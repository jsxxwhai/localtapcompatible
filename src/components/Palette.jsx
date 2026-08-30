import { NODE_TYPES } from '../utils.js'
import { useTranslation } from '../i18n.js'

// 左侧节点面板：点击添加，或直接拖拽到画布
export default function Palette({ onAdd }) {
  const { t } = useTranslation()
  return (
    <div className="palette">
      <div className="panel-title">{t('palette.title')}</div>
      {NODE_TYPES.map((item) => (
        <button
          key={item.type}
          className="palette-item"
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
      <div className="palette-tip">{t('palette.tip')}</div>
    </div>
  )
}
