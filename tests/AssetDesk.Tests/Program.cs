using AssetDesk.Core;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

try
{
var passed = 0;
var testRoot = Path.Combine(Environment.CurrentDirectory, "artifacts", "tests", Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(testRoot);
void Assert(bool condition, string message) { if (!condition) throw new Exception(message); }
void Test(string name, Action run) { run(); passed++; Console.WriteLine($"PASS {name}"); }
async Task TestAsync(string name, Func<Task> run) { await run(); passed++; Console.WriteLine($"PASS {name}"); }
void MustReject(Action action) { try { action(); } catch (Exception ex) when (ex is InvalidDataException or ArgumentException or JsonException or InvalidOperationException) { return; } throw new Exception("Invalid input was accepted"); }

var fixture = Path.Combine(testRoot, "fixture");
Directory.CreateDirectory(fixture); Directory.CreateDirectory(Path.Combine(fixture, ".git")); Directory.CreateDirectory(Path.Combine(fixture, "node_modules", "dependency"));
File.WriteAllText(Path.Combine(fixture, "package.json"), "{\"scripts\":{\"postinstall\":\"do-not-execute\"}}");
File.WriteAllText(Path.Combine(fixture, "notes.md"), "This must remain unchanged.");
File.WriteAllText(Path.Combine(fixture, "截图.png"), "fake image - metadata only");
File.WriteAllText(Path.Combine(fixture, "node_modules", "dependency", "package.json"), "{}");
var before = Directory.GetFiles(fixture, "*", SearchOption.AllDirectories).ToDictionary(p => p, p => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(p))));
ScanResult? scan = null;
await TestAsync("read-only scan, project discovery and dependency exclusions", async () =>
{
    using var pause = new ManualResetEventSlim(true);
    scan = await new FileScanner().ScanAsync(fixture, null, pause, CancellationToken.None);
    Assert(scan.Report.State == "已完成", "scan incomplete");
    Assert(scan.Assets.Count(a => a.Kind == "项目") == 1, "project count");
    Assert(!scan.Assets.Any(a => a.Path.Contains("node_modules")), "dependency traversed");
    Assert(scan.Assets.Any(a => a.Category == "截图候选"), "screenshot rule");
    var after = Directory.GetFiles(fixture, "*", SearchOption.AllDirectories);
    Assert(after.Length == before.Count && after.All(p => before[p] == Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(p)))), "original files changed");
});
await TestAsync("cancellation produces an explicitly partial report", async () =>
{
    using var source = new CancellationTokenSource(); source.Cancel(); using var pause = new ManualResetEventSlim(true);
    var result = await new FileScanner().ScanAsync(fixture, null, pause, source.Token);
    Assert(result.Report.State.Contains("取消") && result.Assets.Count == 0, "cancel not respected");
});
await TestAsync("pause blocks dispatch and can be cancelled", async () =>
{
    using var pause = new ManualResetEventSlim(false); using var source = new CancellationTokenSource();
    var task = new FileScanner().ScanAsync(fixture, null, pause, source.Token);
    await Task.Delay(100); Assert(!task.IsCompleted, "pause ignored"); source.Cancel();
    Assert((await task).Report.State.Contains("取消"), "paused cancellation failed");
});
await TestAsync("scan cap reports partial coverage", async () =>
{
    using var pause = new ManualResetEventSlim(true);
    var result = await new FileScanner().ScanAsync(fixture, null, pause, CancellationToken.None, 2);
    Assert(result.Assets.Count == 2 && result.Report.State.Contains("上限"), "cap silently truncated");
});

await TestAsync("pre-scan counts matching exclusions without creating assets, supports cancellation", async () =>
{
    using var pause = new ManualResetEventSlim(true);
    var result = await new PreScanner().CountAsync(fixture, pause, CancellationToken.None);
    Assert(result.Count == scan!.Assets.Count && result.Files == 3 && result.Projects == 1 && result.Skipped >= 2 && !result.Cancelled, "pre-scan coverage differs");
    Assert(before.All(pair => pair.Value == Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(pair.Key)))), "pre-scan changed files");
    using var cancelled = new CancellationTokenSource(); cancelled.Cancel();
    var partial = await new PreScanner().CountAsync(fixture, pause, cancelled.Token);
    Assert(partial.Cancelled && partial.Count == 0, "pre-scan cancellation ignored");
    Assert(typeof(FileScanner).GetMethod("ScanAsync")!.GetParameters().Single(p => p.Name == "limit").DefaultValue == null, "default scan still capped");
    Assert(!ResultCache.FileScanPolicy.Contains("100000") && ResultCache.FileScanPolicy.Contains("cap=none"), "old capped cache policy reused");
});

