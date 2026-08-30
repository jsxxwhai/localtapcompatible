import { useEffect, useRef } from 'react'

// 通用弹出菜单：用于画布右键 / 节点右键 / “+”拖出松手
// 支持键盘操作：↑↓ 移动、Enter 执行、Esc 关闭
export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const closeIfOutside = (e) => {
      if (ref.current && ref.current.contains(e.target)) return
      onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      const menu = ref.current
      if (!menu) return
      const btns = Array.from(menu.querySelectorAll('button.ctx-item'))
      if (!btns.length) return
      const idx = btns.indexOf(document.activeElement)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const dir = e.key === 'ArrowDown' ? 1 : -1
        const next = idx < 0 ? (dir > 0 ? 0 : btns.length - 1) : (idx + dir + btns.length) % btns.length
        btns[next].focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        btns[0].focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        btns[btns.length - 1].focus()
      }
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
    <div className="ctx-menu" ref={ref} style={{ left: x, top: y }} role="menu" onContextMenu={(e) => e.stopPropagation()}>
      {items.map((item, i) =>
        item.divider ? (
          <div key={`div-${i}`} className="ctx-divider" />
        ) : (
          <button
            key={`${item.label}-${i}`}
            type="button"
            role="menuitem"
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
