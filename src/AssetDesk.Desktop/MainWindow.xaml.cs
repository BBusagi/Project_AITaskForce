using AssetDesk.Core;
using Microsoft.Win32;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Windows;
using System.Windows.Controls;

namespace AssetDesk.Desktop;

public partial class MainWindow : Window
{
    private static readonly bool AiFrozen = true;
    private Workspace workspace;
    private readonly WorkspaceStore? store;
    private readonly HttpClient http = new(new SocketsHttpHandler { UseProxy = false, AllowAutoRedirect = false }) { Timeout = TimeSpan.FromMinutes(3) };
    private readonly ManualResetEventSlim pause = new(true);
    private readonly string storagePath;
    private CancellationTokenSource? scanCancellation;
    private CancellationTokenSource? aiCancellation;
    private Task? scanOperation, aiOperation, saveOperation, managementOperation;
    private bool scanning, analyzing, saving, managing, closing, closeReady, ready;
    private bool Busy => scanning || analyzing || saving || managing || closing;
    private RegisteredApplication? detailRegistration;
    private AssetLocation? detailLocation;
    private int detailRevision;
    private AiContext? context;
    private List<Asset> filteredAssets = [];
    private int page;
    private string preScanText = "";
    private bool updatingSelection;
    private List<Asset> selectedAssets = [];

    public MainWindow(bool smoke = false)
    {
        InitializeComponent();
        storagePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AssetDesk", "workspace.db");
        if (!smoke) store = new WorkspaceStore(storagePath);
        workspace = store?.Load() ?? new Workspace();
        ProviderCombo.ItemsSource = AiProviders.All;
        ProviderCombo.SelectedValue = workspace.ProviderId;
        LoadProviderFields(workspace.ProviderId);
        AppViewCombo.SelectedIndex = workspace.AppIconView ? 1 : 0;
        ShowSystemAppsBox.IsChecked = workspace.ShowSystemApps;
        if (!smoke) RefreshDisks();
        StorageText.Text = $"索引保存在：\n{storagePath}\n\nSQLite 本地保存资产、用户分类、AI 审核结果和扫描报告；未变化记录不会重复写入。无默认遥测。";
        ready = true;
        Navigation.SelectedIndex = 0;
        Refresh();
    }

