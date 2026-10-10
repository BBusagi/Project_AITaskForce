namespace AssetDesk.Core;

public static class ApplicationMetadata
{
    public static string SystemReason(object? systemComponent, string? releaseType, string? location, string windowsRoot)
    {
        if (systemComponent is int flag && flag == 1) return "注册表组件／隐藏标记 SystemComponent=1（系统相关候选）";
        if (new[] { "Update", "Hotfix", "Security Update" }.Contains(releaseType, StringComparer.OrdinalIgnoreCase)) return $"卸载注册表 ReleaseType={releaseType}";
        if (!string.IsNullOrWhiteSpace(location) && !string.IsNullOrWhiteSpace(windowsRoot))
        {
            try
            {
                var path = Path.GetFullPath(location.Trim()); var root = Path.GetFullPath(windowsRoot).TrimEnd(Path.DirectorySeparatorChar);
                if (path.Equals(root, StringComparison.OrdinalIgnoreCase) || path.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) return "注册安装位置位于 Windows 系统目录";
            }
            catch (Exception ex) when (ex is ArgumentException or NotSupportedException or PathTooLongException) { }
        }
        return ""; // Publisher and Program Files alone do not imply an OS component.
    }
    public static (string Path, int Index) ParseIcon(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return ("", 0);
        var path = Environment.ExpandEnvironmentVariables(value.Trim()); var index = 0;
        var comma = path.LastIndexOf(',');
        if (comma >= 0 && int.TryParse(path[(comma + 1)..].Trim(), out var parsed)) { index = parsed; path = path[..comma].Trim(); }
        return (path.Trim('"'), index);
    }
}
