import { NODE_TYPES } from '../utils.js'
import { useTranslation } from '../i18n.js'

// 画布空态：节点全部删除/清空时显示的 QuickStart，canvas-first 引导
export default function CanvasEmpty({ onAdd, onOpenExamples, onTour }) {
  const { t } = useTranslation()
  return (
    <div className="canvas-empty">
      <div className="canvas-empty-card">
        <div className="canvas-empty-badge">✦</div>
        <h2 className="canvas-empty-title">{t('empty.title')}</h2>
        <p className="canvas-empty-sub">{t('empty.subtitle')}</p>

        <div className="canvas-empty-actions">
          <button type="button" className="btn btn-primary" onClick={() => onAdd('text')}>
            {t('empty.addFirst')}
          </button>
          <button type="button" className="btn" onClick={onOpenExamples}>
            {t('empty.loadExample')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onTour}>
            {t('empty.takeTour')}
          </button>
        </div>

        <div className="canvas-empty-nodes">
          {NODE_TYPES.map((item) => (
            <button
              type="button"
              key={item.type}
              className="canvas-empty-node"
              title={t(item.descKey)}
              onClick={() => onAdd(item.type)}
            >
              <span className="canvas-empty-node-icon">{item.icon}</span>
              <span className="canvas-empty-node-label">{t(item.labelKey)}</span>
            </button>
          ))}
        </div>

        <p className="canvas-empty-hint">{t('empty.hint')}</p>
      </div>
    </div>
  )
}
