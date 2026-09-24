import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

export interface Result { id: number; mission: number; stage: string; stars: number; gold: number; accuracy: number; wpm: number; created_at: string }
export interface TestResult { id: number; wpm: number; accuracy: number; score: number; created_at: string }
export interface Report { mission: number; text: string; reply: string; created_at: string }

const storage = 'henry-wild-typing-sqlite'
let db: Database
let queue = Promise.resolve()

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(storage, 1)
    req.onupgradeneeded = () => req.result.createObjectStore('files')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function load(): Promise<Uint8Array | undefined> {
  const store = await openStore()
  try {
    return await new Promise((resolve, reject) => {
      const req = store.transaction('files').objectStore('files').get('game.sqlite')
      req.onsuccess = () => resolve(req.result instanceof Uint8Array ? req.result : undefined)
      req.onerror = () => reject(req.error)
    })
  } finally { store.close() }
}

function save(): Promise<void> {
  const bytes = db.export()
  return openStore().then(store => new Promise<void>((resolve, reject) => {
    const tx = store.transaction('files', 'readwrite')
    tx.objectStore('files').put(bytes, 'game.sqlite')
    tx.oncomplete = () => { store.close(); resolve() }
    tx.onerror = () => { store.close(); reject(tx.error) }
  }))
}

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  db = new SQL.Database(await load())
  db.run(`CREATE TABLE IF NOT EXISTS results (id INTEGER PRIMARY KEY, mission INTEGER NOT NULL, stage TEXT NOT NULL, stars INTEGER NOT NULL, gold INTEGER NOT NULL, accuracy REAL NOT NULL, wpm REAL NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tests (id INTEGER PRIMARY KEY, wpm REAL NOT NULL, accuracy REAL NOT NULL, score REAL NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reports (mission INTEGER PRIMARY KEY, text TEXT NOT NULL, reply TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`)
  await save()
}

function rows<T>(sql: string, params: SqlValue[] = []): T[] {
  const stmt = db.prepare(sql)
  try {
    stmt.bind(params)
    const result: T[] = []
    while (stmt.step()) result.push(stmt.getAsObject() as T)
    return result
  } finally { stmt.free() }
}

function write(sql: string, params: SqlValue[]): Promise<void> {
  const task = queue.then(async () => { db.run(sql, params); await save() })
  queue = task.catch(() => {})
  return task
}

export const getResults = () => rows<Result>('SELECT * FROM results ORDER BY id DESC')
export const getTests = () => rows<TestResult>('SELECT * FROM tests ORDER BY id DESC')
export const getReports = () => rows<Report>('SELECT * FROM reports')
export const getSetting = (key: string) => rows<{value: string}>('SELECT value FROM settings WHERE key = ?', [key])[0]?.value ?? ''
export const setSetting = (key: string, value: string) => write('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
export const saveResult = (mission: number, stage: string, stars: number, gold: number, accuracy: number, wpm: number) => write('INSERT INTO results (mission, stage, stars, gold, accuracy, wpm, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [mission, stage, stars, gold, accuracy, wpm, new Date().toISOString()])
export const saveTest = (wpm: number, accuracy: number, score: number) => write('INSERT INTO tests (wpm, accuracy, score, created_at) VALUES (?, ?, ?, ?)', [wpm, accuracy, score, new Date().toISOString()])
export const saveReport = (mission: number, text: string, reply: string) => write('INSERT OR REPLACE INTO reports (mission, text, reply, created_at) VALUES (?, ?, ?, ?)', [mission, text, reply, new Date().toISOString()])
