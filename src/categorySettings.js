// 板块级 API 设置：每个板块（图片/视频/倒推/Agent）可配置多个 API 版本，
// 每个 API 可拉取模型列表 / 自选模型 ID / 测试；运行前下拉选模型，默认记住上次用的。

export const CATEGORY_DEFS = [
  { id: 'image', labelKey: 'settings.cat.image', icon: '🖼️' },
  { id: 'video', labelKey: 'settings.cat.video', icon: '🎬' },
  { id: 'reverse', labelKey: 'settings.cat.reverse', icon: '🔍' },
  { id: 'agent', labelKey: 'settings.cat.agent', icon: '🤖' },
]
export const CATEGORY_MAP = Object.fromEntries(CATEGORY_DEFS.map((c) => [c.id, c]))
export const GEN_CATS = new Set(['image', 'video', 'reverse'])

// v2：移除模拟测试后升级，丢弃旧版残留的 mock 配置（如 127.0.0.1:4100 / mock-* 模型）
export const SETTINGS_KEY = 'tapnow-local-category-settings-v2'

export function uidApi(prefix = 'api') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

const VISION_SYSTEM = '你是专业的提示词工程师。请用中文详细描述图片的内容、风格、构图、光线与细节，输出一段可直接用于文生图/文生视频的提示词。'

function profile(id, name, cfg) {
  return {
    id,
    name,
    baseUrl: '',
    apiKey: '',
    path: '/',
    method: 'POST',
    model: '',
    headers: {},
    bodyTemplate: { prompt: '{{prompt}}' },
    outputExtract: '',
    outputMediaType: 'auto',
    outputKind: 'media',
    timeoutMs: 120000,
    poll: null,
    models: [], // 最近一次“拉取模型”的结果
    ...cfg,
  }
}

