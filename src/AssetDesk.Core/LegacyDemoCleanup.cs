namespace AssetDesk.Core;

public sealed record DemoCleanupResult(string[] Assets, string[] Suggestions, string[] ScanCaches, string[] AnalysisCaches, bool ReportsChanged)
{
    public bool Changed => Assets.Length + Suggestions.Length + ScanCaches.Length + AnalysisCaches.Length > 0 || ReportsChanged;
}

public static class LegacyDemoCleanup
{
    public static DemoCleanupResult Remove(Workspace workspace)
    {
        var ids = workspace.Assets.Where(a => a.IsDemo || a.Path.StartsWith("demo:", StringComparison.OrdinalIgnoreCase)).Select(a => a.Id).ToHashSet();
        var suggestions = workspace.Suggestions.Where(s => ids.Contains(s.AssetId) || s.Model.StartsWith("示例提案", StringComparison.Ordinal)).Select(s => s.Id).ToHashSet();
        var scans = workspace.ScanCache.Where(s => s.Root.StartsWith("demo:", StringComparison.OrdinalIgnoreCase) || s.AssetIds.Any(ids.Contains)).Select(s => s.Key).ToHashSet();
        var analyses = workspace.AnalysisCache.Where(s => s.Request.Assets.Any(a => ids.Contains(a.Id)) || s.Response.Suggestions.Any(a => ids.Contains(a.AssetId) || suggestions.Contains(a.Id) || a.Model.StartsWith("示例提案", StringComparison.Ordinal))).Select(s => s.Key).ToHashSet();
        workspace.Assets.RemoveAll(a => ids.Contains(a.Id));
        workspace.Suggestions.RemoveAll(s => suggestions.Contains(s.Id));
        workspace.ScanCache.RemoveAll(s => scans.Contains(s.Key));
        workspace.AnalysisCache.RemoveAll(s => analyses.Contains(s.Key));
        var reports = workspace.Reports.RemoveAll(r => r.Root.StartsWith("demo:", StringComparison.OrdinalIgnoreCase)) > 0;
        return new(ids.ToArray(), suggestions.ToArray(), scans.ToArray(), analyses.ToArray(), reports);
    }
}
