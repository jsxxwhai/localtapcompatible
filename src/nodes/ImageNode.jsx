import { memo } from 'react'
import {
  NodeShell,
  NodeHandleTarget,
  NodeHandleSource,
  RunButton,
  MediaView,
  ErrorText,
  ApiSelect,
} from './CanvasNode.jsx'

// 图片生成节点：接收 prompt（可选 image 参考图），调用自定义 API
function ImageNodeInner({ data }) {
  const running = data.status === 'running'
  return (
    <NodeShell
      title="图片生成"
      color="image"
      status={data.status}
      actions={<RunButton onRun={() => data.onRun?.()} running={running} />}
    >
      <NodeHandleTarget id="prompt" top={26} label="提示词" />
      <NodeHandleTarget id="image" top={72} label="参考图" />
      <NodeHandleSource id="output" top={50} label="图片" />

      <textarea
        className="tn-textarea tn-textarea-sm"
        rows={2}
        placeholder="提示词（可选；连了上游文本则用上游的）"
        value={data.text}
        onChange={(e) => data.onText?.(e.target.value)}
      />
      <ApiSelect
        apiOptions={data.apiOptions}
        currentApiId={data.currentApiId}
        onSelect={data.onSelectApi}
        onOpenSettings={data.onOpenSettings}
      />
      <div className="node-preview">
        <MediaView media={data.media} maxHeight={140} />
      </div>
      <ErrorText message={data.error} />
    </NodeShell>
  )
}

export const ImageNode = memo(ImageNodeInner)
