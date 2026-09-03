import { translate, loadLocale } from './i18n.js'

// 桥接层：桌面端（C# WebView2）走 window.lctApi 直连宿主进程；
// 浏览器开发模式（npm run dev）自动退回 fetch。
const hasBridge = () =>
  typeof window !== 'undefined' &&
  window.chrome?.webview?.postMessage &&
  typeof window.lctApi !== 'undefined'

export async function apiRun(config, inputs) {
  if (hasBridge()) return window.lctApi.run(config, inputs, loadLocale())
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': loadLocale() },
    body: JSON.stringify({ config, inputs, locale: loadLocale() }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || translate(loadLocale(), 'common.apiRunFail'))
  return data
}

export async function apiPresets() {
  if (hasBridge()) return window.lctApi.getPresets()
  const res = await fetch('/api/presets')
  return res.json()
}

export async function apiDownload(url) {
  if (hasBridge()) return window.lctApi.download(url)
  // 浏览器兜底：直接 fetch 转 Blob（可能受目标接口 CORS 限制）
  const res = await fetch(url)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const blob = await res.blob()
  return { dataUrl: await blobToDataUrl(blob), filename: '' }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 拉取某接口的模型列表（OpenAI 兼容 /v1/models 等）
export async function apiListModels({ baseUrl, apiKey, path = '/models' } = {}) {
  if (hasBridge()) return window.lctApi.listModels({ baseUrl, apiKey, path, locale: loadLocale() })
  const res = await fetch('/api/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': loadLocale() },
    body: JSON.stringify({ baseUrl, apiKey, path, locale: loadLocale() }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || translate(loadLocale(), 'common.listModelsFail'))
  return data
}