// 每个板块的默认 API 版本
export function defaultApis(cat) {
  if (cat === 'image') {
    return [
      profile('api-openai-image', 'OpenAI 文生图', {
        baseUrl: 'https://api.openai.com/v1',
        path: '/images/generations',
        model: 'gpt-image-1',
        bodyTemplate: { model: '{{model}}', prompt: '{{prompt}}', n: 1, size: '1024x1024' },
        outputExtract: 'data[0].url',
      }),
      profile('api-siliconflow-image', 'SiliconFlow 文生图', {
        baseUrl: 'https://api.siliconflow.cn/v1',
        path: '/images/generations',
        model: 'Kwai-Kolors/Kolors',
        bodyTemplate: { model: '{{model}}', prompt: '{{prompt}}', n: 1, size: '1024x1024' },
        outputExtract: 'data[0].url',
      }),
    ]
  }
  if (cat === 'video') {
    return [
      profile('api-async-video', '通用异步视频（提交+轮询）', {
        baseUrl: 'https://your-api.example.com/v1',
        path: '/videos/generations',
        model: 'your-video-model',
        bodyTemplate: { model: '{{model}}', prompt: '{{prompt}}', image: '{{image}}' },
        outputExtract: 'id',
        outputMediaType: 'video',
        poll: {
          enabled: true,
          path: '/videos/generations/{id}',
          idPath: 'id',
          statusPath: 'status',
          doneValues: 'succeeded,completed,success',
          failedValues: 'failed,error',
          resultExtract: 'output.video_url',
          intervalMs: 3000,
          maxAttempts: 200,
        },
      }),
    ]
  }
  if (cat === 'reverse') {
    return [
      profile('api-openai-vision', 'OpenAI 视觉（倒推提示词）', {
        baseUrl: 'https://api.openai.com/v1',
        path: '/chat/completions',
        model: 'gpt-4o-mini',
        bodyTemplate: {
          model: '{{model}}',
          messages: [
            { role: 'system', content: VISION_SYSTEM },
            { role: 'user', content: [{ type: 'image_url', image_url: { url: '{{image}}' } }] },
          ],
          max_tokens: 512,
        },
        outputExtract: 'choices[0].message.content',
        outputKind: 'text',
      }),
      profile('api-qwen-vl', 'Qwen-VL（倒推提示词）', {
        baseUrl: 'https://api.siliconflow.cn/v1',
        path: '/chat/completions',
        model: 'Qwen/Qwen2.5-VL-72B-Instruct',
        bodyTemplate: {
          model: '{{model}}',
          messages: [
            { role: 'system', content: VISION_SYSTEM },
            { role: 'user', content: [{ type: 'image_url', image_url: { url: '{{image}}' } }] },
          ],
          max_tokens: 512,
        },
        outputExtract: 'choices[0].message.content',
        outputKind: 'text',
      }),
    ]
  }
  // agent
  return [
    profile('api-openai-agent', 'OpenAI Agent', {
      baseUrl: 'https://api.openai.com/v1',
      path: '/chat/completions',
      model: 'gpt-4o-mini',
      bodyTemplate: {
        model: '{{model}}',
        messages: [
          { role: 'system', content: '{{system}}' },
          { role: 'user', content: '{{prompt}}' },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      outputExtract: 'choices[0].message.content',
      outputKind: 'text',
    }),
    profile('api-qwen-agent', 'Qwen Agent', {
      baseUrl: 'https://api.siliconflow.cn/v1',
      path: '/chat/completions',
      model: 'Qwen/Qwen2.5-72B-Instruct',
      bodyTemplate: {
        model: '{{model}}',
        messages: [
          { role: 'system', content: '{{system}}' },
          { role: 'user', content: '{{prompt}}' },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      outputExtract: 'choices[0].message.content',
      outputKind: 'text',
    }),
  ]
}

export function emptyCategory(cat) {
  const apis = defaultApis(cat)
  return {
    currentApiId: apis[0]?.id || '',
    model: apis[0]?.model || '',
    apis,
  }
}

export function normalizeApi(raw, cat) {
  const base = profile(uidApi(), '未命名 API', {})
  if (!raw || typeof raw !== 'object') return base
  const { _busyFetch, _busyTest, testMsg, ...rest } = raw
  return {
    ...base,
    ...rest,
    id: typeof rest.id === 'string' && rest.id ? rest.id : uidApi(),
    poll: rest.poll && typeof rest.poll === 'object' ? { ...base.poll, ...rest.poll } : rest.poll || null,
    models: Array.isArray(rest.models) ? rest.models : [],
  }
}

export function normalizeSettings(raw) {
  const out = {}
  for (const c of CATEGORY_DEFS) {
    const src = raw && typeof raw[c.id] === 'object' ? raw[c.id] : null
    const apis = Array.isArray(src?.apis) ? src.apis.map((a) => normalizeApi(a, c.id)) : defaultApis(c.id)
    const currentApiId = apis.some((a) => a.id === src?.currentApiId) ? src.currentApiId : apis[0]?.id || ''
    out[c.id] = {
      currentApiId,
      model: typeof src?.model === 'string' && src.model ? src.model : apis.find((a) => a.id === currentApiId)?.model || '',
      apis,
    }
  }
  return out
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return normalizeSettings(JSON.parse(raw))
  } catch {}
  return normalizeSettings(null)
}

export function saveSettings(s) {
  try {
    // 只持久化真实配置字段，丢弃弹窗里的临时 UI 状态（_busyFetch/_busyTest/testMsg）
    const clean = {}
    for (const c of CATEGORY_DEFS) {
      const src = s?.[c.id]
      if (!src || typeof src !== 'object') continue
      clean[c.id] = {
        currentApiId: src.currentApiId || '',
        model: typeof src.model === 'string' ? src.model : '',
        apis: (Array.isArray(src.apis) ? src.apis : [])
          .filter((a) => a && typeof a === 'object')
          .map((a) => {
            const { _busyFetch, _busyTest, testMsg, ...api } = a
            return api
          }),
      }
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean))
    return true
  } catch {
    return false
  }
}

export function currentApi(catSet) {
  return (catSet?.apis || []).find((a) => a.id === catSet.currentApiId) || catSet?.apis?.[0] || null
}

// 组装一次运行用的完整 config（板块当前 API + 当前选中的模型）
export function buildRunConfig(cat, settings) {
  const catSet = settings?.[cat]
  const api = currentApi(catSet)
  if (!api) return null
  const { id: _id, name: _name, models: _models, ...config } = api
  return { ...config, model: catSet?.model || api.model || '' }
}

// Agent 用的运行 config
export function buildAgentConfig(settings) {
  return buildRunConfig('agent', settings)
}
