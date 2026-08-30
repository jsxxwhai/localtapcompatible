// 节点执行引擎：把节点配置 + 上游输入，翻译成一次真实的 HTTP 调用
// 支持：模板占位符、Bearer Key、任意 JSON body、输出路径提取、异步任务轮询

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 按 a.b[0].c 形式的路径取值
export function getByPath(obj, path) {
  if (obj == null) return undefined
  if (!path) return undefined
  return path
    .split('.')
    .reduce((acc, key) => {
      if (acc == null) return undefined
      const m = key.match(/^(\w+)\[(\d+)\]$/)
      if (m) return acc[m[1]]?.[Number(m[2])]
      return acc[key]
    }, obj)
}

// 递归找第一个任意字符串（文本输出兜底用）
function firstString(obj, depth = 0) {
  if (obj == null || depth > 4) return undefined
  if (typeof obj === 'string') return obj.trim()
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = firstString(item, depth + 1)
      if (found) return found
    }
    return undefined
  }
  if (typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      const found = firstString(value, depth + 1)
      if (found) return found
    }
  }
  return undefined
}

// 递归找一个字符串 url（用于把响应对象兜底转成可用输出）
function firstStringUrl(obj, depth = 0) {
  if (obj == null || depth > 4) return undefined
  if (typeof obj === 'string') {
    const t = obj.trim()
    if (t.startsWith('http') || t.startsWith('data:')) return t
    return undefined
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = firstStringUrl(item, depth + 1)
      if (found) return found
    }
    return undefined
  }
  if (typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      const found = firstStringUrl(value, depth + 1)
      if (found) return found
    }
  }
  return undefined
}

// 把 {{key}} 占位符替换成变量值；对象会被 JSON 序列化后再替换
// jsonEscape=true 时按 JSON 字符串转义注入（用于请求体，防止引号破坏 JSON）
function resolvePlaceholders(template, vars, jsonEscape = false) {
  const source =
    typeof template === 'string' ? template : JSON.stringify(template ?? {})
  let out = source
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) continue
    let replacement = typeof value === 'string' ? value : JSON.stringify(value)
    if (jsonEscape && typeof value === 'string') {
      replacement = JSON.stringify(value).slice(1, -1)
    }
    out = out.split(`{{${key}}}`).join(replacement)
  }
  return out
}

function joinUrl(baseUrl, path) {
  const base = (baseUrl ?? '').trim().replace(/\/+$/, '')
  const p = (path ?? '').trim()
  if (/^https?:\/\//i.test(p)) return p
  if (!base) return p || '/'
  if (!p) return base
  return `${base}/${p.replace(/^\/+/, '')}`
}

function guessMediaType(value) {
  if (/^data:video\//i.test(value) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(value)) return 'video'
  if (/^data:image\//i.test(value) || /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(value)) return 'image'
  return 'unknown'
}

export function normalizeOutput(value, outputMediaType = 'auto', outputKind = 'media') {
  if (outputKind === 'text') {
    let v = value
    if (typeof v === 'object') v = firstString(v)
    if (typeof v !== 'string') throw new Error('接口输出不是文本，请检查「输出提取路径」')
    return { value: v.trim(), mediaType: 'text' }
  }
  if (value == null) {
    throw new Error('未从接口响应中提取到输出，请检查「输出提取路径」')
  }
  let v = value
  if (typeof v === 'object') {
    v = firstStringUrl(v)
    if (!v) throw new Error('接口返回的不是 URL/图片，请检查「输出提取路径」')
  }
  if (typeof v !== 'string') {
    throw new Error('接口输出无法识别（既不是 URL 也不是文本）')
  }
  v = v.trim()
  let type = outputMediaType && outputMediaType !== 'auto' ? outputMediaType : guessMediaType(v)
  if (type === 'unknown' && outputMediaType && outputMediaType !== 'auto') type = outputMediaType
  if (!v.startsWith('http') && !v.startsWith('data:')) {
    // 裸 base64（有些服务直接返回 b64 字符串）
    if (v.length > 64 && /^[A-Za-z0-9+/=\r\n]+$/.test(v)) {
      const prefix = type === 'video' ? 'data:video/mp4;base64,' : 'data:image/png;base64,'
      v = prefix + v
    } else {
      throw new Error('提取到的输出不是 URL 也不是 base64 数据')
    }
  }
  return { value: v, mediaType: type }
}

function buildHeaders(config, vars) {
  const headers = { 'Content-Type': 'application/json' }
  const custom = config.headers ?? {}
  for (const [k, val] of Object.entries(custom)) {
    headers[k] = resolvePlaceholders(String(val), vars)
  }
  if (config.apiKey && !Object.keys(custom).some((k) => k.toLowerCase() === 'authorization')) {
    headers.Authorization = `Bearer ${config.apiKey}`
  }
  return headers
}

function resolveBody(config, vars) {
  if (!config.method || config.method.toUpperCase() === 'GET') return undefined
  const raw = resolvePlaceholders(config.bodyTemplate ?? {}, vars, true)
  try {
    return JSON.parse(raw)
  } catch (err) {
    throw new Error(`请求体模板不是合法 JSON：${raw.slice(0, 200)}`)
  }
}

async function pollJob({ config, vars, initialJson }) {
  const poll = config.poll ?? {}
  const id = getByPath(initialJson, poll.idPath || 'id')
  if (!id) {
    throw new Error(`提交任务后未找到任务 ID（检查「任务ID路径」），接口返回：${JSON.stringify(initialJson).slice(0, 300)}`)
  }
  // 轮询路径支持 {id}（也兼容 {{id}}）
  let pollPath = resolvePlaceholders(poll.path || '/tasks/{id}', { ...vars, id })
  if (typeof pollPath === 'string') pollPath = pollPath.split('{id}').join(id)
  const pollUrl = joinUrl(config.baseUrl, pollPath)
  const doneValues = poll.doneValues?.length ? poll.doneValues : ['succeeded', 'completed', 'success']
  const failedValues = poll.failedValues?.length ? poll.failedValues : ['failed', 'error']
  const interval = Math.max(500, Number(poll.intervalMs) || 3000)
  const maxAttempts = Math.max(1, Number(poll.maxAttempts) || 200)
  const headers = { 'Content-Type': 'application/json' }
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(interval)
    const res = await fetch(pollUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000),
    })
    const raw = await res.text()
    if (!res.ok) {
      throw new Error(`查询任务状态失败 HTTP ${res.status}：${raw.slice(0, 300)}`)
    }
    let json
    try {
      json = JSON.parse(raw)
    } catch {
      throw new Error(`任务状态响应不是合法 JSON：${raw.slice(0, 200)}`)
    }
    const status = getByPath(json, poll.statusPath || 'status')
    if (doneValues.includes(status)) {
      const value = getByPath(json, poll.resultExtract)
      if (value == null) {
        throw new Error(`任务已完成，但按「结果提取路径」(${poll.resultExtract}) 未取到结果：${JSON.stringify(json).slice(0, 300)}`)
      }
      return { value, raw: json }
    }
    if (failedValues.includes(status)) {
      throw new Error(`任务失败：status = ${status}`)
    }
  }
  throw new Error(`任务轮询超时（${maxAttempts} 次，每次间隔 ${interval}ms）`)
}

