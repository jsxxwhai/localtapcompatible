import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runNode } from './runner.js'
import { PROVIDER_PRESETS } from './providers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '64mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'tapnow-local' })
})

app.get('/api/presets', (_req, res) => {
  res.json(PROVIDER_PRESETS)
})

app.post('/api/run', async (req, res) => {
  const { config, inputs } = req.body ?? {}
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ ok: false, error: '缺少节点配置（config）' })
  }
  try {
    const result = await runNode({ config, inputs })
    res.json({ ok: true, ...result })
  } catch (err) {
    res.json({ ok: false, error: err?.message || String(err) })
  }
})

// 拉取模型列表：浏览器版走本后端，避免跨域
app.post('/api/models', async (req, res) => {
  const { baseUrl, apiKey, path = '/models' } = req.body ?? {}
  if (!baseUrl) return res.json({ ok: false, error: '缺少接口地址' })
  try {
    const url = baseUrl.replace(/\/+$/, '') + '/' + String(path).replace(/^\/+/, '')
    const headers = { 'Content-Type': 'application/json' }
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`
    const r = await fetch(url, { headers, timeout: 15000 })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const json = await r.json()
    const list = Array.isArray(json?.data) ? json.data.map((m) => m?.id).filter(Boolean)
      : Array.isArray(json?.models) ? json.models.map((m) => (typeof m === 'string' ? m : m?.id)).filter(Boolean)
      : []
    if (!list.length) throw new Error('返回中未找到模型列表（data[].id 或 models[].id）')
    res.json({ ok: true, models: list })
  } catch (err) {
    res.json({ ok: false, error: err?.message || String(err) })
  }
})

// 生产模式：托管前端构建产物
const distDir = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  // 未知 API 路径返回 JSON 404，而不是 SPA 首页 HTML
  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: '接口不存在' })
  })
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[api] TapNow Local 后端已启动: http://localhost:${PORT}`)
})
