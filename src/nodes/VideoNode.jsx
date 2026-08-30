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

// 视频生成节点：可接收 prompt + 起始图，支持异步任务轮询
function VideoNodeInner({ data }) {
  const running = data.status === 'running'
  const isPoll = data.config?.poll?.enabled
  return (
    <NodeShell
      title="视频生成"
      color="video"
      status={data.status}
      actions={<RunButton onRun={() => data.onRun?.()} running={running} />}
    >
      <NodeHandleTarget id="prompt" top={26} label="提示词" />
      <NodeHandleTarget id="image" top={72} label="起始图" />
      <NodeHandleSource id="output" top={50} label="视频" />

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

export const VideoNode = memo(VideoNodeInner)
