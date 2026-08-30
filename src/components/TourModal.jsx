import { useState } from 'react'

// 首次使用图文教程：覆盖所有板块，配真实界面截图
const SLIDES = [
  {
    title: '欢迎使用 TapNow Local',
    img: '/tour/01-welcome.png',
    text: (
      <p>
        一个<b>本地运行</b>的类 TapNow 无限画布：把「提示词、图片生成、视频生成、倒推提示词」等板块像搭积木一样连起来，
        每个节点都能接入<b>你自己的任意 AI API</b>。所有数据只存在本机，不占后台内存，关掉窗口即完全退出。
      </p>
    ),
    list: ['节点式 AI 工作流（类似 ComfyUI / TapNow）', '图片 / 视频 / 提示词等节点可自定义任意 API', '本地运行，无云端、无后台驻留'],
  },
  {
    title: '顶部工具栏',
    img: '/tour/02-toolbar.png',
    text: <p>所有全局操作都在顶部一行里。</p>,
    list: ['▶ 运行全部：按连线顺序跑完整张图', '💾 保存 / 📤 导出 / 📥 导入：自动保存 + JSON 工程文件备份', '✚ 清空、❓ 帮助、🚀 新手教程（本教程随时可重开）', '⚙️ 设置：每个板块配置多个 API 与模型'],
  },
  {
    title: '左侧节点库',
    img: '/tour/03-palette.png',
    text: <p>左侧面板有 6 种节点，是搭建工作流的“积木”。</p>,
    list: ['点一下 = 直接添加到画布', '按住拖到画布任意位置松开 = 放在指定位置', '节点类型：提示词、图片生成、视频生成、倒推提示词、图片上传、预览输出'],
  },
  {
    title: '画布与连线',
    img: '/tour/04-canvas.png',
    text: <p>画布是无限缩放的，连线是工作流的核心。</p>,
    list: ['从节点左右两端的连接点拖线', '拖到另一节点的输入口 = 直接连线', '拖到空白处松手 = 弹出「下一步」菜单（文生图 / 图生视频 / 倒推提示词 / 预览输出…）', '画布空白处右键 = 添加节点；节点上右键 = 运行 / 快速连接 / 删除', '左键拖空白处 = 框选节点（像桌面一样），选中后按 Delete 或右键菜单删除', '滚轮缩放；按住鼠标中键拖动 = 平移画布'],
  },
  {
    title: '6 种节点各有什么用',
    img: '/tour/04-canvas.png',
    text: <p>每种节点只做一件事，连起来就是完整流程。</p>,
    list: [
      '✏️ 提示词：输入文本，作为上游提示词',
      '🖼️ 图片生成：文生图 / 图生图（接收提示词 + 参考图）',
      '🎬 视频生成：文生视频 / 图生视频（支持异步轮询）',
      '🔍 倒推提示词：把一张图描述成可复用的提示词',
      '📁 图片上传：选一张本地图片作为参考图',
      '🖥️ 预览输出：自动显示上游结果，可一键下载',
    ],
  },
  {
    title: '怎么运行',
    img: '/tour/04-canvas.png',
    text: <p>运行分两种粒度，结果会自动传给下游。</p>,
    list: [
      '节点上的 ▶ 运行 = 先按顺序跑完它的上游依赖链，再返回结果（不会跑全图）',
      '顶部 ▶ 运行全部 = 整张图按连线顺序执行',
      '图片 / 视频生成节点可直接在节点里输入提示词（连了上游文本则优先用上游的）',
      '跑完的图片 / 视频会缓存在节点上，并自动传到下游节点',
    ],
  },
  {
    title: '⚙️ 板块设置（右上角齿轮）',
    img: '/tour/05-node-config.png',
    text: <p>每个板块（图片生成 / 视频生成 / 倒推提示词 / AI Agent）的 API 都在 <b>⚙️ 设置</b> 里统一管理，一个板块可以配多个 API 版本。</p>,
    list: [
      '一个板块配多个 API：新增空白 / 从内置预设一键添加 / 复制 / 设为当前',
      '每个 API 都能「🔍 拉取模型」列表（如 GET /v1/models），或直接输入模型 ID',
      '「🔌 测试」当场验证这个 API + 模型能不能用',
      '节点上的下拉框选择用哪个 API / 模型，默认记住上次运行用的那个',
      '视频接口支持异步轮询配置（提交任务 → 查状态 → 取结果）',
    ],
  },
  {
    title: '右侧「AI Agent」',
    img: '/tour/06-agent.png',
    text: <p>一个能直接操控整个画布的 Agent，API 同样在 ⚙️ 设置 里统一管理，可配多个模型。</p>,
    list: [
      '输入一句话，AI 自动规划：搭节点、连线、运行',
      'Agent 的 API / 模型在 ⚙️ 设置 里配置（支持拉取模型列表 + 测试）',
      '🔒 全确认模式：每个改动都要你确认，不满意可直接改意见',
      '⚖️ 智能确认：低风险改动自动执行，重要改动（删除 / 改配置 / 运行全部）让你确认',
      '🤖 全自动模式：所有操作直接执行，无需确认',
    ],
  },
  {
    title: '开始使用',
    img: '/tour/01-welcome.png',
    text: <p>三步上手：</p>,
    list: [
      '1️⃣ 左侧节点库拖一个「提示词」到画布',
      '2️⃣ 从它右侧输出点拖线连到「图片生成」节点',
      '3️⃣ 点节点上的 ▶ 运行，看结果',
    ],
    last: true,
  },
]

export default function TourModal({ onClose, onDone }) {
  const [i, setI] = useState(0)
  const s = SLIDES[i]
  const isLast = i === SLIDES.length - 1
  const next = () => (isLast ? onDone?.() : setI((v) => v + 1))

  return (
    <div className="tour-overlay">
      <div className="tour-card">
        <div className="tour-head">
          <span className="tour-title">🚀 新手图文教程</span>
          <span className="tour-step">{i + 1} / {SLIDES.length}</span>
          <button className="btn btn-small btn-ghost" onClick={onDone}>跳过</button>
        </div>
        <div className="tour-body">
          <div className="tour-visual">
            <img src={s.img} alt={s.title} />
            {s.img2 && <img src={s.img2} alt={s.title + ' 2'} />}
          </div>
          <div className="tour-text">
            <h3>{s.title}</h3>
            {s.text}
            <ul>
              {s.list.map((t, k) => (
                <li key={k}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="tour-nav">
          <button className="btn" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
            ← 上一步
          </button>
          <div className="tour-dots">
            {SLIDES.map((_, k) => (
              <span key={k} className={k === i ? 'active' : ''} onClick={() => setI(k)} />
            ))}
          </div>
          <button className="btn btn-primary" onClick={next}>
            {isLast ? '✓ 开始使用' : '下一步 →'}
          </button>
        </div>
      </div>
    </div>
  )
}
