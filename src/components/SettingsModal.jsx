import { useState } from 'react'
import { apiRun, apiListModels } from '../api.js'
import { CATEGORY_DEFS, GEN_CATS, uidApi } from '../categorySettings.js'

function PField({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

function pollOf(api) {
  return api.poll || { enabled: false }
}

// 单个 API 版本卡片
function ApiCard({ cat, api, current, onPatch, onRemove, onDuplicate, onSetCurrent, onSelectModel, busy, presets }) {
  const poll = pollOf(api)
  const patchPoll = (p) => onPatch({ poll: { ...poll, ...p } })
  const strip = ({ id, name, models, ...rest }) => rest

  const test = async () => {
    const cfg = { ...strip(api), model: api.model || 'test-model' }
    const inputs = cat === 'reverse' ? { image: '' } : cat === 'agent'
      ? { prompt: '接口连通性测试', vars: { system: '你是测试助手，只回复 OK' } }
      : { prompt: '接口连通性测试' }
    onPatch({ testMsg: undefined })
    const key = `${api.id}-test`
    // 用 busy 的简单文本状态反馈
    onPatch({ _busyTest: true })
    try {
      const data = await apiRun(cfg, inputs)
      const v = (data.output?.value || '').slice(0, 40)
      onPatch({ testMsg: `✅ 测试成功：${v || '有返回'}` })
    } catch (err) {
      onPatch({ testMsg: `❌ 测试失败：${err.message || err}` })
    } finally {
      onPatch({ _busyTest: false })
    }
    void key
  }

  const fetchModels = async () => {
    if (!api.baseUrl) { onPatch({ testMsg: '请先填接口地址 Base URL 再拉取模型' }); return }
    onPatch({ _busyFetch: true, testMsg: '正在拉取模型列表…' })
    try {
      const data = await apiListModels({ baseUrl: api.baseUrl, apiKey: api.apiKey, path: '/models' })
      onPatch({ models: data.models || [], testMsg: `✅ 拉取到 ${(data.models || []).length} 个模型，点下方列表选用` })
    } catch (err) {
      onPatch({ testMsg: `❌ 拉取失败：${err.message || err}` })
    } finally {
      onPatch({ _busyFetch: false })
    }
  }

  return (
    <div className={`api-card ${current ? 'api-card-current' : ''}`}>
      <div className="api-card-head">
        <span className="api-card-name">
          {current && <span className="api-current-tag">当前</span>}
          {api.name || '未命名 API'}
        </span>
        <span className="api-card-actions">
          {!current && <button className="btn btn-small" onClick={onSetCurrent}>设为当前</button>}
          <button className="btn btn-small" onClick={onDuplicate}>复制</button>
          <button className="btn btn-small btn-danger-ghost" onClick={onRemove}>删除</button>
        </span>
      </div>

      <div className="api-card-grid">
        <PField label="名称">
          <input type="text" value={api.name || ''} onChange={(e) => onPatch({ name: e.target.value })} placeholder="例如：OpenAI 文生图" />
        </PField>
        <PField label="接口地址 Base URL">
          <input type="text" value={api.baseUrl || ''} onChange={(e) => onPatch({ baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
        </PField>
        <PField label="路径">
          <input type="text" value={api.path || ''} onChange={(e) => onPatch({ path: e.target.value })} placeholder="/images/generations" />
        </PField>
        <PField label="方法">
          <select value={api.method || 'POST'} onChange={(e) => onPatch({ method: e.target.value })}>
            <option>POST</option><option>GET</option><option>PUT</option>
          </select>
        </PField>
        <PField label="API Key" hint="仅保存在本机">
          <input type="password" value={api.apiKey || ''} onChange={(e) => onPatch({ apiKey: e.target.value })} placeholder="sk-..." />
        </PField>
      </div>

      <PField label="模型（可下拉选已拉取模型，或直接输入模型 ID）" hint={`拉取列表：GET ${api.baseUrl || '{BaseURL}'}/models`}>
        <div className="model-row">
          <input
            list={`ml-${api.id}`}
            type="text"
            value={api.model || ''}
            onChange={(e) => { onPatch({ model: e.target.value }); onSelectModel(e.target.value) }}
            placeholder="gpt-image-1"
          />
          <button className="btn btn-small" onClick={fetchModels} disabled={api._busyFetch}>
            {api._busyFetch ? '拉取中…' : '🔍 拉取模型'}
          </button>
          <button className="btn btn-small" onClick={test} disabled={api._busyTest}>
            {api._busyTest ? '测试中…' : '🔌 测试'}
          </button>
        </div>
        <datalist id={`ml-${api.id}`}>
          {(api.models || []).map((m) => <option key={m} value={m} />)}
        </datalist>
        {(api.models || []).length > 0 && (
          <div className="model-chips">
            {(api.models || []).slice(0, 24).map((m) => (
              <button key={m} className={`model-chip ${m === api.model ? 'active' : ''}`} onClick={() => { onPatch({ model: m }); onSelectModel(m) }}>
                {m}
              </button>
            ))}
          </div>
        )}
        {api.testMsg && <div className={`api-test-msg ${api.testMsg.startsWith('✅') ? 'ok' : 'err'}`}>{api.testMsg}</div>}
      </PField>

      <div className="api-card-grid">
        <PField label="输出提取路径" hint="如 data[0].url">
          <input type="text" value={api.outputExtract || ''} onChange={(e) => onPatch({ outputExtract: e.target.value })} />
        </PField>
        <PField label="输出类型">
          <select value={api.outputMediaType || 'auto'} onChange={(e) => onPatch({ outputMediaType: e.target.value })}>
            <option value="auto">自动</option><option value="image">图片</option><option value="video">视频</option>
          </select>
        </PField>
        <PField label="输出内容">
          <select value={api.outputKind || 'media'} onChange={(e) => onPatch({ outputKind: e.target.value })}>
            <option value="media">媒体（图片/视频）</option><option value="text">文本</option>
          </select>
        </PField>
        <PField label="超时(ms)">
          <input type="number" value={api.timeoutMs ?? 120000} onChange={(e) => onPatch({ timeoutMs: Number(e.target.value) || 120000 })} />
        </PField>
      </div>

      <PField label="请求体模板（JSON）" hint="支持 {{prompt}} {{image}} {{model}} {{apiKey}}{{system}}">
        <textarea
          className="mono"
          rows={4}
          value={api.bodyTemplate ? JSON.stringify(api.bodyTemplate, null, 2) : ''}
          onChange={(e) => {
            const raw = e.target.value
            try { onPatch({ bodyTemplate: JSON.parse(raw) }) } catch {}
          }}
        />
      </PField>

      <div className="section-toggle">
        <label>
          <input type="checkbox" checked={!!poll.enabled} onChange={(e) => patchPoll({ enabled: e.target.checked })} />
          异步任务轮询（视频接口常用）
        </label>
      </div>
      {poll.enabled && (
        <div className="poll-box">
          <div className="api-card-grid">
            <PField label="查询路径" hint="{id} 会被替换为任务 ID">
              <input type="text" value={poll.path || ''} onChange={(e) => patchPoll({ path: e.target.value })} />
            </PField>
            <PField label="任务ID路径">
              <input type="text" value={poll.idPath || ''} onChange={(e) => patchPoll({ idPath: e.target.value })} />
            </PField>
            <PField label="状态路径">
              <input type="text" value={poll.statusPath || ''} onChange={(e) => patchPoll({ statusPath: e.target.value })} />
            </PField>
            <PField label="完成状态(逗号分隔)">
              <input type="text" value={poll.doneValues || ''} onChange={(e) => patchPoll({ doneValues: e.target.value })} />
            </PField>
            <PField label="失败状态(逗号分隔)">
              <input type="text" value={poll.failedValues || ''} onChange={(e) => patchPoll({ failedValues: e.target.value })} />
            </PField>
            <PField label="结果提取路径">
              <input type="text" value={poll.resultExtract || ''} onChange={(e) => patchPoll({ resultExtract: e.target.value })} />
            </PField>
            <PField label="轮询间隔(ms)">
              <input type="number" value={poll.intervalMs || 3000} onChange={(e) => patchPoll({ intervalMs: Number(e.target.value) || 3000 })} />
            </PField>
            <PField label="最大次数">
              <input type="number" value={poll.maxAttempts || 200} onChange={(e) => patchPoll({ maxAttempts: Number(e.target.value) || 200 })} />
            </PField>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsModal({ onClose, settings, update, presets }) {
  const [cat, setCat] = useState('image')
  const [presetId, setPresetId] = useState('')
  const catSet = settings[cat] || { currentApiId: '', model: '', apis: [] }

  const patchCat = (patch) => update((s) => ({ ...s, [cat]: { ...s[cat], ...patch } }))
  const patchApi = (apiId, patch) => {
    let changedModel = false
    update((s) => ({
      ...s,
      [cat]: {
        ...s[cat],
        model: patch.model && s[cat].currentApiId === apiId && typeof patch.model === 'string' ? patch.model : s[cat].model,
        apis: s[cat].apis.map((a) => (a.id === apiId ? { ...a, ...patch } : a)),
      },
    }))
    void changedModel
  }

  const addApi = (cfg) => {
    const api = {
      id: uidApi(),
      name: cfg?.name || '新 API',
      baseUrl: cfg?.baseUrl || '',
      apiKey: cfg?.apiKey || '',
      path: cfg?.path || '/',
      method: cfg?.method || 'POST',
      model: cfg?.model || '',
      headers: cfg?.headers || {},
      bodyTemplate: cfg?.bodyTemplate || { prompt: '{{prompt}}' },
      outputExtract: cfg?.outputExtract || '',
      outputMediaType: cfg?.outputMediaType || 'auto',
      outputKind: cfg?.outputKind || 'media',
      timeoutMs: cfg?.timeoutMs ?? 120000,
      poll: cfg?.poll || null,
      models: [],
    }
    patchCat({ apis: [...catSet.apis, api], currentApiId: catSet.currentApiId || api.id })
  }

  const removeApi = (apiId) => {
    const rest = catSet.apis.filter((a) => a.id !== apiId)
    if (!rest.length) return
    const cur = catSet.currentApiId === apiId ? rest[0].id : catSet.currentApiId
    patchCat({ apis: rest, currentApiId: cur })
  }

  const duplicateApi = (apiId) => {
    const src = catSet.apis.find((a) => a.id === apiId)
    if (!src) return
    const { id, models, ...rest } = src
    addApi({ ...rest, name: src.name + ' 副本' })
  }

  const setCurrent = (apiId) => {
    const api = catSet.apis.find((a) => a.id === apiId)
    if (!api) return
    patchCat({ currentApiId: apiId, model: api.model || '' })
  }

  const selectModel = (m) => patchCat({ model: m })

  const addFromPreset = () => {
    const preset = (presets || []).find((p) => p.id === presetId)
    if (!preset) return
    addApi({ ...preset.config, name: preset.label })
    setPresetId('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>⚙️ 板块 API 设置</span>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="settings-tabs">
          {CATEGORY_DEFS.map((c) => (
            <button key={c.id} className={cat === c.id ? 'active' : ''} onClick={() => setCat(c.id)}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <div className="modal-body settings-body">
          <div className="settings-current">
            <span>当前该板块使用的 API：</span>
            <select value={catSet.currentApiId || ''} onChange={(e) => setCurrent(e.target.value)}>
              {catSet.apis.map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.model || '未设模型'}</option>
              ))}
            </select>
            <span className="settings-current-model">当前模型：{catSet.model || '未设置'}</span>
          </div>
          <div className="settings-add-row">
            <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
              <option value="">— 从内置预设添加 —</option>
              {(presets || []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <button className="btn btn-small" onClick={addFromPreset} disabled={!presetId}>添加预设</button>
            <button className="btn btn-small btn-primary" onClick={() => addApi({ name: '新 API' })}>＋ 新增空白 API</button>
          </div>
          <div className="settings-apis">
            {catSet.apis.map((api) => (
              <ApiCard
                key={api.id}
                cat={cat}
                api={api}
                current={catSet.currentApiId === api.id}
                onPatch={(patch) => patchApi(api.id, patch)}
                onRemove={() => removeApi(api.id)}
                onDuplicate={() => duplicateApi(api.id)}
                onSetCurrent={() => setCurrent(api.id)}
                onSelectModel={selectModel}
              />
            ))}
            {!catSet.apis.length && <div className="inspector-empty">还没有配置 API，点上方「＋ 新增空白 API」或从预设添加。</div>}
          </div>
        </div>
      </div>
    </div>
  )
}