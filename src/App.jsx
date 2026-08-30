import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from './i18n.js'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import Toolbar from './components/Toolbar.jsx'
import Palette from './components/Palette.jsx'
import Inspector from './components/Inspector.jsx'
import AgentPanel from './components/AgentPanel.jsx'
import HelpModal from './components/HelpModal.jsx'
import TourModal from './components/TourModal.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import ContextMenu from './components/ContextMenu.jsx'
import { TextNode } from './nodes/TextNode.jsx'
import { ImageNode } from './nodes/ImageNode.jsx'
import { VideoNode } from './nodes/VideoNode.jsx'
import { ReverseNode } from './nodes/ReverseNode.jsx'
import { UploadNode } from './nodes/UploadNode.jsx'
import { AssetNode } from './nodes/AssetNode.jsx'
import { OutputNode } from './nodes/OutputNode.jsx'
import {
  createNode,
  normalizeNode,
  normalizeEdges,
  topoSort,
  isRunnable,
  serializeForExport,
  saveToLocalStorage,
  loadFromLocalStorage,
  downloadFile,
  uid,
  NODE_TYPES,
} from './utils.js'
import { apiRun, apiPresets } from './api.js'
import { buildRunConfig, loadSettings, saveSettings, GEN_CATS } from './categorySettings.js'
import { idbPutMedia, idbDeleteMedia, idbClearMedia, idbGetAllMedia, isDataUrl } from './mediaStore.js'

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  reverse: ReverseNode,
  upload: UploadNode,
  asset: AssetNode,
  output: OutputNode,
}

function starterCanvas(t) {
  const text = { id: uid('text'), type: 'text', position: { x: 40, y: 200 }, data: { ...createNode('text'), text: t('starter.prompt') } }
  const image = { id: uid('image'), type: 'image', position: { x: 380, y: 160 }, data: createNode('image') }
  const output = { id: uid('output'), type: 'output', position: { x: 760, y: 180 }, data: createNode('output') }
  return {
    nodes: [text, image, output],
    edges: [
      { id: uid('edge'), source: text.id, sourceHandle: 'output', target: image.id, targetHandle: 'prompt' },
      { id: uid('edge'), source: image.id, sourceHandle: 'output', target: output.id, targetHandle: 'media' },
    ],
  }
}

