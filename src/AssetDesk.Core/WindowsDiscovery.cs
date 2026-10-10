using Microsoft.Win32;
using System.Diagnostics;
using System.Runtime.Versioning;

namespace AssetDesk.Core;

[SupportedOSPlatform("windows")]
public sealed class WindowsDiscovery
{
    public (List<Asset> Assets, ScanReport Report) Discover()
    {
        var assets = new List<Asset>();
        var report = new ScanReport { Root = "应用注册信息与 PATH 环境", State = "已完成" };
        foreach (var hive in new[] { RegistryHive.LocalMachine, RegistryHive.CurrentUser })
        foreach (var view in new[] { RegistryView.Registry64, RegistryView.Registry32 })
        {
            try
            {
                using var baseKey = RegistryKey.OpenBaseKey(hive, view);
                using var uninstall = baseKey.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall");
                if (uninstall == null) continue;
                foreach (var name in uninstall.GetSubKeyNames())
                {
                    try
                    {
                        using var app = uninstall.OpenSubKey(name);
                        var display = app?.GetValue("DisplayName") as string;
                        if (string.IsNullOrWhiteSpace(display)) continue;
                        var location = app?.GetValue("InstallLocation") as string ?? "";
                        // Registry identity is stable even when no installation location is registered.
                        var identity = $"registry:{hive}/{view}/{name}";
                        var systemReason = ApplicationMetadata.SystemReason(app?.GetValue("SystemComponent"), app?.GetValue("ReleaseType") as string, location, Environment.GetFolderPath(Environment.SpecialFolder.Windows));
                        var icon = ApplicationMetadata.ParseIcon(app?.GetValue("DisplayIcon") as string);
                        assets.Add(new Asset { Name = display, Path = identity, Kind = "应用", Category = "应用程序", Protection = "应用保护", IsSystemRelated = systemReason.Length > 0, SystemReason = systemReason, IconPath = icon.Path, IconIndex = icon.Index, Version = app?.GetValue("DisplayVersion") as string ?? "未知", Evidence = $"卸载注册信息 {hive}/{view}；发布者（未验证）：{app?.GetValue("Publisher") ?? "未知"}；安装位置：{location}；系统相关依据：{(systemReason.Length > 0 ? systemReason : "未识别（不代表可删除）")}" });
                    }
                    catch (Exception ex) when (ex is UnauthorizedAccessException or System.Security.SecurityException or IOException) { AddIssue(report, $"注册信息 {name}：{ex.Message}"); }
                }
            }
            catch (Exception ex) when (ex is UnauthorizedAccessException or System.Security.SecurityException or IOException) { AddIssue(report, $"{hive}/{view}：{ex.Message}"); }
        }
        var paths = (Environment.GetEnvironmentVariable("PATH") ?? "").Split(';', StringSplitOptions.RemoveEmptyEntries).Select(p => p.Trim().Trim('"')).Distinct(StringComparer.OrdinalIgnoreCase);
        foreach (var folder in paths)
        foreach (var executable in new[] { "git.exe", "node.exe", "python.exe", "dotnet.exe" })
        {
            try
            {
                var path = System.IO.Path.Combine(folder, executable);
                if (!File.Exists(path)) continue;
                var version = FileVersionInfo.GetVersionInfo(path).ProductVersion;
                assets.Add(new Asset { Name = System.IO.Path.GetFileNameWithoutExtension(executable), Path = System.IO.Path.GetFullPath(path), Kind = "环境", Category = "开发资产", Protection = "依赖保护", Version = string.IsNullOrWhiteSpace(version) ? "未知／需人工探测" : version, Evidence = "PATH 候选；仅文件版本元数据，未执行程序；不代表当前终端有效版本" });
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException or System.Security.SecurityException) { AddIssue(report, $"PATH 候选：{ex.Message}"); }
        }
        report.Excluded.Add("此版未枚举 Store／MSIX 包、便携应用、版本管理器私有环境或 WSL；注册视图可能出现同名记录。");
        report.Discovered = assets.Count;
        if (report.IssueCount > 0) report.State = "完成（有局部错误）";
        return (assets.DistinctBy(a => (a.Kind, a.Path)).ToList(), report);
    }
    private static void AddIssue(ScanReport report, string message) { report.IssueCount++; if (report.Issues.Count < 200) report.Issues.Add(message); }
}
