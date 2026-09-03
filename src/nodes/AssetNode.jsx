import { memo, useRef } from 'react'
import { NodeShell, NodeHandleSource, ErrorText } from './CanvasNode.jsx'
import { useTranslation } from '../i18n.js'

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}

// 图片素材节点：可自定义名称，可多选/拖入多张本地图片，作为下游图生图/图生视频的多图输入
function AssetNodeInner({ data }) {
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const name = data.name || t('node.asset')
  const images = Array.isArray(data.images) ? data.images.filter((v) => typeof v === 'string' && v) : []

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f && typeof f.type === 'string' && f.type.startsWith('image/'))
    if (!files.length) return
    const values = []
    for (const f of files) {
      const v = await readFileAsDataUrl(f)
      if (v && v.length <= 12 * 1024 * 1024) values.push(v)
      else if (v) data.onError?.(t('upload.tooBigSkip'))
    }
    if (values.length) {
      data.onImages?.([...images, ...values])
    }
  }

  return (
    <NodeShell title={name} color="asset" status={data.status} runStartedAt={data.runStartedAt} finishedAt={data.finishedAt}>
      <NodeHandleSource id="output" top={50} label={t('handle.image')} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="asset-name-row">
        <input
          className="asset-name-input"
          value={name}
          onChange={(e) => data.onRename?.(e.target.value)}
          placeholder={t('asset.namePlaceholder')}
          title={t('asset.namePlaceholder')}
        />
      </div>
      <button type="button" className="btn btn-small btn-ghost" onClick={() => inputRef.current?.click()}>
        {t('asset.choose')}
      </button>
      <div
        className="asset-grid"
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          addFiles(e.dataTransfer.files)
        }}
      >
        {images.length === 0 && <div className="media-empty">{t('asset.dropHint')}</div>}
        {images.map((v, i) => (
          <div key={i} className="asset-item">
            <img src={v} alt="" loading="lazy" decoding="async" />
            <button type="button" className="asset-remove" title={t('asset.remove')} aria-label={t('asset.remove')} onClick={() => data.onRemoveImage?.(i)}>
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="asset-tip">{t('asset.tip')}</div>
      <ErrorText message={data.error} />
    </NodeShell>
  )
}

export const AssetNode = memo(AssetNodeInner)
