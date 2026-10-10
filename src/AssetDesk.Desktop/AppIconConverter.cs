using AssetDesk.Core;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Data;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace AssetDesk.Desktop;

public sealed class AppIconConverter : IValueConverter
{
    private readonly Dictionary<(string, int), ImageSource?> cache = [];
    public object? Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is not Asset asset || asset.IsDemo || string.IsNullOrWhiteSpace(asset.IconPath)) return null;
        var key = (asset.IconPath, asset.IconIndex);
        if (cache.TryGetValue(key, out var cached)) return cached;
        ImageSource? result = null; var large = new IntPtr[1]; var small = new IntPtr[1];
        try
        {
            var path = asset.IconPath;
            // Read local icon resources only; no remote share, placeholder hydration or executable launch.
            if (!Path.IsPathFullyQualified(path) || path.StartsWith(@"\\") || path.Length < 3 || path[1] != ':' || !new[] { ".exe", ".dll", ".ico" }.Contains(Path.GetExtension(path), StringComparer.OrdinalIgnoreCase)) return null;
            var drive = new DriveInfo(Path.GetPathRoot(path)!);
            if (drive.DriveType != DriveType.Fixed || !File.Exists(path) || (File.GetAttributes(path) & (FileAttributes.Offline | FileAttributes.ReparsePoint)) != 0) return null;
            if (ExtractIconEx(path, asset.IconIndex, large, small, 1) > 0 && large[0] != IntPtr.Zero)
            { var bitmap = Imaging.CreateBitmapSourceFromHIcon(large[0], Int32Rect.Empty, BitmapSizeOptions.FromWidthAndHeight(48, 48)); bitmap.Freeze(); result = bitmap; }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException or System.Security.SecurityException or NotSupportedException or ExternalException) { }
        finally { if (large[0] != IntPtr.Zero) DestroyIcon(large[0]); if (small[0] != IntPtr.Zero) DestroyIcon(small[0]); }
        if (cache.Count < 512) cache[key] = result;
        return result;
    }
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => throw new NotSupportedException();
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)] private static extern uint ExtractIconEx(string path, int index, IntPtr[] large, IntPtr[] small, uint count);
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)] private static extern bool DestroyIcon(IntPtr icon);
}
