// 前端工具函数

// 全部节点类型（面板 / 右键菜单 / 拖拽共用）
export const NODE_TYPES = [
  { type: 'text', label: '提示词', desc: '输入文本，作为上游提示词', icon: '✏️' },
  { type: 'image', label: '图片生成', desc: '文生图 / 图生图 API', icon: '🖼️' },
  { type: 'video', label: '视频生成', desc: '文生视频 / 图生视频 API（支持轮询）', icon: '🎬' },
  { type: 'reverse', label: '倒推提示词', desc: '视觉模型把图片描述成提示词', icon: '🔍' },
  { type: 'upload', label: '图片上传', desc: '上传本地图片作为参考图', icon: '📁' },
  { type: 'output', label: '预览输出', desc: '预览/下载上游图片或视频', icon: '🖥️' },
]


export function uid(prefix = 'node') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

// 节点默认配置
export function defaultNodeConfig(type) {
  const base = {
    name: '',
    baseUrl: '',
    apiKey: '',
    model: '',
    path: '/',
    method: 'POST',
    headers: {},
    bodyTemplate: { prompt: '{{prompt}}' },
    outputExtract: '',
    outputMediaType: 'auto',
    outputKind: 'media',
    timeoutMs: 120000,
    poll: {
      enabled: false,
      path: '/tasks/{id}',
      idPath: 'id',
      statusPath: 'status',
      doneValues: 'succeeded,completed,success',
      failedValues: 'failed,error',
      resultExtract: 'output.video_url',
      intervalMs: 3000,
      maxAttempts: 200,
    },
  }
  if (type === 'reverse') {
    return {
      ...base,
      model: 'gpt-4o-mini',
      path: '/chat/completions',
      bodyTemplate: {
        model: '{{model}}',
        messages: [
          { role: 'system', content: '你是专业的提示词工程师。请用中文详细描述图片的内容、风格、构图、光线与细节，输出一段可直接用于文生图/文生视频的提示词。' },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: '{{image}}' } }] },
        ],
        max_tokens: 512,
      },
      outputExtract: 'choices[0].message.content',
      outputKind: 'text',
    }
  }
  return base
}

// 新节点工厂
export function createNode(type) {
  const labels = {
    text: '提示词',
    image: '图片生成',
    video: '视频生成',
    reverse: '倒推提示词',
    upload: '图片上传',
    output: '预览输出',
  }
  const data = {
    type,
    label: labels[type] || type,
    status: 'idle',
    error: '',
    text: '',
    media: null, // { value, mediaType }
    config: defaultNodeConfig(type),
  }
  return data
}

// 可持久化的节点类型集合
export const NODE_TYPES_SET = new Set(NODE_TYPES.map((t) => t.type))

// 归一化节点：合并默认配置、清理运行时状态、过滤未知类型（加载/导入共用）
export function normalizeNode(raw) {
  if (!raw || typeof raw !== 'object') return null
  const type = typeof raw.type === 'string' ? raw.type : ''
  if (!NODE_TYPES_SET.has(type)) return null
  const defaults = createNode(type)
  const rawData = raw.data && typeof raw.data === 'object' ? raw.data : {}
  const data = { ...defaults, ...rawData }
  data.config = { ...defaults.config, ...(rawData.config || {}) }
  if (defaults.config.poll && data.config.poll) {
    data.config.poll = { ...defaults.config.poll, ...data.config.poll }
  }
  // 运行时状态不持久化
  data.status = 'idle'
  data.error = ''
  if (typeof data.text !== 'string') data.text = ''
  if (!data.media || typeof data.media !== 'object') data.media = null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(type),
    type,
    position: {
      x: Number(raw.position?.x) || 0,
      y: Number(raw.position?.y) || 0,
    },
    data,
  }
}

// 归一化连线：去掉两端不存在或自连的边
export function normalizeEdges(edges, nodeIds) {
  const ids = new Set(nodeIds)
  return (Array.isArray(edges) ? edges : [])
    .filter((e) => e && e.source && e.target && ids.has(e.source) && ids.has(e.target) && e.source !== e.target)
    .map((e) => ({ ...e, id: e.id || uid('edge') }))
}

// Kahn 拓扑排序；返回节点 id 顺序（依赖在前）
export function topoSort(nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const indegree = new Map(nodes.map((n) => [n.id, 0]))
  const adj = new Map(nodes.map((n) => [n.id, []]))

  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue
    if (edge.source === edge.target) continue
    adj.get(edge.source).push(edge.target)
    indegree.set(edge.target, indegree.get(edge.target) + 1)
  }

  const queue = [...nodes].filter((n) => indegree.get(n.id) === 0).map((n) => n.id)
  const order = []
  while (queue.length) {
    const id = queue.shift()
    order.push(id)
    for (const next of adj.get(id)) {
      indegree.set(next, indegree.get(next) - 1)
      if (indegree.get(next) === 0) queue.push(next)
    }
  }
  if (order.length !== nodes.length) {
    throw new Error('图中存在循环依赖，请先断开循环连线')
  }
  return order
}

export function isRunnable(node) {
  return node.type === 'image' || node.type === 'video' || node.type === 'reverse'
}

// 序列化保存时去掉运行时大字段
export function sanitizeForSave(nodes) {
  return nodes.map((n) => {
    const copy = structuredClone(n.data)
    // 运行时状态不保存，避免下次打开时出现“运行中/出错”卡住
    delete copy.status
    delete copy.error
    if (copy.media?.value?.startsWith('data:') && copy.media.value.length > 200_000) {
      copy.media = { ...copy.media, value: '' }
    }
    return { id: n.id, type: n.type, position: n.position, data: copy }
  })
}

export async function saveToLocalStorage(nodes, edges) {
  try {
    localStorage.setItem(
      'tapnow-local-canvas',
      JSON.stringify({ nodes: sanitizeForSave(nodes), edges })
    )
    return true
  } catch {
    // 空间不足：去掉所有大体积 data url 再试
    try {
      localStorage.setItem(
        'tapnow-local-canvas',
        JSON.stringify({
          nodes: nodes.map((n) => {
            const copy = structuredClone(n.data)
            delete copy.status
            delete copy.error
            copy.media = copy.media?.value?.startsWith('data:') ? null : copy.media
            return { id: n.id, type: n.type, position: n.position, data: copy }
          }),
          edges,
        })
      )
      return true
    } catch {
      return false
    }
  }
}

export function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('tapnow-local-canvas')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.nodes)) return null
    const nodes = parsed.nodes.map(normalizeNode).filter(Boolean)
    if (!nodes.length) return null
    return { nodes, edges: normalizeEdges(parsed.edges, nodes.map((n) => n.id)) }
  } catch {
    return null
  }
}

export function downloadFile(name, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

