import { NODE_TYPES } from '../utils.js'

// 左侧节点面板：点击添加，或直接拖拽到画布
export default function Palette({ onAdd }) {
  return (
    <div className="palette">
      <div className="panel-title">节点库</div>
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
            <span className="palette-label">{item.label}</span>
            <span className="palette-desc">{item.desc}</span>
          </span>
        </button>
      ))}
      <div className="palette-tip">
        四种添加方式：
        <br />· 点这里直接添加
        <br />· 拖拽到画布任意位置
        <br />· 画布空白处右键
        <br />· 从节点输出点拖线到空白处选下一步
      </div>
    </div>
  )
}
