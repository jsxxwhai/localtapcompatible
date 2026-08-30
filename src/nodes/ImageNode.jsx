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

// 图片生成节点：接收 prompt（可选 image 参考图），调用自定义 API
function ImageNodeInner({ data }) {
  const { t } = useTranslation()
  const running = data.status === 'running'
  return (
    <NodeShell
      title={t('node.image')}
      color="image"
      status={data.status}
      actions={<RunButton onRun={() => data.onRun?.()} running={running} />}
    >
      <NodeHandleTarget id="prompt" top={26} label={t('handle.prompt')} />
      <NodeHandleTarget id="image" top={72} label={t('handle.refImage')} />
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
        <div className="multi-img-note">{t('multiImage', { count: data.inputImageCount })}</div>
      )}
      <div className="node-preview">
        <MediaView media={data.media} maxHeight={140} />
      </div>
      <ErrorText message={data.error} />
    </NodeShell>
  )
}

export const ImageNode = memo(ImageNodeInner)
