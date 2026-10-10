using Microsoft.Win32;
using System.Runtime.Versioning;
using System.Text.RegularExpressions;

namespace AssetDesk.Core;

public sealed record RegisteredApplication(string Identity, string Name, string InstallLocation, string IconPath, string UninstallString, bool NoRemove, bool SystemRelated);
public sealed record AssetLocation(string Path, string Source, bool SelectFile);
public sealed record UninstallPlan(string Executable, string Arguments, string FallbackReason)
{
    public bool CanLaunch => Executable.Length > 0;
}

public static class ApplicationManagement
{
    [SupportedOSPlatform("windows")]
    public static RegisteredApplication ReadRegistration(Asset asset)
    {
        if (asset.IsDemo || asset.Kind != "应用" || !asset.Path.StartsWith("registry:", StringComparison.Ordinal)) throw new InvalidOperationException("对象没有有效的应用注册来源。");
        var parts = asset.Path[9..].Split('/', 3);
        if (parts.Length != 3 || parts[2].Length == 0 || parts[2].Contains('\\') || parts[2].Contains('/') || parts[2].Any(char.IsControl)) throw new InvalidOperationException("应用注册标识无效。");
        var hive = parts[0] switch { "LocalMachine" => RegistryHive.LocalMachine, "CurrentUser" => RegistryHive.CurrentUser, _ => throw new InvalidOperationException("应用注册范围无效。") };
        var view = parts[1] switch { "Registry64" => RegistryView.Registry64, "Registry32" => RegistryView.Registry32, _ => throw new InvalidOperationException("应用注册视图无效。") };
        using var root = RegistryKey.OpenBaseKey(hive, view);
        using var key = root.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\" + parts[2]);
        var name = key?.GetValue("DisplayName") as string;
        if (string.IsNullOrWhiteSpace(name)) throw new InvalidOperationException("应用注册信息已不存在，请刷新应用清单。");
        var location = key!.GetValue("InstallLocation") as string ?? "";
        var icon = ApplicationMetadata.ParseIcon(key.GetValue("DisplayIcon") as string);
        var system = ApplicationMetadata.SystemReason(key.GetValue("SystemComponent"), key.GetValue("ReleaseType") as string, location, Environment.GetFolderPath(Environment.SpecialFolder.Windows));
        return new(asset.Path, name, location, icon.Path, key.GetValue("UninstallString") as string ?? "", key.GetValue("NoRemove") is int flag && flag != 0, system.Length > 0);
    }

    public static string LocalPath(string value)
    {
        var path = Environment.ExpandEnvironmentVariables(value.Trim().Trim('"'));
        if (path.Length < 3 || !char.IsAsciiLetter(path[0]) || path[1] != ':' || path[2] != '\\' || path[2..].Contains(':') || path.Any(char.IsControl) || path.Contains('"')) throw new InvalidOperationException("位置不是有效的本地绝对路径。");
        var full = System.IO.Path.GetFullPath(path);
        var drive = new DriveInfo(System.IO.Path.GetPathRoot(full)!);
        if (drive.DriveType is not (DriveType.Fixed or DriveType.Removable)) throw new InvalidOperationException("位置不在可用的本地固定／可移动磁盘上。");
        return full;
    }

