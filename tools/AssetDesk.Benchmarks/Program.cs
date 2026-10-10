using AssetDesk.Core;
using System.Diagnostics;
using System.Text.Json;

var fileCount = args.Length > 0 ? int.Parse(args[0]) : 10000;
var recordCount = args.Length > 1 ? int.Parse(args[1]) : 100000;
if (fileCount < 1 || recordCount < 1) throw new ArgumentException("Counts must be positive.");
var output = Path.GetFullPath(Path.Combine("artifacts", "benchmarks", Guid.NewGuid().ToString("N")));
var fixture = Path.Combine(output, "fixture"); Directory.CreateDirectory(fixture);
for (var i = 0; i < fileCount; i++)
{
    var directory = Path.Combine(fixture, (i / 10).ToString()); Directory.CreateDirectory(directory);
    File.WriteAllText(Path.Combine(directory, $"file-{i}.txt"), "isolated benchmark");
    if (i % 100 == 0) File.WriteAllText(Path.Combine(directory, "package.json"), "{}");
}
using var pause = new ManualResetEventSlim(true);
var scans = new List<object>();
for (var round = 0; round < 3; round++)
{
    foreach (var baseline in round % 2 == 0 ? new[] { true, false } : new[] { false, true })
    {
        var timer = Stopwatch.StartNew();
        var result = baseline ? await new BaselineFileScanner().ScanAsync(fixture, null, pause, CancellationToken.None, int.MaxValue) : await new FileScanner().ScanAsync(fixture, null, pause, CancellationToken.None);
        timer.Stop();
        if (result.Report.State != "已完成" || result.Assets.Count != fileCount + 2 * ((fileCount + 99) / 100)) throw new Exception("Benchmark scan coverage mismatch.");
        scans.Add(new { Engine = baseline ? "v0.1.5" : "single-pass", Round = round, Milliseconds = timer.Elapsed.TotalMilliseconds, Assets = result.Assets.Count });
    }
}
var workspace = new Workspace { Assets = Enumerable.Range(0, recordCount).Select(i => new Asset { Name = $"file-{i}.txt", Path = $"demo:/benchmark/{i}", Size = i }).ToList() };
using var previous = new BaselineWorkspaceStore(Path.Combine(output, "baseline.db"));
using var current = new WorkspaceStore(Path.Combine(output, "current.db"));
var saves = new List<object>();
foreach (var operation in new[] { "initial", "unchanged", "settings", "one-tag" })
{
    if (operation == "settings") workspace.AppIconView = true;
    if (operation == "one-tag") workspace.Assets[recordCount / 2].Tags = ["edited"];
    var timer = Stopwatch.StartNew(); previous.Save(workspace); timer.Stop();
    var before = timer.Elapsed.TotalMilliseconds;
    timer.Restart(); current.Save(workspace); timer.Stop();
    saves.Add(new { Operation = operation, BaselineMilliseconds = before, CurrentMilliseconds = timer.Elapsed.TotalMilliseconds, CurrentWritten = current.LastSave.Written, CurrentDeleted = current.LastSave.Deleted, CurrentUnchanged = current.LastSave.Unchanged });
}
if (current.Load().Assets.Count != recordCount || current.Load().Assets[recordCount / 2].Tags.Single() != "edited") throw new Exception("Persistence mismatch.");
var report = new { TimeUtc = DateTimeOffset.UtcNow, OS = Environment.OSVersion.ToString(), Runtime = Environment.Version.ToString(), CPUs = Environment.ProcessorCount, DiskFileSystem = new DriveInfo(Path.GetPathRoot(output)!).DriveFormat, AvailableMemoryBytes = GC.GetGCMemoryInfo().TotalAvailableMemoryBytes, FileCount = fileCount, RecordCount = recordCount, Caveat = "Local synthetic fixtures, alternating scans with warm filesystem caches; not a cold whole-PC or million-asset benchmark. Save timings include full JSON serialization/hash work. No LLM calls.", Scans = scans, Saves = saves, ProcessPeakWorkingSetBytes = Process.GetCurrentProcess().PeakWorkingSet64 };
var json = JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true });
File.WriteAllText(Path.Combine(output, "report.json"), json);
Console.WriteLine(json); Console.WriteLine($"Report: {output}/report.json");