var workspace = new Workspace { Assets = scan!.Assets };
var asset = workspace.Assets.First(a => a.Kind == "文件");
var input = AiAdvisor.CreateContext("按用途分类，不移动文件", [asset]);
var valid = JsonSerializer.Serialize(new { summary = "需要用户审核", suggestions = new[] { new { assetId = asset.Id, category = "工作资料", tags = new[] { "待检查" }, reason = "仅依据元数据，内容未知。" } } });
Test("strict AI contract accepts only known assets and allowed fields", () =>
{
    var response = AiAdvisor.ValidateResponse(valid, input); Assert(response.Suggestions.Count == 1, "valid response rejected");
    MustReject(() => AiAdvisor.ValidateResponse(valid.Replace(asset.Id, "unknown-id"), input));
    var duplicate = JsonNode.Parse(valid)!;
    duplicate["suggestions"]!.AsArray().Add(duplicate["suggestions"]![0]!.DeepClone());
    MustReject(() => AiAdvisor.ValidateResponse(duplicate.ToJsonString(), input));
    MustReject(() => AiAdvisor.ValidateResponse(valid.Replace("\"reason\":", "\"command\":\"delete\",\"reason\":"), input));
    MustReject(() => AiAdvisor.ValidateResponse("{\"summary\":\"x\",\"suggestions\":null}", input));
    MustReject(() => AiAdvisor.ValidateResponse("{\"summary\":null,\"suggestions\":[]}", input));
    var badTags = JsonNode.Parse(valid)!;
    badTags["suggestions"]![0]!["tags"] = new JsonArray((JsonNode?)null);
    MustReject(() => AiAdvisor.ValidateResponse(badTags.ToJsonString(), input));
});
Test("metadata preview excludes full paths and bodies", () =>
{
    var preview = AiAdvisor.Preview(input); Assert(!preview.Contains(asset.Path) && preview.Contains(asset.Name), "private paths included");
    MustReject(() => AiAdvisor.CreateContext("", [asset]));
    MustReject(() => AiAdvisor.CreateContext("x", Enumerable.Range(0, 41).Select(_ => new Asset())));
});
Test("local endpoint restriction prevents remote uploads", () =>
{
    AiAdvisor.ValidateEndpoint("http://127.0.0.1:11434"); AiAdvisor.ValidateEndpoint("http://localhost:11434");
    MustReject(() => AiAdvisor.ValidateEndpoint("https://example.com"));
    MustReject(() => AiAdvisor.ValidateEndpoint("http://localhost.evil.com:11434"));
    MustReject(() => AiAdvisor.ValidateEndpoint("http://user:pass@localhost:11434"));
    MustReject(() => AiAdvisor.ValidateEndpoint("http://localhost:11434/proxy"));
});
Test("review changes labels only; rejection and re-scan preserve user decisions", () =>
{
    var suggestion = AiAdvisor.ValidateResponse(valid, input).Suggestions[0]; workspace.Suggestions.Add(suggestion);
    var path = asset.Path; var protection = asset.Protection;
    ReviewService.Accept(workspace, suggestion);
    Assert(asset.Category == "工作资料" && asset.UserClassified && asset.Path == path && asset.Protection == protection, "unsafe mutation");
    MustReject(() => ReviewService.Accept(workspace, suggestion));
    var rejected = AiAdvisor.ValidateResponse(valid, input).Suggestions[0]; ReviewService.Reject(rejected); Assert(rejected.Status == "已拒绝", "rejection failed");
    var replacement = new Asset { Path = path, Kind = asset.Kind, Category = "文档", Protection = protection };
    ReviewService.Merge(workspace, [replacement]);
    Assert(workspace.Assets.First(a => a.Path == path).Id == asset.Id && replacement.Category == "工作资料" && replacement.Tags.Contains("待检查"), "rescan lost user override");
    Assert(File.Exists(path), "file removed");
});
Test("SQLite round-trip persists Unicode, settings and review states", () =>
{
    var database = Path.Combine(testRoot, "workspace.db");
    using (var store = new WorkspaceStore(database)) store.Save(workspace);
    using (var store = new WorkspaceStore(database))
    {
        var restored = store.Load(); Assert(restored.Assets.Count == workspace.Assets.Count, "assets missing");
        Assert(restored.Suggestions[0].Status == "已接受" && restored.Assets.Any(a => a.Tags.Contains("待检查")), "review missing");
        restored.Assets.Clear(); store.Save(restored); Assert(store.Load().Assets.Count == 0, "clear index failed");
    }
    Assert(before.All(p => p.Value == Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(p.Key)))), "persistence changed originals");
});
await TestAsync("Ollama request uses schema and bounded metadata; response is validated", async () =>
{
    var handler = new StubHandler(valid);
    using var client = new HttpClient(handler);
    var response = await new AiAdvisor(client).AnalyzeAsync("http://127.0.0.1:11434", "test-model", input, CancellationToken.None);
    Assert(response.Suggestions[0].Model == "test-model", "route missing");
    Assert(handler.Body.Contains("\"stream\":false") && handler.Body.Contains("\"think\":false") && handler.Body.Contains("\"format\":{") && !handler.Body.Contains(asset.Path), "request contract");
});
await TestAsync("Ollama incomplete outputs are rejected", async () =>
{
    using var client = new HttpClient(new StubHandler(valid, false));
    try { await new AiAdvisor(client).AnalyzeAsync("http://127.0.0.1:11434", "test-model", input, CancellationToken.None); }
    catch (InvalidDataException) { return; }
    throw new Exception("incomplete response accepted");
});
Test("provider defaults, HTTPS restriction and official endpoint binding", () =>
{
    foreach (var provider in AiProviders.All.Where(p => p.Id != "custom")) AiProviders.Validate(AiProviders.Defaults(provider.Id));
    MustReject(() => AiProviders.Validate(new() { ProviderId = "openai", Endpoint = "https://example.com/v1", Model = "test" }));
    MustReject(() => AiProviders.Validate(new() { ProviderId = "custom", Endpoint = "http://example.com/v1", Model = "test" }));
    MustReject(() => AiProviders.Validate(new() { ProviderId = "custom", Endpoint = "https://user:pass@example.com/v1", Model = "test" }));
    var legacy = JsonSerializer.Deserialize<Workspace>("{\"Endpoint\":\"http://localhost:11434\",\"Model\":\"legacy-model\"}")!;
    Assert(legacy.ActiveConfig().ProviderId == "ollama" && legacy.ActiveConfig().Model == "legacy-model", "legacy settings lost");
});
Test("DPAPI key ciphertext and provider selection survive SQLite restore", () =>
{
    const string key = "fixture-credential-for-tests";
    var ciphertext = SecretProtector.Protect(key);
    Assert(ciphertext != key && SecretProtector.Unprotect(ciphertext) == key, "DPAPI round-trip");
    var profile = AiProviders.Defaults("openai"); profile.EncryptedApiKey = ciphertext;
    var settingsWorkspace = new Workspace { ProviderId = "openai", ProviderSettings = new() { ["openai"] = profile } };
    var json = JsonSerializer.Serialize(settingsWorkspace);
    Assert(!json.Contains(key), "plaintext credential serialized");
    using var store = new WorkspaceStore(Path.Combine(testRoot, "providers.db")); store.Save(settingsWorkspace);
    var restored = store.Load();
    Assert(restored.ProviderId == "openai" && SecretProtector.Unprotect(restored.ActiveConfig().EncryptedApiKey) == key, "credential or provider lost");
});
foreach (var provider in new[] { "openai", "deepseek", "claude", "custom" })
await TestAsync($"{provider} authentication, endpoint and advice response adapter", async () =>
{
    var config = AiProviders.Defaults(provider);
    if (provider == "custom") { config.Endpoint = "https://example.com/proxy/v1"; config.Model = "test"; }
    var body = provider == "claude" ? JsonSerializer.Serialize(new { stop_reason = "end_turn", content = new[] { new { type = "text", text = valid } } }) : JsonSerializer.Serialize(new { choices = new[] { new { finish_reason = "stop", message = new { content = valid } } } });
    var handler = new ApiStubHandler(body); using var client = new HttpClient(handler);
    var response = await new AiAdvisor(client).AnalyzeAsync(config, "fixture-key", input, CancellationToken.None);
    Assert(response.Suggestions.Count == 1 && response.Suggestions[0].Model.Contains(config.Model), "advice parse");
    Assert(handler.Address!.AbsolutePath.EndsWith(provider == "claude" ? "/v1/messages" : "/v1/chat/completions"), "base path lost");
    Assert(provider == "claude" ? handler.ApiKey == "fixture-key" && handler.Version == "2023-06-01" && handler.Authorization == null : handler.Authorization == "Bearer fixture-key" && handler.ApiKey == null, "wrong credential header");
    Assert(!handler.Body.Contains(asset.Path) && !handler.Body.Contains("fixture-key"), "secret or path in request body");
});
await TestAsync("API failures do not leak reflected credentials; truncated results reject", async () =>
{
    var config = AiProviders.Defaults("openai");
    using var client = new HttpClient(new ApiStubHandler("fixture-key echoed by server", HttpStatusCode.Unauthorized));
    try { await new AiAdvisor(client).AnalyzeAsync(config, "fixture-key", input, CancellationToken.None); throw new Exception("HTTP error accepted"); }
    catch (HttpRequestException ex) { Assert(!ex.Message.Contains("fixture-key") && ex.StatusCode == HttpStatusCode.Unauthorized, "credential leak"); }
    var truncated = JsonSerializer.Serialize(new { choices = new[] { new { finish_reason = "length", message = new { content = valid } } } });
    using var truncatedClient = new HttpClient(new ApiStubHandler(truncated));
    try { await new AiAdvisor(truncatedClient).AnalyzeAsync(config, "fixture-key", input, CancellationToken.None); throw new Exception("truncated accepted"); }
    catch (InvalidDataException) { }
});
await TestAsync("cloud model list adapter uses credential header and preserves API prefix", async () =>
{
    var handler = new ApiStubHandler("{\"data\":[{\"id\":\"test-model\"}]}"); using var client = new HttpClient(handler);
    var models = await new AiAdvisor(client).ListModelsAsync(AiProviders.Defaults("openai"), "fixture-key", CancellationToken.None);
    Assert(models.SequenceEqual(new[] { "test-model" }) && handler.Address!.AbsolutePath == "/v1/models" && handler.Authorization == "Bearer fixture-key", "models request");
});
await TestAsync("multi-root scans deduplicate roots and continue after a per-root cap", async () =>
{
    var secondRoot = Path.Combine(testRoot, "second-disk-fixture"); Directory.CreateDirectory(secondRoot); File.WriteAllText(Path.Combine(secondRoot, "second.txt"), "unchanged");
    var roots = new List<string>(); var results = new List<ScanResult>(); using var pause = new ManualResetEventSlim(true);
    await ScanScopes.ScanRootsAsync([fixture, fixture, secondRoot], async root => { roots.Add(root); results.Add(await new FileScanner().ScanAsync(root, null, pause, CancellationToken.None, 2)); }, CancellationToken.None, _ => throw new Exception("unexpected skip"));
    Assert(roots.Count == 2 && results[0].Report.State.Contains("上限") && results[1].Assets.Single().Name == "second.txt", "cap on first root prevented next root");
    Assert(File.ReadAllText(Path.Combine(secondRoot, "second.txt")) == "unchanged", "disk fixture changed");
});
await TestAsync("multi-root cancellation records remaining roots without dispatch", async () =>
{
    using var source = new CancellationTokenSource(); var scanned = new List<string>(); var skipped = new List<string>();
    var later = Path.Combine(testRoot, "later");
    await ScanScopes.ScanRootsAsync([fixture, later], root => { scanned.Add(root); source.Cancel(); return Task.CompletedTask; }, source.Token, skipped.Add);
    Assert(scanned.SequenceEqual(new[] { fixture }) && skipped.SequenceEqual(new[] { later }), "cancellation dispatched remaining disk");
});
Test("system app evidence recognizes components and updates without publisher heuristics", () =>
{
    var windowsRoot = @"C:\Windows";
    Assert(ApplicationMetadata.SystemReason(1, null, null, windowsRoot).Contains("SystemComponent"), "system component missed");
    Assert(ApplicationMetadata.SystemReason(0, "Security Update", null, windowsRoot).Contains("ReleaseType"), "update missed");
    Assert(ApplicationMetadata.SystemReason(null, null, @"C:\Windows\System32", windowsRoot).Length > 0, "Windows location missed");
    Assert(ApplicationMetadata.SystemReason(null, null, @"C:\WindowsExtra", windowsRoot).Length == 0, "Windows prefix false positive");
    Assert(ApplicationMetadata.SystemReason(null, null, @"C:\Program Files\Microsoft App", windowsRoot).Length == 0, "ordinary Microsoft app treated as system");
});
Test("registered icon parsing handles quoted paths, commas and resource indexes", () =>
{
    Assert(ApplicationMetadata.ParseIcon("\"C:\\Tools\\app, main.exe\",-4") == (@"C:\Tools\app, main.exe", -4), "quoted icon parse");
    Assert(ApplicationMetadata.ParseIcon(@"C:\Tools\app.ico") == (@"C:\Tools\app.ico", 0), "ico parse");
    Assert(ApplicationMetadata.ParseIcon(null) == ("", 0), "missing icon parse");
});
Test("application evidence and view preferences survive index restore and review", () =>
{
    var app = new Asset { Name = "fixture system", Kind = "应用", Path = "registry:fixture", IsSystemRelated = true, SystemReason = "SystemComponent=1", IconPath = @"C:\fixture\app.exe", IconIndex = -2, Protection = "应用保护" };
    var prefs = new Workspace { Assets = [app], AppIconView = true, ShowSystemApps = false };
    var suggestion = new Suggestion { AssetId = app.Id, Category = "工作工具" }; ReviewService.Accept(prefs, suggestion);
    using var store = new WorkspaceStore(Path.Combine(testRoot, "app-prefs.db")); store.Save(prefs); var restored = store.Load();
    Assert(restored.AppIconView && !restored.ShowSystemApps && restored.Assets[0].IsSystemRelated && restored.Assets[0].IconIndex == -2 && restored.Assets[0].SystemReason == app.SystemReason, "app evidence or prefs lost");
    Assert(restored.Assets[0].Protection == "应用保护", "review changed protection");
    var old = JsonSerializer.Deserialize<Workspace>("{}")!; Assert(old.ShowSystemApps && !old.AppIconView, "legacy preferences changed");
});
await TestAsync("scan cache bypasses enumeration, survives restore and supports forced refresh", async () =>
{
    var cachedWorkspace = new Workspace(); var calls = 0; using var pause = new ManualResetEventSlim(true);
    var key = ResultCache.ScanKey(fixture, ResultCache.FileScanPolicy, "fixture-volume");
    async Task<ScanResult> Scan() { calls++; return await new FileScanner().ScanAsync(fixture, null, pause, CancellationToken.None); }
    var first = await ResultCache.ScanOrReuseAsync(cachedWorkspace, key, fixture, ResultCache.FileScanPolicy, false, Scan);
    Assert(!first.FromCache && calls == 1 && cachedWorkspace.ScanCache.Count == 1, "initial scan not stored");
    cachedWorkspace.Assets[0].Category = "人工分类"; cachedWorkspace.Assets[0].UserClassified = true;
    var path = Path.Combine(testRoot, "scan-cache.db"); using (var store = new WorkspaceStore(path)) store.Save(cachedWorkspace);
    using (var store = new WorkspaceStore(path)) cachedWorkspace = store.Load();
    var second = await ResultCache.ScanOrReuseAsync(cachedWorkspace, key, fixture, ResultCache.FileScanPolicy, false, Scan);
    Assert(second.FromCache && calls == 1 && cachedWorkspace.Assets[0].Category == "人工分类", "cached scan enumerated or overwrote decisions");
    await ResultCache.ScanOrReuseAsync(cachedWorkspace, key, fixture, ResultCache.FileScanPolicy, true, Scan);
    Assert(calls == 2 && cachedWorkspace.ScanCache.Count == 1 && cachedWorkspace.Assets[0].Category == "人工分类", "force refresh or merge failed");
});
Test("scan cache separates rules and volumes, excludes failed/cancelled snapshots", () =>
{
    var state = new Workspace { Assets = [asset] };
    var key = ResultCache.ScanKey(fixture, "rules-v1", "volume-a");
    Assert(key != ResultCache.ScanKey(fixture, "rules-v2", "volume-a") && key != ResultCache.ScanKey(fixture, "rules-v1", "volume-b"), "scan policy or mounted volume ignored");
    ResultCache.SaveScan(state, key, fixture, "rules-v1", new() { State = "已取消（部分扫描）" }, [asset]);
    ResultCache.SaveScan(state, key, fixture, "rules-v1", new() { State = "扫描失败" }, [asset]);
    Assert(state.ScanCache.Count == 0, "cancelled or failed snapshot cached as complete");
    ResultCache.SaveScan(state, key, fixture, "rules-v1", new() { State = "达到数量上限（部分扫描）", Discovered = 1 }, [asset]);
    Assert(ResultCache.FindScan(state, key)!.Report.State.Contains("部分"), "cap provenance lost");
    state.Assets.Clear(); Assert(ResultCache.FindScan(state, key) == null, "missing indexed assets silently reused");
});
await TestAsync("analysis cache skips HTTP across restart, preserves rejection and duplicates no proposals", async () =>
{
    var state = new Workspace { Assets = [asset] }; var config = AiProviders.Defaults("ollama");
    var cachedInput = AiAdvisor.CreateContext(input.Goal, state.Assets);
    var handler = new StubHandler(valid); using var client = new HttpClient(handler);
    Task<AiResponse> Generate() => new AiAdvisor(client).AnalyzeAsync(config, "", cachedInput, CancellationToken.None);
    var first = await ResultCache.AnalyzeOrReuseAsync(state, config, cachedInput, false, Generate);
    Assert(!first.FromCache && handler.Calls == 1 && state.Suggestions.Count == 1, "initial analysis not cached");
    ReviewService.Reject(state.Suggestions[0]); var path = Path.Combine(testRoot, "analysis-cache.db");
    using (var store = new WorkspaceStore(path)) store.Save(state);
    using (var store = new WorkspaceStore(path)) state = store.Load();
    var restoredInput = AiAdvisor.CreateContext(input.Goal, state.Assets);
    var second = await ResultCache.AnalyzeOrReuseAsync(state, config, restoredInput, false, Generate);
    Assert(second.FromCache && handler.Calls == 1 && state.Suggestions.Count == 1 && state.Suggestions[0].Status == "已拒绝", "cache called model or reset rejection");
    await ResultCache.AnalyzeOrReuseAsync(state, config, restoredInput, true, Generate);
    Assert(handler.Calls == 2 && state.Suggestions.Count == 2 && state.AnalysisCache.Count == 1, "force analysis did not replace cache");
});
Test("analysis cache invalidates scope, goal, provider, model and metadata but excludes API keys", () =>
{
    var item = new Asset { Name = "cache item", Path = "fixture:/item", Size = 10, Modified = DateTimeOffset.UnixEpoch };
    var state = new Workspace { Assets = [item] }; var config = AiProviders.Defaults("openai");
    string Key(string goal = "分类") => ResultCache.AnalysisKey(state, config, AiAdvisor.CreateContext(goal, [item]));
    var original = Key(); Assert(Key("新目标") != original, "goal ignored");
    config.EncryptedApiKey = "fixture-ciphertext-not-a-real-key"; Assert(Key() == original, "credential changes force paid reanalysis");
    config.Model = "different-model"; Assert(Key() != original, "model ignored"); config.Model = AiProviders.Get("openai").Model;
    config.ProviderId = "custom"; Assert(Key() != original, "provider ignored"); config.Endpoint = "https://fixture.invalid/v1"; Assert(Key() != original, "endpoint ignored"); config = AiProviders.Defaults("openai");
    item.Modified = item.Modified.Value.AddSeconds(1); Assert(Key() != original, "same-size modification ignored"); item.Modified = DateTimeOffset.UnixEpoch;
    item.Size++; Assert(Key() != original, "size ignored"); item.Size--;
    item.Name += "changed"; Assert(Key() != original, "name ignored"); item.Name = "cache item";
    item.Path += "changed"; Assert(Key() != original, "local identity ignored"); item.Path = "fixture:/item";
    item.Tags.Add("人工标签"); Assert(Key() != original, "manual labels ignored"); item.Tags.Clear();
    var extra = new Asset { Name = "extra" }; state.Assets.Add(extra);
    Assert(ResultCache.AnalysisKey(state, config, AiAdvisor.CreateContext("分类", [item, extra])) != original, "grouping scope ignored");
});
await TestAsync("acceptance reuses cached decisions without paying again and preserves acceptance", async () =>
{
    var item = new Asset { Name = "approve fixture", Path = "fixture:/approve" }; var state = new Workspace { Assets = [item] }; var config = AiProviders.Defaults("ollama"); var calls = 0;
    Task<AiResponse> Generate() { calls++; return Task.FromResult(new AiResponse { Summary = "fixture", Suggestions = [new() { AssetId = item.Id, AssetName = item.Name, Category = "已整理", Tags = ["工作"], Reason = "fixture reason" }] }); }
    await ResultCache.AnalyzeOrReuseAsync(state, config, AiAdvisor.CreateContext("分类", [item]), false, Generate);
    ReviewService.Accept(state, state.Suggestions[0]);
    var hit = await ResultCache.AnalyzeOrReuseAsync(state, config, AiAdvisor.CreateContext("分类", [item]), false, Generate);
    Assert(hit.FromCache && calls == 1 && state.Suggestions.Count == 1 && state.Suggestions[0].Status == "已接受" && item.Tags.Contains("工作"), "acceptance caused paid reanalysis or reset");
});
await TestAsync("changed metadata cannot apply stale cached suggestions or rebind an invalid group", async () =>
{
    var one = new Asset { Name = "one", Modified = DateTimeOffset.UnixEpoch }; var two = new Asset { Name = "two", Modified = DateTimeOffset.UnixEpoch };
    var state = new Workspace { Assets = [one, two] }; var config = AiProviders.Defaults("ollama"); var context = AiAdvisor.CreateContext("分类", state.Assets);
    await ResultCache.AnalyzeOrReuseAsync(state, config, context, false, () => Task.FromResult(new AiResponse { Summary = "fixture", Suggestions = [new() { AssetId = one.Id, Category = "工作", Reason = "fixture" }, new() { AssetId = two.Id, Category = "个人", Reason = "fixture" }] }));
    var oldKey = state.AnalysisCache[0].Key; two.Modified = DateTimeOffset.UnixEpoch.AddSeconds(1);
    MustReject(() => ReviewService.Accept(state, state.Suggestions[1]));
    ReviewService.Accept(state, state.Suggestions[0]);
    Assert(state.AnalysisCache[0].Key == oldKey && ResultCache.FindAnalysis(state, ResultCache.AnalysisKey(state, config, AiAdvisor.CreateContext("分类", state.Assets)), AiAdvisor.CreateContext("分类", state.Assets)) == null, "stale group rebound after accepting another asset");
});
await TestAsync("failed and invalid analysis is not cached; validated empty advice is reusable", async () =>
{
    var state = new Workspace { Assets = [asset] }; var config = AiProviders.Defaults("ollama");
    var currentInput = AiAdvisor.CreateContext(input.Goal, state.Assets);
    try { await ResultCache.AnalyzeOrReuseAsync(state, config, currentInput, false, () => throw new HttpRequestException("fixture error")); throw new Exception("error accepted"); } catch (HttpRequestException) { }
    Assert(state.AnalysisCache.Count == 0, "network failure cached");
    try { await ResultCache.AnalyzeOrReuseAsync(state, config, currentInput, false, () => throw new OperationCanceledException()); throw new Exception("cancellation accepted"); } catch (OperationCanceledException) { }
    Assert(state.AnalysisCache.Count == 0, "cancellation cached");
    await ResultCache.AnalyzeOrReuseAsync(state, config, currentInput, false, () => Task.FromResult(new AiResponse { Summary = "无需新建议" }));
    var hit = await ResultCache.AnalyzeOrReuseAsync(state, config, currentInput, false, () => throw new Exception("empty response regenerated")); Assert(hit.FromCache, "empty validated response was not cached");
    state.AnalysisCache[0].Response.Suggestions.Add(new() { AssetId = "invalid", Category = "x", Reason = "x" });
    Assert(ResultCache.FindAnalysis(state, state.AnalysisCache[0].Key, currentInput) == null && state.AnalysisCache.Count == 0, "invalid stored response reused");
});
await TestAsync("stale send previews are rejected before invoking a model", async () =>
{
    var item = new Asset { Name = "original" }; var state = new Workspace { Assets = [item] }; var context = AiAdvisor.CreateContext("分类", state.Assets); item.Name = "changed";
    var calls = 0;
    try { await ResultCache.AnalyzeOrReuseAsync(state, AiProviders.Defaults("ollama"), context, false, () => { calls++; return Task.FromResult(new AiResponse()); }); throw new Exception("stale preview accepted"); }
    catch (InvalidOperationException ex) { Assert(ex.Message.Contains("预览已过期") && calls == 0, "stale preview caused model call"); }
});
Test("v2 index upgrades additively without losing existing assets, settings or decisions", () =>
{
    var path = Path.Combine(testRoot, "legacy-v2.db"); var state = new Workspace { Assets = [asset], Model = "legacy-model", ShowSystemApps = false };
    state.Suggestions.Add(new() { AssetId = asset.Id, Status = "已拒绝" });
    using (var store = new WorkspaceStore(path)) store.Save(state);
    LegacyFixtureSqlite.MakeV2(path);
    using var migrated = new WorkspaceStore(path); var restored = migrated.Load();
    Assert(restored.Assets.Single().Id == asset.Id && restored.Suggestions[0].Status == "已拒绝" && restored.Model == "legacy-model" && !restored.ShowSystemApps && restored.ScanCache.Count == 0 && restored.AnalysisCache.Count == 0, "migration changed legacy data");
    migrated.Save(restored); Assert(migrated.Load().Assets.Count == 1, "migrated save failed");
});
Console.WriteLine($"\n{passed} checks passed. Fixtures: {testRoot}");
}
catch (Exception ex)
{
    Console.Error.WriteLine($"FAIL: {ex}");
    Environment.ExitCode = 1;
}

