import { memo } from 'react'
import { apiDownload } from '../api.js'
import { Handle, Position } from '@xyflow/react'
import { NodeShell, MediaView, ErrorText } from './CanvasNode.jsx'

// 预览输出节点：展示上游传来的图片/视频
function OutputNodeInner({ data }) {
  const handleDownload = async () => {
    try {
      const res = await apiDownload(data.media.value)
      const a = document.createElement('a')
      a.href = res.dataUrl
      a.download = res.filename || (isVideo ? 'output.mp4' : 'output.png')
      a.click()
    } catch (err) {
      alert('下载失败：' + err.message)
    }
  }
  const isVideo = data.media?.mediaType === 'video' || /^data:video/i.test(data.media?.value || '')
  return (
    <NodeShell title="预览输出" color="output" status={data.status}>
      <Handle
        type="target"
        position={Position.Left}
        id="media"
        style={{ top: '50%' }}
        className="tn-handle tn-handle-target"
      />
      <div className="handle-label handle-label-left" style={{ top: '50%' }}>媒体</div>
      <div className="output-stage">
        <MediaView media={data.media} maxHeight={280} />
        {data.media?.value && (
          <button className="btn btn-small btn-ghost" onClick={handleDownload}>
            ⬇ 下载{isVideo ? '视频' : '图片'}
          </button>
        )}
      </div>
      <ErrorText message={data.error} />
    </NodeShell>
  )
}

export const OutputNode = memo(OutputNodeInner)


