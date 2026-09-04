import { ApiSelect } from '../nodes/CanvasNode.jsx'
import { NODE_TYPE_MAP } from '../utils.js'
import { CATEGORY_MAP, GEN_CATS } from '../categorySettings.js'
import { useTranslation } from '../i18n.js'

// 节点配置面板：API 已上收到“板块设置”（右上角 ⚙️），这里只负责查看与选择当前板块使用的 API/模型
export default function Inspector({ node, settings, onSelectApi, onOpenSettings, onTest, onClose, testing, onOpenExamples }) {
  const { t } = useTranslation()
  const tintMap = { text:'#8b9cf7', image:'#4dc2eb', video:'#7cc7ff', reverse:'#c4b5fd', upload:'#fbbf24', asset:'#4ade80', output:'#2dd4bf' }

  if (!node) {
    return (
      <div className="inspector">
        <div className="inspector-hero inspector-hero-none">
          <span className="inspector-hero-icon">◇</span>
          <div className="inspector-hero-meta">
            <div className="inspector-hero-title">{t('inspector.title')}</div>
            <div className="inspector-hero-sub">{t('inspector.heroNone')}</div>
          </div>
        </div>
        <div className="inspector-empty">
          {t('inspector.empty').split(/\n|\\n/).map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </div>
        <div className="inspector-quick-actions">
          <button type="button" className="btn" onClick={onOpenSettings}>{t('inspector.openSettings')}</button>
          {onOpenExamples && (
            <button type="button" className="btn" onClick={onOpenExamples}>{t('inspector.openExamples')}</button>
          )}
        </div>
      </div>
    )
  }

  const isGen = GEN_CATS.has(node.type)
  const cat = CATEGORY_MAP[node.type]
  const catSet = settings?.[node.type]

  const title =
    node.type === 'text' ? t('inspector.nodeText')
    : node.type === 'upload' ? t('inspector.nodeUpload')
    : node.type === 'output' ? t('inspector.nodeOutput')
    : t('inspector.nodeGen')

  return (
    <div className="inspector">
      <div className="inspector-hero" style={{ '--insp-tint': tintMap[node.type] || 'var(--accent)' }}>
        <span className="inspector-hero-icon">{NODE_TYPE_MAP[node.type]?.icon || '✦'}</span>
        <div className="inspector-hero-meta">
          <div className="inspector-hero-title">{title}</div>
          <div className="inspector-hero-sub">{t('node.' + node.type + '.desc')}</div>
        </div>
        <button type="button" className="btn-icon inspector-hero-close" onClick={onClose} title={t('common.close')} aria-label={t('common.close')}>×</button>
      </div>

      {!isGen ? (
        <div className="inspector-empty">
          {t('inspector.noApi').split(/\n|\\n/).map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </div>
      ) : (
        <div className="inspector-body">
          <div className="inspector-cat-info">
            <span className="inspector-cat-label">{cat?.icon} {t(cat?.labelKey)}</span>
            <span className="inspector-cat-current">{t('inspector.currentModel', { model: catSet?.model || t('settings.unset') })}</span>
          </div>
          <label className="field">
            <span className="field-label">{t('inspector.selectApi')}</span>
            <ApiSelect
              apiOptions={catSet?.apis || []}
              currentApiId={catSet?.currentApiId || ''}
              onSelect={(apiId) => onSelectApi(node.type, apiId)}
              onOpenSettings={onOpenSettings}
            />
          </label>
          <div className="inspector-actions">
            <button type="button" className="btn btn-primary" onClick={() => onTest(node.id)} disabled={testing}>
              {testing ? t('inspector.testing') : t('inspector.test')}
            </button>
            <button type="button" className="btn" onClick={onOpenSettings}>{t('inspector.openSettings')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
