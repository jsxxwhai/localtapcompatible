import { useTranslation, LOCALES } from '../i18n.js'

// 顶部工具栏
export default function Toolbar({
  onRunAll,
  onSave,
  onExport,
  onImport,
  onClear,
  onHelp,
  onTour,
  onSettings,
  running,
  saveHint,
}) {
  const { t, localePref, setLocale } = useTranslation()
  return (
    <div className="toolbar">
      <div className="brand">
        <span className="brand-logo">◧</span>
        <span className="brand-name">TapNow Local</span>
        <span className="brand-sub">{t('app.brandSub')}</span>
      </div>
      <div className="toolbar-actions">
        <button className="btn btn-primary" onClick={onRunAll} disabled={running}>
          {t('app.runAll')}
        </button>
        <button className="btn" onClick={onSave}>{t('app.save')}</button>
        <button className="btn" onClick={onExport}>{t('app.export')}</button>
        <button className="btn" onClick={onImport}>{t('app.import')}</button>
        <button className="btn btn-danger-ghost" onClick={onClear}>{t('app.clear')}</button>
        <button className="btn" onClick={onHelp}>{t('app.help')}</button>
        <button className="btn" onClick={onTour}>{t('app.tour')}</button>
        <label className="lang-select" title={t('settings.language')}>
          <span className="lang-select-icon">🌐</span>
          <select value={localePref} onChange={(e) => setLocale(e.target.value)}>
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
            ))}
          </select>
        </label>
        <button className="btn" onClick={onSettings} title={t('app.settingsTitle')}>{t('app.settings')}</button>
      </div>
      {saveHint && <span className="save-hint">{saveHint}</span>}
    </div>
  )
}
