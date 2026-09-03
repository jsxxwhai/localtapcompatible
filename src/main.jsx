import React, { useMemo, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { I18nContext, loadLocale, persistLocale, translate, detectSystemLocale, SYSTEM_LOCALE } from './i18n.js'

function Root() {
  const [localePref, setLocalePref] = useState(() => {
    try {
      const saved = localStorage.getItem('lct-locale')
      if (saved) return saved
    } catch {}
    return SYSTEM_LOCALE
  })
  const [locale, setLocale] = useState(() => loadLocale())

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja' : locale === 'ko' ? 'ko' : 'en'
    document.title = translate(locale, 'app.documentTitle')
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = translate(locale, 'app.metaDescription')
  }, [locale])

  const value = useMemo(() => ({
    locale,
    localePref,
    t: (k, v) => translate(locale, k, v),
    setLocale: (code) => {
      const pref = code === SYSTEM_LOCALE ? SYSTEM_LOCALE : code
      persistLocale(pref)
      setLocalePref(pref)
      setLocale(pref === SYSTEM_LOCALE ? detectSystemLocale() : pref)
    },
  }), [locale, localePref])

  return (
    <I18nContext.Provider value={value}>
      <App />
    </I18nContext.Provider>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
