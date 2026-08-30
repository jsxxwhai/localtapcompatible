import { memo, useRef } from 'react'
import { NodeShell, NodeHandleSource, ErrorText } from './CanvasNode.jsx'

// 图片上传节点：本地图片转 dataURL 作为参考图输入
function UploadNodeInner({ data }) {
  const inputRef = useRef(null)
  const handleFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      data.onError?.('请选择图片文件')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const value = reader.result
      if (typeof value === 'string' && value.length > 12 * 1024 * 1024) {
        data.onError?.('图片超过 12MB，可能过大，建议压缩后重试')
        return
      }
      data.onFile?.(value)
    }
    reader.readAsDataURL(file)
  }
  return (
    <NodeShell title="图片上传" color="upload" status={data.status}>
      <NodeHandleSource id="output" top={50} label="图片" />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button className="btn btn-small btn-ghost" onClick={() => inputRef.current?.click()}>
        📁 选择本地图片
      </button>
      {data.media?.value ? (
        <img className="upload-thumb" src={data.media.value} alt="上传的图片" />
      ) : (
        <div className="media-empty">未选择图片</div>
      )}
      <ErrorText message={data.error} />
    </NodeShell>
  )
}

export const UploadNode = memo(UploadNodeInner)
