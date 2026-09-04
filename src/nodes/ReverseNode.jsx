import { memo } from 'react'
import { NodeShell, NodeHandleTarget, NodeHandleSource, RunButton, ErrorText, ApiSelect } from './CanvasNode.jsx'
import { useTranslation } from '../i18n.js'

// 倒推提示词节点：图片 → 视觉模型 → 提示词文本
function ReverseNodeInner({ data }) {
  const { t } = useTranslation()
  const busy = data.status === 'running' || data.status === 'queued'
  return (
    <NodeShell
      title={t('node.reverse')}
      color="reverse" pathLit={data.pathLit} pathDim={data.pathDim}
      status={data.status}
      runStartedAt={data.runStartedAt}
      finishedAt={data.finishedAt}
      actions={<RunButton onRun={() => data.onRun?.()} running={busy} />}
    >
      <NodeHandleTarget id="image" top={50} label={t('handle.image')} />
      <NodeHandleSource id="output" top={50} label={t('handle.text')} />
      <ApiSelect
        apiOptions={data.apiOptions}
        currentApiId={data.currentApiId}
        onSelect={data.onSelectApi}
        onOpenSettings={data.onOpenSettings}
      />
      <div className="reverse-text" title={data.text}>
        {data.text || <span className="media-empty">{t('reverse.empty')}</span>}
      </div>
      <ErrorText message={data.error} />
    </NodeShell>
  )
}

export const ReverseNode = memo(ReverseNodeInner)
