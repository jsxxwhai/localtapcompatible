import { useCallback, useMemo, useRef, useState } from 'react'
import { apiRun } from '../api.js'
import {
  buildSystemPrompt,
  parseAgentResponse,
  normalizeAction,
  needConfirm,
} from '../agent.js'
import { buildAgentConfig } from '../categorySettings.js'
import { useTranslation } from '../i18n.js'

function describeActionLocal(a, t) {
  switch (a.op) {
    case 'addNode': return t('agent.action.addNode', { type: a.type }) + (a.text ? t('agent.action.addNodeText', { text: String(a.text).slice(0, 40) }) : '')
    case 'connect': return t('agent.action.connect', { from: a.from, to: a.to, handle: a.handle })
    case 'setText': return t('agent.action.setText', { id: a.nodeId })
    case 'setConfig': return t('agent.action.setConfig', { id: a.nodeId })
    case 'run': return a.target === 'all' ? t('agent.action.runAll') : t('agent.action.run', { id: a.target })
    case 'delete': return t('agent.action.delete', { id: a.nodeId })
    case 'move': return t('agent.action.move', { id: a.nodeId })
    case 'clear': return t('agent.action.clear')
    default: return a.op || t('agent.action.unknown')
  }
}

export default function AgentPanel({ snapshot, agentApi, agentSettings, onAgentUpdate, onOpenSettings }) {
  const { t } = useTranslation()
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
          return { ok: true, msg: describeActionLocal(action, t) }
        }
        case 'connect': {
          const from = resolve(action.from)
          const to = resolve(action.to)
          if (!from || !to) return { ok: false, msg: t('agent.notFound', { id: `from=${action.from}, to=${action.to}` }) }
          agentApi.connect(from, to, action.handle)
          return { ok: true, msg: describeActionLocal(action, t) }
        }
        case 'setText': {
          const id = resolve(action.nodeId)
          if (!id) return { ok: false, msg: t('agent.notFound', { id: action.nodeId }) }
          agentApi.setText(id, String(action.text ?? ''))
          return { ok: true, msg: describeActionLocal(action, t) }
        }
        case 'setConfig': {
          const id = resolve(action.nodeId)
          if (!id) return { ok: false, msg: t('agent.notFound', { id: action.nodeId }) }
          agentApi.setConfig(id, action.config)
          return { ok: true, msg: describeActionLocal(action, t) }
        }
        case 'run': {
          if (action.target === 'all') {
            await agentApi.runAll()
          } else {
            const id = resolve(action.target)
            if (!id) return { ok: false, msg: t('agent.notFound', { id: action.target }) }
            await agentApi.run(id)
          }
          return { ok: true, msg: describeActionLocal(action, t) }
        }
        case 'delete': {
          const id = resolve(action.nodeId)
          if (!id) return { ok: false, msg: t('agent.notFound', { id: action.nodeId }) }
          agentApi.remove(id)
          return { ok: true, msg: describeActionLocal(action, t) }
        }
        case 'move': {
          const id = resolve(action.nodeId)
          if (!id) return { ok: false, msg: t('agent.notFound', { id: action.nodeId }) }
          agentApi.move(id, action.position)
          return { ok: true, msg: describeActionLocal(action, t) }
        }
        case 'clear':
          agentApi.clear()
          return { ok: true, msg: describeActionLocal(action, t) }
        default:
          return { ok: false, msg: t('agent.unknownOp', { op: action.op }) }
      }
    },
    [agentApi, resolve, t]
  )

  const setItemStatus = useCallback((index, patch) => {
    setQueue((q) => q.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }, [])

  const runAgent = useCallback(async () => {
    if (!userInput.trim()) {
      agentApi.toast(t('agent.needInput'), 'error')
      return
    }
    const runConfig = buildAgentConfig(agentSettings ? { agent: agentSettings } : null)
    if (!runConfig) {
      agentApi.toast(t('agent.needApi'), 'error')
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
        .map((a) => ({ action: a, desc: describeActionLocal(a, t), status: 'pending', error: '' }))
      if (!items.length) {
        agentApi.toast(t('agent.noActions'), 'info')
        setRunning(false)
        return
      }
      setQueue(items)

      for (let i = 0; i < items.length; i++) {
        if (needConfirm(items[i].action, mode)) continue
        const res = await applyAction(items[i].action)
        setItemStatus(i, res.ok ? { status: 'applied' } : { status: 'error', error: res.msg })
        if (!res.ok) break
      }
    } catch (err) {
      agentApi.toast(t('agent.failed', { msg: err.message || err }), 'error')
    } finally {
      setRunning(false)
    }
  }, [userInput, agentSettings, mode, snapshot, agentApi, applyAction, setItemStatus, t])

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
        if (!edited || !edited.op) throw new Error('missing op')
        setItemStatus(index, { action: edited, desc: describeActionLocal(edited, t), status: 'pending', error: '' })
        setEditingIdx(null)
        const res = await applyAction(edited)
        setItemStatus(index, res.ok ? { status: 'applied' } : { status: 'error', error: res.msg })
      } catch (err) {
        agentApi.toast(t('agent.editInvalid', { msg: err.message }), 'error')
      }
    },
    [editText, setItemStatus, applyAction, agentApi, t]
  )

  const modeMeta = useMemo(
    () => ({
      pending: { label: t('agent.pending'), color: '#f59e0b' },
      applied: { label: t('agent.applied'), color: '#22c55e' },
      rejected: { label: t('agent.rejected'), color: '#64748b' },
      error: { label: t('agent.error'), color: '#ef4444' },
    }),
    [t]
  )

  const examples = [t('agent.ex1'), t('agent.ex2'), t('agent.ex3')]

  return (
    <div className="agent-panel">
      <div className="agent-head">
        <span className="agent-title">{t('agent.title')}</span>
        <span className="agent-badge">{t('agent.badge')}</span>
      </div>

      <div className="agent-section-label">{t('agent.modeLabel')}</div>
      <div className="mode-cards">
        {[1, 2, 3].map((id) => (
          <button
            key={id}
            className={`mode-card ${mode === id ? 'active' : ''}`}
            onClick={() => setMode(id)}
          >
            <span className="mode-icon">{['🔒', '⚖️', '🤖'][id - 1]}</span>
            <span className="mode-title">{t(`mode.${id}.title`)}</span>
            <span className="mode-desc">{t(`mode.${id}.desc`)}</span>
          </button>
        ))}
      </div>

      <div className="agent-section-label">{t('agent.apiLabel')}</div>
      <select
        className="agent-api-select"
        value={agentSettings?.currentApiId || ''}
        onChange={(e) => selectAgentApi(e.target.value)}
      >
        {(agentSettings?.apis || []).map((a) => (
          <option key={a.id} value={a.id}>{a.name} · {a.model || t('settings.noModel')}</option>
        ))}
      </select>
      <div className="agent-api-row">
        <span>{t('agent.apiCurrentModel', { model: agentSettings?.model || t('settings.unset') })}</span>
        <button className="btn btn-small" onClick={onOpenSettings}>{t('agent.apiOpenSettings')}</button>
      </div>

      <div className="agent-section-label">{t('agent.inputLabel')}</div>
      <textarea
        className="agent-input"
        rows={3}
        placeholder={t('agent.inputPlaceholder')}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
      />
      <div className="agent-examples">
        {examples.map((ex) => (
          <button key={ex} className="agent-example" onClick={() => setUserInput(ex)}>
            {ex}
          </button>
        ))}
      </div>
      <button className="btn btn-primary agent-run" onClick={runAgent} disabled={running}>
        {running ? t('agent.running') : t('agent.run')}
      </button>

      {summary && (
        <div className="agent-summary">
          <span className="agent-summary-label">{t('agent.plan')}</span>
          {summary}
        </div>
      )}

      {queue.length > 0 && (
        <div className="agent-queue">
          <div className="agent-queue-head">
            <span>{t('agent.queueHead', { count: queue.filter((x) => x.status === 'pending').length })}</span>
            <span className="agent-queue-actions">
              <button className="btn btn-small btn-primary" onClick={confirmAll}>{t('agent.confirmAll')}</button>
              <button className="btn btn-small" onClick={rejectAll}>{t('agent.rejectAll')}</button>
              <button className="btn btn-small btn-ghost" onClick={clearQueue}>{t('agent.clearQueue')}</button>
            </span>
          </div>
          {queue.map((item, i) => {
            const meta = modeMeta[item.status] || modeMeta.pending
            return (
              <div key={i} className={`queue-item status-${item.status}`}>
                <div className="queue-item-row">
                  <span className="queue-dot" style={{ background: meta.color }} />
                  <span className="queue-desc">{item.desc}</span>
                  <span className="queue-status" style={{ color: meta.color }}>{meta.label}</span>
                </div>
                {item.action.importance === 'high' && item.status === 'pending' && (
                  <span className="queue-important">{t('agent.important')}</span>
                )}
                {item.status === 'error' && <div className="queue-error">{item.error}</div>}
                {item.status === 'pending' && (
                  <div className="queue-buttons">
                    <button className="btn btn-small btn-primary" onClick={() => confirmItem(i)}>{t('agent.confirm')}</button>
                    <button className="btn btn-small" onClick={() => startEdit(i)}>{t('agent.edit')}</button>
                    <button className="btn btn-small" onClick={() => rejectItem(i)}>{t('agent.reject')}</button>
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
                    <button className="btn btn-small btn-primary" onClick={() => applyEdit(i)}>{t('agent.apply')}</button>
                    <button className="btn btn-small" onClick={() => setEditingIdx(null)}>{t('agent.cancel')}</button>
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
