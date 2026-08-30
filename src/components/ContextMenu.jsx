import { useEffect, useRef } from 'react'

// 通用弹出菜单：用于画布右键 / 节点右键 / “+”拖出松手
export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const closeIfOutside = (e) => {
      if (ref.current && ref.current.contains(e.target)) return
      onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', closeIfOutside)
    window.addEventListener('contextmenu', closeIfOutside)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', onClose)
    window.addEventListener('scroll', onClose, true)
    return () => {
      window.removeEventListener('mousedown', closeIfOutside)
      window.removeEventListener('contextmenu', closeIfOutside)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onClose)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  return (
    <div className="ctx-menu" ref={ref} style={{ left: x, top: y }} onContextMenu={(e) => e.stopPropagation()}>
      {items.map((item, i) =>
        item.divider ? (
          <div key={`div-${i}`} className="ctx-divider" />
        ) : (
          <button
            key={`${item.label}-${i}`}
            className="ctx-item"
            onClick={() => {
              item.action()
              onClose()
            }}
          >
            <span className="ctx-label">{item.label}</span>
            {item.hint && <span className="ctx-hint">{item.hint}</span>}
          </button>
        )
      )}
    </div>
  )
}
