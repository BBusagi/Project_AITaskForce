using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace AssetDesk.Core;

public sealed class ScanSnapshot
{
    public string Key { get; set; } = "";
    public string Root { get; set; } = "";
    public string Policy { get; set; } = "";
    public DateTimeOffset SavedAt { get; set; } = DateTimeOffset.Now;
    public ScanReport Report { get; set; } = new();
    public List<string> AssetIds { get; set; } = [];
}
public sealed class AnalysisSnapshot
{
    public string Key { get; set; } = "";
    public DateTimeOffset SavedAt { get; set; } = DateTimeOffset.Now;
    public AiResponse Response { get; set; } = new();
    public AiContext Request { get; set; } = new("", []);
    public string[] Fingerprints { get; set; } = [];
    public string ProviderId { get; set; } = "";
    public string Endpoint { get; set; } = "";
    public string Model { get; set; } = "";
}
public sealed record CachedScanResult(ScanReport Report, bool FromCache, DateTimeOffset SavedAt);
public sealed record CachedAnalysisResult(AiResponse Response, bool FromCache, DateTimeOffset SavedAt);

public static class ResultCache
{
    public const string FilePolicy = "metadata-scan-v3;cap=none;";
    public const string DiscoveryPolicy = "registry-path-discovery-v3;installation-location";
    public const string DiscoveryRoot = "应用注册信息与 PATH 环境";
    // Bump this when prompt/schema/request defaults or interpretation changes.
    public const string AnalysisPolicy = "metadata-advice-v1;output=4096;";
    private static string Hash(object value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value))));
    public static string AssetFingerprint(Asset asset) => Hash(new { asset.Id, asset.Path, asset.Name, asset.Kind, asset.Category, asset.Protection, asset.Size, asset.Modified, asset.Version, asset.Tags, asset.IsDemo, asset.IsSystemRelated, asset.SystemReason });
    public static string FileScanPolicy => FilePolicy + string.Join('|', FileScanner.DefaultExclusions);

    public static string ScanKey(string root, string policy, string identity) => Hash(new { root = policy == DiscoveryPolicy ? root : Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar), policy, identity });
    public static string LocalIdentity(string root)
    {
        if (!OperatingSystem.IsWindows()) return "";
        var mount = Path.GetPathRoot(Path.GetFullPath(root))!;
        var name = new StringBuilder(1024);
        // Never reuse a drive-letter snapshot if the mounted volume cannot be identified.
        return GetVolumeNameForVolumeMountPoint(mount, name, name.Capacity) ? name.ToString() : "";
    }
    public static string DiscoveryIdentity => Environment.MachineName + "|" + Environment.UserName + "|" + (Environment.GetEnvironmentVariable("PATH") ?? "");
    public static ScanSnapshot? FindScan(Workspace workspace, string key)
    {
        var snapshot = workspace.ScanCache.LastOrDefault(s => s.Key == key);
        if (snapshot == null) return null;
        var ids = workspace.Assets.Select(a => a.Id).ToHashSet();
        return snapshot.AssetIds.All(ids.Contains) ? snapshot : null;
    }
    public static async Task<CachedScanResult> ScanOrReuseAsync(Workspace workspace, string key, string root, string policy, bool force, Func<Task<ScanResult>> scan)
    {
        if (!force && FindScan(workspace, key) is { } cached) return new(Clone(cached.Report), true, cached.SavedAt);
        var result = await scan();
        ReviewService.Merge(workspace, result.Assets);
        SaveScan(workspace, key, root, policy, result.Report, result.Assets);
        return new(result.Report, false, DateTimeOffset.Now);
    }
    public static void SaveScan(Workspace workspace, string key, string root, string policy, ScanReport report, IEnumerable<Asset> assets)
    {
        if (report.State != "已完成" && report.State != "完成（有局部错误）" && !report.State.Contains("达到数量上限", StringComparison.Ordinal)) return;
        workspace.ScanCache.RemoveAll(s => s.Key == key);
        workspace.ScanCache.Add(new() { Key = key, Root = root, Policy = policy, Report = Clone(report), AssetIds = assets.Select(a => a.Id).Distinct().ToList() });
    }
    public static string AnalysisKey(Workspace workspace, AiProviderConfig config, AiContext context)
    {
        var endpoint = AiProviders.Validate(config).AbsoluteUri.TrimEnd('/');
        var assets = context.Assets.Select(a => workspace.Assets.SingleOrDefault(item => item.Id == a.Id) ?? throw new InvalidOperationException("分析对象已不在索引中。")).ToArray();
        if (Hash(AiAdvisor.CreateContext(context.Goal, assets)) != Hash(context)) throw new InvalidOperationException("分析预览已过期，请重新生成预览。");
        var fingerprints = assets.Select(AssetFingerprint).ToArray();
        // Entire request scope is included: grouping suggestions may depend on other selected assets.
        // Credentials are intentionally excluded; changing a key does not change the classification request.
        return Hash(new { policy = AnalysisPolicy, prompt = AiAdvisor.SystemPrompt, config.ProviderId, endpoint, config.Model, context, fingerprints });
    }
    public static AnalysisSnapshot? FindAnalysis(Workspace workspace, string key, AiContext context)
    {
        var snapshot = workspace.AnalysisCache.LastOrDefault(s => s.Key == key);
        if (snapshot == null) return null;
        try { Validate(snapshot.Response, context); return snapshot; }
        catch (Exception ex) when (ex is InvalidDataException or JsonException or ArgumentException) { workspace.AnalysisCache.Remove(snapshot); return null; }
    }
    public static async Task<CachedAnalysisResult> AnalyzeOrReuseAsync(Workspace workspace, AiProviderConfig config, AiContext context, bool force, Func<Task<AiResponse>> analyze)
    {
        var key = AnalysisKey(workspace, config, context);
        if (!force && FindAnalysis(workspace, key, context) is { } cached)
        { UseAnalysis(workspace, cached); return new(Clone(cached.Response), true, cached.SavedAt); }
        var response = await analyze();
        SaveAnalysis(workspace, key, config, context, response);
        UseAnalysis(workspace, workspace.AnalysisCache.Last(s => s.Key == key));
        return new(response, false, DateTimeOffset.Now);
    }
    public static void SaveAnalysis(Workspace workspace, string key, AiProviderConfig config, AiContext context, AiResponse response)
    {
        Validate(response, context);
        foreach (var suggestion in response.Suggestions) suggestion.SourceFingerprint = AssetFingerprint(workspace.Assets.Single(a => a.Id == suggestion.AssetId));
        workspace.AnalysisCache.RemoveAll(s => s.Key == key);
        workspace.AnalysisCache.Add(new() { Key = key, Response = Clone(response), Request = Clone(context), Fingerprints = context.Assets.Select(a => AssetFingerprint(workspace.Assets.Single(item => item.Id == a.Id))).ToArray(), ProviderId = config.ProviderId, Endpoint = config.Endpoint, Model = config.Model });
        if (workspace.AnalysisCache.Count > 200) workspace.AnalysisCache.RemoveRange(0, workspace.AnalysisCache.Count - 200);
    }
    public static void UseAnalysis(Workspace workspace, AnalysisSnapshot snapshot)
    {
        var existing = workspace.Suggestions.Select(s => s.Id).ToHashSet();
        foreach (var suggestion in Clone(snapshot.Response).Suggestions) if (existing.Add(suggestion.Id)) workspace.Suggestions.Add(suggestion);
        // Existing accepted/rejected decisions are not reset and repeated cache hits add no duplicate proposals.
    }
    public static void RebindAfterAcceptance(Workspace workspace, string assetId, string previousFingerprint)
    {
        // Applying a proposal changes labels, but repeating the same request should still reuse that decision.
        // Only rebind a previously valid scope; unrelated metadata changes must remain cache misses.
        foreach (var snapshot in workspace.AnalysisCache.ToArray())
        {
            var position = Array.FindIndex(snapshot.Request.Assets, a => a.Id == assetId);
            if (position < 0 || snapshot.Fingerprints.Length != snapshot.Request.Assets.Length || snapshot.Fingerprints[position] != previousFingerprint) continue;
            var assets = snapshot.Request.Assets.Select(a => workspace.Assets.SingleOrDefault(item => item.Id == a.Id)).ToArray();
            if (assets.Any(a => a == null) || Enumerable.Range(0, assets.Length).Any(i => i != position && AssetFingerprint(assets[i]!) != snapshot.Fingerprints[i])) continue;
            var request = AiAdvisor.CreateContext(snapshot.Request.Goal, assets.Cast<Asset>());
            var config = new AiProviderConfig { ProviderId = snapshot.ProviderId, Endpoint = snapshot.Endpoint, Model = snapshot.Model };
            snapshot.Key = AnalysisKey(workspace, config, request); snapshot.Request = request;
            snapshot.Fingerprints = assets.Select(a => AssetFingerprint(a!)).ToArray();
            foreach (var suggestion in snapshot.Response.Suggestions) if (workspace.Suggestions.SingleOrDefault(s => s.Id == suggestion.Id) is { } existing) suggestion.Status = existing.Status;
        }
        workspace.AnalysisCache = workspace.AnalysisCache.GroupBy(s => s.Key).Select(g => g.Last()).ToList();
    }
    private static void Validate(AiResponse response, AiContext context) => AiAdvisor.ValidateResponse(JsonSerializer.Serialize(new { summary = response.Summary, suggestions = response.Suggestions.Select(s => new { assetId = s.AssetId, category = s.Category, tags = s.Tags, reason = s.Reason }) }), context);
    private static T Clone<T>(T value) => JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(value))!;
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)] private static extern bool GetVolumeNameForVolumeMountPoint(string mount, StringBuilder volume, int length);
}