// 执行单个节点
// config: 节点配置（baseUrl / apiKey / model / path / bodyTemplate / outputExtract / poll ...）
// inputs: { prompt?: string, image?: string }
export async function runNode({ config, inputs = {} }) {
  const vars = {
    prompt: inputs.prompt ?? '',
    image: inputs.image ?? '',
    model: config.model ?? '',
    apiKey: config.apiKey ?? '',
    ...(inputs.vars ?? {}), // 自定义占位符（如 {{system}}）
  }

  const url = joinUrl(config.baseUrl, resolvePlaceholders(config.path || '/', vars))
  const headers = buildHeaders(config, vars)
  const body = resolveBody(config, vars)

  const timeoutMs = Math.max(5000, Number(config.timeoutMs) || 120000)
  const res = await fetch(url, {
    method: (config.method || 'POST').toUpperCase(),
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  })
  const raw = await res.text()
  if (!res.ok) {
    throw new Error(`接口返回 HTTP ${res.status}：${raw.slice(0, 500)}`)
  }
  let json
  try {
    json = JSON.parse(raw)
  } catch {
    json = null
  }

  // 文本输出（倒推提示词等）：直接返回文本
  if ((config.outputKind || 'media') === 'text') {
    let value = getByPath(json, config.outputExtract)
    if (value == null && json != null) value = firstString(json)
    // 非 JSON 响应（纯文本）直接当文本输出
    if (value == null) value = String(raw || '').trim()
    const normalized = normalizeOutput(value, config.outputMediaType, 'text')
    return { ok: true, output: normalized, raw: json ?? raw }
  }

  // 先按输出提取路径取值
  let extracted = getByPath(json, config.outputExtract)
  if (extracted == null && json != null) extracted = firstStringUrl(json)

  // 如果已经取到媒体地址（http/data:）就直接返回；否则进入轮询
  const looksMedia =
    typeof extracted === 'string' && (extracted.trim().startsWith('http') || extracted.trim().startsWith('data:'))
  if (config.poll?.enabled && !looksMedia) {
    const { value, raw: pollRaw } = await pollJob({ config, vars, initialJson: json })
    const normalized = normalizeOutput(value, config.outputMediaType)
    return { ok: true, output: normalized, raw: pollRaw ?? json }
  }

  const normalized = normalizeOutput(extracted, config.outputMediaType, config.outputKind)
  return { ok: true, output: normalized, raw: json ?? raw }
}

