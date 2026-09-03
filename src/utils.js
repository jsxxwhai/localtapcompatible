// 前端工具函数
import { translate, loadLocale } from './i18n.js'

// 全部节点类型（面板 / 右键菜单 / 拖拽共用）
// labelKey / descKey 用于 i18n 翻译，icon 固定
export const NODE_TYPES = [
  { type: 'text', labelKey: 'node.text', descKey: 'node.text.desc', icon: '✏️' },
  { type: 'image', labelKey: 'node.image', descKey: 'node.image.desc', icon: '🖼️' },
  { type: 'video', labelKey: 'node.video', descKey: 'node.video.desc', icon: '🎬' },
  { type: 'reverse', labelKey: 'node.reverse', descKey: 'node.reverse.desc', icon: '🔍' },
  { type: 'upload', labelKey: 'node.upload', descKey: 'node.upload.desc', icon: '📁' },
  { type: 'asset', labelKey: 'node.asset', descKey: 'node.asset.desc', icon: '📂' },
  { type: 'output', labelKey: 'node.output', descKey: 'node.output.desc', icon: '🖥️' },
]

export const NODE_TYPE_MAP = Object.fromEntries(NODE_TYPES.map((t) => [t.type, t]))

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
      doneValues: ['succeeded', 'completed', 'success'],
      failedValues: ['failed', 'error'],
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
          { role: 'system', content: translate(loadLocale(), 'reverse.visionSystem') },
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
  const data = {
    type,
    labelKey: NODE_TYPE_MAP[type]?.labelKey || type,
    label: '', // 兼容旧数据；展示优先用 labelKey 翻译
    status: 'idle',
    error: '',
    text: '',
    media: null, // { value, mediaType }
    config: defaultNodeConfig(type),
  }
  if (type === 'asset') data.images = [] // 图片素材：可放多张本地图片
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
  let head = 0
  while (head < queue.length) {
    const id = queue[head++]
    order.push(id)
    for (const next of adj.get(id)) {
      indegree.set(next, indegree.get(next) - 1)
      if (indegree.get(next) === 0) queue.push(next)
    }
  }
  if (order.length !== nodes.length) {
    const err = new Error('cycle')
    err.code = 'CYCLE'
    throw err
  }
  return order
}

export function isRunnable(node) {
  return node.type === 'image' || node.type === 'video' || node.type === 'reverse'
}

// data URL 媒体的本地存储占位：大图存 IndexedDB，localStorage 只留标记
function offloadMedia(media) {
  if (!media || typeof media.value !== 'string' || !media.value.startsWith('data:')) return media
  return { ...media, value: '', __idb: true }
}

// 序列化保存时去掉运行时大字段；keepLargeMedia=true 用于导出（完整保留媒体）
export function sanitizeForSave(nodes, keepLargeMedia = false) {
  return nodes.map((n) => {
    const copy = { ...n.data }
    delete copy.status
    delete copy.error
    if (!keepLargeMedia && copy.media && typeof copy.media.value === 'string' && copy.media.value.startsWith('data:')) {
      copy.media = { ...copy.media, value: '', __idb: true }
    }
    if (!keepLargeMedia && Array.isArray(copy.images) && copy.images.some((v) => typeof v === 'string' && v.startsWith('data:'))) {
      copy.images = []
    }
    return { id: n.id, type: n.type, position: n.position, data: copy }
  })
}

// 导出专用：完整保留媒体（data URL 也保留），供下载 JSON 工程文件
export function serializeForExport(nodes) {
  return sanitizeForSave(nodes, true)
}

export async function saveToLocalStorage(nodes, edges) {
  try {
    localStorage.setItem(
      'lct-canvas',
      JSON.stringify({ nodes: sanitizeForSave(nodes), edges })
    )
    return true
  } catch {
    try {
      localStorage.setItem(
        'lct-canvas',
        JSON.stringify({
          nodes: nodes.map((n) => {
            const copy = { ...n.data }
            delete copy.status
            delete copy.error
            copy.media = copy.media?.value?.startsWith('data:') ? offloadMedia(copy.media) : copy.media
            if (Array.isArray(copy.images) && copy.images.some((v) => typeof v === 'string' && v.startsWith('data:'))) {
              copy.images = []
            }
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
    const raw = localStorage.getItem('lct-canvas')
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

// 自动整理画布布局：按拓扑分层，尽量保持原有相对顺序，输出整齐的网格
// 不改变连线，只调整 position；返回新的 nodes 数组（新增了 keepAlive 防误触）
export function autoLayout(nodes, edges) {
  if (!Array.isArray(nodes) || nodes.length < 2) return nodes
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const indeg = new Map(nodes.map((n) => [n.id, 0]))
  const adj = new Map(nodes.map((n) => [n.id, []]))

  for (const e of edges || []) {
    if (!byId.has(e.source) || !byId.has(e.target) || e.source === e.target) continue
    adj.get(e.source).push(e.target)
    indeg.set(e.target, (indeg.get(e.target) || 0) + 1)
  }

  // 拓扑排序（处理环：剩余节点按原顺序排在最后）
  const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id)
  const order = []
  const seen = new Set()
  let head = 0
  while (head < queue.length) {
    const id = queue[head++]
    if (seen.has(id)) continue
    seen.add(id)
    order.push(id)
    for (const nxt of adj.get(id)) {
      indeg.set(nxt, indeg.get(nxt) - 1)
      if (indeg.get(nxt) === 0) queue.push(nxt)
    }
  }
  for (const n of nodes) if (!seen.has(n.id)) order.push(n.id)

  // 层分配：level = 距离所有根的深度（取最大，尽量贴合连线方向）
  const level = new Map(nodes.map((n) => [n.id, 0]))
  for (const id of order) {
    const lv = level.get(id) || 0
    for (const nxt of adj.get(id)) {
      if ((level.get(nxt) || 0) < lv + 1) level.set(nxt, lv + 1)
    }
  }

  // 每层按原顺序排队
  const cols = new Map()
  for (const n of nodes) {
    const lv = level.get(n.id) || 0
    if (!cols.has(lv)) cols.set(lv, [])
    cols.get(lv).push(n.id)
  }
  const X_GAP = 320
  const Y_GAP = 190
  const maxPerCol = Math.max(...[...cols.values()].map((arr) => arr.length), 1)
  const startY = 40 + ((maxPerCol - 1) * Y_GAP) / 2

  const positions = new Map()
  for (const [lv, ids] of [...cols.entries()].sort((a, b) => a[0] - b[0])) {
    const x = 60 + lv * X_GAP
    ids.forEach((id, i) => {
      positions.set(id, { x, y: startY + i * Y_GAP - (ids.length - 1) * Y_GAP / 2 })
    })
  }

  return nodes.map((n) => (positions.has(n.id) ? { ...n, position: positions.get(n.id) } : n))
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
