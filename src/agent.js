import { translate, loadLocale } from './i18n.js'

// Agent 全面掌控：画布快照 → 系统提示词 → 解析 AI 返回的 JSON 操作指令

export function buildSystemPrompt(snapshot) {
  return `你是 "TapNow Local" 无限画布（节点式 AI 工作流，类似 ComfyUI）的 AI 掌控 Agent。
你的任务：根据用户的指令，直接规划对画布的操作，返回严格的 JSON。

可用节点类型：
- text 提示词（输出文本，出口 handle=output）
- image 图片生成（输入口 handle：prompt=提示词, image=参考图；出口 output）
- video 视频生成（输入口 handle：prompt, image；出口 output）
- reverse 倒推提示词（输入口 handle：image；输出文本，出口 output）
- upload 图片上传（出口 output）
- output 预览输出（输入口 handle：media）

画布当前状态（JSON）：
${JSON.stringify(snapshot)}

要求：
1. 只返回一个 JSON 对象，禁止 Markdown 代码块，禁止多余文字。
2. 格式：{"summary":"一句话说明本次改动","actions":[{...}]}
3. 可用操作 op（每个操作都可带 importance:"high" 或 "low"）：
   - addNode:  { op, type:"text|image|video|reverse|upload|output", id:"新节点临时ID(如 n1)", text?:"提示词文本", position?:{x,y}, config?:{任意节点配置字段} }
   - connect:  { op, from:"已有节点id或临时ID", to:"目标节点id或临时ID", handle:"prompt|image|media" }
   - setText:  { op, nodeId, text }
   - setConfig:{ op, nodeId, config:{...} }
   - run:      { op, target:"节点id" 或 "all" }
   - delete:   { op, nodeId }
   - move:     { op, nodeId, position:{x,y} }
   - clear:    { op }
4. 引用已有节点必须使用状态中的 id；新建节点用临时 id（n1、n2...），后续操作可引用。
5. importance 规则：删除、清空、修改已有配置/文本、运行全部等影响大的操作标 "high"；新建节点、连线、移动等低风险标 "low"。
6. 为实现用户意图，请自主规划完整流程（如：添加提示词节点→添加图片生成节点→连线→运行）。不要问问题，直接给操作。
7. ${translate(loadLocale(), 'agent.langInstruction')}`
}

export function parseAgentResponse(raw) {
  let text = String(raw ?? '').trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) text = fence[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error(translate(loadLocale(), 'agent.noJson'))
  let plan
  try {
    plan = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error(translate(loadLocale(), 'agent.badJson'))
  }
  if (!plan || typeof plan !== 'object') throw new Error(translate(loadLocale(), 'agent.badFormat'))
  if (!Array.isArray(plan.actions)) throw new Error(translate(loadLocale(), 'agent.noActionsArr'))
  return { summary: String(plan.summary || ''), actions: plan.actions }
}

const OPS = new Set(['addNode', 'connect', 'setText', 'setConfig', 'run', 'delete', 'move', 'clear'])

export function normalizeAction(a) {
  if (!a || typeof a !== 'object') return null
  if (!OPS.has(a.op)) return null
  return { ...a, importance: a.importance === 'high' ? 'high' : 'low' }
}

export function needConfirm(action, mode) {
  if (mode === 3) return false
  if (mode === 1) return true
  return action.importance === 'high'
}