sealed class StubHandler(string content, bool done = true) : HttpMessageHandler
{
    public int Calls { get; private set; }
    public string Body { get; private set; } = "";
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Calls++;
        Body = await request.Content!.ReadAsStringAsync(cancellationToken);
        return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { done, message = new { content } }), Encoding.UTF8, "application/json") };
    }
}
static class LegacyFixtureSqlite
{
    public static void MakeV2(string path)
    {
        if (Open(path, out var db, 6, IntPtr.Zero) != 0) throw new Exception("fixture sqlite open failed");
        try { if (Exec(db, "DROP TABLE scan_cache; DROP TABLE analysis_cache; PRAGMA user_version=2;", IntPtr.Zero, IntPtr.Zero, IntPtr.Zero) != 0) throw new Exception("fixture v2 setup failed"); }
        finally { Close(db); }
    }
    [System.Runtime.InteropServices.DllImport("winsqlite3", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl, EntryPoint = "sqlite3_open_v2")] private static extern int Open([System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPUTF8Str)] string path, out IntPtr db, int flags, IntPtr vfs);
    [System.Runtime.InteropServices.DllImport("winsqlite3", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl, EntryPoint = "sqlite3_exec")] private static extern int Exec(IntPtr db, [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.LPUTF8Str)] string sql, IntPtr callback, IntPtr arg, IntPtr error);
    [System.Runtime.InteropServices.DllImport("winsqlite3", CallingConvention = System.Runtime.InteropServices.CallingConvention.Cdecl, EntryPoint = "sqlite3_close")] private static extern int Close(IntPtr db);
}
sealed class ApiStubHandler(string response, HttpStatusCode status = HttpStatusCode.OK) : HttpMessageHandler
{
    public Uri? Address; public string? Authorization, ApiKey, Version; public string Body = "";
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Address = request.RequestUri; Authorization = request.Headers.Authorization?.ToString();
        ApiKey = request.Headers.TryGetValues("x-api-key", out var keys) ? keys.Single() : null;
        Version = request.Headers.TryGetValues("anthropic-version", out var versions) ? versions.Single() : null;
        if (request.Content != null) Body = await request.Content.ReadAsStringAsync(cancellationToken);
        return new(status) { Content = new StringContent(response, Encoding.UTF8, "application/json") };
    }
}