function CanvasApp() {
  const { t } = useTranslation()
  const initial = useMemo(() => loadFromLocalStorage() || starterCanvas(t), [t])
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)

  const [selectedId, setSelectedId] = useState(null)
  const [presets, setPresets] = useState([])
  const [helpOpen, setHelpOpen] = useState(false)
  const [testingId, setTestingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [saveHint, setSaveHint] = useState('')
  const saveHintRef = useRef(null)
  const [ctxMenu, setCtxMenu] = useState(null)
  const [rightTab, setRightTab] = useState('node')
  const [settings, setSettings] = useState(() => loadSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(() => {
    try {
      return !localStorage.getItem('tapnow-tour-seen')
    } catch {
      return true
    }
  })
  const runChainRef = useRef(Promise.resolve())
  const saveGen = useRef(0)
  const mediaCacheRef = useRef(new Map()) // nodeId -> 上次写入 IDB 的媒体值（去重，避免反复写）
  const displayCacheRef = useRef(new Map()) // nodeId -> { node, nodeData }（拖拽时只重渲变化的节点）
  const displaySettingsRef = useRef(null)
  const displayEdgesRef = useRef(null)
  const selectedIdsRef = useRef([]) // 当前框选/点选的所有节点 id
  const canvasRef = useRef({ nodes, edges })
  canvasRef.current = { nodes, edges }
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const plusRef = useRef(null) // “+”拖拽起点
  const fileInputRef = useRef(null)
  const { screenToFlowPosition } = useReactFlow()

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const selectedNode = selectedId ? nodeMap.get(selectedId) || null : null
  const anyRunning = nodes.some((n) => n.data.status === 'running')

  // 加载预设
  useEffect(() => {
    apiPresets()
      .then(setPresets)
      .catch(() => {})
  }, [])

  // 把画布里所有 data URL 媒体增量写入 IndexedDB；值没变则跳过（减少 IO 与 GC）
  const persistMedia = useCallback((ns) => {
    const cache = mediaCacheRef.current
    const jobs = []
    const live = new Set()
    for (const n of ns) {
      live.add(n.id)
      const m = n.data.media
      const imgs = Array.isArray(n.data.images) ? n.data.images.filter((v) => typeof v === 'string' && isDataUrl(v)) : []
      if (m && isDataUrl(m.value)) {
        if (cache.get(n.id) !== 'm:' + m.value) {
          cache.set(n.id, 'm:' + m.value)
          jobs.push(idbPutMedia(n.id, { value: m.value, mediaType: m.mediaType }))
        }
      } else if (imgs.length) {
        const sig = 'i:' + imgs.join('\u0001')
        if (cache.get(n.id) !== sig) {
          cache.set(n.id, sig)
          jobs.push(idbPutMedia(n.id, { images: imgs }))
        }
      } else if (cache.has(n.id)) {
        cache.delete(n.id)
        jobs.push(idbDeleteMedia(n.id))
      }
    }
    for (const id of [...cache.keys()]) {
      if (!live.has(id)) {
        cache.delete(id)
        jobs.push(idbDeleteMedia(id))
      }
    }
    return Promise.all(jobs)
  }, [])

  // 自动保存
  const saveTimer = useRef(null)
  useEffect(() => () => { if (saveHintRef.current) clearTimeout(saveHintRef.current) }, [])
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const gen = ++saveGen.current
    saveTimer.current = setTimeout(async () => {
      await persistMedia(nodes)
      if (gen !== saveGen.current) return // 保存期间画布又变了，丢弃本次旧快照
      saveToLocalStorage(nodes, edges)
    }, 800)
    return () => clearTimeout(saveTimer.current)
  }, [nodes, edges, persistMedia])

  // 启动时从 IndexedDB 恢复大图（localStorage 里只有 __idb 占位标记）
  useEffect(() => {
    let cancelled = false
    idbGetAllMedia().then((list) => {
      if (cancelled) return
      const byId = new Map(list.map((e) => [e.nodeId, e]))
      setNodes((ns) => {
        let changed = false
        const next = ns.map((n) => {
          const entry = byId.get(n.id)
          if (!entry) return n
          if (typeof entry.value === 'string' && entry.value) {
            const m = n.data.media
            if (m && m.value === entry.value) return n
            changed = true
            mediaCacheRef.current.set(n.id, 'm:' + entry.value)
            return { ...n, data: { ...n.data, media: { value: entry.value, mediaType: entry.mediaType || 'image' }, status: 'success', error: '' } }
          }
          if (Array.isArray(entry.images) && entry.images.length) {
            const cur = Array.isArray(n.data.images) ? n.data.images : []
            if (cur.length === entry.images.length && cur.every((v, i) => v === entry.images[i])) return n
            changed = true
            mediaCacheRef.current.set(n.id, 'i:' + entry.images.join('\u0001'))
            return { ...n, data: { ...n.data, images: entry.images, status: 'success', error: '' } }
          }
          return n
        })
        return changed ? next : ns
      })
    })
    return () => { cancelled = true }
  }, [setNodes])

  const showToast = useCallback((msg, kind = 'info') => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const finishTour = useCallback(() => {
    try {
      localStorage.setItem('tapnow-tour-seen', '1')
    } catch {}
    setTourOpen(false)
  }, [])

  const updateSettings = useCallback((fn) => {
    setSettings((s) => {
      const next = fn(s)
      saveSettings(next)
      return next
    })
  }, [])

  // 运行前选择该板块的 API：默认记住上次用的（同时记住其模型）
  const selectCategoryApi = useCallback((cat, apiId) => {
    setSettings((s) => {
      const api = s[cat]?.apis.find((a) => a.id === apiId)
      if (!api) return s
      const next = { ...s, [cat]: { ...s[cat], currentApiId: apiId, model: api.model || '' } }
      saveSettings(next)
      return next
    })
  }, [])

  const notifyNode = useCallback(
    (id, patch) => {
      setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)))
    },
    [setNodes]
  )

  // 预览输出节点：自动接收上游媒体（图片/视频），无需手动运行
  useEffect(() => {
    const { nodes: ns, edges: es } = canvasRef.current
    setNodes((prev) => {
      let changed = false
      const next = prev.map((n) => {
        if (n.type !== 'output') return n
        const edge = es.find((e) => e.target === n.id && e.targetHandle === 'media')
        if (!edge) return n
        const src = ns.find((s) => s.id === edge.source)
        if (!src) return n
        // 图片素材节点没有 media，用它的第一张图预览
        const media =
          src.type === 'asset'
            ? Array.isArray(src.data.images) && src.data.images.length
              ? { value: src.data.images[0], mediaType: 'image' }
              : null
            : src.data.media ?? null
        if (media?.value === n.data.media?.value) return n
        changed = true
        return { ...n, data: { ...n.data, media, status: media ? 'success' : 'idle', error: '' } }
      })
      return changed ? next : prev
    })
  }, [setNodes])

  const setNodeStatus = useCallback(
    (id, status, extra = {}) => {
      setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, status, ...extra } } : n)))
    },
    [setNodes]
  )

  // ---------- 执行 ----------
  const collectInputs = useCallback(
    (id) => {
      const { nodes: ns, edges: es } = canvasRef.current
      const byId = new Map(ns.map((n) => [n.id, n]))
      const inputs = {}
      const imageList = []
      for (const edge of es) {
        if (edge.target !== id) continue
        const src = byId.get(edge.source)
        if (!src) continue
        if (edge.targetHandle === 'image') {
          // 多图：把所有上游图片收集进 imageList
          if (src.type === 'asset') {
            for (const v of src.data.images || []) {
              if (typeof v === 'string' && v) imageList.push(v)
            }
          } else if (src.data.media?.value) {
            imageList.push(src.data.media.value)
          }
          continue
        }
        let value = null
        if (src.type === 'text' || src.type === 'reverse') value = src.data.text
        else value = src.data.media?.value
        if (value == null || value === '') continue
        if (edge.targetHandle === 'prompt') inputs.prompt = value
        else if (edge.targetHandle === 'media') inputs.media = value
      }
      if (imageList.length) {
        inputs.image = imageList[0]
        inputs.images = imageList
      }
      // 节点本地提示词兜底：没连上游文本时，直接用节点里的输入
      const target = byId.get(id)
      if (target && (target.type === 'image' || target.type === 'video') && !inputs.prompt && target.data.text) {
        inputs.prompt = target.data.text
      }
      return inputs
    },
    []
  )

  const executeNode = useCallback(
    (id) => {
      const node = canvasRef.current.nodes.find((n) => n.id === id)
      if (!node || !isRunnable(node)) return
      // 并发运行排队串行执行，而不是静默丢弃
      const task = runChainRef.current.then(async () => {
        const cur = canvasRef.current.nodes.find((n) => n.id === id)
        if (!cur) return
        setNodeStatus(id, 'running')
        const inputs = collectInputs(id)
        try {
          const cfg = buildRunConfig(cur.type, settingsRef.current)
          if (!cfg) throw new Error(t('toast.noApi', { name: cur.data.name || cur.data.label || cur.type }))
          const data = await apiRun(cfg, inputs)
          if (cur.type === 'reverse') {
            setNodeStatus(id, 'success', { text: data.output?.value ?? '', error: '' })
          } else {
            setNodeStatus(id, 'success', { media: data.output, error: '' })
          }
        } catch (err) {
          setNodeStatus(id, 'error', { error: err.message || String(err) })
        }
      })
      runChainRef.current = task.catch(() => {})
      return task
    },
    [collectInputs, setNodeStatus]
  )

  const runAll = useCallback(async () => {
    const { nodes: ns, edges: es } = canvasRef.current
    let order
    try {
      order = topoSort(ns, es)
    } catch (err) {
      showToast(err.message, 'error')
      return
    }
    const targets = order.filter((id) => isRunnable(canvasRef.current.nodes.find((n) => n.id === id)))
    if (!targets.length) {
      showToast(t('toast.noRunnable'), 'info')
      return
    }
    for (const id of targets) {
      await executeNode(id)
      const fresh = canvasRef.current.nodes.find((n) => n.id === id)
      if (fresh?.data.status === 'error') break
    }
  }, [executeNode, showToast])

  // 运行某节点：先把它的上游依赖链全部跑完（拓扑顺序），再返回结果
  const runUpstream = useCallback(
    async (id) => {
      const { nodes: ns, edges: es } = canvasRef.current
      const needed = new Set([id])
      const scan = (targetId) => {
        for (const e of es) {
          if (e.target === targetId && !needed.has(e.source)) {
            needed.add(e.source)
            scan(e.source)
          }
        }
      }
      scan(id)
      let order
      try {
        order = topoSort(ns, es)
      } catch (err) {
        showToast(err.message, 'error')
        return
      }
      const targets = order.filter(
        (nid) => needed.has(nid) && isRunnable(ns.find((n) => n.id === nid))
      )
      if (!targets.length) {
        showToast(t('toast.noUpstream'), 'info')
        return
      }
      for (const nid of targets) {
        await executeNode(nid)
        const fresh = canvasRef.current.nodes.find((n) => n.id === nid)
        if (fresh?.data.status === 'error') break
      }
    },
    [executeNode, showToast]
  )

  const runSingle = useCallback(async (id) => runUpstream(id), [runUpstream])

  const testNode = useCallback(
    async (id) => {
      const node = nodeMap.get(id)
      if (!node) return
      setTestingId(id)
      try {
        const cfg = buildRunConfig(node.type, settingsRef.current)
        if (!cfg) throw new Error(t('toast.noApi', { name: node.data.name || node.data.label || node.type }))
        const data = await apiRun(cfg, {
          prompt: t('settings.testPrompt'),
          image: collectInputs(id).image || '',
        })
        if (node.type === 'reverse') {
          showToast(t('toast.testText') + ' ' + (data.output?.value || '').slice(0, 60), 'success')
          setNodeStatus(id, 'success', { text: data.output?.value ?? '', error: '' })
        } else {
          showToast(t('toast.testOk', { type: data.output?.mediaType || 'unknown' }) + ' ' + (data.output?.value || '').slice(0, 60), 'success')
          setNodeStatus(id, 'success', { media: data.output, error: '' })
        }
      } catch (err) {
        showToast(t('toast.testFail', { msg: err.message }), 'error')
        setNodeStatus(id, 'error', { error: err.message })
      } finally {
        setTestingId(null)
      }
    },
    [nodeMap, collectInputs, showToast, setNodeStatus, t]
  )

