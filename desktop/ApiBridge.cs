using System.Text;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;

namespace LocalTapCompatible;

// 前端桥接层：通过 postMessage 与页面通信，替代 HTTP 服务，零额外进程
public sealed class ApiBridge
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = null };
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromMinutes(6) };
    private CoreWebView2? _webView;

    // 注入到页面的脚本：提供 window.lctApi.* 接口
    public string InjectScript => """
        window.lctApi = {
          _pending: new Map(),
          _seq: 0,
          call(method, payload) {
            return new Promise((resolve, reject) => {
              const id = ++this._seq;
              this._pending.set(id, { resolve, reject });
              window.chrome.webview.postMessage({ id, method, payload });
            });
          },
          run: (config, inputs, locale) => window.lctApi.call('run', { config, inputs, locale }),
          getPresets: () => window.lctApi.call('getPresets', {}),
          health: () => window.lctApi.call('health', {}),
          download: (url) => window.lctApi.call('download', { url }),
          listModels: (cfg) => window.lctApi.call('listModels', cfg)
        };
        window.chrome.webview.addEventListener('message', (e) => {
          const msg = e.data;
          if (!msg || msg.id === undefined) return;
          const p = window.lctApi._pending.get(msg.id);
          if (!p) return;
          window.lctApi._pending.delete(msg.id);
          msg.ok ? p.resolve(msg.result) : p.reject(new Error(msg.error));
        });
        true;
        """;

    public void Attach(CoreWebView2 webView)
    {
        _webView = webView;
        webView.WebMessageReceived += OnMessage;
    }

    private void Reply(long id, object result)
    {
        var json = JsonSerializer.Serialize(new { id, ok = true, result }, JsonOpts);
        Trace("REPLY: " + json);
        _webView?.PostWebMessageAsJson(json);
    }

    private void ReplyError(long id, string error)
        => _webView?.PostWebMessageAsJson(JsonSerializer.Serialize(new { id, ok = false, error }, JsonOpts));

    private static void Trace(string msg)
    {
        // 只记录前 300 字符，避免把大段 base64 媒体数据写进日志文件
        try
        {
            if (msg.Length > 300) msg = msg[..300] + "...(truncated)";
            System.IO.File.AppendAllText(System.IO.Path.Combine(System.IO.Path.GetTempPath(), "localtapcompatible-bridge-debug.log"), msg + Environment.NewLine);
        }
        catch { }
    }

    private async void OnMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        long id = 0;
        try
        {
            Trace("RECV: " + e.WebMessageAsJson);

            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            id = root.GetProperty("id").GetInt64();
            var method = root.GetProperty("method").GetString() ?? "";
            var payload = root.TryGetProperty("payload", out var p) ? p.Clone() : default;
            var locale = Loc.Normalize(payload.ValueKind == JsonValueKind.Object && payload.TryGetProperty("locale", out var l) ? l.GetString() : null);

            switch (method)
            {
                case "health":
                    Reply(id, new { ok = true, name = "local-tap-compatible" });
                    break;

                case "getPresets":
                    Reply(id, Providers.List);
                    break;

                case "run":
                {
                    var config = payload.ValueKind == JsonValueKind.Object && payload.TryGetProperty("config", out var c) ? c.Clone() : default;
                    var inputs = payload.ValueKind == JsonValueKind.Object && payload.TryGetProperty("inputs", out var i) ? i.Clone() : default;
                    var result = await Runner.Run(config, inputs, locale);
                    Reply(id, new { ok = true, output = new { value = result.Value, mediaType = result.MediaType } });
                    break;
                }

                case "download":
                {
                    var url = payload.ValueKind == JsonValueKind.Object && payload.TryGetProperty("url", out var u)
                        ? u.GetString()
                        : null;
                    if (string.IsNullOrEmpty(url)) throw new InvalidOperationException(Loc.T(locale, "api.missingDownloadUrl"));
                    Reply(id, await DownloadAsync(url));
                    break;
                }

                case "listModels":
                {
                    var baseUrl = payload.ValueKind == JsonValueKind.Object && payload.TryGetProperty("baseUrl", out var b) ? b.GetString() : null;
                    var apiKey = payload.ValueKind == JsonValueKind.Object && payload.TryGetProperty("apiKey", out var k) ? k.GetString() : null;
                    var path = payload.ValueKind == JsonValueKind.Object && payload.TryGetProperty("path", out var pt) ? pt.GetString() : "/models";
                    if (string.IsNullOrWhiteSpace(baseUrl)) throw new InvalidOperationException(Loc.T(locale, "api.missingBaseUrl"));
                    Reply(id, await ListModelsAsync(baseUrl, apiKey, path ?? "/models", locale));
                    break;
                }

                default:
                    ReplyError(id, Loc.T(locale, "api.unknownMethod", ("m", method)));
                    break;
            }
        }
        catch (Exception ex)
        {
            ReplyError(id, ex.Message);
        }
    }

    private async Task<object> DownloadAsync(string url)
    {
        if (url.StartsWith("data:"))
        {
            var isVideo = url.StartsWith("data:video");
            return new { dataUrl = url, filename = isVideo ? "output.mp4" : "output.png" };
        }
        var bytes = await _http.GetByteArrayAsync(url);
        var mime = GuessMime(url);
        var dataUrl = $"data:{mime};base64," + Convert.ToBase64String(bytes);
        string filename;
        try
        {
            filename = Path.GetFileName(new Uri(url).AbsolutePath);
        }
        catch
        {
            filename = "output";
        }
        if (string.IsNullOrWhiteSpace(filename) || filename == "/") filename = mime.StartsWith("video") ? "output.mp4" : "output.png";
        return new { dataUrl, filename };
    }

    // 拉取 OpenAI 兼容接口的模型列表（data[].id 或 models[].id）
    private async Task<object> ListModelsAsync(string baseUrl, string? apiKey, string path, string locale)
    {
        var url = baseUrl.TrimEnd('/') + "/" + path.TrimStart('/');
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        if (!string.IsNullOrEmpty(apiKey))
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
        using var res = await _http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode) throw new InvalidOperationException(Loc.T(locale, "api.listHttp", ("status", ((int)res.StatusCode).ToString())));
        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;
        var list = new List<string>();
        if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
        {
            foreach (var m in data.EnumerateArray())
                if (m.TryGetProperty("id", out var id) && id.ValueKind == JsonValueKind.String)
                    list.Add(id.GetString()!);
        }
        else if (root.TryGetProperty("models", out var models) && models.ValueKind == JsonValueKind.Array)
        {
            foreach (var m in models.EnumerateArray())
            {
                if (m.ValueKind == JsonValueKind.String) list.Add(m.GetString()!);
                else if (m.TryGetProperty("id", out var id) && id.ValueKind == JsonValueKind.String) list.Add(id.GetString()!);
            }
        }
        if (list.Count == 0) throw new InvalidOperationException(Loc.T(locale, "api.noModels"));
        return new { models = list };
    }

    private static string GuessMime(string url)
    {
        if (RegexMatch(url, @"\.(mp4|webm|mov|m4v)(\?|$)")) return "video/mp4";
        if (RegexMatch(url, @"\.(png|jpe?g|webp|gif|avif)(\?|$)")) return "image/png";
        return "application/octet-stream";
    }

    private static bool RegexMatch(string s, string pattern)
        => System.Text.RegularExpressions.Regex.IsMatch(s, pattern, System.Text.RegularExpressions.RegexOptions.IgnoreCase);

    public void Dispose() => _http.Dispose();
}
