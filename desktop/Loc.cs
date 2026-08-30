namespace TapNowLocal;

// 轻量桌面端国际化字典：与 server/i18n.js 保持键一致
public static class Loc
{
    private static readonly Dictionary<string, Dictionary<string, string>> Dict = new()
    {
        ["zh"] = new()
        {
            ["api.missingConfig"] = "缺少节点配置（config）",
            ["api.missingBaseUrl"] = "缺少接口地址",
            ["api.missingDownloadUrl"] = "缺少下载地址",
            ["api.noModels"] = "返回中未找到模型列表（data[].id 或 models[].id）",
            ["api.unknownMethod"] = "未知方法: {m}",
            ["runner.outputNotText"] = "接口输出不是文本，请检查「输出提取路径」",
            ["runner.noOutput"] = "未从接口响应中提取到输出，请检查「输出提取路径」",
            ["runner.notUrl"] = "接口返回的不是 URL/图片，请检查「输出提取路径」",
            ["runner.notUrlNorBase64"] = "提取到的输出不是 URL 也不是 base64 数据",
            ["runner.badBodyJson"] = "请求体模板不是合法 JSON：{raw}",
            ["runner.httpError"] = "接口返回 HTTP {status}：{raw}",
            ["runner.pollNotJson"] = "提交任务后接口返回的不是合法 JSON，无法轮询",
            ["poll.noTaskId"] = "提交任务后未找到任务 ID（检查「任务ID路径」），接口返回：{json}",
            ["poll.statusHttp"] = "查询任务状态失败 HTTP {status}：{raw}",
            ["poll.noResult"] = "任务已完成，但按「结果提取路径」({path}) 未取到结果",
            ["poll.failed"] = "任务失败：status = {status}",
            ["poll.timeout"] = "任务轮询超时（{n} 次，每次间隔 {ms}ms）",
        },
        ["en"] = new()
        {
            ["api.missingConfig"] = "Missing node config (config)",
            ["api.missingBaseUrl"] = "Missing API base URL",
            ["api.missingDownloadUrl"] = "Missing download URL",
            ["api.noModels"] = "No model list found in response (expected data[].id or models[].id)",
            ["api.unknownMethod"] = "Unknown method: {m}",
            ["runner.outputNotText"] = "API output is not text; check the \"Output extract path\"",
            ["runner.noOutput"] = "Could not extract output from response; check the \"Output extract path\"",
            ["runner.notUrl"] = "API did not return a URL/image; check the \"Output extract path\"",
            ["runner.notUrlNorBase64"] = "Extracted output is neither a URL nor base64 data",
            ["runner.badBodyJson"] = "Body template is not valid JSON: {raw}",
            ["runner.httpError"] = "API returned HTTP {status}: {raw}",
            ["runner.pollNotJson"] = "API did not return valid JSON after submit; cannot poll",
            ["poll.noTaskId"] = "No task ID found after submit (check \"Task ID path\"); API returned: {json}",
            ["poll.statusHttp"] = "Failed to query task status, HTTP {status}: {raw}",
            ["poll.noResult"] = "Task completed but no result found at \"Result extract path\" ({path})",
            ["poll.failed"] = "Task failed: status = {status}",
            ["poll.timeout"] = "Task polling timed out ({n} attempts, {ms}ms apart)",
        },
        ["ja"] = new()
        {
            ["api.missingConfig"] = "ノード設定（config）がありません",
            ["api.missingBaseUrl"] = "API ベースURL がありません",
            ["api.missingDownloadUrl"] = "ダウンロードURL がありません",
            ["api.noModels"] = "レスポンスにモデル一覧が見つかりません（data[].id または models[].id が必要）",
            ["api.unknownMethod"] = "未知のメソッド: {m}",
            ["runner.outputNotText"] = "API 出力がテキストではありません。「出力抽出パス」を確認してください",
            ["runner.noOutput"] = "レスポンスから出力を抽出できませんでした。「出力抽出パス」を確認してください",
            ["runner.notUrl"] = "API が URL/画像を返しませんでした。「出力抽出パス」を確認してください",
            ["runner.notUrlNorBase64"] = "抽出した出力が URL でも base64 データでもありません",
            ["runner.badBodyJson"] = "リクエストボディテンプレートが正しい JSON ではありません：{raw}",
            ["runner.httpError"] = "API が HTTP {status} を返しました：{raw}",
            ["runner.pollNotJson"] = "タスク送信後に API が正しい JSON を返しませんでした。ポーリングできません",
            ["poll.noTaskId"] = "タスク ID が見つかりません（「タスクIDパス」を確認）。API 応答：{json}",
            ["poll.statusHttp"] = "タスク状態の取得に失敗 HTTP {status}：{raw}",
            ["poll.noResult"] = "タスクは完了しましたが「結果抽出パス」({path}) に結果がありません",
            ["poll.failed"] = "タスク失敗：status = {status}",
            ["poll.timeout"] = "タスクのポーリングがタイムアウトしました（{n} 回、間隔 {ms}ms）",
        },
        ["ko"] = new()
        {
            ["api.missingConfig"] = "노드 설정(config)이 없습니다",
            ["api.missingBaseUrl"] = "API 기본 URL이 없습니다",
            ["api.missingDownloadUrl"] = "다운로드 URL이 없습니다",
            ["api.noModels"] = "응답에서 모델 목록을 찾지 못했습니다 (data[].id 또는 models[].id 필요)",
            ["api.unknownMethod"] = "알 수 없는 메서드: {m}",
            ["runner.outputNotText"] = "API 출력이 텍스트가 아닙니다. \"출력 추출 경로\"를 확인하세요",
            ["runner.noOutput"] = "응답에서 출력을 추출하지 못했습니다. \"출력 추출 경로\"를 확인하세요",
            ["runner.notUrl"] = "API가 URL/이미지를 반환하지 않았습니다. \"출력 추출 경로\"를 확인하세요",
            ["runner.notUrlNorBase64"] = "추출한 출력이 URL도 base64 데이터도 아닙니다",
            ["runner.badBodyJson"] = "요청 본문 템플릿이 올바른 JSON이 아닙니다: {raw}",
            ["runner.httpError"] = "API가 HTTP {status}를 반환했습니다: {raw}",
            ["runner.pollNotJson"] = "작업 제출 후 API가 올바른 JSON을 반환하지 않아 폴링할 수 없습니다",
            ["poll.noTaskId"] = "작업 ID를 찾지 못했습니다 (\"작업 ID 경로\" 확인). API 응답: {json}",
            ["poll.statusHttp"] = "작업 상태 조회 실패 HTTP {status}: {raw}",
            ["poll.noResult"] = "작업은 완료되었지만 \"결과 추출 경로\"({path})에 결과가 없습니다",
            ["poll.failed"] = "작업 실패: status = {status}",
            ["poll.timeout"] = "작업 폴링 시간 초과 ({n}회, 간격 {ms}ms)",
        },
    };

    public static string T(string? locale, string key, params (string Key, string Value)[] vars)
    {
        var src = (locale != null && Dict.TryGetValue(locale, out var l)) ? l : Dict["zh"];
        if (!src.TryGetValue(key, out var val) && !Dict["zh"].TryGetValue(key, out val)) return key;
        foreach (var (k, v) in vars)
            val = val.Replace("{" + k + "}", v ?? "");
        return val;
    }

    public static string Normalize(string? locale)
    {
        if (locale != null && Dict.ContainsKey(locale)) return locale;
        return "zh";
    }
}