const updateNodeConfig = useCallback(
    (id, config) => {
      setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, config } } : n)))
    },
    [setNodes]
  )

  // ---------- 菜单 ----------
  const openMenu = useCallback((x, y, items) => {
    const mw = 250
    const mh = items.length * 36 + 12
    const px = Math.min(x, window.innerWidth - mw - 8)
    const py = Math.min(y, window.innerHeight - mh - 8)
    setCtxMenu({ x: Math.max(8, px), y: Math.max(8, py), items })
  }, [])
  const closeMenu = useCallback(() => setCtxMenu(null), [])

  // ---------- 节点增删 ----------
  const addNodeAt = useCallback(
    (type, position) => {
      const data = createNode(type)
      const node = { id: uid(type), type, position, data }
      setNodes((ns) => [...ns, node])
      setSelectedId(node.id)
      return node
    },
    [setNodes]
  )

  const addNode = useCallback(
    (type) => {
      const pos = { x: 120 + Math.random() * 120, y: 120 + Math.random() * 160 }
      addNodeAt(type, pos)
    },
    [addNodeAt]
  )

  // 把本地图片文件读成 data URL，塞进一个新的「图片素材」节点（多选/多张）
  const addAssetFromFiles = useCallback(
    async (files, position) => {
      const list = Array.from(files || []).filter((f) => f && typeof f.type === 'string' && f.type.startsWith('image/'))
      if (!list.length) return null
      const values = []
      for (const f of list) {
        const v = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
          reader.onerror = () => resolve('')
          reader.readAsDataURL(f)
        })
        if (v && v.length <= 12 * 1024 * 1024) values.push(v)
      }
      if (!values.length) return null
      const node = addNodeAt('asset', position)
      notifyNode(node.id, { images: values, status: 'success' })
      showToast(t('toast.addedAssets', { count: values.length }), 'success')
      return node
    },
    [addNodeAt, notifyNode, showToast]
  )

  // 新建节点并自动连到来源节点
  const addLinkedNode = useCallback(
    (type, fromNodeId, targetHandle, position) => {
      const node = addNodeAt(type, position)
      setEdges((eds) => [
        ...eds,
        { id: uid('edge'), source: fromNodeId, sourceHandle: 'output', target: node.id, targetHandle },
      ])
      return node
    },
    [addNodeAt, setEdges]
  )

  // 批量删除节点及其相连的连线（框选多选后删除用）
  const deleteNodes = useCallback(
    (ids) => {
      const idSet = new Set(ids)
      for (const id of idSet) {
        idbDeleteMedia(id)
        mediaCacheRef.current.delete(id)
      }
      setNodes((ns) => ns.filter((n) => !idSet.has(n.id)))
      setEdges((eds) => eds.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)))
      setSelectedId((s) => (idSet.has(s) ? null : s))
    },
    [setNodes, setEdges]
  )

  const deleteNode = useCallback(
    (id) => {
      deleteNodes([id])
    },
    [deleteNodes]
  )

  // 复制节点：生成一个相同配置的副本（不复制连线，偏移位置放置）
  const duplicateNode = useCallback(
    (id) => {
      const node = nodeMap.get(id)
      if (!node) return
      const copy = {
        id: uid(node.type),
        type: node.type,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        data: JSON.parse(JSON.stringify(node.data)),
      }
      setNodes((ns) => [...ns, copy])
      setSelectedId(copy.id)
    },
    [nodeMap, setNodes]
  )

  // 根据来源节点类型生成“下一步”选项
  const buildQuickItems = useCallback(
    (fromNodeId, position) => {
      const node = nodeMap.get(fromNodeId)
      if (!node) return []
      const add = (type, targetHandle) => () => addLinkedNode(type, fromNodeId, targetHandle, position)
      switch (node.type) {
        case 'text':
        case 'reverse':
          return [
            { label: t('menu.next.text2image'), hint: t('menu.next.text2imageHint'), action: add('image', 'prompt') },
            { label: t('menu.next.text2video'), hint: t('menu.next.text2videoHint'), action: add('video', 'prompt') },
          ]
        case 'image':
        case 'upload':
        case 'asset':
          return [
            { label: t('menu.next.image2image'), hint: t('menu.next.image2imageHint'), action: add('image', 'image') },
            { label: t('menu.next.image2video'), hint: t('menu.next.image2videoHint'), action: add('video', 'image') },
            { label: t('menu.next.reverse'), hint: t('menu.next.reverseHint'), action: add('reverse', 'image') },
            { label: t('menu.next.output'), hint: t('menu.next.outputHint'), action: add('output', 'media') },
          ]
        case 'video':
          return [
            { label: t('menu.next.output'), hint: t('menu.next.outputVideoHint'), action: add('output', 'media') },
          ]
        default:
          return []
      }
    },
    [nodeMap, addLinkedNode]
  )

  // ---------- 连线 ----------
  const onConnect = useCallback(
    (params) => {
      if (params.source === params.target) {
        showToast(t('toast.cantSelf'), 'error')
        return
      }
      const hasSame = edges.some((e) => e.target === params.target && e.targetHandle === params.targetHandle)
      // 参考图输入口支持多张图同时接入；提示词/媒体输入口仍只允许一条
      if (hasSame && params.targetHandle !== 'image') {
        showToast(t('toast.portTaken'), 'error')
        return
      }
      setEdges((eds) => addEdge({ ...params, animated: false }, eds))
    },
    [edges, setEdges, showToast]
  )

  const onConnectStart = useCallback((_event, params) => {
    // 从左右两端任意连接点拖线；松手停在空白处时弹出“下一步”菜单
    if (params?.handleType) plusRef.current = { nodeId: params.nodeId }
  }, [])

  // “+”拖出后松手：若没落在输入口，弹出下一步菜单
  const onConnectEnd = useCallback(
    (event, connectionState) => {
      const plus = plusRef.current
      plusRef.current = null
      if (!plus) return
      if (connectionState?.isValid) return // 已连到目标输入口，正常建边
      const node = nodeMap.get(plus.nodeId)
      if (!node) return
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const items = buildQuickItems(plus.nodeId, pos)
      if (items.length) openMenu(event.clientX, event.clientY, items)
    },
    [nodeMap, screenToFlowPosition, buildQuickItems, openMenu]
  )

  // 画布空白处右键
  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault()
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const items = NODE_TYPES.map((it) => ({
        label: `${it.icon} ${t(it.labelKey)}`,
        hint: t(it.descKey),
        action: () => addNodeAt(it.type, pos),
      }))
      items.push({ divider: true })
      items.push({ label: t('menu.runAll'), hint: t('menu.runAllHint'), action: runAll })
      openMenu(event.clientX, event.clientY, items)
    },
    [screenToFlowPosition, addNodeAt, runAll, openMenu, t]
  )

  // 节点右键
  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault()
      const sel = selectedIdsRef.current
      if (sel.length > 1 && sel.includes(node.id)) {
        const items = [
          { label: t('menu.deleteSel', { count: sel.length }), hint: t('menu.deleteSelHint'), action: () => deleteNodes(sel) },
          { divider: true },
          { label: t('menu.runAll'), hint: t('menu.runAllHint'), action: runAll },
        ]
        openMenu(event.clientX, event.clientY, items)
        return
      }
      const items = []
      if (isRunnable(node)) {
        items.push({ label: t('menu.runNode'), hint: '', action: () => runUpstream(node.id) })
      }
      items.push({ label: t('menu.duplicateNode'), hint: t('menu.duplicateNodeHint'), action: () => duplicateNode(node.id) })
      const pos = { x: node.position.x + 100, y: node.position.y + 80 }
      items.push(...buildQuickItems(node.id, pos))
      items.push({ divider: true })
      items.push({ label: t('menu.deleteNode'), hint: t('menu.deleteNodeHint'), action: () => deleteNode(node.id) })
      openMenu(event.clientX, event.clientY, items)
    },
    [buildQuickItems, deleteNode, deleteNodes, duplicateNode, runUpstream, runAll, openMenu, t]
  )

  // 左侧面板拖拽进画布
  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])
  const onDrop = useCallback(
    (event) => {
      event.preventDefault()
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      // 本地图片拖进画布 → 自动创建「图片素材」节点
      const files = Array.from(event.dataTransfer.files || [])
      if (files.some((f) => f && typeof f.type === 'string' && f.type.startsWith('image/'))) {
        addAssetFromFiles(files, pos)
        return
      }
      // 左侧面板拖拽
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return
      addNodeAt(type, pos)
    },
    [screenToFlowPosition, addNodeAt, addAssetFromFiles]
  )

  // ---------- 保存 / 导入导出 ----------
  const handleSave = useCallback(() => {
    persistMedia(nodes).then(() => {
      const ok = saveToLocalStorage(nodes, edges)
      showToast(ok ? t('toast.saved') : t('toast.saveFail'), ok ? 'success' : 'error')
    })
  }, [nodes, edges, persistMedia, showToast])

  const handleExport = useCallback(() => {
    const payload = {
      app: 'tapnow-local',
      version: 1,
      nodes: serializeForExport(nodes),
      edges,
    }
    downloadFile(`tapnow-canvas-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json')
    showToast(t('toast.exported'), 'success')
  }, [nodes, edges, showToast])

  const handleImport = useCallback(() => fileInputRef.current?.click(), [])

  const onImportFile = useCallback(
    (file) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const payload = JSON.parse(reader.result)
          if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) throw new Error(t('toast.badFormat'))
          const nodes = payload.nodes.map(normalizeNode).filter(Boolean)
          if (!nodes.length) throw new Error(t('toast.noValidNode'))
          setNodes(nodes)
          setEdges(normalizeEdges(payload.edges, nodes.map((n) => n.id)))
          showToast(t('toast.importOk'), 'success')
        } catch (err) {
          showToast(t('toast.importFail', { msg: err.message }), 'error')
        }
      }
      reader.readAsText(file)
    },
    [setNodes, setEdges, showToast]
  )

  const handleClear = useCallback(() => {
    if (!window.confirm(t('confirm.clear'))) return
    idbClearMedia()
    mediaCacheRef.current.clear()
    try {
      localStorage.setItem('tapnow-local-canvas-backup', JSON.stringify({ nodes, edges }))
    } catch {}
    const fresh = starterCanvas(t)
    setNodes(fresh.nodes)
    setEdges(fresh.edges)
    setSelectedId(null)
    setSaveHint(t('toast.clearHint'))
    saveHintRef.current = setTimeout(() => setSaveHint(''), 4000)
    showToast(t('toast.cleared'), 'success')
  }, [nodes, edges, setNodes, setEdges, showToast, t])

  // 键盘快捷键：Ctrl+S 保存 / Ctrl+Enter 运行全部 / Ctrl+, 打开设置
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target
      const tag = el && el.tagName ? el.tagName.toUpperCase() : ''
      const editable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === 's' && !editable) {
        e.preventDefault()
        handleSave()
      } else if (key === 'enter' && !editable) {
        e.preventDefault()
        runAll()
      } else if (key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave, runAll])

  // 画布快照（给 Agent 看的精简状态）
  const canvasSnapshot = useMemo(
    () => ({
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.data.label || n.type,
        text: n.data.text ? String(n.data.text).slice(0, 200) : undefined,
        hasOutput: !!(n.data.media?.value || n.data.text),
        config: n.data.config
          ? {
              baseUrl: n.data.config.baseUrl || '',
              model: n.data.config.model || '',
              path: n.data.config.path || '',
              outputKind: n.data.config.outputKind || 'media',
              poll: !!n.data.config.poll?.enabled,
            }
          : undefined,
      })),
      edges: edges.map((e) => ({
        from: e.source,
        fromHandle: e.sourceHandle || 'output',
        to: e.target,
        toHandle: e.targetHandle || '',
      })),
    }),
    [nodes, edges]
  )

  // Agent 可用的画布操作集
  const agentApi = useMemo(
    () => ({
      addNode: (type, position, extra = {}) => {
        const node = addNodeAt(type, position)
        if (extra.text) notifyNode(node.id, { text: String(extra.text), status: 'idle' })
        if (extra.config && typeof extra.config === 'object') {
          setNodes((ns) =>
            ns.map((x) => (x.id === node.id ? { ...x, data: { ...x.data, config: { ...x.data.config, ...extra.config } } } : x))
          )
        }
        return node.id
      },
      connect: (from, to, handle) => {
        if (!from || !to || from === to) return
        const es = canvasRef.current.edges
        const hasSame = es.some((e) => e.target === to && e.targetHandle === handle)
        // 参考图输入口支持多图；其他输入口仍只允许一条
        if (hasSame && handle !== 'image') {
          showToast(t('toast.portTaken'), 'error')
          return
        }
        setEdges((eds) => [
          ...eds,
          { id: uid('edge'), source: from, sourceHandle: 'output', target: to, targetHandle: handle },
        ])
      },
      run: (id) => runUpstream(id),
      runAll: () => runAll(),
      remove: (id) => deleteNode(id),
      move: (id, position) =>
        setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, position } : n))),
      setConfig: (id, config) =>
        setNodes((ns) =>
          ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n))
        ),
      setText: (id, text) => notifyNode(id, { text, status: 'idle' }),
      clear: () => handleClear(),
      toast: (msg, kind) => showToast(msg, kind),
    }),
    [addNodeAt, notifyNode, setNodes, setEdges, runUpstream, runAll, deleteNode, handleClear, showToast, t]
  )

  // 给节点注入交互回调
  const displayNodes = useMemo(
    () => {
      // 节点对象引用没变就复用上次注入的回调对象：拖拽/缩放时只有变化的节点重渲染
      const cache = displayCacheRef.current
      if (displaySettingsRef.current !== settings) {
        cache.clear()
        displaySettingsRef.current = settings
      }
      if (displayEdgesRef.current !== edges) {
        cache.clear() // 连线变化会影响 inputImageCount 等派生信息
        displayEdgesRef.current = edges
      }
      const byId = new Map(nodes.map((x) => [x.id, x]))
      const countConnectedImages = (nodeId) =>
        edges.reduce((sum, e) => {
          if (e.target !== nodeId || e.targetHandle !== 'image') return sum
          const src = byId.get(e.source)
          if (!src) return sum
          if (src.type === 'asset') {
            return sum + (Array.isArray(src.data.images) ? src.data.images.filter((v) => typeof v === 'string' && v).length : 0)
          }
          return sum + (src.data.media?.value ? 1 : 0)
        }, 0)
      const inject = (n) => ({
        ...n,
        data: {
          ...n.data,
          onRun: () => runSingle(n.id),
          onConfig: () => setSelectedId(n.id),
          onText: (text) => notifyNode(n.id, { text, status: 'idle' }),
          onFile: (value) => notifyNode(n.id, { media: { value, mediaType: 'image' }, status: 'success' }),
          onError: (error) => notifyNode(n.id, { error, status: 'error' }),
          onRename: (name) => notifyNode(n.id, { name, status: 'idle' }),
          onImages: (images) => notifyNode(n.id, { images, status: 'success' }),
          onRemoveImage: (i) =>
            setNodes((ns) =>
              ns.map((x) =>
                x.id === n.id
                  ? { ...x, data: { ...x.data, images: (x.data.images || []).filter((_, idx) => idx !== i) } }
                  : x
              )
            ),
          ...(GEN_CATS.has(n.type)
            ? {
                category: n.type,
                apiOptions: settings[n.type]?.apis || [],
                currentApiId: settings[n.type]?.currentApiId || '',
                currentModel: settings[n.type]?.model || '',
                onSelectApi: (apiId) => selectCategoryApi(n.type, apiId),
                onOpenSettings: () => setSettingsOpen(true),
              }
            : {}),
          ...(n.type === 'image' || n.type === 'video' ? { inputImageCount: countConnectedImages(n.id) } : {}),
        },
      })
      const next = nodes.map((n) => {
        const hit = cache.get(n.id)
        if (hit && hit.node === n) return hit.nodeData
        const nodeData = inject(n)
        cache.set(n.id, { node: n, nodeData })
        return nodeData
      })
      if (cache.size !== nodes.length) {
        const live = new Set(nodes.map((x) => x.id))
        for (const id of [...cache.keys()]) if (!live.has(id)) cache.delete(id)
      }
      return next
    },
    [nodes, edges, runSingle, notifyNode, setNodes, settings, selectCategoryApi]
  )

  return (
    <div className="app">
      <Toolbar
        onRunAll={runAll}
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
        onHelp={() => setHelpOpen(true)}
        onTour={() => setTourOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        running={anyRunning}
        saveHint={saveHint}
      />
      <div className="app-body">
        <Palette onAdd={addNode} />
        <div className="canvas-wrap">
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={(deleted) => {
              for (const n of deleted || []) {
                idbDeleteMedia(n.id)
                mediaCacheRef.current.delete(n.id)
              }
            }}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onPaneContextMenu={onPaneContextMenu}
            onNodeContextMenu={onNodeContextMenu}
            onDragOver={onDragOver}
            onDrop={onDrop}
            selectionOnDrag
            panOnDrag={[1]}
            selectionMode="partial"
            onSelectionChange={({ nodes: sel }) => {
              selectedIdsRef.current = sel.map((n) => n.id)
              setSelectedId(sel?.[0]?.id ?? null)
            }}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.15}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#3a4460" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={(n) => nodeColor(n.type)} maskColor="rgba(10,12,20,0.75)" />
          </ReactFlow>
        </div>
        <div className="right-col">
          <div className="right-tabs">
            <button className={rightTab === 'node' ? 'active' : ''} onClick={() => setRightTab('node')}>
              {t('panel.tabNode')}
            </button>
            <button className={rightTab === 'agent' ? 'active' : ''} onClick={() => setRightTab('agent')}>
              {t('panel.tabAgent')}
            </button>
          </div>
          {rightTab === 'node' ? (
            <Inspector
              node={selectedNode}
              settings={settings}
              onSelectApi={selectCategoryApi}
              onOpenSettings={() => setSettingsOpen(true)}
              onTest={testNode}
              onClose={() => setSelectedId(null)}
              testing={testingId === selectedId}
            />
          ) : (
            <AgentPanel
              snapshot={canvasSnapshot}
              agentApi={agentApi}
              agentSettings={settings.agent}
              onAgentUpdate={updateSettings}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onImportFile(f)
          e.target.value = ''
        }}
      />

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={closeMenu} />}
      {toast && <div className={`toast toast-${toast.kind}`} role="status" aria-live="polite">{toast.msg}</div>}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} onTour={() => setTourOpen(true)} />}
      {tourOpen && <TourModal onClose={finishTour} onDone={finishTour} />}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          update={updateSettings}
          presets={presets}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <CanvasApp />
    </ReactFlowProvider>
  )
}

function nodeColor(type) {
  return (
    {
      text: '#8b9cf7',
      image: '#7dd3fc',
      video: '#f0abfc',
      reverse: '#c4b5fd',
      upload: '#fcd34d',
      asset: '#a3e635',
      output: '#6ee7b7',
    }[type] || '#94a3b8'
  )
}
