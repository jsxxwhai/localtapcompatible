import { memo } from 'react'
import { NodeShell, NodeHandleTarget, NodeHandleSource, RunButton, ErrorText, ApiSelect } from './CanvasNode.jsx'

// 倒推提示词节点：图片 → 视觉模型 → 提示词文本
function ReverseNodeInner({ data }) {
  const running = data.status === 'running'
  return (
    <NodeShell
      title="倒推提示词"
      color="reverse"
      status={data.status}
      actions={<RunButton onRun={() => data.onRun?.()} running={running} />}
    >
      <NodeHandleTarget id="image" top={50} label="图片" />
      <NodeHandleSource id="output" top={50} label="文本" />
      <ApiSelect
        apiOptions={data.apiOptions}
        currentApiId={data.currentApiId}
        onSelect={data.onSelectApi}
        onOpenSettings={data.onOpenSettings}
      />
      <div className="reverse-text" title={data.text}>
        {data.text || <span className="media-empty">连接图片后运行，生成提示词</span>}
      </div>
      <ErrorText message={data.error} />
    </NodeShell>
  )
}

export const ReverseNode = memo(ReverseNodeInner)
