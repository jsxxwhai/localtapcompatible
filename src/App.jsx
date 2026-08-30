import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { OutputNode } from './nodes/OutputNode.jsx'
import {
  createNode,
  normalizeNode,
  normalizeEdges,
  topoSort,
  isRunnable,
  sanitizeForSave,
  saveToLocalStorage,
  loadFromLocalStorage,
  downloadFile,
  uid,
  NODE_TYPES,
} from './utils.js'
import { apiRun, apiPresets } from './api.js'
import { buildRunConfig, loadSettings, saveSettings, GEN_CATS } from './categorySettings.js'

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  reverse: ReverseNode,
  upload: UploadNode,
  output: OutputNode,
}

function starterCanvas() {
  const text = { id: uid('text'), type: 'text', position: { x: 40, y: 200 }, data: { ...createNode('text'), text: '赛博朋克风格的霓虹城市夜景，电影感构图' } }
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
  const initial = useMemo(() => loadFromLocalStorage() || starterCanvas(), [])
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)

  const [selectedId, setSelectedId] = useState(null)
  const [presets, setPresets] = useState([])
  const [helpOpen, setHelpOpen] = useState(false)
  const [testingId, setTestingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [saveHint, setSaveHint] = useState('')
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

  // 自动保存
  const saveTimer = useRef(null)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveToLocalStorage(nodes, edges)
    }, 800)
    return () => clearTimeout(saveTimer.current)
  }, [nodes, edges])

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
        const media = src.data.media ?? null
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
      for (const edge of es) {
        if (edge.target !== id) continue
        const src = byId.get(edge.source)
        if (!src) continue
        let value = null
        if (src.type === 'text' || src.type === 'reverse') value = src.data.text
        else value = src.data.media?.value
        if (value == null || value === '') continue
        if (edge.targetHandle === 'prompt') inputs.prompt = value
        else if (edge.targetHandle === 'image') inputs.image = value
        else if (edge.targetHandle === 'media') inputs.media = value
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
          if (!cfg) throw new Error(`「${cur.data.label || cur.type}」板块还没配置 API，点右上角 ⚙️ 设置`)
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
      showToast('画布中没有可运行的节点', 'info')
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
        showToast('该节点没有可运行的上游节点', 'info')
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
        if (!cfg) throw new Error('该板块还没配置 API，点右上角 ⚙️ 设置')
        const data = await apiRun(cfg, {
          prompt: '接口连通性测试',
          image: collectInputs(id).image || '',
        })
        if (node.type === 'reverse') {
          showToast(`测试成功（文本）${(data.output?.value || '').slice(0, 60)}`, 'success')
          setNodeStatus(id, 'success', { text: data.output?.value ?? '', error: '' })
        } else {
          showToast(`测试成功（${data.output?.mediaType || 'unknown'}）${(data.output?.value || '').slice(0, 60)}`, 'success')
          setNodeStatus(id, 'success', { media: data.output, error: '' })
        }
      } catch (err) {
        showToast(`测试失败：${err.message}`, 'error')
        setNodeStatus(id, 'error', { error: err.message })
      } finally {
        setTestingId(null)
      }
    },
    [nodeMap, collectInputs, showToast, setNodeStatus]
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
            { label: '🖼️ 文生图', hint: '提示词 → 图片生成', action: add('image', 'prompt') },
            { label: '🎬 文生视频', hint: '提示词 → 视频生成', action: add('video', 'prompt') },
          ]
        case 'image':
        case 'upload':
          return [
            { label: '🖼️ 图生图', hint: '作为参考图生成新图片', action: add('image', 'image') },
            { label: '🎬 图生视频', hint: '作为起始帧生成视频', action: add('video', 'image') },
            { label: '🔍 倒推提示词', hint: '用视觉模型描述这张图', action: add('reverse', 'image') },
            { label: '🖥️ 预览输出', hint: '连接并查看结果', action: add('output', 'media') },
          ]
        case 'video':
          return [
            { label: '🖥️ 预览输出', hint: '连接并查看视频', action: add('output', 'media') },
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
        showToast('不能连接到自身节点', 'error')
        return
      }
      const hasSame = edges.some((e) => e.target === params.target && e.targetHandle === params.targetHandle)
      if (hasSame) {
        showToast('该输入口已连接，请先断开原有连线', 'error')
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
      const items = NODE_TYPES.map((t) => ({
        label: `${t.icon} ${t.label}`,
        hint: t.desc,
        action: () => addNodeAt(t.type, pos),
      }))
      items.push({ divider: true })
      items.push({ label: '▶ 运行全部', hint: '按连线顺序执行', action: runAll })
      openMenu(event.clientX, event.clientY, items)
    },
    [screenToFlowPosition, addNodeAt, runAll, openMenu]
  )

  // 节点右键
  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault()
      const sel = selectedIdsRef.current
      // 多选状态下右键选中节点：提供批量删除
      if (sel.length > 1 && sel.includes(node.id)) {
        const items = [
          { label: `🗑 删除选中的 ${sel.length} 个节点`, hint: '同时删除相连的连线', action: () => deleteNodes(sel) },
          { divider: true },
          { label: '▶ 运行全部', hint: '按连线顺序执行', action: runAll },
        ]
        openMenu(event.clientX, event.clientY, items)
        return
      }
      const items = []
      if (isRunnable(node)) {
        items.push({ label: '▶ 运行此节点（含上游）', hint: '', action: () => runUpstream(node.id) })
      }
      const pos = { x: node.position.x + 100, y: node.position.y + 80 }
      items.push(...buildQuickItems(node.id, pos))
      items.push({ divider: true })
      items.push({ label: '🗑 删除节点', hint: '也可按 Delete 键', action: () => deleteNode(node.id) })
      openMenu(event.clientX, event.clientY, items)
    },
    [buildQuickItems, deleteNode, deleteNodes, runUpstream, runAll, openMenu]
  )

  // 左侧面板拖拽进画布
  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])
  const onDrop = useCallback(
    (event) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      addNodeAt(type, pos)
    },
    [screenToFlowPosition, addNodeAt]
  )

  // ---------- 保存 / 导入导出 ----------
  const handleSave = useCallback(() => {
    const ok = saveToLocalStorage(nodes, edges)
    showToast(ok ? '已保存到本地浏览器' : '保存失败（本地存储空间不足）', ok ? 'success' : 'error')
  }, [nodes, edges, showToast])

  const handleExport = useCallback(() => {
    const payload = {
      app: 'tapnow-local',
      version: 1,
      nodes: sanitizeForSave(nodes),
      edges,
    }
    downloadFile(`tapnow-canvas-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json')
    showToast('已导出 JSON 工程文件', 'success')
  }, [nodes, edges, showToast])

  const handleImport = useCallback(() => fileInputRef.current?.click(), [])

  const onImportFile = useCallback(
    (file) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const payload = JSON.parse(reader.result)
          if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) throw new Error('文件格式不对')
          const nodes = payload.nodes.map(normalizeNode).filter(Boolean)
          if (!nodes.length) throw new Error('文件中没有有效节点')
          setNodes(nodes)
          setEdges(normalizeEdges(payload.edges, nodes.map((n) => n.id)))
          showToast('导入成功', 'success')
        } catch (err) {
          showToast(`导入失败：${err.message}`, 'error')
        }
      }
      reader.readAsText(file)
    },
    [setNodes, setEdges, showToast]
  )

  const handleClear = useCallback(() => {
    if (!window.confirm('确定清空当前画布？会自动备份到浏览器后再重置。')) return
    try {
      localStorage.setItem('tapnow-local-canvas-backup', JSON.stringify({ nodes, edges }))
    } catch {}
    const fresh = starterCanvas()
    setNodes(fresh.nodes)
    setEdges(fresh.edges)
    setSelectedId(null)
    setSaveHint('已清空并重置示例画布（备份在 tapnow-local-canvas-backup）')
    showToast('画布已重置', 'success')
  }, [nodes, edges, setNodes, setEdges, showToast])

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
        if (from === to) return
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
    [addNodeAt, notifyNode, setNodes, setEdges, runUpstream, runAll, deleteNode, handleClear, showToast]
  )

  // 给节点注入交互回调
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onRun: () => runSingle(n.id),
          onConfig: () => setSelectedId(n.id),
          onText: (text) => notifyNode(n.id, { text, status: 'idle' }),
          onFile: (value) => notifyNode(n.id, { media: { value, mediaType: 'image' }, status: 'success' }),
          onError: (error) => notifyNode(n.id, { error, status: 'error' }),
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
        },
      })),
    [nodes, runSingle, notifyNode, settings, selectCategoryApi]
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
              节点配置
            </button>
            <button className={rightTab === 'agent' ? 'active' : ''} onClick={() => setRightTab('agent')}>
              🤖 AI Agent
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
      {toast && <div className={`toast toast-${toast.kind}`}>{toast.msg}</div>}
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
      output: '#6ee7b7',
    }[type] || '#94a3b8'
  )
}
