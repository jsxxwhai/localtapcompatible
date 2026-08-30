import { ApiSelect } from '../nodes/CanvasNode.jsx'
import { CATEGORY_MAP, GEN_CATS } from '../categorySettings.js'
import { useTranslation } from '../i18n.js'

// 节点配置面板：API 已上收到“板块设置”（右上角 ⚙️），这里只负责查看与选择当前板块使用的 API/模型
export default function Inspector({ node, settings, onSelectApi, onOpenSettings, onTest, onClose, testing }) {
  const { t } = useTranslation()

  if (!node) {
    return (
      <div className="inspector">
        <div className="panel-title">{t('inspector.title')}</div>
        <div className="inspector-empty">
          {t('inspector.empty').split('\n').map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
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
      <div className="panel-title">
        {title}
        <button type="button" className="btn-icon" onClick={onClose} title={t('common.close')} aria-label={t('common.close')}>×</button>
      </div>

      {!isGen ? (
        <div className="inspector-empty">
          {t('inspector.noApi').split('\n').map((line, i) => (
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
