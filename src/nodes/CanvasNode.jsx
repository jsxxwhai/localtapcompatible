import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useTranslation } from '../i18n.js'

// 节点通用外壳 + 共享小组件
export function statusMeta(t) {
  return {
    idle: { label: t('status.idle'), color: '#64748b' },
    running: { label: t('status.running'), color: '#f59e0b' },
    success: { label: t('status.success'), color: '#22c55e' },
    error: { label: t('status.error'), color: '#ef4444' },
  }
}

export function StatusBadge({ status }) {
  const { t } = useTranslation()
  const meta = statusMeta(t)[status] || statusMeta(t).idle
  return (
    <span className="status-badge" style={{ color: meta.color }}>
      <span className="dot" style={{ background: meta.color }} />
      {meta.label}
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
export function NodeShell({ title, color, status, actions, children }) {
  return (
    <div className={`tn-node tn-node-${color}`}>
      <div className="tn-node-head">
        <span className="tn-node-title">{title}</span>
        <div className="tn-node-head-right">
          {actions}
          <StatusBadge status={status} />
        </div>
      </div>
      <div className="tn-node-body">{children}</div>
    </div>
  )
}

export function RunButton({ onRun, running }) {
  const { t } = useTranslation()
  return (
    <button className="btn btn-small btn-primary" onClick={onRun} disabled={running}>
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
        onChange={(e) => onSelect?.(e.target.value)}
      >
        {!apiOptions?.length && <option value="">{t('api.none')}</option>}
        {apiOptions.map((a) => (
          <option key={a.id} value={a.id}>{a.nameKey ? t(a.nameKey) : a.name} · {a.model || t('settings.noModel')}</option>
        ))}
      </select>
      <button className="btn-icon" title={t('inspector.openSettings')} onClick={() => onOpenSettings?.()}>⚙️</button>
    </div>
  )
}
