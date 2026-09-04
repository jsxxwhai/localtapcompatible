import { useState, useRef, useEffect } from 'react'
import { useTranslation, LOCALES } from '../i18n.js'

// 顶部工具栏
export default function Toolbar({
  onRunAll,
  onSave,
  onExport,
  onImport,
  onClear,
  examples,
  onLoadExample,
  onHelp,
  onTour,
  onSettings,
  running,
  saveHint,
  nodeCount,
  selStatus,
  selStatusColor,
}) {
  const { t, localePref, setLocale } = useTranslation()
  const [fileOpen, setFileOpen] = useState(false)
  const fileRef = useRef(null)
  const fileMenuRef = useRef(null)
  useEffect(() => {
    if (!fileOpen) return
    const close = (e) => { if (fileRef.current && !fileRef.current.contains(e.target)) setFileOpen(false) }
    const onKey = (e) => {
      if (e.key === 'Escape') { setFileOpen(false); return }
      const menu = fileMenuRef.current
      if (!menu) return
      const items = Array.from(menu.querySelectorAll('button.menu-item'))
      if (!items.length) return
      const idx = items.indexOf(document.activeElement)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const dir = e.key === 'ArrowDown' ? 1 : -1
        const next = idx < 0 ? (dir > 0 ? 0 : items.length - 1) : (idx + dir + items.length) % items.length
        items[next].focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        items[0].focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        items[items.length - 1].focus()
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [fileOpen])
  return (
    <div className="toolbar">
      <div className="brand">
        <span className="brand-logo">◧</span>
        <span className="brand-name">local-tap-compatible</span>
        <span className="brand-sub">{t('app.brandSub')}</span>
      </div>
      <div className="toolbar-actions">
        <button type="button" className="btn btn-primary" onClick={onRunAll} disabled={running} title={t('app.kbdRunAll')}>
          {t('app.runAll')}
        </button>
        <div className="menu-wrap" ref={fileRef}>
          <button type="button"
            className="btn"
            onClick={() => setFileOpen((v) => !v)}
            aria-label={t('app.file')}
            aria-haspopup="true"
            aria-expanded={fileOpen}
          >
            {t('app.file')}
          </button>
          {fileOpen && (
            <div className="menu-pop" ref={fileMenuRef} role="menu" aria-label={t('app.file')}>
              <button type="button" className="menu-item" role="menuitem" onClick={() => { setFileOpen(false); onSave() }}>{t('app.save')}</button>
              <button type="button" className="menu-item" role="menuitem" onClick={() => { setFileOpen(false); onExport() }}>{t('app.export')}</button>
              <button type="button" className="menu-item" role="menuitem" onClick={() => { setFileOpen(false); onImport() }}>{t('app.import')}</button>
              <div className="menu-divider" />
              <div className="menu-label">{t('app.examples')}</div>
              {(examples || []).map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className="menu-item"
                  role="menuitem"
                  title={t(ex.descKey)}
                  onClick={() => { setFileOpen(false); onLoadExample(ex) }}
                >
                  <span className="menu-item-icon">{ex.icon}</span>
                  <span className="menu-item-label">{t(ex.key)}</span>
                </button>
              ))}
              <div className="menu-divider" />
              <button type="button" className="menu-item menu-item-danger" role="menuitem" onClick={() => { setFileOpen(false); onClear() }}>{t('app.clear')}</button>
            </div>
          )}
        </div>
        <button type="button" className="btn" onClick={onHelp} aria-label={t('app.help')}>{t('app.help')}</button>
        <button type="button" className="btn" onClick={onTour} aria-label={t('app.tour')}>{t('app.tour')}</button>
        <label className="lang-select" title={t('settings.language')} aria-label={t('settings.language')}>
          <span className="lang-select-icon">🌐</span>
          <select value={localePref} onChange={(e) => setLocale(e.target.value)}>
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>{l.flag} {l.labelKey ? t(l.labelKey) : l.label}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" onClick={onSettings} title={t('app.kbdSettings')} aria-label={t('app.settings')}>{t('app.settings')}</button>
      </div>
      <div className="statusbar">
        <span className="statusbar-item statusbar-brand-dot" title={t('hud.ready')} aria-hidden="true" />
        <span className="statusbar-item statusbar-engine">{t('hud.engine')}</span>
        <span className="statusbar-item statusbar-version">{t('hud.version')}</span>
        <span className="statusbar-sep" />
        <span className="statusbar-item statusbar-nodes">{nodeCount} {t('hud.nodes')}</span>
        {selStatus ? (
          <span className="statusbar-item statusbar-sel" style={{ color: selStatusColor }}>
            <span className="statusbar-sel-dot" style={{ background: selStatusColor, boxShadow: `0 0 6px ${selStatusColor}` }} />
            {selStatus}
          </span>
        ) : null}
        <span className="statusbar-sep" />
        <span className="statusbar-item statusbar-motd">{t('hud.motd')}</span>
      </div>
      {saveHint && <span className="save-hint">{saveHint}</span>}
    </div>
  )
}
