import { translate, loadLocale } from './i18n.js'

// Agent 全面掌控：画布快照 → 系统提示词 → 解析 AI 返回的 JSON 操作指令
export function buildSystemPrompt(snapshot, refs = []) {
  const locale = loadLocale()
  let base = translate(locale, 'agent.systemPrompt', { snapshot: JSON.stringify(snapshot) })
  if (Array.isArray(refs) && refs.length) {
    base += '\n\n' + translate(locale, 'agent.refBlock', {
      refs: refs.map((r) => `${r.type}:${r.id}${r.preview ? '=' + String(r.preview).slice(0, 60) : ''}`).join(' | '),
    })
  }
  return base + '\n7. ' + translate(locale, 'agent.langInstruction')
}

export function parseAgentResponse(raw) {
  let text = String(raw ?? '')
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
