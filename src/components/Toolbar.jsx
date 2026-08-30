import { useState, useRef, useEffect } from 'react'
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
  const [fileOpen, setFileOpen] = useState(false)
  const fileRef = useRef(null)
  useEffect(() => {
    if (!fileOpen) return
    const close = (e) => { if (fileRef.current && !fileRef.current.contains(e.target)) setFileOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [fileOpen])
  return (
    <div className="toolbar">
      <div className="brand">
        <span className="brand-logo">◧</span>
        <span className="brand-name">TapNow Local</span>
        <span className="brand-sub">{t('app.brandSub')}</span>
      </div>
      <div className="toolbar-actions">
        <button className="btn btn-primary" onClick={onRunAll} disabled={running} title={t('app.kbdRunAll')}>
          {t('app.runAll')}
        </button>
        <div className="menu-wrap" ref={fileRef}>
          <button
            className="btn"
            onClick={() => setFileOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={fileOpen}
          >
            {t('app.file')}
          </button>
          {fileOpen && (
            <div className="menu-pop">
              <button className="menu-item" onClick={() => { setFileOpen(false); onSave() }}>{t('app.save')}</button>
              <button className="menu-item" onClick={() => { setFileOpen(false); onExport() }}>{t('app.export')}</button>
              <button className="menu-item" onClick={() => { setFileOpen(false); onImport() }}>{t('app.import')}</button>
              <div className="menu-divider" />
              <button className="menu-item menu-item-danger" onClick={() => { setFileOpen(false); onClear() }}>{t('app.clear')}</button>
            </div>
          )}
        </div>
        <button className="btn" onClick={onHelp}>{t('app.help')}</button>
        <button className="btn" onClick={onTour}>{t('app.tour')}</button>
        <label className="lang-select" title={t('settings.language')}>
          <span className="lang-select-icon">🌐</span>
          <select value={localePref} onChange={(e) => setLocale(e.target.value)}>
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>{l.flag} {l.labelKey ? t(l.labelKey) : l.label}</option>
            ))}
          </select>
        </label>
        <button className="btn" onClick={onSettings} title={t('app.kbdSettings')}>{t('app.settings')}</button>
      </div>
      {saveHint && <span className="save-hint">{saveHint}</span>}
    </div>
  )
}
