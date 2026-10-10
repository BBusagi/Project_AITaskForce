namespace AssetDesk.Core;

public sealed record DiskScope(string Root, string Label, bool Ready, string Limitation);

public static class ScanScopes
{
    // Local mounted fixed/removable disks only. Network and optical media are explicit exclusions.
    public static IReadOnlyList<DiskScope> DiscoverDisks()
    {
        var disks = new List<DiskScope>();
        foreach (var drive in DriveInfo.GetDrives())
        {
            try
            {
                if (drive.DriveType is not (DriveType.Fixed or DriveType.Removable)) continue;
                var ready = drive.IsReady;
                disks.Add(new(drive.Name, ready ? $"{drive.Name}  {drive.VolumeLabel}  ({drive.DriveType})" : $"{drive.Name}  未就绪", ready, ready ? "" : "磁盘未就绪／离线，未扫描"));
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Security.SecurityException)
            { disks.Add(new(drive.Name, $"{drive.Name}  不可访问", false, "磁盘状态不可读取，未扫描")); }
        }
        return disks.OrderBy(d => d.Root, StringComparer.OrdinalIgnoreCase).ToArray();
    }

    public static async Task ScanRootsAsync(IEnumerable<string> roots, Func<string, Task> scan, CancellationToken token, Action<string> skipped)
    {
        foreach (var root in roots.Select(Path.GetFullPath).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (token.IsCancellationRequested) { skipped(root); continue; }
            await scan(root);
        }
    }
}
