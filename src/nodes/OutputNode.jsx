import { memo, useState } from 'react'
import { apiDownload } from '../api.js'
import { Handle, Position } from '@xyflow/react'
import { NodeShell, MediaView, ErrorText } from './CanvasNode.jsx'
import { useTranslation } from '../i18n.js'

// 预览输出节点：展示上游传来的图片/视频
function OutputNodeInner({ data }) {
  const { t } = useTranslation()
  const [dlError, setDlError] = useState('')
  const isVideo = data.media?.mediaType === 'video' || /^data:video/i.test(data.media?.value || '')
  const handleDownload = async () => {
    setDlError('')
    try {
      const res = await apiDownload(data.media.value)
      const a = document.createElement('a')
      a.href = res.dataUrl
      a.download = res.filename || (isVideo ? 'output.mp4' : 'output.png')
      a.click()
    } catch (err) {
      setDlError(t('output.downloadFail') + err.message)
    }
  }
  return (
    <NodeShell title={t('node.output')} color="output" status={data.status} runStartedAt={data.runStartedAt} finishedAt={data.finishedAt}>
      <Handle
        type="target"
        position={Position.Left}
        id="media"
        style={{ top: '50%' }}
        className="tn-handle tn-handle-target"
      />
      <div className="handle-label handle-label-left" style={{ top: '50%' }}>{t('handle.media')}</div>
      <div className="output-stage">
        <MediaView media={data.media} maxHeight={280} />
        {data.media?.value && (
          <button type="button" className="btn btn-small btn-ghost" onClick={handleDownload}>
            {isVideo ? t('output.downloadVideo') : t('output.downloadImage')}
          </button>
        )}
        {dlError && <div className="node-error" title={dlError}>{dlError}</div>}
      </div>
      <ErrorText message={data.error} />
    </NodeShell>
  )
}

export const OutputNode = memo(OutputNodeInner)