    public static AssetLocation ResolveLocation(Asset asset, RegisteredApplication? registration = null)
    {
        if (asset.IsDemo) throw new InvalidOperationException("旧示例对象没有本地位置。");
        if (asset.Kind != "应用")
        {
            var path = LocalPath(asset.Path);
            if (Directory.Exists(path)) return new(path, "资产目录", false);
            if (File.Exists(path)) return new(path, "原始文件", true);
            throw new FileNotFoundException("原始对象已不存在或离线，请重新扫描。");
        }
        if (registration == null) throw new InvalidOperationException("需要重新读取应用注册信息。");
        if (!string.IsNullOrWhiteSpace(registration.InstallLocation))
        {
            try { var path = LocalPath(registration.InstallLocation); if (Directory.Exists(path)) return new(path, "注册安装位置", false); }
            catch (Exception ex) when (ex is InvalidOperationException or ArgumentException or IOException) { }
        }
        var plan = BuildUninstallPlan(registration);
        foreach (var candidate in new[] { (registration.IconPath, "注册图标程序所在目录（候选）"), (plan.Executable, "注册卸载程序所在目录（候选）") })
        {
            try
            {
                var path = LocalPath(candidate.Item1);
                if (!path.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) || !File.Exists(path) || IsWindowsPath(path)) continue;
                var directory = System.IO.Path.GetDirectoryName(path)!;
                if (Directory.Exists(directory)) return new(directory, candidate.Item2, false);
            }
            catch (Exception ex) when (ex is InvalidOperationException or ArgumentException or IOException) { }
        }
        throw new DirectoryNotFoundException("应用未登记可访问的安装位置，或目录已不存在。可打开 Windows 已安装应用查看管理选项。");
    }

    private static bool IsWindowsPath(string path)
    {
        var root = Environment.GetFolderPath(Environment.SpecialFolder.Windows).TrimEnd('\\');
        return root.Length > 0 && (path.Equals(root, StringComparison.OrdinalIgnoreCase) || path.StartsWith(root + "\\", StringComparison.OrdinalIgnoreCase));
    }

    public static UninstallPlan BuildUninstallPlan(RegisteredApplication app)
    {
        UninstallPlan Fallback(string reason) => new("", "", reason);
        if (app.NoRemove || app.SystemRelated) return Fallback("注册信息标记为不可移除或系统相关，请使用 Windows 管理界面。");
        var command = Environment.ExpandEnvironmentVariables(app.UninstallString.Trim());
        if (command.Length == 0 || command.Length > 32767 || command.Any(char.IsControl)) return Fallback("没有可用的注册卸载命令。");
        // Do not guess an executable from an ambiguous unquoted path with spaces.
        var match = Regex.Match(command, "^(?:\"(?<exe>[^\"]+\\.exe)\"|(?<exe>[^\\s\"]+\\.exe))(?<args>\\s.*)?$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        if (!match.Success) return Fallback("卸载命令格式无法直接解析。");
        var executable = match.Groups["exe"].Value;
        var arguments = match.Groups["args"].Value.Trim();
        var msi = Regex.Match(arguments, "^/[ix]\\s*(?<code>\\{[0-9a-f-]{36}\\})$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        var systemMsi = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "msiexec.exe");
        if (executable.Equals("msiexec.exe", StringComparison.OrdinalIgnoreCase) || executable.Equals(systemMsi, StringComparison.OrdinalIgnoreCase))
        {
            if (!msi.Success || !Guid.TryParseExact(msi.Groups["code"].Value, "B", out var code)) return Fallback("复杂的 Windows Installer 命令请在 Windows 管理界面卸载。");
            return File.Exists(systemMsi) ? new(systemMsi, "/x " + code.ToString("B") + " /norestart", "") : Fallback("Windows Installer 不可用。");
        }
        try { executable = LocalPath(executable); }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException or IOException) { return Fallback("卸载程序不是可解析的本地绝对路径。"); }
        if (IsWindowsPath(executable) || new[] { "cmd.exe", "powershell.exe", "pwsh.exe", "rundll32.exe", "wscript.exe", "cscript.exe", "mshta.exe", "regsvr32.exe", "msiexec.exe" }.Contains(System.IO.Path.GetFileName(executable), StringComparer.OrdinalIgnoreCase)) return Fallback("该卸载命令需要系统宿主或脚本，请使用 Windows 管理界面。");
        if (Regex.IsMatch(arguments, "(?:^|\\s)[/-](?:s|silent|verysilent|quiet|passive|qn)(?:\\s|$)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)) return Fallback("注册命令使用静默模式，请使用 Windows 管理界面。");
        if (!File.Exists(executable)) return Fallback("注册卸载程序已不存在或离线。");
        return new(executable, arguments, "");
    }
}
