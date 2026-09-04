import { useState } from 'react'
import { NODE_TYPES } from '../utils.js'
import { useTranslation } from '../i18n.js'

// 左侧节点面板：按功能分组展示；点击添加、可拖拽、点击分组标题可折叠
// 与画布节点卡片共享同一套类型色，让左侧节点库也呈现“彩色模块”视觉
const NODE_TINT = {
  text: '#8b9cf7',
  image: '#4dc2eb',
  video: '#7cc7ff',
  reverse: '#c4b5fd',
  upload: '#fbbf24',
  asset: '#4ade80',
  output: '#2dd4bf',
}
const GROUPS = [
  { key: 'input', icon: '📥', types: ['text', 'upload'] },
  { key: 'generate', icon: '✨', types: ['image', 'video', 'reverse'] },
  { key: 'asset', icon: '🗂️', types: ['asset'] },
  { key: 'output', icon: '🖥️', types: ['output'] },
]

const CLOSED_KEY = 'lct-palette-closed'

function loadClosed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLOSED_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export default function Palette({ onAdd }) {
  const { t } = useTranslation()
  const [closed, setClosed] = useState(loadClosed)

  const toggleGroup = (key) => {
    setClosed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      try {
        localStorage.setItem(CLOSED_KEY, JSON.stringify([...next]))
      } catch {}
      return next
    })
  }

  return (
    <div className="palette">
      <div className="panel-title palette-head">
        <span>{t('palette.title')}</span>
        <span className="palette-count">{NODE_TYPES.length}</span>
      </div>
      {GROUPS.map((group) => {
        const list = NODE_TYPES.filter((n) => group.types.includes(n.type))
        if (!list.length) return null
        const isClosed = closed.has(group.key)
        return (
          <div className="palette-group" key={group.key}>
            <button
              type="button"
              className="palette-group-head"
              onClick={() => toggleGroup(group.key)}
              aria-expanded={!isClosed}
              title={isClosed ? t('palette.expand') : t('palette.collapse')}
            >
              <span className="palette-group-title">
                <span className="palette-group-icon">{group.icon}</span>
                <span>{t(`palette.group.${group.key}`)}</span>
              </span>
              <span className="palette-chevron">{isClosed ? '▸' : '▾'}</span>
            </button>
            {!isClosed && (
              <div className="palette-items">
                {list.map((item) => (
                  <button
                    type="button"
                    key={item.type}
                    className="palette-item"
                    style={{ "--node-tint": NODE_TINT[item.type] || "var(--accent)" }}
                    title={t(item.descKey)}
                    aria-label={t(item.labelKey)}
                    draggable
                    onClick={() => onAdd(item.type)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/reactflow', item.type)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                  >
                    <span className="palette-icon">{item.icon}</span>
                    <span className="palette-info">
                      <span className="palette-label">{t(item.labelKey)}</span>
                      <span className="palette-desc">{t(item.descKey)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
      <div className="palette-tip">{t('palette.tip')}</div>
    </div>
  )
}
