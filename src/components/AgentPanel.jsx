import { useCallback, useMemo, useRef, useState } from 'react'
import { apiRun } from '../api.js'
import {
  buildSystemPrompt,
  parseAgentResponse,
  normalizeAction,
  describeAction,
  needConfirm,
  MODES,
} from '../agent.js'
import { buildAgentConfig } from '../categorySettings.js'

// 右侧 Agent 面板：AI 直接操控整个画布，带三种确认模式；API 在右上角 ⚙️ 板块设置统一管理
export default function AgentPanel({ snapshot, agentApi, agentSettings, onAgentUpdate, onOpenSettings }) {
  const [userInput, setUserInput] = useState('')
  const [mode, setMode] = useState(1)
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState('')
  const [queue, setQueue] = useState([])
  const [editingIdx, setEditingIdx] = useState(null)
  const [editText, setEditText] = useState('')

  const tempMap = useRef({})
  const queueRef = useRef(queue)
  queueRef.current = queue

  const selectAgentApi = useCallback(
    (apiId) => {
      onAgentUpdate?.((s) => {
        const api = s?.agent?.apis.find((a) => a.id === apiId)
        if (!api) return s
        return { ...s, agent: { ...s.agent, currentApiId: apiId, model: api.model || '' } }
      })
    },
    [onAgentUpdate]
  )

  // ---------- 执行动作 ----------
  const resolve = useCallback((id) => {
    if (!id) return undefined
    if (tempMap.current[id]) return tempMap.current[id]
    if (snapshot?.nodes?.some((n) => n.id === id)) return id
    return undefined
  }, [snapshot])

  const applyAction = useCallback(
    async (action) => {
      switch (action.op) {
        case 'addNode': {
          const pos = action.position || { x: 120 + Math.random() * 160, y: 120 + Math.random() * 120 }
          const id = agentApi.addNode(action.type, pos, { text: action.text, config: action.config })
          if (action.id) tempMap.current[action.id] = id
          return { ok: true, msg: describeAction(action) }
        }
        case 'connect': {
          const from = resolve(action.from)
          const to = resolve(action.to)
          if (!from || !to) return { ok: false, msg: `找不到节点（from=${action.from}, to=${action.to}）` }
          agentApi.connect(from, to, action.handle)
          return { ok: true, msg: describeAction(action) }
        }
        case 'setText': {
          const id = resolve(action.nodeId)
          if (!id) return { ok: false, msg: `找不到节点 ${action.nodeId}` }
          agentApi.setText(id, String(action.text ?? ''))
          return { ok: true, msg: describeAction(action) }
        }
        case 'setConfig': {
          const id = resolve(action.nodeId)
          if (!id) return { ok: false, msg: `找不到节点 ${action.nodeId}` }
          agentApi.setConfig(id, action.config)
          return { ok: true, msg: describeAction(action) }
        }
        case 'run': {
          if (action.target === 'all') {
            await agentApi.runAll()
          } else {
            const id = resolve(action.target)
            if (!id) return { ok: false, msg: `找不到节点 ${action.target}` }
            await agentApi.run(id)
          }
          return { ok: true, msg: describeAction(action) }
        }
        case 'delete': {
          const id = resolve(action.nodeId)
          if (!id) return { ok: false, msg: `找不到节点 ${action.nodeId}` }
          agentApi.remove(id)
          return { ok: true, msg: describeAction(action) }
        }
        case 'move': {
          const id = resolve(action.nodeId)
          if (!id) return { ok: false, msg: `找不到节点 ${action.nodeId}` }
          agentApi.move(id, action.position)
          return { ok: true, msg: describeAction(action) }
        }
        case 'clear':
          agentApi.clear()
          return { ok: true, msg: describeAction(action) }
        default:
          return { ok: false, msg: `未知操作 ${action.op}` }
      }
    },
    [agentApi, resolve]
  )

  const setItemStatus = useCallback((index, patch) => {
    setQueue((q) => q.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }, [])

  const runAgent = useCallback(async () => {
    if (!userInput.trim()) {
      agentApi.toast('请先输入你的指令', 'error')
      return
    }
    const runConfig = buildAgentConfig(agentSettings ? { agent: agentSettings } : null)
    if (!runConfig) {
      agentApi.toast('请先在右上角 ⚙️ 设置里配置 Agent 板块的 API', 'error')
      return
    }
    setRunning(true)
    setSummary('')
    setQueue([])
    setEditingIdx(null)
    tempMap.current = {}
    try {
      const data = await apiRun(runConfig, {
        vars: { system: buildSystemPrompt(snapshot) },
        prompt: userInput,
      })
      const plan = parseAgentResponse(data.output?.value)
      setSummary(plan.summary)
      const items = plan.actions
        .map((a) => normalizeAction(a))
        .filter(Boolean)
        .map((a) => ({ action: a, desc: describeAction(a), status: 'pending', error: '' }))
      if (!items.length) {
        agentApi.toast('Agent 没有返回任何操作', 'info')
        setRunning(false)
        return
      }
      setQueue(items)

      // 自动执行不需要确认的操作（按顺序，出错即停）
      for (let i = 0; i < items.length; i++) {
        if (needConfirm(items[i].action, mode)) continue
        const res = await applyAction(items[i].action)
        setItemStatus(i, res.ok ? { status: 'applied' } : { status: 'error', error: res.msg })
        if (!res.ok) break
      }
    } catch (err) {
      agentApi.toast(`Agent 执行失败：${err.message || err}`, 'error')
    } finally {
      setRunning(false)
    }
  }, [userInput, agentSettings, mode, snapshot, agentApi, applyAction, setItemStatus])

  const confirmItem = useCallback(
    async (index) => {
      const item = queueRef.current[index]
      if (!item) return
      const res = await applyAction(item.action)
      setItemStatus(index, res.ok ? { status: 'applied' } : { status: 'error', error: res.msg })
    },
    [applyAction, setItemStatus]
  )

  const rejectItem = useCallback(
    (index) => setItemStatus(index, { status: 'rejected' }),
    [setItemStatus]
  )

  const confirmAll = useCallback(async () => {
    const items = queueRef.current
    for (let i = 0; i < items.length; i++) {
      if (items[i].status !== 'pending') continue
      const res = await applyAction(items[i].action)
      setItemStatus(i, res.ok ? { status: 'applied' } : { status: 'error', error: res.msg })
      if (!res.ok) break
    }
  }, [applyAction, setItemStatus])

  const rejectAll = useCallback(() => {
    setQueue((q) => q.map((x) => (x.status === 'pending' ? { ...x, status: 'rejected' } : x)))
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
    setSummary('')
    setEditingIdx(null)
  }, [])

  const startEdit = useCallback((index) => {
    setEditingIdx(index)
    setEditText(JSON.stringify(queueRef.current[index].action, null, 2))
  }, [])

  const applyEdit = useCallback(
    async (index) => {
      try {
        const edited = JSON.parse(editText)
        if (!edited || !edited.op) throw new Error('缺少 op 字段')
        setItemStatus(index, { action: edited, desc: describeAction(edited), status: 'pending', error: '' })
        setEditingIdx(null)
        const res = await applyAction(edited)
        setItemStatus(index, res.ok ? { status: 'applied' } : { status: 'error', error: res.msg })
      } catch (err) {
        agentApi.toast(`修改后的 JSON 无效：${err.message}`, 'error')
      }
    },
    [editText, setItemStatus, applyAction, agentApi]
  )

  const statusMeta = useMemo(
    () => ({
      pending: { label: '待确认', color: '#f59e0b' },
      applied: { label: '已执行', color: '#22c55e' },
      rejected: { label: '已拒绝', color: '#64748b' },
      error: { label: '失败', color: '#ef4444' },
    }),
    []
  )

  return (
    <div className="agent-panel">
      <div className="agent-head">
        <span className="agent-title">🤖 Agent 全面掌控</span>
        <span className="agent-badge">AI</span>
      </div>

      {/* 三种模式 */}
      <div className="agent-section-label">执行模式</div>
      <div className="mode-cards">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-card ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            <span className="mode-icon">{m.icon}</span>
            <span className="mode-title">{m.title}</span>
            <span className="mode-desc">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Agent API（板块设置统一管理） */}
      <div className="agent-section-label">Agent API（⚙️ 设置里统一管理）</div>
      <select
        className="agent-api-select"
        value={agentSettings?.currentApiId || ''}
        onChange={(e) => selectAgentApi(e.target.value)}
      >
        {(agentSettings?.apis || []).map((a) => (
          <option key={a.id} value={a.id}>{a.name} · {a.model || '未设模型'}</option>
        ))}
      </select>
      <div className="agent-api-row">
        <span>当前模型：{agentSettings?.model || '未设置'}</span>
        <button className="btn btn-small" onClick={onOpenSettings}>⚙️ 板块设置</button>
      </div>

      {/* 指令输入 */}
      <div className="agent-section-label">指令</div>
      <textarea
        className="agent-input"
        rows={3}
        placeholder='例如：帮我搭一个“猫咪照片→图生视频”的流程并运行'
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
      />
      <div className="agent-examples">
        {['搭一个图生视频流程并运行', '把图片倒推成提示词', '画一只会飞的鲸鱼，星空背景'].map((ex) => (
          <button key={ex} className="agent-example" onClick={() => setUserInput(ex)}>
            {ex}
          </button>
        ))}
      </div>
      <button className="btn btn-primary agent-run" onClick={runAgent} disabled={running}>
        {running ? '🤖 思考执行中…' : '🚀 交给 Agent 执行'}
      </button>

      {/* 摘要 */}
      {summary && (
        <div className="agent-summary">
          <span className="agent-summary-label">Agent 计划</span>
          {summary}
        </div>
      )}

      {/* 操作队列 */}
      {queue.length > 0 && (
        <div className="agent-queue">
          <div className="agent-queue-head">
            <span>操作队列（{queue.filter((x) => x.status === 'pending').length} 待处理）</span>
            <span className="agent-queue-actions">
              <button className="btn btn-small btn-primary" onClick={confirmAll}>全部确认</button>
              <button className="btn btn-small" onClick={rejectAll}>全部拒绝</button>
              <button className="btn btn-small btn-ghost" onClick={clearQueue}>清空</button>
            </span>
          </div>
          {queue.map((item, i) => {
            const meta = statusMeta[item.status] || statusMeta.pending
            return (
              <div key={i} className={`queue-item status-${item.status}`}>
                <div className="queue-item-row">
                  <span className="queue-dot" style={{ background: meta.color }} />
                  <span className="queue-desc">{item.desc}</span>
                  <span className="queue-status" style={{ color: meta.color }}>{meta.label}</span>
                </div>
                {item.action.importance === 'high' && item.status === 'pending' && (
                  <span className="queue-important">重要</span>
                )}
                {item.status === 'error' && <div className="queue-error">{item.error}</div>}
                {item.status === 'pending' && (
                  <div className="queue-buttons">
                    <button className="btn btn-small btn-primary" onClick={() => confirmItem(i)}>✅ 确认</button>
                    <button className="btn btn-small" onClick={() => startEdit(i)}>✏️ 修改</button>
                    <button className="btn btn-small" onClick={() => rejectItem(i)}>❌ 拒绝</button>
                  </div>
                )}
                {editingIdx === i && (
                  <div className="queue-edit">
                    <textarea
                      className="mono"
                      rows={6}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <button className="btn btn-small btn-primary" onClick={() => applyEdit(i)}>应用修改并执行</button>
                    <button className="btn btn-small" onClick={() => setEditingIdx(null)}>取消</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