    private void Navigation_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (!ready) return;
        ShowPage(Navigation.SelectedIndex switch { 4 => 6, 5 => 4, 6 => 5, var index => index });
    }
    private void GoApps_Click(object sender, RoutedEventArgs e) => Navigation.SelectedIndex = 3;
    private void GoPersonal_Click(object sender, RoutedEventArgs e) => Navigation.SelectedIndex = 5;
    private void GoHistory_Click(object sender, RoutedEventArgs e) => Navigation.SelectedIndex = 2;
    private void GoFiles_Click(object sender, RoutedEventArgs e) { Navigation.SelectedIndex = 4; }
    private void ShowPage(int selectedPage)
    {
        if (selectedPage < 0) return;
        page = selectedPage;
        OverviewPanel.Visibility = page == 0 ? Visibility.Visible : Visibility.Collapsed;
        AiPanel.Visibility = page == 1 ? Visibility.Visible : Visibility.Collapsed;
        AssetsPanel.Visibility = page is 6 or 3 or 4 ? Visibility.Visible : Visibility.Collapsed;
        HistoryPanel.Visibility = page == 2 ? Visibility.Visible : Visibility.Collapsed;
        SettingsPanel.Visibility = page == 5 ? Visibility.Visible : Visibility.Collapsed;
        var titles = new[] { "总览", "AI 分析（AI 整理助手）", "扫描与记录", "应用清单", "个人化面板", "设置", "文件资产" };
        var subtitles = new[] { "已索引的应用、文件、项目和环境。", "暂时冻结 · 保留结构与 UI，暂停交互、模型请求及审核，等待功能重新设计。", "扫描范围、排除项和失败原因保持可见；记录可选择与复制。", "当前用户与机器卸载注册信息；覆盖限制可查看。", "当前显示项目与开发环境及其发现来源。", "连接配置、缓存和本地索引。", "跨目录虚拟分类，原始文件保留在原位置。" };
        PageTitle.Text = titles[page]; PageSubtitle.Text = subtitles[page];
        RefreshAssets();
    }
    private void Search_TextChanged(object sender, TextChangedEventArgs e)
    {
        if (!ready) return;
        InvalidateContext(); RefreshAssets();
    }
    private bool Matches(Asset asset)
    {
        var query = SearchBox.Text.Trim();
        return query.Length == 0 || $"{asset.Name} {asset.Path} {asset.Category} {asset.TagText} {asset.Kind}".Contains(query, StringComparison.OrdinalIgnoreCase);
    }
    private void RefreshAssets()
    {
        filteredAssets = workspace.Assets.Where(Matches).Where(a => page switch { 6 => a.Kind == "文件", 3 => a.Kind == "应用" && (workspace.ShowSystemApps || !a.IsSystemRelated), 4 => a.Kind is "项目" or "环境", _ => true }).ToList();
        // Preserve selections across updates; AI page keeps the source selection from the asset view.
        AppViewControls.Visibility = page == 3 ? Visibility.Visible : Visibility.Collapsed;
        AppSystemColumn.Visibility = page == 3 ? Visibility.Visible : Visibility.Collapsed;
        var icons = page == 3 && workspace.AppIconView;
        AssetGrid.Visibility = icons ? Visibility.Collapsed : Visibility.Visible;
        AppIconList.Visibility = icons ? Visibility.Visible : Visibility.Collapsed;
        if (page is 6 or 3 or 4)
        {
            var ids = selectedAssets.Select(a => a.Id).ToHashSet();
            selectedAssets = filteredAssets.Where(a => ids.Contains(a.Id)).ToList();
            updatingSelection = true;
            try
            {
                AssetGrid.ItemsSource = filteredAssets; AppIconList.ItemsSource = icons ? filteredAssets : null;
                foreach (var asset in selectedAssets) { AssetGrid.SelectedItems.Add(asset); if (icons) AppIconList.SelectedItems.Add(asset); }
            }
            finally { updatingSelection = false; }
            UpdateDetail();
        }
        var hidden = page == 3 ? workspace.Assets.Count(a => a.Kind == "应用" && a.IsSystemRelated && Matches(a) && !workspace.ShowSystemApps) : 0;
        ListHint.Text = $"{filteredAssets.Count:N0} 个匹配对象" + (hidden > 0 ? $" · 已隐藏 {hidden} 个系统相关应用" : "") + " · Ctrl / Shift 多选。历史记录尚未核实是否仍存在。";
    }
    private async void AppView_Changed(object sender, RoutedEventArgs e)
    {
        if (!ready || Busy) return;
        workspace.AppIconView = AppViewCombo.SelectedIndex == 1;
        workspace.ShowSystemApps = ShowSystemAppsBox.IsChecked == true;
        InvalidateContext(); RefreshAssets();
        try { await PersistAsync(); } catch (Exception ex) { ShowError(ex); }
    }
    private void Refresh()
    {
        AssetCount.Text = workspace.Assets.Count.ToString("N0");
        SizeCount.Text = Asset.FormatSize(workspace.Assets.Where(a => a.Kind == "文件").Sum(a => a.Size));
        ProjectCount.Text = $"{workspace.Assets.Count(a => a.Kind == "项目")} / {workspace.Assets.Count(a => a.Kind == "环境")}";
        AppCount.Text = workspace.Assets.Count(a => a.Kind == "应用").ToString("N0");
        var lastScan = workspace.Reports.LastOrDefault();
        OverviewIndexHint.Text = $"类别未知：{workspace.Assets.Count(a => a.Category == "未知"):N0}\n扫描快照：{workspace.ScanCache.Count:N0} 个\n" + (lastScan == null ? "尚无扫描记录。" : $"最近扫描：{lastScan.Time.LocalDateTime:yyyy-MM-dd HH:mm}\n状态：{lastScan.State}") + "\n\n缓存不会自动检查磁盘变化；需要更新时使用强制刷新。";
        CategoryList.ItemsSource = workspace.Assets.GroupBy(a => a.Category).OrderByDescending(g => g.Count()).Take(8).Select(g => $"{g.Key}   ·   {g.Count():N0} 个").ToArray();
        SuggestionGrid.ItemsSource = workspace.Suggestions.AsEnumerable().Reverse().ToList();
        var active = workspace.ActiveConfig();
        AiRoute.Text = $"发送目标：{AiProviders.Get(active.ProviderId).Name}\n{active.Endpoint}\n{active.Model}";
        var builder = new StringBuilder();
        foreach (var report in workspace.Reports.AsEnumerable().Reverse())
        {
            builder.AppendLine($"{report.Time.LocalDateTime:yyyy-MM-dd HH:mm}   ·   {report.State}\n{report.Root}\n发现 {report.Discovered:N0} 项；局部错误 {report.IssueCount} 项");
            if (report.DurationSeconds is { } seconds) builder.AppendLine($"扫描方式：{report.Scanner}；本次范围枚举耗时 {seconds:F2} 秒（含暂停，不含合并／写库；缓存时为历史耗时）");
            if (report.Excluded.Count > 0) builder.AppendLine("排除／覆盖限制（最多显示 200 条）：\n" + string.Join("\n", report.Excluded));
            if (report.Issues.Count > 0) builder.AppendLine("错误（最多显示 200 条）：\n" + string.Join("\n", report.Issues));
            builder.AppendLine("\n─────────────────────────\n");
        }
        HistoryText.Text = builder.Length == 0 ? "尚无扫描记录。" : builder.ToString();
        if (workspace.ScanCache.Count > 0)
        {
            HistoryText.Text += "\n已保存的扫描缓存（历史快照，未复查变化）：\n";
            foreach (var snapshot in workspace.ScanCache.AsEnumerable().Reverse())
                HistoryText.Text += $"\n{snapshot.Root} · {snapshot.SavedAt.LocalDateTime:yyyy-MM-dd HH:mm} · {snapshot.Report.State} · {snapshot.Report.Discovered:N0} 项；错误 {snapshot.Report.IssueCount} 项\n" + string.Join("\n", snapshot.Report.Issues.Take(10)) + "\n" + string.Join("\n", snapshot.Report.Excluded.Take(10)) + "\n";
        }
        if (preScanText.Length > 0) HistoryText.Text = preScanText + "\n─────────────────────────\n" + HistoryText.Text;
        RefreshAssets(); UpdateActions();
        CacheSummary.Text = $"扫描快照 {workspace.ScanCache.Count} 个 · 分析结果 {workspace.AnalysisCache.Count} 批（最多保留 200 批）\n扫描缓存不检测磁盘的新变化；查看快照时间，需复查时勾选强制刷新。\n分析缓存匹配范围、目标、模型、提示词及已知元数据；命中不调用模型。";
    }
    private void UpdateActions()
    {
        ScanButton.IsEnabled = DiscoverButton.IsEnabled = ClearButton.IsEnabled = SaveTagButton.IsEnabled = SaveSettingsButton.IsEnabled = ConnectButton.IsEnabled = !Busy;
        AcceptButton.IsEnabled = RejectButton.IsEnabled = !AiFrozen && !Busy;
        PauseButton.IsEnabled = scanCancellation != null && !closing;
        CancelButton.IsEnabled = (scanCancellation != null || analyzing) && !closing;
        AnalyzeButton.IsEnabled = !AiFrozen && !Busy && context != null;
        ProviderCombo.IsEnabled = ApiKeyBox.IsEnabled = EndpointBox.IsEnabled = ModelBox.IsEnabled = RemoveKeyBox.IsEnabled = !Busy;
        ForceScanBox.IsEnabled = !Busy; ForceAnalysisBox.IsEnabled = !AiFrozen && !Busy;
        ClearCacheButton.IsEnabled = !Busy;
        ScanModeCombo.IsEnabled = DiskCombo.IsEnabled = PreScanButton.IsEnabled = AppViewCombo.IsEnabled = ShowSystemAppsBox.IsEnabled = !Busy;
        var single = selectedAssets.Count == 1;
        SaveTagButton.IsEnabled = !Busy && selectedAssets.Count > 0;
        LocateButton.IsEnabled = CopyLocationButton.IsEnabled = !Busy && single && detailLocation != null;
        UninstallButton.IsEnabled = !Busy && single && detailRegistration != null;
        WindowsAppsButton.IsEnabled = !Busy && single && selectedAssets[0].Kind == "应用";
    }
    private void InvalidateContext()
    {
        context = null;
        if (!ready) return;
        ContextPreview.Text = ""; ContextHint.Text = AiFrozen ? "AI 分析已冻结，暂停生成预览。" : "范围或信息已改变，请重新生成预览。";
        AnalysisCacheHint.Text = "先生成预览，再检查缓存。";
        UpdateActions();
    }
    private async Task PersistAsync()
    {
        if (store == null) return;
        saving = true; UpdateActions();
        try { saveOperation = Task.Run(() => store.Save(workspace)); await saveOperation; }
        finally { saving = false; UpdateActions(); }
    }
    private void ShowError(Exception ex)
    {
        StatusText.Text = $"操作未完成：{ex.Message}";
        if (!closing) MessageBox.Show(this, ex.Message, "操作未完成", MessageBoxButton.OK, MessageBoxImage.Information);
    }
    private List<DiskScope>? SelectScanScopes()
    {
        List<DiskScope> scopes;
        if (ScanModeCombo.SelectedIndex == 2)
        {
            var dialog = new OpenFolderDialog { Title = "选择只读扫描目录", Multiselect = false };
            if (dialog.ShowDialog(this) != true) return null;
            scopes = [new(dialog.FolderName, dialog.FolderName, true, "")];
        }
        else if (ScanModeCombo.SelectedIndex == 1)
        {
            if (DiskCombo.SelectedItem is not DiskScope disk) { ShowError(new ArgumentException("请先选择磁盘。")); return null; }
            scopes = [disk];
        }
        else
        {
            try { scopes = ScanScopes.DiscoverDisks().ToList(); }
            catch (Exception ex) { ShowError(ex); return null; }
        }
        if (scopes.Count == 0) { ShowError(new InvalidOperationException("未发现本地固定或可移动磁盘。")); return null; }
        return scopes;
    }
    private async void Scan_Click(object sender, RoutedEventArgs e)
    {
        if (Busy) return;
        var scopes = SelectScanScopes(); if (scopes == null) return;
        scanOperation = RunScanAsync(scopes, ScanModeCombo.SelectedIndex == 0, ForceScanBox.IsChecked == true);
        await scanOperation;
    }
    private void ScanMode_Changed(object sender, SelectionChangedEventArgs e)
    {
        if (DiskCombo == null) return;
        DiskCombo.Visibility = ScanModeCombo.SelectedIndex == 1 ? Visibility.Visible : Visibility.Collapsed;
        if (SearchBox != null) { SearchBox.Visibility = SearchLabel.Visibility = ScanModeCombo.SelectedIndex == 2 ? Visibility.Visible : Visibility.Collapsed; if (ScanModeCombo.SelectedIndex != 2) SearchBox.Text = ""; }
    }
    private void Disk_DropDownOpened(object sender, EventArgs e) { if (!Busy) RefreshDisks(); }
    private async void PreScan_Click(object sender, RoutedEventArgs e)
    {
        if (Busy) return;
        var scopes = SelectScanScopes(); if (scopes == null) return;
        scanOperation = RunPreScanAsync(scopes); await scanOperation;
    }
    private async Task RunPreScanAsync(List<DiskScope> scopes)
    {
        scanning = true; pause.Set(); scanCancellation = new CancellationTokenSource(); UpdateActions();
        var builder = new StringBuilder("预扫描 · 不写入资产索引，不读取正文。数量仅代表当前可枚举的文件与项目；正式扫描时可能变化。\n");
        long total = 0; double minimum = 0, maximum = 0; var incomplete = false;
        try
        {
            foreach (var scope in scopes)
            {
                if (scanCancellation.IsCancellationRequested) { incomplete = true; builder.AppendLine($"{scope.Root}：未预扫描（取消）"); continue; }
                if (!scope.Ready) { incomplete = true; builder.AppendLine($"{scope.Root}：{scope.Limitation}"); continue; }
                try
                {
                    StatusText.Text = $"预扫描中 · {scope.Root} · 数量未知，可暂停／取消";
                    var progress = new Progress<long>(count => { if (scanning) StatusText.Text = $"预扫描中 · {scope.Root} · 已计数 {count:N0} 项，可暂停／取消"; });
                    var result = await new PreScanner().CountAsync(scope.Root, pause, scanCancellation.Token, progress);
                    total += result.Count; minimum += result.EstimatedMinimum.TotalSeconds; maximum += result.EstimatedMaximum.TotalSeconds;
                    incomplete |= result.Cancelled || result.Errors > 0;
                    builder.AppendLine($"{scope.Root}：文件 {result.Files:N0}／项目 {result.Projects:N0}／目录 {result.Directories:N0}；跳过 {result.Skipped:N0}，错误 {result.Errors:N0}；枚举耗时 {result.Elapsed.TotalSeconds:F1} 秒{(result.Cancelled ? "（已取消，部分计数）" : "")}");
                }
                catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Security.SecurityException)
                { incomplete = true; builder.AppendLine($"{scope.Root}：{ex.Message}"); }
            }
            builder.AppendLine($"合计 {total:N0} 个文件／项目{(incomplete ? "（部分计数，不代表整个范围）" : "（当前可枚举范围，不含排除对象）")}");
            builder.AppendLine(incomplete ? "范围不完整，无法给出整个范围的耗时估计。" : $"后续重新枚举扫描的粗估时间：{minimum:F0}–{maximum:F0} 秒（按预扫描枚举耗时的 2–6 倍启发式估计，未校准；不保证覆盖合并、界面与数据库开销）。");
            builder.AppendLine("预扫描本身需要遍历目录，会额外耗时；全电脑的应用／PATH 发现不计入本次数量与估时。正式检索若命中缓存，会跳过枚举，以上估时不适用于缓存复用。指定目录正式扫描时请选同一目录。");
            preScanText = builder.ToString(); Refresh();
            ShowPage(2); Navigation.SelectedIndex = 2;
            StatusText.Text = $"预扫描已结束 · {total:N0} 项{(incomplete ? "，部分范围" : "")} · 详细估算见扫描与记录";
        }
        catch (Exception ex) { ShowError(ex); }
        finally { scanning = false; pause.Set(); PauseButton.Content = "暂停"; scanCancellation.Dispose(); scanCancellation = null; UpdateActions(); }
    }
    private void RefreshDisks()
    {
        try { var root = (DiskCombo.SelectedItem as DiskScope)?.Root; DiskCombo.ItemsSource = ScanScopes.DiscoverDisks(); DiskCombo.SelectedItem = DiskCombo.Items.Cast<DiskScope>().FirstOrDefault(d => d.Root == root); if (DiskCombo.SelectedIndex < 0 && DiskCombo.Items.Count > 0) DiskCombo.SelectedIndex = 0; }
        catch (Exception ex) { ShowError(ex); }
    }
    private async Task RunScanAsync(List<DiskScope> scopes, bool wholeComputer, bool force)
    {
        scanning = true; pause.Set(); scanCancellation = new CancellationTokenSource(); UpdateActions(); InvalidateContext();
        StatusText.Text = $"正在检索 {scopes.Count} 个范围 · 总数未知…";
        var progress = new Progress<ScanProgress>(p =>
        {
            if (!scanning || saving) return;
            StatusText.Text = $"扫描中 · 已发现 {p.Count:N0} 项 · {p.CurrentPath}";
        });
        try
        {
            var reports = new List<ScanReport>(); var cacheHits = 0; var cacheTimes = new List<DateTimeOffset>();
            if (wholeComputer && !scanCancellation.IsCancellationRequested)
            {
                var discovery = await ResultCache.ScanOrReuseAsync(workspace, ResultCache.ScanKey(ResultCache.DiscoveryRoot, ResultCache.DiscoveryPolicy, ResultCache.DiscoveryIdentity), ResultCache.DiscoveryRoot, ResultCache.DiscoveryPolicy, force, async () => { var result = await Task.Run(() => new WindowsDiscovery().Discover()); return new ScanResult(result.Assets, result.Report); });
                reports.Add(discovery.Report);
                if (discovery.FromCache) { cacheHits++; cacheTimes.Add(discovery.SavedAt); StatusText.Text = $"应用／环境缓存 · {discovery.SavedAt.LocalDateTime:yyyy-MM-dd HH:mm} · 旧快照，未复查变化"; }
                else workspace.Reports.Add(discovery.Report);
                await PersistAsync();
            }
            await ScanScopes.ScanRootsAsync(scopes.Select(d => d.Root), async root =>
            {
                var scope = scopes.First(d => Path.GetFullPath(d.Root).Equals(root, StringComparison.OrdinalIgnoreCase));
                ScanReport report; var fromCache = false;
                if (!scope.Ready) report = new() { Root = root, State = "未扫描（磁盘不可用）", IssueCount = 1, Issues = [scope.Limitation] };
                else
                {
                    try
                    {
                        var identity = ResultCache.LocalIdentity(root);
                        var key = ResultCache.ScanKey(root, ResultCache.FileScanPolicy, identity);
                        var result = await ResultCache.ScanOrReuseAsync(workspace, key, root, ResultCache.FileScanPolicy, force || identity.Length == 0, () => new FileScanner().ScanAsync(root, progress, pause, scanCancellation.Token));
                        report = result.Report; fromCache = result.FromCache;
                        if (fromCache) { cacheHits++; cacheTimes.Add(result.SavedAt); StatusText.Text = $"复用扫描快照 · {root} · {result.SavedAt.LocalDateTime:yyyy-MM-dd HH:mm} · {report.State} · 未复查磁盘变化"; }
                    }
                    catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Security.SecurityException)
                    { report = new() { Root = root, State = "扫描失败", IssueCount = 1, Issues = [ex.Message] }; }
                }
                if (wholeComputer) report.Excluded.Add("全电脑检索范围：本机已挂载的固定／可移动磁盘；网络、光盘、未挂载卷不在本次范围。不设固定数量上限。");
                reports.Add(report); if (!fromCache) workspace.Reports.Add(report); await PersistAsync();
            }, scanCancellation.Token, root => { var report = new ScanReport { Root = root, State = "未扫描（任务已取消）" }; reports.Add(report); workspace.Reports.Add(report); });
            await PersistAsync();
            var timeHint = cacheTimes.Count > 0 ? $" · 最早快照 {cacheTimes.Min().LocalDateTime:yyyy-MM-dd HH:mm}（可能过期，强制刷新可复查）" : "";
            StatusText.Text = $"检索{(scanCancellation.IsCancellationRequested ? "已取消" : "已结束")} · 复用 {cacheHits}/{reports.Count} 个范围，快照发现 {reports.Sum(r => r.Discovered):N0} 项；{reports.Count(r => r.State != "已完成")} 个范围有覆盖限制" + timeHint;
        }
        catch (Exception ex) { ShowError(ex); }
        finally { scanning = false; pause.Set(); PauseButton.Content = "暂停"; scanCancellation.Dispose(); scanCancellation = null; Refresh(); }
    }
    private void Pause_Click(object sender, RoutedEventArgs e)
    {
        if (!scanning) return;
        if (pause.IsSet) { pause.Reset(); PauseButton.Content = "继续"; StatusText.Text = "已请求暂停 · 当前批次完成后暂停。"; }
        else { pause.Set(); PauseButton.Content = "暂停"; StatusText.Text = "扫描已继续。"; }
    }
    private void Cancel_Click(object sender, RoutedEventArgs e) { scanCancellation?.Cancel(); aiCancellation?.Cancel(); pause.Set(); PauseButton.Content = "暂停"; StatusText.Text = "已请求取消…"; }
    private async void Discover_Click(object sender, RoutedEventArgs e)
    {
        if (Busy) return;
        scanOperation = RunDiscoveryAsync(); await scanOperation;
    }
    private async Task RunDiscoveryAsync()
    {
        scanning = true; UpdateActions(); InvalidateContext(); StatusText.Text = "正在读取应用注册信息与 PATH 候选…";
        try
        {
            var result = await Task.Run(() => new WindowsDiscovery().Discover());
            ReviewService.Merge(workspace, result.Assets); workspace.Reports.Add(result.Report);
            ResultCache.SaveScan(workspace, ResultCache.ScanKey(ResultCache.DiscoveryRoot, ResultCache.DiscoveryPolicy, ResultCache.DiscoveryIdentity), ResultCache.DiscoveryRoot, ResultCache.DiscoveryPolicy, result.Report, result.Assets);
            await PersistAsync(); StatusText.Text = $"发现 {result.Assets.Count} 个应用／环境记录。未执行程序；Store 包等范围尚未覆盖。";
        }
        catch (Exception ex) { ShowError(ex); }
        finally { scanning = false; Refresh(); }
    }
    private void GoAi_Click(object sender, RoutedEventArgs e) { Navigation.SelectedIndex = 1; }
    private void Goal_Changed(object sender, TextChangedEventArgs e) { if (!AiFrozen && ready) InvalidateContext(); }
    private void Preview_Click(object sender, RoutedEventArgs e)
    {
        if (AiFrozen || Busy) return;
        try
        {
            var selected = selectedAssets.Where(a => workspace.Assets.Contains(a) && Matches(a)).ToArray();
            context = AiAdvisor.CreateContext(GoalBox.Text, selected.Length > 0 ? selected : workspace.Assets.Where(Matches).Take(40));
            ContextPreview.Text = AiAdvisor.Preview(context);
            ContextHint.Text = $"本次 {context.Assets.Length} 个资产 · {(selected.Length > 0 ? "来自列表选择" : "搜索匹配的前 40 项")}";
            UpdateAnalysisCacheHint();
            UpdateActions();
        }
        catch (Exception ex) { InvalidateContext(); ShowError(ex); }
    }
    private async void Analyze_Click(object sender, RoutedEventArgs e)
    {
        if (AiFrozen || Busy || context == null) return;
        aiOperation = RunAiAsync(context); await aiOperation;
    }
    private async Task RunAiAsync(AiContext input)
    {
        if (AiFrozen) return;
        analyzing = true; aiCancellation = new CancellationTokenSource(); UpdateActions();
        var config = workspace.ActiveConfig();
        StatusText.Text = $"{AiProviders.Get(config.ProviderId).Name} 正在分析 {input.Assets.Length} 个资产 · {config.Model}（可取消）";
        try
        {
            var result = await ResultCache.AnalyzeOrReuseAsync(workspace, config, input, ForceAnalysisBox.IsChecked == true, () => new AiAdvisor(http).AnalyzeAsync(config, SecretProtector.Unprotect(config.EncryptedApiKey), input, aiCancellation.Token));
            AiSummary.Text = result.FromCache ? $"缓存结果 · {result.SavedAt.LocalDateTime:yyyy-MM-dd HH:mm}\n{result.Response.Summary}" : result.Response.Summary;
            await PersistAsync();
            StatusText.Text = result.FromCache ? "命中分析缓存 · 本次未调用模型，不消耗 API token；已有审核状态保留，未重复添加建议。" : $"AI 生成 {result.Response.Suggestions.Count} 条建议并保存缓存。未自动应用。";
        }
        catch (OperationCanceledException) { StatusText.Text = "AI 已取消或超时；未采用本次建议。"; }
        catch (HttpRequestException ex) { ShowError(new InvalidOperationException(ex.StatusCode == null ? "连接失败，请检查网络、服务地址和模型设置。" : ex.Message)); }
        catch (Exception ex) { ShowError(ex); }
        finally { analyzing = false; aiCancellation.Dispose(); aiCancellation = null; Refresh(); }
    }
    private void AnalysisCacheMode_Changed(object sender, RoutedEventArgs e) { if (!AiFrozen && ready) UpdateAnalysisCacheHint(); }
    private void UpdateAnalysisCacheHint()
    {
        if (context == null) { AnalysisCacheHint.Text = "先生成预览，再检查缓存。"; return; }
        var cached = ResultCache.FindAnalysis(workspace, ResultCache.AnalysisKey(workspace, workspace.ActiveConfig(), context), context);
        AnalysisCacheHint.Text = ForceAnalysisBox.IsChecked == true ? "已选择重新分析：将调用模型，可能产生费用。" : cached != null ? $"分析缓存命中 · {cached.SavedAt.LocalDateTime:yyyy-MM-dd HH:mm} · 不发送模型请求" : "无匹配缓存：确认后调用所选模型，并缓存已验证的结果。";
    }
    private void SuggestionGrid_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (!AiFrozen && SuggestionGrid.SelectedItem is Suggestion suggestion) SuggestionReason.Text = $"模型：{suggestion.Model}\n理由：{suggestion.Reason}";
    }
    private async void Accept_Click(object sender, RoutedEventArgs e) => await ReviewSelectedAsync(true);
    private async void Reject_Click(object sender, RoutedEventArgs e) => await ReviewSelectedAsync(false);
    private async Task ReviewSelectedAsync(bool accept)
    {
        if (AiFrozen || Busy) return;
        var selected = SuggestionGrid.SelectedItems.Cast<Suggestion>().Where(s => s.Status == "待审核").ToArray();
        if (selected.Length == 0) { StatusText.Text = "请先选择待审核建议。"; return; }
        try
        {
            foreach (var suggestion in selected)
            {
                if (accept) ReviewService.Accept(workspace, suggestion); else ReviewService.Reject(suggestion);
            }
            InvalidateContext(); await PersistAsync(); Refresh();
            StatusText.Text = $"{selected.Length} 条建议已{(accept ? "接受（只更新索引分类）" : "拒绝")}。";
        }
        catch (Exception ex) { ShowError(ex); }
    }
    private void AssetGrid_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (!ready || updatingSelection || page is not (6 or 3 or 4)) return;
        selectedAssets = (sender == AppIconList ? AppIconList.SelectedItems : AssetGrid.SelectedItems).Cast<Asset>().ToList();
        InvalidateContext();
        UpdateDetail();
    }
    private async void UpdateDetail()
    {
        var revision = ++detailRevision;
        detailRegistration = null; detailLocation = null;
        var isApp = page == 3 || selectedAssets.LastOrDefault()?.Kind == "应用";
        UninstallButton.Visibility = WindowsAppsButton.Visibility = isApp ? Visibility.Visible : Visibility.Collapsed;
        LocateButton.Content = isApp ? "打开安装位置" : "定位原始文件";
        ManagementHint.Text = ""; UpdateActions();
        if (selectedAssets.LastOrDefault() is not Asset asset) { DetailName.Text = "选择一个资产"; DetailPath.Text = DetailEvidence.Text = DetailProtection.Text = ManualCategory.Text = ManualTags.Text = ""; return; }
        DetailName.Text = asset.Name; DetailPath.Text = asset.Path;
        DetailEvidence.Text = $"{asset.Evidence}\n版本：{asset.Version}\n最近修改：{asset.Modified?.LocalDateTime.ToString("yyyy-MM-dd HH:mm") ?? "未知"}";
        DetailProtection.Text = $"保护状态：{asset.Protection}";
        ManualCategory.Text = asset.Category; ManualTags.Text = string.Join(", ", asset.Tags);
        if (selectedAssets.Count != 1) { ManagementHint.Text = "打开位置或卸载时请选择一个对象。"; return; }
        try
        {
            var registration = await Task.Run(() => isApp ? ApplicationManagement.ReadRegistration(asset) : null);
            if (revision != detailRevision || closing) return;
            detailRegistration = registration;
            if (registration != null)
            {
                var plan = await Task.Run(() => ApplicationManagement.BuildUninstallPlan(registration));
                if (revision != detailRevision || closing) return;
                ManagementHint.Text = plan.CanLaunch ? "卸载将启动已注册程序，完成状态由卸载程序决定。" : plan.FallbackReason;
            }
            var location = await Task.Run(() => ApplicationManagement.ResolveLocation(asset, registration));
            if (revision != detailRevision || closing) return;
            detailLocation = location; DetailPath.Text = location.Path;
            ManagementHint.Text = location.Source + (registration == null ? "" : "\n注册来源：" + asset.Path + "\n" + ManagementHint.Text);
        }
        catch (Exception ex) { if (revision == detailRevision && !closing) ManagementHint.Text = ex.Message + (isApp ? "\n可打开 Windows 已安装应用。" : ""); }
        finally { if (revision == detailRevision && !closing) UpdateActions(); }
    }
    private async void SaveTags_Click(object sender, RoutedEventArgs e)
    {
        if (Busy || selectedAssets.LastOrDefault() is not Asset asset) return;
        var category = ManualCategory.Text.Trim();
        var tags = ManualTags.Text.Split([',', '，'], StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).Distinct().ToList();
        if (category.Length is < 1 or > 40 || tags.Count > 12 || tags.Any(t => t.Length > 24)) { ShowError(new ArgumentException("分类需为 1–40 字，最多 12 个标签，每个最多 24 字。")); return; }
        try { asset.Category = category; asset.Tags = tags; asset.UserClassified = true; InvalidateContext(); await PersistAsync(); Refresh(); StatusText.Text = "人工分类已保存；原始文件未改变。"; }
        catch (Exception ex) { ShowError(ex); }
    }
    private async void Locate_Click(object sender, RoutedEventArgs e)
    {
        if (Busy || selectedAssets.Count != 1) return;
        managementOperation = LocateAsync(selectedAssets[0]); await managementOperation;
    }
    private async Task LocateAsync(Asset asset)
    {
        managing = true; UpdateActions();
        try
        {
            var location = await Task.Run(() => ApplicationManagement.ResolveLocation(asset, asset.Kind == "应用" ? ApplicationManagement.ReadRegistration(asset) : null));
            if (closing) return;
            var start = new ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "explorer.exe")) { UseShellExecute = false };
            if (location.SelectFile) start.Arguments = "/select,\"" + location.Path + "\"";
            else start.ArgumentList.Add(location.Path);
            using var process = Process.Start(start);
            StatusText.Text = "已打开：" + location.Path + " · " + location.Source;
        }
        catch (Exception ex) { ShowError(ex); }
        finally { managing = false; UpdateActions(); }
    }
    private void CopyLocation_Click(object sender, RoutedEventArgs e)
    {
        if (Busy || selectedAssets.Count != 1 || detailLocation == null) return;
        try { Clipboard.SetText(detailLocation.Path); StatusText.Text = "位置已复制。"; } catch (Exception ex) { ShowError(ex); }
    }
    private void WindowsApps_Click(object sender, RoutedEventArgs e)
    {
        if (Busy || selectedAssets.Count != 1 || selectedAssets[0].Kind != "应用") return;
        try { OpenWindowsApps(); } catch (Exception ex) { ShowError(ex); }
    }
    private void OpenWindowsApps()
    {
        using var process = Process.Start(new ProcessStartInfo("ms-settings:appsfeatures") { UseShellExecute = true });
        StatusText.Text = "已打开 Windows 已安装应用；在系统界面选择应用进行管理。";
    }
    private async void Uninstall_Click(object sender, RoutedEventArgs e)
    {
        if (Busy || selectedAssets.Count != 1 || selectedAssets[0].Kind != "应用") return;
        managementOperation = UninstallAsync(selectedAssets[0]); await managementOperation;
    }
    private async Task UninstallAsync(Asset asset)
    {
        managing = true; UpdateActions();
        try
        {
            var registration = await Task.Run(() => ApplicationManagement.ReadRegistration(asset));
            var plan = await Task.Run(() => ApplicationManagement.BuildUninstallPlan(registration));
            if (closing) return;
            if (!plan.CanLaunch)
            {
                if (MessageBox.Show(this, registration.Name + "\n" + plan.FallbackReason + "\n\n打开 Windows 已安装应用？", "应用管理", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes) OpenWindowsApps();
                return;
            }
            var message = $"启动 {registration.Name} 的卸载程序？\n\n程序：{plan.Executable}\n参数：{plan.Arguments}\n来源：{registration.Identity}\n\n卸载可能移除应用及其数据，具体操作由卸载程序处理。";
            if (MessageBox.Show(this, message, "卸载应用", MessageBoxButton.YesNo, MessageBoxImage.Warning, MessageBoxResult.No) != MessageBoxResult.Yes) return;
            var current = await Task.Run(() => ApplicationManagement.ReadRegistration(asset));
            var currentPlan = await Task.Run(() => ApplicationManagement.BuildUninstallPlan(current));
            if (closing) return;
            if (current != registration || currentPlan != plan) throw new InvalidOperationException("应用注册信息在确认期间改变，请重新检查后操作。");
            using var process = Process.Start(new ProcessStartInfo(plan.Executable) { Arguments = plan.Arguments, UseShellExecute = true, WorkingDirectory = Path.GetDirectoryName(plan.Executable)! });
            StatusText.Text = "已启动卸载程序；未核实卸载是否完成。完成后请刷新应用清单。";
        }
        catch (Exception ex) { ShowError(ex); }
        finally { managing = false; UpdateActions(); UpdateDetail(); }
    }
    private async void SaveSettings_Click(object sender, RoutedEventArgs e)
    {
        if (Busy) return;
        try
        {
            var config = DraftConfig();
            var key = DraftKey(config);
            config.EncryptedApiKey = key.Length == 0 ? "" : SecretProtector.Protect(key);
            var previousId = workspace.ProviderId; var previousEndpoint = workspace.Endpoint; var previousModel = workspace.Model;
            workspace.ProviderSettings.TryGetValue(config.ProviderId, out var previousProfile);
            workspace.ProviderSettings[config.ProviderId] = config;
            workspace.ProviderId = config.ProviderId; workspace.Endpoint = config.Endpoint; workspace.Model = config.Model;
            try { await PersistAsync(); }
            catch { workspace.ProviderId = previousId; workspace.Endpoint = previousEndpoint; workspace.Model = previousModel; if (previousProfile == null) workspace.ProviderSettings.Remove(config.ProviderId); else workspace.ProviderSettings[config.ProviderId] = previousProfile; throw; }
            ApiKeyBox.Clear(); RemoveKeyBox.IsChecked = false; LoadProviderFields(config.ProviderId);
            InvalidateContext(); Refresh(); StatusText.Text = "服务商设置已应用；重新确认发送预览后可生成建议。";
        }
        catch (Exception ex) { ShowError(ex); }
    }
    private async void Connect_Click(object sender, RoutedEventArgs e)
    {
        if (Busy) return;
        aiOperation = CheckConnectionAsync(); await aiOperation;
    }
    private async Task CheckConnectionAsync()
    {
        analyzing = true; aiCancellation = new CancellationTokenSource(TimeSpan.FromSeconds(10)); UpdateActions(); ModelStatus.Text = "正在检查所选服务商…";
        try
        {
            var config = DraftConfig();
            var models = await new AiAdvisor(http).ListModelsAsync(config, DraftKey(config), aiCancellation.Token);
            ModelStatus.Text = models.Length == 0 ? "连接成功，但服务未返回模型列表。" : "连接成功（模型列表，不代表已验证生成）：\n" + string.Join("\n", models.Take(30));
        }
        catch (Exception ex) { ModelStatus.Text = $"连接失败：{ex.Message}"; }
        finally { analyzing = false; aiCancellation.Dispose(); aiCancellation = null; UpdateActions(); }
    }
    private void Provider_Changed(object sender, SelectionChangedEventArgs e)
    {
        if (workspace == null || ProviderCombo.SelectedValue is not string id) return;
        LoadProviderFields(id);
    }
    private void LoadProviderFields(string id)
    {
        var config = workspace.ProviderSettings.TryGetValue(id, out var saved) ? saved : id == "ollama" && workspace.ProviderId == "ollama" ? workspace.ActiveConfig() : AiProviders.Defaults(id);
        EndpointBox.Text = config.Endpoint; ModelBox.Text = config.Model;
        EndpointBox.IsReadOnly = id is not ("ollama" or "custom");
        ApiKeyBox.Clear(); RemoveKeyBox.IsChecked = false;
        ApiKeyBox.Visibility = id == "ollama" ? Visibility.Hidden : Visibility.Visible;
        KeyHint.Text = id == "ollama" ? "Ollama 无需 API Key。选择云端服务商后填写密钥。" : config.EncryptedApiKey.Length > 0 ? "已加密保存密钥；留空保留，填写新值替换。应用设置后生效。" : "密钥仅在本机加密保存。应用后，确认发送的元数据将交给所选服务商。";
        ModelStatus.Text = "";
    }
    private AiProviderConfig DraftConfig()
    {
        var id = ProviderCombo.SelectedValue as string ?? "ollama";
        var config = new AiProviderConfig { ProviderId = id, Endpoint = EndpointBox.Text.Trim(), Model = ModelBox.Text.Trim() };
        AiProviders.Validate(config); return config;
    }
    private string DraftKey(AiProviderConfig config)
    {
        if (config.ProviderId == "ollama" || RemoveKeyBox.IsChecked == true) return "";
        var entered = ApiKeyBox.Password.Trim();
        if (entered.Length > 0)
        {
            if (entered.Any(char.IsControl)) throw new ArgumentException("API Key 不能包含控制字符。");
            return entered;
        }
        if (workspace.ProviderSettings.TryGetValue(config.ProviderId, out var saved) && saved.EncryptedApiKey.Length > 0)
        {
            if (saved.Endpoint.TrimEnd('/') != config.Endpoint.TrimEnd('/')) throw new ArgumentException("服务地址已改变，请重新输入该地址使用的 API Key。");
            return SecretProtector.Unprotect(saved.EncryptedApiKey);
        }
        throw new ArgumentException("请填写所选服务商的 API Key。");
    }
    private async void Clear_Click(object sender, RoutedEventArgs e)
    {
        if (Busy) return;
        if (MessageBox.Show(this, "清空所有本地资产索引、标签、AI 建议、扫描报告与结果缓存？\n原始文件不会删除。模型设置保留。", "清空索引", MessageBoxButton.YesNo, MessageBoxImage.Question) != MessageBoxResult.Yes) return;
        try
        {
            workspace.Assets.Clear(); workspace.Suggestions.Clear(); workspace.Reports.Clear(); workspace.ScanCache.Clear(); workspace.AnalysisCache.Clear(); InvalidateContext();
            await PersistAsync(); Refresh(); StatusText.Text = "索引已清空；磁盘文件未改变。";
        }
        catch (Exception ex) { ShowError(ex); }
    }
    private async void ClearCache_Click(object sender, RoutedEventArgs e)
    {
        if (Busy) return;
        try { workspace.ScanCache.Clear(); workspace.AnalysisCache.Clear(); InvalidateContext(); await PersistAsync(); Refresh(); StatusText.Text = "扫描与分析缓存已清除；资产索引、人工标签及审核记录保留。下次检索／分析将重新执行。"; }
        catch (Exception ex) { ShowError(ex); }
    }
    public void PrepareSmoke()
    {
        if (workspace.Assets.Count != 0 || workspace.Suggestions.Count != 0 || FindName("DemoButton") != null)
            throw new InvalidOperationException("空索引或示例入口检查失败。");
        var smokePage = Environment.GetEnvironmentVariable("ASSETDESK_SMOKE_PAGE");
        Navigation.SelectedIndex = smokePage switch { "ai" or "ai-cache" => 1, "history" => 2, "apps" or "apps-list" => 3, "files" => 4, "settings" => 6, _ => 0 };
        if (smokePage is "ai" or "ai-cache")
        {
            Preview_Click(this, new RoutedEventArgs()); Analyze_Click(this, new RoutedEventArgs());
            Accept_Click(this, new RoutedEventArgs()); Reject_Click(this, new RoutedEventArgs());
            if (AiPanel.IsEnabled || AnalyzeButton.IsEnabled || context != null || workspace.Suggestions.Count != 0)
                throw new InvalidOperationException("AI 冻结检查失败。");
        }
        if (smokePage == "history")
        {
            HistoryText.SelectAll();
            if (!HistoryText.IsReadOnly || HistoryText.SelectedText != HistoryText.Text || Navigation.Items.Count != 7)
                throw new InvalidOperationException("记录选择或导航检查失败。");
            HistoryText.Select(0, 0);
        }
        if (smokePage is "apps" or "apps-list") AppViewCombo.SelectedIndex = smokePage == "apps" ? 1 : 0;
        if (smokePage == "settings") ProviderCombo.SelectedValue = "openai";
        if (LocateButton.IsEnabled || CopyLocationButton.IsEnabled || UninstallButton.IsEnabled)
            throw new InvalidOperationException("无选择时管理操作仍可用。");
    }
    public void DisposeForSmoke() { store?.Dispose(); http.Dispose(); pause.Dispose(); }
    private async void Window_Closing(object? sender, CancelEventArgs e)
    {
        if (closeReady) return;
        e.Cancel = true;
        if (closing) return;
        closing = true; UpdateActions(); scanCancellation?.Cancel(); aiCancellation?.Cancel(); pause.Set();
        try { await Task.WhenAll(new[] { scanOperation, aiOperation, saveOperation, managementOperation }.Where(t => t != null).Cast<Task>()); }
        catch { /* Individual operations already show errors. */ }
        finally { store?.Dispose(); http.Dispose(); pause.Dispose(); closeReady = true; Close(); }
    }
}
