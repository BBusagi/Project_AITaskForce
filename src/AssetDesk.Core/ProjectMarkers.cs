namespace AssetDesk.Core;

internal static class ProjectMarkers
{
    private static readonly HashSet<string> Manifests = new(StringComparer.OrdinalIgnoreCase) { "package.json", "pyproject.toml", "Cargo.toml", "go.mod" };
    // Inspect names already returned by directory enumeration; never open manifests.
    public static string? Evidence(FileSystemInfo entry)
    {
        if (entry.Name.Equals(".git", StringComparison.OrdinalIgnoreCase)) return "Git 标记（未探测分支）";
        return Manifests.Contains(entry.Name) && (entry.Attributes & FileAttributes.Directory) == 0 ? entry.Name : null;
    }
}
