import { useTranslation } from '../i18n.js'

// 帮助弹窗
export default function HelpModal({ onClose, onTour }) {
  const { t } = useTranslation()
  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t('help.title')} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>{t('help.title')}</span>
          {onTour && (
            <button type="button" className="btn btn-small btn-primary" onClick={onTour}>{t('help.openTour')}</button>
          )}
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('help.close')}>{t('help.close')}</button>
        </div>
        <div className="modal-body">
          <h4>{t('help.wfTitle')}</h4>
          <ol>
            <li>{t('help.wf.1')}</li>
            <li>{t('help.wf.2')}</li>
            <li>{t('help.wf.3')}</li>
            <li>{t('help.wf.4')}</li>
          </ol>

          <h4>{t('help.cfgTitle')}</h4>
          <ul>
            <li>{t('help.cfg.1')}</li>
            <li>{t('help.cfg.2')}</li>
            <li>{t('help.cfg.3')}</li>
            <li>{t('help.cfg.4')}</li>
            <li>{t('help.cfg.5')}</li>
          </ul>

          <h4>{t('help.exampleTitle')}</h4>
          <pre>{t('help.exampleBody')}</pre>

          <h4>{t('help.quickTitle')}</h4>
          <ul>
            <li>{t('help.quick.1')}</li>
            <li>{t('help.quick.2')}</li>
            <li>{t('help.quick.3')}</li>
            <li>{t('help.quick.4')}</li>
            <li>{t('help.quick.5')}</li>
            <li>{t('help.quick.6')}</li>
            <li>{t('help.quick.7')}</li>
            <li>{t('help.quick.8')}</li>
          </ul>
          <h4>{t('help.kbdTitle')}</h4>
          <ul>
            <li>{t('help.kbd.1')}</li>
            <li>{t('help.kbd.2')}</li>
            <li>{t('help.kbd.3')}</li>
            <li>{t('help.kbd.4')}</li>
          </ul>

          <h4>{t('help.dataTitle')}</h4>
          <ul>
            <li>{t('help.data.1')}</li>
            <li>{t('help.data.2')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
