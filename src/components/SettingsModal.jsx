import { useEffect, useState } from 'react'
import { apiRun, apiListModels } from '../api.js'
import { CATEGORY_DEFS, uidApi } from '../categorySettings.js'
import { useTranslation, LOCALES } from '../i18n.js'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

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

function ApiCard({ cat, api, current, advanced, onPatch, onRemove, onDuplicate, onSetCurrent, onSelectModel }) {
  const { t } = useTranslation()
  const poll = pollOf(api)
  const patchPoll = (p) => onPatch({ poll: { ...poll, ...p } })
  const strip = ({ id, name, models, ...rest }) => rest
  const [modelDraft, setModelDraft] = useState(api.model || '')
  useEffect(() => setModelDraft(api.model || ''), [api.model])
  const commitModel = (m) => {
    const value = String(m ?? modelDraft).trim()
    setModelDraft(value)
    onPatch({ model: value })
    onSelectModel(value)
  }

  const test = async () => {
    const cfg = { ...strip(api), model: modelDraft || api.model || 'test-model' }
    const inputs = cat === 'reverse'
      ? { image: TINY_PNG }
      : cat === 'agent'
        ? { prompt: 'ping', vars: { system: 'You are a test assistant. Reply only OK.' } }
        : { prompt: 'ping' }
    onPatch({ testMsg: undefined })
    onPatch({ _busyTest: true })
    try {
      const data = await apiRun(cfg, inputs)
      const v = (data.output?.value || '').slice(0, 40)
      onPatch({ testMsg: t('settings.testOk', { msg: v || 'OK' }) })
    } catch (err) {
      onPatch({ testMsg: t('settings.testFail', { msg: err.message || err }) })
    } finally {
      onPatch({ _busyTest: false })
    }
  }

  const fetchModels = async () => {
    if (!api.baseUrl) {
      onPatch({ testMsg: t('settings.needBaseUrl') })
      return
    }
    onPatch({ _busyFetch: true, testMsg: t('settings.fetching') })
    try {
      const data = await apiListModels({ baseUrl: api.baseUrl, apiKey: api.apiKey, path: '/models' })
      onPatch({ models: data.models || [], testMsg: t('settings.fetchOk', { count: (data.models || []).length }) })
    } catch (err) {
      onPatch({ testMsg: t('settings.fetchFail', { msg: err.message || err }) })
    } finally {
      onPatch({ _busyFetch: false })
    }
  }

  return (
    <div className={`api-card ${current ? 'api-card-current' : ''}`}>
      <div className="api-card-head">
        <span className="api-card-name">
          {current && <span className="api-current-tag">{t('settings.currentTag')}</span>}
          {api.nameKey ? t(api.nameKey) : (api.name || t('settings.unnamed'))}
        </span>
        <span className="api-card-actions">
          {!current && <button className="btn btn-small" onClick={onSetCurrent}>{t('settings.setCurrent')}</button>}
          <button className="btn btn-small" onClick={onDuplicate}>{t('settings.duplicate')}</button>
          <button className="btn btn-small btn-danger-ghost" onClick={onRemove}>{t('settings.remove')}</button>
        </span>
      </div>

      {/* 常用字段：名称 / 接口地址 / 模型 / API Key */}
      <div className="api-card-grid">
        <PField label={t('settings.field.name')}>
          <input type="text" value={api.name || ''} onChange={(e) => onPatch({ name: e.target.value, nameKey: undefined })} placeholder={t('settings.namePlaceholder')} />
        </PField>
        <PField label={t('settings.field.baseUrl')}>
          <input type="text" value={api.baseUrl || ''} onChange={(e) => onPatch({ baseUrl: e.target.value })} placeholder={t('settings.baseUrlPlaceholder')} />
        </PField>
        <PField label={t('settings.field.apiKey')} hint={t('settings.field.apiKeyHint')}>
          <input type="password" value={api.apiKey || ''} onChange={(e) => onPatch({ apiKey: e.target.value })} placeholder="sk-..." />
        </PField>
      </div>

      <PField label={t('settings.field.model')} hint={t('settings.field.modelHint', { baseUrl: api.baseUrl || '{BaseURL}' })}>
        <div className="model-row">
          <input
            list={`ml-${api.id}`}
            type="text"
            value={modelDraft}
            onChange={(e) => setModelDraft(e.target.value)}
            onBlur={() => commitModel()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitModel()
              }
            }}
            placeholder={t('settings.modelPlaceholder')}
          />
          <button className="btn btn-small" onClick={fetchModels} disabled={api._busyFetch}>
            {api._busyFetch ? t('settings.fetchingShort') : t('settings.fetchModels')}
          </button>
          <button className="btn btn-small" onClick={test} disabled={api._busyTest}>
            {api._busyTest ? t('inspector.testing') : t('settings.test')}
          </button>
        </div>
        <datalist id={`ml-${api.id}`}>
          {(api.models || []).map((m) => <option key={m} value={m} />)}
        </datalist>
        {(api.models || []).length > 0 && (
          <div className="model-chips">
            {(api.models || []).slice(0, 24).map((m) => (
              <button key={m} className={`model-chip ${m === modelDraft ? 'active' : ''}`} onClick={() => commitModel(m)}>
                {m}
              </button>
            ))}
          </div>
        )}
        {api.testMsg && <div className={`api-test-msg ${api.testMsg.startsWith('✅') ? 'ok' : 'err'}`}>{api.testMsg}</div>}
      </PField>

      {/* 高级字段 */}
      {advanced && (
        <>
          <div className="api-card-grid">
            <PField label={t('settings.field.path')}>
              <input type="text" value={api.path || ''} onChange={(e) => onPatch({ path: e.target.value })} placeholder={t('settings.pathPlaceholder')} />
            </PField>
            <PField label={t('settings.field.method')}>
              <select value={api.method || 'POST'} onChange={(e) => onPatch({ method: e.target.value })}>
                <option>POST</option><option>GET</option><option>PUT</option>
              </select>
            </PField>
          </div>

          <div className="api-card-grid">
            <PField label={t('settings.extract')} hint="data[0].url">
              <input type="text" value={api.outputExtract || ''} onChange={(e) => onPatch({ outputExtract: e.target.value })} />
            </PField>
            <PField label={t('settings.outputType')}>
              <select value={api.outputMediaType || 'auto'} onChange={(e) => onPatch({ outputMediaType: e.target.value })}>
                <option value="auto">{t('settings.outputMediaAuto')}</option>
                <option value="image">{t('settings.outputMediaImage')}</option>
                <option value="video">{t('settings.outputMediaVideo')}</option>
              </select>
            </PField>
            <PField label={t('settings.outputKind')}>
              <select value={api.outputKind || 'media'} onChange={(e) => onPatch({ outputKind: e.target.value })}>
                <option value="media">{t('settings.outputKindMedia')}</option>
                <option value="text">{t('settings.outputKindText')}</option>
              </select>
            </PField>
            <PField label={t('settings.timeoutMs')}>
              <input type="number" value={api.timeoutMs ?? 120000} onChange={(e) => onPatch({ timeoutMs: Number(e.target.value) || 120000 })} />
            </PField>
          </div>

          <PField label={t('settings.template')} hint="{{prompt}} {{image}} {{model}} {{apiKey}} {{system}}">
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
              {t('settings.pollEnable')}
            </label>
          </div>
          {poll.enabled && (
            <div className="poll-box">
              <div className="api-card-grid">
                <PField label={t('settings.poll.path')} hint="{id}">
                  <input type="text" value={poll.path || ''} onChange={(e) => patchPoll({ path: e.target.value })} />
                </PField>
                <PField label={t('settings.poll.idPath')}>
                  <input type="text" value={poll.idPath || ''} onChange={(e) => patchPoll({ idPath: e.target.value })} />
                </PField>
                <PField label={t('settings.poll.statusPath')}>
                  <input type="text" value={poll.statusPath || ''} onChange={(e) => patchPoll({ statusPath: e.target.value })} />
                </PField>
                <PField label={t('settings.poll.done')}>
                  <input type="text" value={poll.doneValues || ''} onChange={(e) => patchPoll({ doneValues: e.target.value })} />
                </PField>
                <PField label={t('settings.poll.failed')}>
                  <input type="text" value={poll.failedValues || ''} onChange={(e) => patchPoll({ failedValues: e.target.value })} />
                </PField>
                <PField label={t('settings.poll.result')}>
                  <input type="text" value={poll.resultExtract || ''} onChange={(e) => patchPoll({ resultExtract: e.target.value })} />
                </PField>
                <PField label={t('settings.poll.interval')}>
                  <input type="number" value={poll.intervalMs || 3000} onChange={(e) => patchPoll({ intervalMs: Number(e.target.value) || 3000 })} />
                </PField>
                <PField label={t('settings.poll.max')}>
                  <input type="number" value={poll.maxAttempts || 200} onChange={(e) => patchPoll({ maxAttempts: Number(e.target.value) || 200 })} />
                </PField>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function SettingsModal({ onClose, settings, update, presets }) {
  const { t, locale, setLocale } = useTranslation()
  const [cat, setCat] = useState('image')
  const [presetId, setPresetId] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const catSet = settings[cat] || { currentApiId: '', model: '', apis: [] }

  const patchCat = (patch) => update((s) => ({ ...s, [cat]: { ...s[cat], ...patch } }))
  const patchApi = (apiId, patch) => {
    update((s) => ({
      ...s,
      [cat]: {
        ...s[cat],
        model: patch.model && s[cat].currentApiId === apiId && typeof patch.model === 'string' ? patch.model : s[cat].model,
        apis: s[cat].apis.map((a) => (a.id === apiId ? { ...a, ...patch } : a)),
      },
    }))
  }

  const addApi = (cfg) => {
    const api = {
      id: uidApi(),
      name: cfg?.name || t('settings.newApi'),
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
    const { id, models, nameKey, ...rest } = src
    addApi({ ...rest, name: (src.name || '') + t('settings.copySuffix') })
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
    addApi({ ...preset.config, name: t('preset.' + preset.id) || preset.label })
    setPresetId('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>{t('settings.title')}</span>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>

        <div className="settings-language-bar">
          <span className="settings-language-label">{t('settings.language')}</span>
          <div className="settings-language-options">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                className={`lang-chip ${locale === l.code ? 'active' : ''}`}
                onClick={() => setLocale(l.code)}
                title={l.label}
              >
                <span className="lang-flag">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
          <span className="settings-language-hint">{t('settings.languageHint')}</span>
        </div>

        <div className="settings-tabs">
          {CATEGORY_DEFS.map((c) => (
            <button key={c.id} className={cat === c.id ? 'active' : ''} onClick={() => setCat(c.id)}>
              {c.icon} {t(c.labelKey)}
            </button>
          ))}
        </div>

        <div className="settings-advanced-toggle">
          <button
            className={`mode-chip ${!advanced ? 'active' : ''}`}
            onClick={() => setAdvanced(false)}
          >
            {t('settings.modeSimple')}
          </button>
          <button
            className={`mode-chip ${advanced ? 'active' : ''}`}
            onClick={() => setAdvanced(true)}
          >
            {t('settings.modeAdvanced')}
          </button>
          <span className="settings-mode-hint">{t('settings.modeHint')}</span>
        </div>

        <div className="modal-body settings-body">
          <div className="settings-current">
            <span>{t('settings.current')}</span>
            <select value={catSet.currentApiId || ''} onChange={(e) => setCurrent(e.target.value)}>
              {catSet.apis.map((a) => (
                <option key={a.id} value={a.id}>{a.nameKey ? t(a.nameKey) : a.name} · {a.model || t('settings.noModel')}</option>
              ))}
            </select>
            <span className="settings-current-model">{t('settings.currentModel', { model: catSet.model || t('settings.unset') })}</span>
          </div>
          <div className="settings-add-row">
            <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
              <option value="">{t('settings.presetPlaceholder')}</option>
              {(presets || []).map((p) => <option key={p.id} value={p.id}>{t('preset.' + p.id) || p.label}</option>)}
            </select>
            <button className="btn btn-small" onClick={addFromPreset} disabled={!presetId}>{t('settings.addPreset')}</button>
            <button className="btn btn-small btn-primary" onClick={() => addApi({ name: t('settings.newApi') })}>{t('settings.addBlank')}</button>
          </div>
          <div className="settings-apis">
            {catSet.apis.map((api) => (
              <ApiCard
                key={api.id}
                cat={cat}
                api={api}
                current={catSet.currentApiId === api.id}
                advanced={advanced}
                onPatch={(patch) => patchApi(api.id, patch)}
                onRemove={() => removeApi(api.id)}
                onDuplicate={() => duplicateApi(api.id)}
                onSetCurrent={() => setCurrent(api.id)}
                onSelectModel={selectModel}
              />
            ))}
            {!catSet.apis.length && <div className="inspector-empty">{t('settings.empty')}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
