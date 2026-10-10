// Benchmark reference frozen from Git commit 9a12067 (v0.1.5); not product runtime.
namespace AssetDesk.Core;




public sealed class BaselineFileScanner
{
    public static readonly string[] DefaultExclusions = [".git", "node_modules", ".venv", "venv", "__pycache__", "bin", "obj", ".vs", "$Recycle.Bin", "System Volume Information"];
    private static readonly HashSet<string> Images = new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".heic", ".gif", ".bmp", ".svg" };
    private static readonly HashSet<string> Documents = new(StringComparer.OrdinalIgnoreCase) { ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".md", ".csv" };
    private static readonly HashSet<string> Source = new(StringComparer.OrdinalIgnoreCase) { ".cs", ".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".rs", ".go", ".java", ".cpp", ".h", ".json", ".yaml", ".yml", ".toml" };
    private static readonly HashSet<string> Video = new(StringComparer.OrdinalIgnoreCase) { ".mp4", ".mkv", ".mov", ".avi", ".webm" };
    private static readonly HashSet<string> Audio = new(StringComparer.OrdinalIgnoreCase) { ".mp3", ".wav", ".flac", ".m4a" };
    private static readonly HashSet<string> Archives = new(StringComparer.OrdinalIgnoreCase) { ".zip", ".7z", ".rar", ".tar", ".gz" };

    public Task<ScanResult> ScanAsync(string root, IProgress<ScanProgress>? progress, ManualResetEventSlim pause, CancellationToken token, int? limit = null, IEnumerable<string>? exclusions = null) => Task.Run(() => Scan(root, progress, pause, token, limit, exclusions));

    private ScanResult Scan(string root, IProgress<ScanProgress>? progress, ManualResetEventSlim pause, CancellationToken token, int? limit, IEnumerable<string>? exclusions)
    {
        root = System.IO.Path.GetFullPath(root);
        if (!Directory.Exists(root)) throw new DirectoryNotFoundException("扫描目录不存在。");
        if (limit.HasValue && limit.Value < 1) throw new ArgumentOutOfRangeException(nameof(limit));
        var excludedNames = new HashSet<string>(exclusions ?? DefaultExclusions, StringComparer.OrdinalIgnoreCase);
        var assets = new List<Asset>();
        var batch = new List<Asset>();
        var report = new ScanReport { Root = root };
        var pending = new Stack<string>();
        pending.Push(root);
        string current = root;
        void Issue(string message) { report.IssueCount++; if (report.Issues.Count < 200) report.Issues.Add(message); }
        void Emit() { if (batch.Count == 0) return; progress?.Report(new(batch.ToArray(), assets.Count, current)); batch.Clear(); }
        void Add(Asset asset) { assets.Add(asset); batch.Add(asset); if (batch.Count >= 100) Emit(); }
        try
        {
            while (pending.TryPop(out var next))
            {
                current = next;
                token.ThrowIfCancellationRequested(); pause.Wait(token);
                if (limit.HasValue && assets.Count >= limit.Value) { report.State = "达到数量上限（部分扫描）"; Emit(); report.Discovered = assets.Count; return new(assets, report); }
                try
                {
                    var dir = new DirectoryInfo(current);
                    if ((dir.Attributes & FileAttributes.ReparsePoint) != 0) { if (report.Excluded.Count < 200) report.Excluded.Add($"连接／占位目录：{current}"); continue; }
                    var projectEvidence = new List<string>();
                    if (Directory.Exists(System.IO.Path.Combine(current, ".git")) || File.Exists(System.IO.Path.Combine(current, ".git"))) projectEvidence.Add("Git 标记（未探测分支）");
                    foreach (var marker in new[] { "package.json", "pyproject.toml", "Cargo.toml", "go.mod" })
                        if (File.Exists(System.IO.Path.Combine(current, marker))) projectEvidence.Add(marker);
                    if (projectEvidence.Count > 0) Add(new Asset { Name = dir.Name, Path = current, Kind = "项目", Category = "开发资产", Protection = "依赖保护", Evidence = string.Join("；", projectEvidence) });
                    foreach (var entry in dir.EnumerateFileSystemInfos())
                    {
                        token.ThrowIfCancellationRequested(); pause.Wait(token);
                        if (limit.HasValue && assets.Count >= limit.Value) { report.State = "达到数量上限（部分扫描）"; Emit(); report.Discovered = assets.Count; return new(assets, report); }
                        try
                        {
                            if ((entry.Attributes & (FileAttributes.ReparsePoint | FileAttributes.Offline)) != 0)
                            {
                                if (report.Excluded.Count < 200) report.Excluded.Add($"连接／离线／云占位对象：{entry.FullName}");
                                continue;
                            }
                            if ((entry.Attributes & FileAttributes.Directory) != 0)
                            {
                                if (excludedNames.Contains(entry.Name)) { if (report.Excluded.Count < 200) report.Excluded.Add(entry.FullName); }
                                else pending.Push(entry.FullName);
                                continue;
                            }
                            var file = (FileInfo)entry;
                            var category = Classify(file.Name);
                            var protectedPath = IsProtected(file.FullName);
                            Add(new Asset { Name = file.Name, Path = file.FullName, Size = file.Length, Modified = file.LastWriteTimeUtc, Category = category, Protection = protectedPath ? "系统／应用保护" : category == "源代码" ? "依赖保护" : "待确认", Evidence = $"扩展名规则：{file.Extension}；只读取元数据" });
                        }
                        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Security.SecurityException) { Issue($"{entry.FullName}：{ex.Message}"); }
                    }
                }
                catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Security.SecurityException) { Issue($"{current}：{ex.Message}"); }
            }
            report.State = report.IssueCount == 0 ? "已完成" : "完成（有局部错误）";
        }
        catch (OperationCanceledException) { report.State = "已取消（部分扫描）"; }
        Emit(); report.Discovered = assets.Count;
        return new(assets, report);
    }

    public static string Classify(string name)
    {
        var extension = System.IO.Path.GetExtension(name);
        if (Images.Contains(extension)) return name.Contains("screenshot", StringComparison.OrdinalIgnoreCase) || name.Contains("截图", StringComparison.Ordinal) ? "截图候选" : "图像";
        if (Documents.Contains(extension)) return "文档";
        if (Source.Contains(extension)) return "源代码";
        if (Video.Contains(extension)) return "视频";
        if (Audio.Contains(extension)) return "音频";
        if (Archives.Contains(extension)) return "压缩包";
        if (extension.Equals(".exe", StringComparison.OrdinalIgnoreCase) || extension.Equals(".msi", StringComparison.OrdinalIgnoreCase)) return "程序／安装包候选";
        return "未知";
    }

    public static bool IsProtected(string path)
    {
        var roots = new[] { Environment.GetFolderPath(Environment.SpecialFolder.Windows), Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData) };
        return roots.Where(r => !string.IsNullOrEmpty(r)).Any(r => path.Equals(r, StringComparison.OrdinalIgnoreCase) || path.StartsWith(r.TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase));
    }
}
