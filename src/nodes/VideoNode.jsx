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
import { useTranslation } from '../i18n.js'

// 视频生成节点：可接收 prompt + 起始图，支持异步任务轮询
function VideoNodeInner({ data }) {
  const { t } = useTranslation()
  const busy = data.status === 'running' || data.status === 'queued'
  return (
    <NodeShell
      title={t('node.video')}
      color="video"
      status={data.status}
      actions={<RunButton onRun={() => data.onRun?.()} running={busy} />}
    >
      <NodeHandleTarget id="prompt" top={26} label={t('handle.prompt')} />
      <NodeHandleTarget id="image" top={72} label={t('handle.startImage')} />
      <NodeHandleSource id="output" top={50} label={t('handle.image')} />

      <textarea
        className="tn-textarea tn-textarea-sm"
        rows={2}
        placeholder={t('gen.placeholder')}
        value={data.text}
        onChange={(e) => data.onText?.(e.target.value)}
      />
      <ApiSelect
        apiOptions={data.apiOptions}
        currentApiId={data.currentApiId}
        onSelect={data.onSelectApi}
        onOpenSettings={data.onOpenSettings}
      />
      {data.inputImageCount > 1 && (
        <div className="multi-img-note">{t('multiImageVideo', { count: data.inputImageCount })}</div>
      )}
      <div className="node-preview">
        <MediaView media={data.media} maxHeight={140} />
      </div>
      <ErrorText message={data.error} />
    </NodeShell>
  )
}

export const VideoNode = memo(VideoNodeInner)
