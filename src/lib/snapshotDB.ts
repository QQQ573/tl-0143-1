export interface Snapshot {
  id?: number
  name: string
  createdAt: number
  beads: Array<{
    id: string
    layer: number
    row: number
    col: number
    colorId: string
    isHanger?: boolean
  }>
  layers: Array<{ index: number; visible: boolean }>
  gridSize: number
  baseType: string
  hangerPositions: string[]
  cog: {
    projectedX: number
    projectedZ: number
    y: number
    overhangRatio: number
    withinBase: boolean
    totalWeight: number
  }
}

const DB_NAME = 'perler-bead-snapshots'
const STORE_NAME = 'snapshots'
const DB_VERSION = 1

export class SnapshotDB {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          })
          store.createIndex('createdAt', 'createdAt', { unique: false })
          store.createIndex('name', 'name', { unique: false })
        }
      }
    })
  }

  async getAll(): Promise<Snapshot[]> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result.sort((a, b) => b.createdAt - a.createdAt)
        resolve(result)
      }
    })
  }

  async add(snapshot: Omit<Snapshot, 'id'>): Promise<Snapshot> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.add(snapshot)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        resolve({ ...snapshot, id: request.result as number })
      }
    })
  }

  async delete(id: number): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getCount(): Promise<number> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.count()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async getOldest(): Promise<Snapshot | null> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('createdAt')
      const request = index.openCursor(null, 'next')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const cursor = request.result
        resolve(cursor ? cursor.value : null)
      }
    })
  }

  async deleteOldest(): Promise<void> {
    const oldest = await this.getOldest()
    if (oldest && oldest.id !== undefined) {
      await this.delete(oldest.id)
    }
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

export const snapshotDB = new SnapshotDB()
