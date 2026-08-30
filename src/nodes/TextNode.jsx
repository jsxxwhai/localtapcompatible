import { memo } from 'react'
import { NodeShell, NodeHandleSource, ErrorText } from './CanvasNode.jsx'
import { useTranslation } from '../i18n.js'

// 提示词节点：纯文本输入，输出字符串
function TextNodeInner({ data }) {
  const { t } = useTranslation()
  return (
    <NodeShell title={t('node.text')} color="text" status={data.status}>
      <NodeHandleSource id="output" top={50} label={t('handle.text')} />
      <textarea
        className="tn-textarea"
        rows={3}
        placeholder={t('text.placeholder')}
        value={data.text}
        onChange={(e) => data.onText?.(e.target.value)}
      />
      <ErrorText message={data.error} />
    </NodeShell>
  )
}

export const TextNode = memo(TextNodeInner)
