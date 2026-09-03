import { memo, useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useTranslation } from '../i18n.js'

// 节点通用外壳 + 共享小组件
// 状态色：与 styles.css 顶部主题变量保持一致（青 = 运行/等待，绿 = 成功，红 = 出错）
export function statusMeta(t) {
  return {
    idle: { label: t('status.idle'), color: 'var(--status-idle)' },
    queued: { label: t('status.queued'), color: 'var(--status-queued)' },
    running: { label: t('status.running'), color: 'var(--status-running)' },
    success: { label: t('status.success'), color: 'var(--status-ok)' },
    error: { label: t('status.error'), color: 'var(--status-error)' },
  }
}

function fmtElapsed(ms) {
  if (ms == null || !Number.isFinite(ms)) return ''
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return s + 's'
  const m = Math.floor(s / 60)
  const rs = s % 60
  return m + 'm' + String(rs).padStart(2, '0') + 's'
}

// 运行中/排队中：显示实时累计耗时（节点自身 1s 心跳，不触发全局重渲）；结束后：显示本次耗时
export function StatusBadge({ status, runStartedAt, finishedAt }) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())
  const live = status === 'running' || status === 'queued'
  useEffect(() => {
    if (!live) return undefined
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [live])
  const meta = statusMeta(t)[status] || statusMeta(t).idle
  let elapsed = null
  if (live && Number.isFinite(runStartedAt)) {
    elapsed = Math.max(0, now - runStartedAt)
  } else if (
    (status === 'success' || status === 'error') &&
    Number.isFinite(runStartedAt) &&
    Number.isFinite(finishedAt) &&
    finishedAt >= runStartedAt
  ) {
    elapsed = finishedAt - runStartedAt
  }
  return (
    <span className="status-badge" style={{ color: meta.color }}>
      <span className="dot" style={{ background: meta.color }} />
      {meta.label}
      {elapsed != null ? <span className="status-time">· {fmtElapsed(elapsed)}</span> : null}
    </span>
  )
}

export function MediaView({ media, maxHeight }) {
  const { t } = useTranslation()
  if (!media || !media.value) {
    return <div className="media-empty">{t('media.empty')}</div>
  }
  const isVideo = media.mediaType === 'video' || /^data:video/i.test(media.value)
  const common = { style: { maxHeight: maxHeight || 180, maxWidth: '100%' } }
  return isVideo ? (
    <video src={media.value} controls playsInline preload="none" {...common} />
  ) : (
    <img src={media.value} alt={t('output.alt')} loading="lazy" decoding="async" {...common} />
  )
}

// NodeShell：节点外壳
export function NodeShell({ title, color, status, runStartedAt, finishedAt, actions, children }) {
  return (
    <div className={'tn-node tn-node-' + color} data-status={status}>
      <div className="tn-node-head">
        <span className="tn-node-title">{title}</span>
        <div className="tn-node-head-right">
          {actions}
          <StatusBadge status={status} runStartedAt={runStartedAt} finishedAt={finishedAt} />
        </div>
      </div>
      <div className="tn-node-body">{children}</div>
    </div>
  )
}

export function RunButton({ onRun, running }) {
  const { t } = useTranslation()
  return (
    <button type="button" className="btn btn-small btn-primary" onClick={onRun} disabled={running}>
      {running ? '…' : t('run.button')}
    </button>
  )
}

export function ErrorText({ message }) {
  if (!message) return null
  return <div className="node-error" title={message}>{message}</div>
}

// 输入连接点（左侧）：position 为垂直位置百分比
export const NodeHandleTarget = memo(function NodeHandleTarget({ id, top, label }) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        id={id}
        style={{ top: `${top}%` }}
        className="tn-handle tn-handle-target"
      />
      <div className="handle-label handle-label-left" style={{ top: `${top}%` }}>{label}</div>
    </>
  )
})

// 输出连接点（右侧）
export const NodeHandleSource = memo(function NodeHandleSource({ id, top, label }) {
  return (
    <>
      <Handle
        type="source"
        position={Position.Right}
        id={id}
        style={{ top: `${top}%` }}
        className="tn-handle tn-handle-source"
      />
      <div className="handle-label handle-label-right" style={{ top: `${top}%` }}>{label}</div>
    </>
  )
})

// 板块 API/模型 下拉：默认记住上次用的，可随时切换，运行就用选中的
export function ApiSelect({ apiOptions, currentApiId, onSelect, onOpenSettings }) {
  const { t } = useTranslation()
  return (
    <div className="node-api-row">
      <select
        className="node-api-select"
        value={currentApiId || ''}
        title={t('inspector.selectApi')}
        aria-label={t('inspector.selectApi')}
        onChange={(e) => onSelect?.(e.target.value)}
      >
        {!apiOptions?.length && <option value="">{t('api.none')}</option>}
        {apiOptions.map((a) => (
          <option key={a.id} value={a.id}>{a.nameKey ? t(a.nameKey) : a.name} · {a.model || t('settings.noModel')}</option>
        ))}
      </select>
      <button type="button" className="btn-icon" title={t('inspector.openSettings')} aria-label={t('inspector.openSettings')} onClick={() => onOpenSettings?.()}>⚙️</button>
    </div>
  )
}