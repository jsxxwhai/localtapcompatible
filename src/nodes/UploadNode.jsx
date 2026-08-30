import { memo, useRef } from 'react'
import { NodeShell, NodeHandleSource, ErrorText } from './CanvasNode.jsx'
import { useTranslation } from '../i18n.js'

// 图片上传节点：本地图片转 dataURL 作为参考图输入
function UploadNodeInner({ data }) {
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const handleFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      data.onError?.(t('upload.notImage'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const value = reader.result
      if (typeof value === 'string' && value.length > 12 * 1024 * 1024) {
        data.onError?.(t('upload.tooBig'))
        return
      }
      data.onFile?.(value)
    }
    reader.readAsDataURL(file)
  }
  return (
    <NodeShell title={t('node.upload')} color="upload" status={data.status}>
      <NodeHandleSource id="output" top={50} label={t('handle.image')} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button type="button" className="btn btn-small btn-ghost" onClick={() => inputRef.current?.click()}>
        {t('upload.choose')}
      </button>
      {data.media?.value ? (
        <img className="upload-thumb" src={data.media.value} alt={t('output.alt')} loading="lazy" decoding="async" />
      ) : (
        <div className="media-empty">{t('upload.none')}</div>
      )}
      <ErrorText message={data.error} />
    </NodeShell>
  )
}

export const UploadNode = memo(UploadNodeInner)
