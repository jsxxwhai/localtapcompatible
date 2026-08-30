// 国际化核心：语言探测、持久化、React Context、翻译函数
import { createContext, useContext } from 'react'
import zh from './locales/zh.js'
import en from './locales/en.js'
import ja from './locales/ja.js'
import ko from './locales/ko.js'

export const LOCALES = [
  { code: 'zh', label: '简体中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
]

const dict = { zh, en, ja, ko }
const STORAGE_KEY = 'tapnow-locale'

// 跟随系统语言，识别不了回退中文
export function detectSystemLocale() {
  try {
    const nav = (typeof navigator !== 'undefined' && navigator.language) || ''
    const lang = nav.toLowerCase()
    if (lang.startsWith('zh')) return 'zh'
    if (lang.startsWith('ja')) return 'ja'
    if (lang.startsWith('ko')) return 'ko'
    if (lang.startsWith('en')) return 'en'
  } catch {}
  return 'zh'
}

export function loadLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && dict[saved]) return saved
  } catch {}
  return detectSystemLocale()
}

export function persistLocale(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {}
}

function getByPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj)
}

// 纯翻译函数：locale -> key -> 文本；缺省回退中文
// 语言包是扁平 key（如 'app.runAll'），优先直接命中；同时也兼容嵌套结构。
export function translate(locale, key, vars) {
  const src = dict[locale] || dict.zh
  let val = src[key]
  if (val == null) val = getByPath(src, key)
  if (val == null) val = dict.zh[key]
  if (val == null) val = getByPath(dict.zh, key)
  if (val == null) return key
  if (vars && typeof val === 'string') {
    for (const [k, v] of Object.entries(vars)) {
      val = val.split('{' + k + '}').join(String(v ?? ''))
    }
  }
  return val
}

export const I18nContext = createContext({ locale: 'zh', t: (k, v) => translate('zh', k, v), setLocale: () => {} })

// 在组件里取 t 函数与当前语言
export function useTranslation() {
  return useContext(I18nContext)
}
