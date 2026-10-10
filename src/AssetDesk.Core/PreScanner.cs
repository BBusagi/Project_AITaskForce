using System.Diagnostics;

namespace AssetDesk.Core;

public sealed record PreScanResult(string Root, long Files, long Projects, long Directories, long Skipped, long Errors, TimeSpan Elapsed, bool Cancelled)
{
    public long Count => Files + Projects;
    // Planning heuristic only: this measures enumeration, not index merging, UI or persistence.
    public TimeSpan EstimatedMinimum => TimeSpan.FromSeconds(Elapsed.TotalSeconds * 2);
    public TimeSpan EstimatedMaximum => TimeSpan.FromSeconds(Elapsed.TotalSeconds * 6);
}

public sealed class PreScanner
{
    public Task<PreScanResult> CountAsync(string root, ManualResetEventSlim pause, CancellationToken token, IProgress<long>? progress = null) => Task.Run(() => Count(root, pause, token, progress));
    private static PreScanResult Count(string root, ManualResetEventSlim pause, CancellationToken token, IProgress<long>? progress)
    {
        root = Path.GetFullPath(root);
        if (!Directory.Exists(root)) throw new DirectoryNotFoundException("预扫描目录不存在。");
        var watch = Stopwatch.StartNew();
        var excluded = new HashSet<string>(FileScanner.DefaultExclusions, StringComparer.OrdinalIgnoreCase);
        var pending = new Stack<string>(); pending.Push(root);
        long files = 0, projects = 0, directories = 0, skipped = 0, errors = 0;
        var cancelled = false;
        try
        {
            while (pending.TryPop(out var current))
            {
                token.ThrowIfCancellationRequested(); pause.Wait(token);
                try
                {
                    var dir = new DirectoryInfo(current);
                    if ((dir.Attributes & (FileAttributes.ReparsePoint | FileAttributes.Offline)) != 0) { skipped++; continue; }
                    directories++;
                    var project = false;
                    foreach (var entry in dir.EnumerateFileSystemInfos())
                    {
                        token.ThrowIfCancellationRequested(); pause.Wait(token);
                        try
                        {
                            project |= ProjectMarkers.Evidence(entry) != null;
                            if ((entry.Attributes & (FileAttributes.ReparsePoint | FileAttributes.Offline)) != 0) { skipped++; continue; }
                            if ((entry.Attributes & FileAttributes.Directory) != 0)
                            {
                                if (excluded.Contains(entry.Name)) skipped++; else pending.Push(entry.FullName);
                            }
                            else files++;
                            if ((files + projects) % 1000 == 0) progress?.Report(files + projects);
                        }
                        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Security.SecurityException) { errors++; }
                    }
                    if (project) projects++;
                }
                catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Security.SecurityException) { errors++; }
            }
        }
        catch (OperationCanceledException) { cancelled = true; }
        watch.Stop();
        return new(root, files, projects, directories, skipped, errors, watch.Elapsed, cancelled);
    }
}
