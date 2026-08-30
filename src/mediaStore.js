// IndexedDB 媒体存储：解决 localStorage 放不下大图（data URL）的问题
// 自动保存时把 data URL 媒体写入这里，localStorage 只存占位标记；加载时再取回
const DB_NAME = 'tapnow-local-media'
const DB_VERSION = 1
const STORE = 'media'

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'nodeId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('Failed to open media store'))
  })
  return dbPromise
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const store = t.objectStore(STORE)
    let result
    const done = (v) => { result = v }
    const req = fn(store, done)
    t.oncomplete = () => resolve(result ?? (req && 'result' in req ? req.result : undefined))
    t.onerror = () => reject(t.error || new Error('Media store transaction failed'))
    t.onabort = () => reject(t.error || new Error('Media store transaction aborted'))
  })
}

// payload: { value, mediaType }（单张）或 { images: [...] }（图片素材多张）
export async function idbPutMedia(nodeId, payload) {
  if (!nodeId || !payload || typeof payload !== 'object') return
  try {
    const db = await openDb()
    await tx(db, 'readwrite', (store, done) => {
      store.put({ nodeId, ...payload, savedAt: Date.now() })
      done(true)
    })
  } catch { /* 媒体库不可用时静默降级，画布结构仍能保存 */ }
}

export async function idbDeleteMedia(nodeId) {
  if (!nodeId) return
  try {
    const db = await openDb()
    await tx(db, 'readwrite', (store, done) => {
      store.delete(nodeId)
      done(true)
    })
  } catch { /* ignore */ }
}

export async function idbClearMedia() {
  try {
    const db = await openDb()
    await tx(db, 'readwrite', (store, done) => {
      store.clear()
      done(true)
    })
  } catch { /* ignore */ }
}

// 返回 [{ nodeId, value, mediaType }]
export async function idbGetAllMedia() {
  try {
    const db = await openDb()
    const all = await tx(db, 'readonly', (store, done) => {
      const req = store.getAll()
      req.onsuccess = () => done(req.result)
    })
    return Array.isArray(all) ? all : []
  } catch {
    return []
  }
}

export function isDataUrl(v) {
  return typeof v === 'string' && v.startsWith('data:')
}
