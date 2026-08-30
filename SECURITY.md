# 安全策略

## 报告漏洞

如发现安全漏洞，请通过 GitHub 私有渠道（Security → Report a vulnerability）或邮件联系维护者，请勿直接公开漏洞细节。

## 已知设计

- 本项目不存储、不上传任何 API Key；所有密钥仅保存在用户本机浏览器的 localStorage 中。
- 浏览器版请求由本地后端 `localhost:3001` 发出；桌面版经 WebView2 桥接直达本机进程。
- 请勿在公开仓库或 Issue 中粘贴你的真实 API Key。

## 支持版本

当前仅维护 `main` 分支的最新版本。
