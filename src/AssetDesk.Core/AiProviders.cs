namespace AssetDesk.Core;

public sealed record AiProvider(string Id, string Name, string Endpoint, string Model);
public sealed class AiProviderConfig
{
    public string ProviderId { get; set; } = "ollama";
    public string Endpoint { get; set; } = "http://127.0.0.1:11434";
    public string Model { get; set; } = "qwen3:8b";
    public string EncryptedApiKey { get; set; } = "";
}
public static class AiProviders
{
    public static IReadOnlyList<AiProvider> All { get; } = [
        new("ollama", "Ollama（本机）", "http://127.0.0.1:11434", "qwen3:8b"),
        new("openai", "OpenAI", "https://api.openai.com/v1", "gpt-4o-mini"),
        new("deepseek", "DeepSeek", "https://api.deepseek.com/v1", "deepseek-flash"),
        new("claude", "Anthropic / Claude", "https://api.anthropic.com/v1", "claude-sonnet-5-5"),
        new("custom", "自定义（OpenAI 兼容）", "", "")
    ];
    public static AiProvider Get(string id) => All.SingleOrDefault(p => p.Id == id) ?? throw new ArgumentException("不支持的服务商。");
    public static AiProviderConfig Defaults(string id)
    {
        var provider = Get(id);
        return new() { ProviderId = id, Endpoint = provider.Endpoint, Model = provider.Model };
    }
    public static Uri Validate(AiProviderConfig config)
    {
        var provider = Get(config.ProviderId);
        if (string.IsNullOrWhiteSpace(config.Model) || config.Model.Length > 120) throw new ArgumentException("请填写有效的模型名称。");
        if (config.ProviderId == "ollama") return AiAdvisor.ValidateEndpoint(config.Endpoint);
        if (!Uri.TryCreate(config.Endpoint, UriKind.Absolute, out var uri) || uri.Scheme != "https" || !string.IsNullOrEmpty(uri.UserInfo) || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment)) throw new ArgumentException("API Base URL 需要 HTTPS 地址，不能包含账号、查询参数或片段。");
        if (config.ProviderId != "custom" && uri.AbsoluteUri.TrimEnd('/') != provider.Endpoint) throw new ArgumentException("该服务商使用官方地址；代理或其他地址请选择自定义兼容服务。");
        return new Uri(uri.AbsoluteUri.TrimEnd('/') + "/");
    }
}
