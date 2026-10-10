using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace AssetDesk.Desktop;

public partial class App : Application
{
    private Mutex? instanceMutex;
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        try
        {
            var smoke = e.Args.Length >= 2 && e.Args[0] == "--smoke";
            if (!smoke)
            {
                instanceMutex = new Mutex(true, "Local\\AssetDesk.Singleton", out var created);
                if (!created) { instanceMutex.Dispose(); instanceMutex = null; MessageBox.Show("AssetDesk 已经运行，请切换到已有工作台。", "AssetDesk"); Shutdown(0); return; }
            }
            var window = new MainWindow(smoke);
            MainWindow = window;
            if (smoke)
            {
                window.PrepareSmoke();
                window.Width = 1380; window.Height = 900;
                var content = (FrameworkElement)window.Content;
                window.Content = null;
                System.Windows.Documents.TextElement.SetFontFamily(content, window.FontFamily);
                System.Windows.Documents.TextElement.SetFontSize(content, window.FontSize);
                System.Windows.Documents.TextElement.SetForeground(content, window.Foreground);
                content.Measure(new Size(1380, 900)); content.Arrange(new Rect(0, 0, 1380, 900)); content.UpdateLayout();
                var image = new RenderTargetBitmap(1380, 900, 96, 96, PixelFormats.Pbgra32);
                image.Render(content);
                var encoder = new PngBitmapEncoder(); encoder.Frames.Add(BitmapFrame.Create(image));
                Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(e.Args[1]))!);
                using (var stream = File.Create(e.Args[1])) encoder.Save(stream);
                window.DisposeForSmoke();
                Shutdown(0);
            }
            else window.Show();
        }
        catch (Exception ex)
        {
            if (e.Args.Contains("--smoke")) { File.WriteAllText(e.Args[1] + ".error.txt", ex.ToString()); Shutdown(1); return; }
            MessageBox.Show($"无法打开工作台索引，数据未覆盖。\n{ex.Message}", "AssetDesk", MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown(1);
        }
    }
    protected override void OnExit(ExitEventArgs e)
    {
        instanceMutex?.ReleaseMutex(); instanceMutex?.Dispose();
        base.OnExit(e);
    }
}
