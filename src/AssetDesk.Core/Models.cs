using System.Text.Json.Serialization;

namespace AssetDesk.Core;

public sealed class Asset
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = "";
    public string Path { get; set; } = "";
    public string Kind { get; set; } = "文件";
    public string Category { get; set; } = "未知";
    public string Protection { get; set; } = "待确认";
    public string Evidence { get; set; } = "";
    public string Version { get; set; } = "未知";
    public long Size { get; set; }
    public DateTimeOffset? Modified { get; set; }
    public List<string> Tags { get; set; } = [];
    public bool UserClassified { get; set; }
    // Retained only for cleanup of records saved by older clients.
    public bool IsDemo { get; set; }
    // Omit absent locations to avoid rewriting every old file record when saving settings.
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? InstallLocation { get; set; }
    public bool IsSystemRelated { get; set; }
    public string SystemReason { get; set; } = "";
    public string IconPath { get; set; } = "";
    public int IconIndex { get; set; }
    [JsonIgnore] public string SystemText => IsSystemRelated ? "系统相关" : "普通／未识别";
    [JsonIgnore] public string SizeText => Kind != "文件" ? "未测量" : FormatSize(Size);
    [JsonIgnore] public string TagText => string.Join(" · ", Tags);
    [JsonIgnore] public string InventoryText => Kind is "环境" or "应用" ? Version : SizeText;
    public static string FormatSize(long value) => value >= 1L << 30 ? $"{value / (double)(1L << 30):F1} GB" : value >= 1L << 20 ? $"{value / (double)(1L << 20):F1} MB" : value >= 1024 ? $"{value / 1024d:F1} KB" : $"{value} B";
}

public sealed class Suggestion
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string AssetId { get; set; } = "";
    public string AssetName { get; set; } = "";
    public string Category { get; set; } = "";
    public List<string> Tags { get; set; } = [];
    public string Reason { get; set; } = "";
    public string Status { get; set; } = "待审核";
    public string Model { get; set; } = "";
    public string SourceFingerprint { get; set; } = "";
    [JsonIgnore] public string TagText => string.Join(" · ", Tags);
}

public sealed class ScanReport
{
    public string Root { get; set; } = "";
    public string State { get; set; } = "进行中";
    public double? DurationSeconds { get; set; }
    public string Scanner { get; set; } = "";
    public int Discovered { get; set; }
    public int IssueCount { get; set; }
    public List<string> Issues { get; set; } = [];
    public List<string> Excluded { get; set; } = [];
    public DateTimeOffset Time { get; set; } = DateTimeOffset.Now;
}

public sealed class Workspace
{
    public List<Asset> Assets { get; set; } = [];
    public List<Suggestion> Suggestions { get; set; } = [];
    public List<ScanReport> Reports { get; set; } = [];
    public string Model { get; set; } = "qwen3:8b";
    public string Endpoint { get; set; } = "http://127.0.0.1:11434";
    public string ProviderId { get; set; } = "ollama";
    public Dictionary<string, AiProviderConfig> ProviderSettings { get; set; } = [];
    public bool AppIconView { get; set; }
    public bool ShowSystemApps { get; set; } = true;
    public List<ScanSnapshot> ScanCache { get; set; } = [];
    public List<AnalysisSnapshot> AnalysisCache { get; set; } = [];
    public AiProviderConfig ActiveConfig() => ProviderSettings.TryGetValue(ProviderId, out var config) ? config : new() { ProviderId = ProviderId, Endpoint = Endpoint, Model = Model };
}

public static class ReviewService
{
    public static void Accept(Workspace workspace, Suggestion suggestion)
    {
        if (suggestion.Status != "待审核") throw new InvalidOperationException("该建议已经处理。");
        var asset = workspace.Assets.SingleOrDefault(a => a.Id == suggestion.AssetId) ?? throw new InvalidOperationException("对象已不在索引中，请重新生成建议。");
        if (suggestion.SourceFingerprint.Length > 0 && suggestion.SourceFingerprint != ResultCache.AssetFingerprint(asset)) throw new InvalidOperationException("对象元数据或人工标签已改变，该建议已过期，请重新分析。");
        var previousFingerprint = ResultCache.AssetFingerprint(asset);
        asset.Category = suggestion.Category;
        asset.Tags = asset.Tags.Concat(suggestion.Tags).Distinct(StringComparer.Ordinal).ToList();
        asset.UserClassified = true;
        suggestion.Status = "已接受";
        ResultCache.RebindAfterAcceptance(workspace, asset.Id, previousFingerprint);
        // Deliberately no filesystem operations: protection and original location stay intact.
    }
    public static void Reject(Suggestion suggestion)
    {
        if (suggestion.Status != "待审核") throw new InvalidOperationException("该建议已经处理。");
        suggestion.Status = "已拒绝";
    }

    public static void Merge(Workspace workspace, IEnumerable<Asset> discovered)
    {
        var byPath = workspace.Assets.Select((a, index) => (a, index)).ToDictionary(item => (item.a.Kind, item.a.Path), item => item.index);
        foreach (var incoming in discovered)
        {
            if (byPath.TryGetValue((incoming.Kind, incoming.Path), out var index))
            {
                var previous = workspace.Assets[index];
                incoming.Id = previous.Id;
                incoming.Tags = previous.Tags;
                incoming.UserClassified = previous.UserClassified;
                if (previous.UserClassified) incoming.Category = previous.Category;
                workspace.Assets[index] = incoming;
            }
            else
            {
                byPath[(incoming.Kind, incoming.Path)] = workspace.Assets.Count;
                workspace.Assets.Add(incoming);
            }
        }
    }
}
