import { memo } from 'react'
import { NodeShell, NodeHandleSource, ErrorText } from './CanvasNode.jsx'

// 提示词节点：纯文本输入，输出字符串
function TextNodeInner({ data }) {
  return (
    <NodeShell title="提示词" color="text" status={data.status}>
      <NodeHandleSource id="output" top={50} label="文本" />
      <textarea
        className="tn-textarea"
        rows={3}
        placeholder="输入提示词，例如：赛博朋克风格的街景，电影感打光…"
        value={data.text}
        onChange={(e) => data.onText?.(e.target.value)}
      />
      <ErrorText message={data.error} />
    </NodeShell>
  )
}

export const TextNode = memo(TextNodeInner)
