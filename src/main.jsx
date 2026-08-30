import React, { useMemo, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { I18nContext, loadLocale, persistLocale, translate } from './i18n.js'

function Root() {
  const [locale, setLocale] = useState(() => loadLocale())

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo(() => ({
    locale,
    t: (k, v) => translate(locale, k, v),
    setLocale: (code) => {
      persistLocale(code)
      setLocale(code)
    },
  }), [locale])

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
