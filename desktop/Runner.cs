using System.Text.Json;
using System.Text.RegularExpressions;

namespace TapNowLocal;

public sealed record RunOutput(string Value, string MediaType);

// 节点执行引擎：把节点配置 + 上游输入，翻译成一次真实的 HTTP 调用
// 支持：模板占位符、Bearer Key、任意 JSON body、输出路径提取、异步任务轮询
public static partial class Runner
{
    private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = false };

    // ------- 配置读取辅助 -------
    private static string? S(JsonElement el, string prop)
        => el.ValueKind == JsonValueKind.Object && el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;

    private static bool B(JsonElement el, string prop, bool dflt = false)
        => el.ValueKind == JsonValueKind.Object && el.TryGetProperty(prop, out var v) && v.ValueKind is JsonValueKind.True or JsonValueKind.False
            ? v.GetBoolean()
            : dflt;

    private static int I(JsonElement el, string prop, int dflt)
        => el.ValueKind == JsonValueKind.Object && el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var n)
            ? n
            : dflt;

    private static JsonElement O(JsonElement el, string prop)
        => el.ValueKind == JsonValueKind.Object && el.TryGetProperty(prop, out var v) ? v.Clone() : default;

    // ------- 按 a.b[0].c 形式的路径取值 -------
    public static JsonElement? GetByPath(JsonElement root, string? path)
    {
        if (string.IsNullOrWhiteSpace(path) || root.ValueKind == JsonValueKind.Undefined) return null;
        JsonElement cur = root;
        foreach (var rawKey in path!.Split('.'))
        {
            var key = rawKey.Trim();
            if (key.Length == 0) continue;
            var m = IndexKey().Match(key);
            if (m.Success)
            {
                if (cur.ValueKind != JsonValueKind.Object || !cur.TryGetProperty(m.Groups[1].Value, out var arr)) return null;
                if (arr.ValueKind != JsonValueKind.Array) return null;
                if (!int.TryParse(m.Groups[2].Value, out var idx) || idx >= arr.GetArrayLength()) return null;
                cur = arr[idx];
            }
            else
            {
                if (cur.ValueKind != JsonValueKind.Object || !cur.TryGetProperty(key, out var next)) return null;
                cur = next;
            }
        }
        return cur.Clone();
    }

    // 递归找一个字符串 URL（兜底用）
    private static string? FirstStringUrl(JsonElement el, int depth = 0)
    {
        if (el.ValueKind == JsonValueKind.Undefined || depth > 4) return null;
        if (el.ValueKind == JsonValueKind.String)
        {
            var t = el.GetString()!.Trim();
            return t.StartsWith("http") || t.StartsWith("data:") ? t : null;
        }
        if (el.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in el.EnumerateArray())
            {
                var found = FirstStringUrl(item, depth + 1);
                if (found != null) return found;
            }
            return null;
        }
        if (el.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in el.EnumerateObject())
            {
                var found = FirstStringUrl(prop.Value, depth + 1);
                if (found != null) return found;
            }
        }
        return null;
    }

    // 递归找第一个任意字符串（文本输出兜底）
    private static string? FirstString(JsonElement el, int depth = 0)
    {
        if (el.ValueKind == JsonValueKind.Undefined || depth > 4) return null;
        if (el.ValueKind == JsonValueKind.String)
        {
            var t = el.GetString()!.Trim();
            return t.Length > 0 ? t : null;
        }
        if (el.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in el.EnumerateArray())
            {
                var found = FirstString(item, depth + 1);
                if (found != null) return found;
            }
            return null;
        }
        if (el.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in el.EnumerateObject())
            {
                var found = FirstString(prop.Value, depth + 1);
                if (found != null) return found;
            }
        }
        return null;
    }

    // 把 {{key}} 占位符替换成变量值（在序列化后的字符串上操作）
    private static string ResolvePlaceholders(string source, Dictionary<string, string?> vars, bool jsonEscape = false)
    {
        var result = source;
        foreach (var (key, value) in vars)
        {
            if (value is null) continue;
            var replacement = jsonEscape ? JsonSerializer.Serialize(value)[1..^1] : value;
            result = result.Replace("{{" + key + "}}", replacement);
        }
        return result;
    }

    private static string JoinUrl(string? baseUrl, string? path)
    {
        var base_ = (baseUrl ?? "").Trim().TrimEnd('/');
        var p = (path ?? "").Trim();
        if (Regex.IsMatch(p, @"^https?://", RegexOptions.IgnoreCase)) return p;
        if (base_.Length == 0) return p.Length == 0 ? "/" : p;
        if (p.Length == 0) return base_;
        return base_ + "/" + p.TrimStart('/');
    }

    private static string GuessMediaType(string value)
    {
        if (Regex.IsMatch(value, @"^data:video/", RegexOptions.IgnoreCase)
            || Regex.IsMatch(value, @"\.(mp4|webm|mov|m4v)(\?|$)", RegexOptions.IgnoreCase)) return "video";
        if (Regex.IsMatch(value, @"^data:image/", RegexOptions.IgnoreCase)
            || Regex.IsMatch(value, @"\.(png|jpe?g|webp|gif|avif)(\?|$)", RegexOptions.IgnoreCase)) return "image";
        return "unknown";
    }

    private static RunOutput NormalizeOutput(JsonElement value, string? outputMediaType, string? outputKind = "media")
    {
        if (outputKind == "text")
        {
            if (value.ValueKind == JsonValueKind.Undefined)
                throw new InvalidOperationException("未从接口响应中提取到文本，请检查「输出提取路径」");
            if (value.ValueKind != JsonValueKind.String)
            {
                var found = FirstString(value);
                if (found is null) throw new InvalidOperationException("接口输出不是文本，请检查「输出提取路径」");
                return new RunOutput(found, "text");
            }
            return new RunOutput(value.GetString()!.Trim(), "text");
        }

        if (value.ValueKind == JsonValueKind.Undefined)
            throw new InvalidOperationException("未从接口响应中提取到输出，请检查「输出提取路径」");

        string v;
        if (value.ValueKind == JsonValueKind.String)
        {
            v = value.GetString()!.Trim();
        }
        else
        {
            var found = FirstStringUrl(value)
                ?? throw new InvalidOperationException("接口返回的不是 URL/图片，请检查「输出提取路径」");
            v = found.Trim();
        }

        var type = outputMediaType is not null && outputMediaType != "auto" ? outputMediaType : GuessMediaType(v);

        if (!v.StartsWith("http") && !v.StartsWith("data:"))
        {
            if (v.Length > 64 && Regex.IsMatch(v, @"^[A-Za-z0-9+/=\r\n]+$"))
            {
                var prefix = type == "video" ? "data:video/mp4;base64," : "data:image/png;base64,";
                v = prefix + v;
            }
            else
            {
                throw new InvalidOperationException("提取到的输出不是 URL 也不是 base64 数据");
            }
        }
        return new RunOutput(v, type);
    }

    private static Dictionary<string, string?> BuildVars(JsonElement config, JsonElement inputs)
    {
        var d = new Dictionary<string, string?>
        {
            ["prompt"] = inputs.ValueKind == JsonValueKind.Object && inputs.TryGetProperty("prompt", out var pr) && pr.ValueKind == JsonValueKind.String ? pr.GetString() : "",
            ["image"] = inputs.ValueKind == JsonValueKind.Object && inputs.TryGetProperty("image", out var im) && im.ValueKind == JsonValueKind.String ? im.GetString() : "",
            ["model"] = S(config, "model") ?? "",
            ["apiKey"] = S(config, "apiKey") ?? "",
        };
        // 多图：image1..imageN 命名单张图
        if (inputs.ValueKind == JsonValueKind.Object && inputs.TryGetProperty("images", out var imgs) && imgs.ValueKind == JsonValueKind.Array)
        {
            var idx = 1;
            foreach (var img in imgs.EnumerateArray())
            {
                if (img.ValueKind == JsonValueKind.String)
                    d[$"image{idx++}"] = img.GetString();
            }
        }
        // 自定义占位符（如 {{system}}）
        if (inputs.ValueKind == JsonValueKind.Object && inputs.TryGetProperty("vars", out var vars) && vars.ValueKind == JsonValueKind.Object)
        {
            foreach (var v in vars.EnumerateObject())
            {
                if (v.Value.ValueKind == JsonValueKind.String)
                    d[v.Name] = v.Value.GetString();
            }
        }
        return d;
    }

    // {{images}} 用的 JSON 数组字面量（"[\"a\",\"b\"]"）
    private static string BuildImagesJson(JsonElement inputs)
    {
        if (inputs.ValueKind == JsonValueKind.Object && inputs.TryGetProperty("images", out var imgs) && imgs.ValueKind == JsonValueKind.Array)
        {
            var list = new List<string>();
            foreach (var img in imgs.EnumerateArray())
                if (img.ValueKind == JsonValueKind.String) list.Add(img.GetString()!);
            return JsonSerializer.Serialize(list);
        }
        return "[]";
    }

    private static async Task<RunOutput> PollJob(HttpClient client, JsonElement config, Dictionary<string, string?> vars, JsonElement initialJson)
    {
        var poll = O(config, "poll");
        var id = GetByPath(initialJson, S(poll, "idPath") ?? "id");
        if (id is null || id.Value.ValueKind != JsonValueKind.String || string.IsNullOrEmpty(id.Value.GetString()))
            throw new InvalidOperationException(
                "提交任务后未找到任务 ID（检查「任务ID路径」），接口返回：" + Truncate(initialJson.GetRawText(), 300));

        var doneValues = SplitList(S(poll, "doneValues"), ["succeeded", "completed", "success"]);
        var failedValues = SplitList(S(poll, "failedValues"), ["failed", "error"]);
        var interval = Math.Max(500, I(poll, "intervalMs", 3000));
        var maxAttempts = Math.Max(1, I(poll, "maxAttempts", 200));

        var pollPath = S(poll, "path") ?? "/tasks/{id}";
        var resolvedPollPath = ResolvePlaceholders(pollPath, new Dictionary<string, string?>(vars) { ["id"] = id.Value.GetString() }).Replace("{id}", id.Value.GetString());
            var pollUrl = JoinUrl(S(config, "baseUrl"), resolvedPollPath);

        for (var attempt = 0; attempt < maxAttempts; attempt++)
        {
            await Task.Delay(interval);
            using var req = new HttpRequestMessage(HttpMethod.Get, pollUrl);
            ApplyAuth(req, config);
            req.Headers.Accept.ParseAdd("application/json");
            using var res = await client.SendAsync(req);
            var raw = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
                throw new InvalidOperationException($"查询任务状态失败 HTTP {(int)res.StatusCode}：{Truncate(raw, 300)}");

            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement.Clone();
            var status = GetByPath(root, S(poll, "statusPath") ?? "status")?.GetString() ?? "";
            if (doneValues.Contains(status))
            {
                var result = GetByPath(root, S(poll, "resultExtract"))
                    ?? throw new InvalidOperationException($"任务已完成，但按「结果提取路径」({S(poll, "resultExtract")}) 未取到结果");
                return NormalizeOutput(result, S(config, "outputMediaType"), S(config, "outputKind"));
            }
            if (failedValues.Contains(status))
                throw new InvalidOperationException($"任务失败：status = {status}");
        }
        throw new InvalidOperationException($"任务轮询超时（{maxAttempts} 次，每次间隔 {interval}ms）");
    }

    private static List<string> SplitList(string? csv, string[] dflt)
    {
        if (string.IsNullOrWhiteSpace(csv)) return [.. dflt];
        return csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
    }

    private static void ApplyAuth(HttpRequestMessage req, JsonElement config)
    {
        var apiKey = S(config, "apiKey");
        if (string.IsNullOrEmpty(apiKey)) return;
        req.Headers.TryAddWithoutValidation("Authorization", "Bearer " + apiKey);
    }

    private static string Truncate(string s, int n) => s.Length <= n ? s : s[..n];

    // 执行单个节点：config + inputs -> RunOutput
    public static async Task<RunOutput> Run(JsonElement config, JsonElement inputs)
    {
        var vars = BuildVars(config, inputs);
        var url = JoinUrl(S(config, "baseUrl"), ResolvePlaceholders(S(config, "path") ?? "/", vars));
        var timeoutMs = Math.Max(5000, I(config, "timeoutMs", 120000));

        using var http = new HttpClient { Timeout = TimeSpan.FromMilliseconds(timeoutMs) };

        using var req = new HttpRequestMessage(new HttpMethod(S(config, "method") ?? "POST"), url);
        ApplyAuth(req, config);
        req.Headers.Accept.ParseAdd("application/json");

        // 自定义请求头
        var headers = O(config, "headers");
        if (headers.ValueKind == JsonValueKind.Object)
        {
            foreach (var h in headers.EnumerateObject())
            {
                if (h.Value.ValueKind == JsonValueKind.String)
                    req.Headers.TryAddWithoutValidation(h.Name, ResolvePlaceholders(h.Value.GetString()!, vars));
            }
        }

        var method = (S(config, "method") ?? "POST").ToUpperInvariant();
        if (method != "GET" && method != "HEAD")
        {
            var bodyTemplate = O(config, "bodyTemplate");
            var bodyJson = bodyTemplate.ValueKind == JsonValueKind.Undefined
                ? JsonSerializer.Serialize(new Dictionary<string, object> { ["prompt"] = "{{prompt}}" }, JsonOpts)
                : bodyTemplate.GetRawText();
            // 多图：{{images}} 直接替换成 JSON 数组字面量（不转义），其余占位符正常处理；
            // 模板里通常写成 "{{images}}"，需连外层引号一起替换成数组
            var imagesJson = BuildImagesJson(inputs);
            bodyJson = bodyJson.Replace("\"{{images}}\"", imagesJson, StringComparison.Ordinal);
            bodyJson = bodyJson.Replace("{{images}}", imagesJson, StringComparison.Ordinal);
            bodyJson = ResolvePlaceholders(bodyJson, vars, true);
            try
            {
                using var bodyDoc = JsonDocument.Parse(bodyJson);
                req.Content = new StringContent(bodyDoc.RootElement.GetRawText(), System.Text.Encoding.UTF8, "application/json");
            }
            catch (JsonException)
            {
                throw new InvalidOperationException("请求体模板不是合法 JSON：" + Truncate(bodyJson, 200));
            }
        }

        using var res = await http.SendAsync(req);
        var raw = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"接口返回 HTTP {(int)res.StatusCode}：{Truncate(raw, 500)}");

        JsonElement json;
        try
        {
            using var doc = JsonDocument.Parse(raw);
            json = doc.RootElement.Clone();
        }
        catch (JsonException)
        {
            json = default;
        }

        // 文本输出（倒推提示词等）：直接返回文本
        if ((S(config, "outputKind") ?? "media") == "text")
        {
            string? text = null;
            if (json.ValueKind != JsonValueKind.Undefined)
            {
                var byPath = GetByPath(json, S(config, "outputExtract"));
                text = byPath is { ValueKind: JsonValueKind.String }
                    ? byPath.Value.GetString()!.Trim()
                    : FirstString(json);
            }
            // 非 JSON 响应（纯文本）直接当文本输出
            text ??= raw.Trim();
            if (string.IsNullOrEmpty(text))
                throw new InvalidOperationException("未从接口响应中提取到文本，请检查「输出提取路径」");
            return new RunOutput(text, "text");
        }

        string? extracted = null;
        if (json.ValueKind != JsonValueKind.Undefined)
        {
            var byPath = GetByPath(json, S(config, "outputExtract"));
            extracted = byPath is { ValueKind: JsonValueKind.String }
                ? byPath.Value.GetString()!.Trim()
                : FirstStringUrl(json);
        }
        var looksMedia = extracted is not null && (extracted.StartsWith("http") || extracted.StartsWith("data:"));

        if (B(O(config, "poll"), "enabled") && !looksMedia)
        {
            if (json.ValueKind == JsonValueKind.Undefined)
                throw new InvalidOperationException("提交任务后接口返回的不是合法 JSON，无法轮询");
            return await PollJob(http, config, vars, json);
        }

        var resultValue = extracted is null
            ? default
            : JsonDocument.Parse(JsonSerializer.Serialize(extracted)).RootElement.Clone();
        return NormalizeOutput(resultValue, S(config, "outputMediaType"), S(config, "outputKind"));
    }

    [GeneratedRegex(@"^(\w+)\[(\d+)\]$")]
    private static partial Regex IndexKey();
}

