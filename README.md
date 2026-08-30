# TapNow Local — 本地 AI 无限画布

一个本地运行的类 TapNow 画布应用：**无限画布 + 节点式 AI 工作流**。
图片、视频等每个功能节点都可以接入**你自己的任意 API**（OpenAI 兼容、SiliconFlow、可灵、Seedance、Runway 等）。

## 功能

- 首次启动自动弹出「🚀 图文新手教程」，逐页讲解工具栏 / 节点库 / 画布连线 / 6 种节点 / 运行方式 / 接口配置 / AI Agent；随时可点顶部「🚀 新手教程」重看
- 无限缩放画布，节点连线组成工作流（类似 ComfyUI / TapNow）
- 节点类型：提示词、图片生成、视频生成、倒推提示词（图→文）、图片上传、预览输出
- 四种快速添加：左侧面板点击或拖拽到画布、画布空白处右键、从节点左右连接点拖线到空白处选下一步
- 从节点输出点拖线连线；拖到空白处松手弹出下一步菜单（图生图 / 图生视频 / 倒推提示词 / 预览输出）
- 图片/视频生成节点自带提示词输入框：没连上游文本时直接用框里内容，连了则用上游文本
- 节点上右键可运行 / 快速连接下一步 / 删除
- 右上角「⚙️ 设置」按板块统一配置 API（图片生成 / 视频生成 / 倒推提示词 / AI Agent），每个板块可配多个 API 版本：
  - 接口地址（Base URL + 路径）、方法、API Key、请求体 JSON 模板（占位符 {{prompt}} {{image}} {{model}} {{apiKey}}）
  - 每个 API 可「🔍 拉取模型」列表（GET /v1/models）或直接输入模型 ID，并「🔌 测试」连通性
  - 节点上的下拉框选择用哪个 API / 模型，默认记住上次运行用的那个
  - 异步任务轮询（视频接口常用：提交任务 → 查状态 → 取结果）
- 拓扑顺序自动执行：点某节点「运行」会先跑完它的上游依赖链再返回结果；「运行全部」跑全图；结果自动传到下游
- 画布自动保存在浏览器 localStorage，支持导出/导入 JSON 工程文件
- API Key 只存本地浏览器，请求由本地后端 localhost:3001 发出（无跨域限制）

## 桌面版（推荐）

已打包成 Windows 桌面软件（C# WinForms + WebView2）：**单进程、无后台驻留，关闭窗口即完全退出**，不会常驻内存。

```bash
# 构建桌面版（输出到 release/ 目录）
npm run desktop:build

# 或直接以开发方式运行桌面版
npm run desktop:run
```

运行 `release/TapNowLocal.exe` 即可。

**资源占用**：约 390MB（含系统 WebView2 渲染内核，这是网页画布类 UI 的技术下限；无独立 Node 后端进程，比 Electron 方案省约 100MB，磁盘体积仅约 5MB）。

## 浏览器版（开发模式）

也可以用浏览器调试：

```bash
npm install
npm run dev    # 前端 http://localhost:5173 ，后端 http://localhost:3001
```

桌面版与浏览器版功能完全一致。

## 交互操作

- **拖线连接**：从节点右侧输出点（或左侧输入点）拖出一条线；直接拖到另一节点输入口即连线；松手停在空白处会弹出下一步选项菜单（按来源节点类型不同：文生图/图生图/图生视频/倒推提示词/预览输出）
- **画布右键**：空白处右键弹出添加节点菜单；节点上右键可运行、快速连接、删除
- **桌面式框选**：画布空白处按住左键拖动拉出选框，框住多个节点后按 Delete 删除，或右键选中节点批量删除；中键拖动平移画布
- **面板拖拽**：左侧节点库任意项按住直接拖到画布指定位置
- **倒推提示词**：从图片/上传节点的连接点拖线到空白处选「倒推提示词」，新建视觉节点把图片描述成可复用的提示词（预设 OpenAI 视觉 / Qwen-VL 等）

## 快速上手

1. 左侧节点库添加：**提示词 → 图片生成 → 预览输出**
2. 从节点右侧输出口拖线到下一节点左侧输入口（提示词接「提示词」口，图片接「参考图」口）
3. 点击「图片生成」节点，右侧面板选预设（如 OpenAI 文生图）或手动填写：
   - Base URL：https://api.openai.com/v1
   - 路径：/images/generations
   - 模型：gpt-image-1
   - 请求体：{ "model": "{{model}}", "prompt": "{{prompt}}", "n": 1, "size": "1024x1024" }
   - 输出提取：data[0].url
4. 点节点上的 **▶ 运行**，或顶部 **运行全部**

## 异步视频接口配置示例

视频类接口一般是「提交任务 → 轮询状态」两步：

- 提交：POST {baseUrl}/videos/generations，请求体 { "model": "{{model}}", "prompt": "{{prompt}}", "image": "{{image}}" }
- 输出提取路径填任务 ID 字段，如 id
- 在配置面板打开「异步任务轮询」：
  - 查询路径：/videos/generations/{id}（{id} 会自动替换）
  - 任务ID路径 / 状态路径 / 结果提取路径：按你的服务返回字段填写
  - 完成状态、失败状态、轮询间隔、最大次数按需设置

## 桌面版技术说明

- 前端资源通过 WebView2 虚拟主机映射加载（零 HTTP 服务，无本地端口占用）
- API 调用经 window.tapnowApi 桥接直达 C# 进程（desktop/ApiBridge.cs），无跨域、无额外进程
- 执行引擎在 desktop/Runner.cs（与 server/runner.js 逻辑一致），预设见 desktop/Providers.cs
- 精简参数：关闭 GPU 合成、扩展、后台同步，限制 JS 堆，尽量降低内存

## 项目结构

```
server/               # 浏览器版后端（可选，桌面版不需要）
  index.js            # Express：托管前端 + /api/run 执行节点
  runner.js           # 节点执行引擎（模板替换、提取、轮询）
  providers.js        # 接口预设
desktop/              # 桌面版
  TapNowLocal.csproj  # C# 工程（WinForms + WebView2）
  MainForm.cs         # 主窗口与虚拟主机映射
  ApiBridge.cs        # 页面桥接（postMessage 直连宿主）
  Runner.cs           # 执行引擎（C# 版）
  Providers.cs        # 接口预设（C# 版）
src/
  App.jsx             # 画布 + 图执行 + 持久化
  api.js              # 桥接层（桌面走宿主，浏览器走 fetch）
  nodes/              # 各类节点组件
  components/         # 工具栏 / 节点库 / 配置面板 / 帮助
  utils.js            # 拓扑排序、存储等
```
