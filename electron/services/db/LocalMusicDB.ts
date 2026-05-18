import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { app } from 'electron'
import type { TrackRecord, IMetadataDB } from '../types'

const DB_PATH = path.join(app.getPath('userData'), 'local-music.json')

interface StoreData {
  tracks: TrackRecord[]
  scanDirs: { id: number; path: string; label: string; lastScan: string }[]
  playlists: { id: string; name: string; description: string; coverPath: string; createdAt: string; updatedAt: string }[]
  playlistTracks: { playlistId: string; trackId: string; sortOrder: number; addedAt: string }[]
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

export class LocalMusicDB implements IMetadataDB {
  private data!: StoreData
  private dirty = false

  async init() {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(DB_PATH)) {
      try {
        this.data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
      } catch {
        this.data = this.emptyStore()
      }
    } else {
      this.data = this.emptyStore()
    }
    this.persist()
  }

  private emptyStore(): StoreData {
    return { tracks: [], scanDirs: [], playlists: [], playlistTracks: [] }
  }

  private persist() {
    if (!this.dirty) return
    fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 1))
    this.dirty = false
  }

  private serializedWrite<T>(fn: () => T): Promise<T> {
    try {
      const result = fn()
      this.persist()
      return Promise.resolve(result)
    } catch (e) { return Promise.reject(e) }
  }

  getAllTracks(): Promise<TrackRecord[]> {
    const sorted = [...this.data.tracks].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
    return Promise.resolve(sorted)
  }

  getTrackByPath(filePath: string): Promise<TrackRecord | null> {
    const norm = filePath.replace(/\\/g, '/')
    return Promise.resolve(this.data.tracks.find(t => t.path.replace(/\\/g, '/') === norm) || null)
  }

  async upsertTracks(tracks: TrackRecord[]) {
    if (!tracks.length) return
    return this.serializedWrite(() => {
      const keyMap = new Map<string, number>()
      this.data.tracks.forEach((t, i) => keyMap.set(t.path.replace(/\\/g, '/').toLowerCase(), i))
      for (const t of tracks) {
        const key = t.path.replace(/\\/g, '/').toLowerCase()
        const idx = keyMap.get(key)
        if (idx !== undefined) {
          this.data.tracks[idx] = { ...this.data.tracks[idx], ...t, updatedAt: now() }
        } else {
          keyMap.set(key, this.data.tracks.length)
          this.data.tracks.push({ ...t, id: t.id || crypto.randomUUID(), createdAt: now(), updatedAt: now() })
        }
      }
    })
  }

  async removeTracks(paths: string[]) {
    if (!paths.length) return
    return this.serializedWrite(() => {
      const toRemove = new Set(paths.map(p => p.replace(/\\/g, '/').toLowerCase()))
      const removedIds = new Set<string>()
      this.data.tracks = this.data.tracks.filter(t => {
        const key = t.path.replace(/\\/g, '/').toLowerCase()
        if (toRemove.has(key)) { removedIds.add(t.id); return false }
        return true
      })
      this.data.playlistTracks = this.data.playlistTracks.filter(pt => !removedIds.has(pt.trackId))
    })
  }

  async clearAllTracks(): Promise<number> {
    return this.serializedWrite(() => {
      const count = this.data.tracks.length
      this.data.tracks = []
      this.data.playlistTracks = []
      this.data.scanDirs = []
      return count
    })
  }

  async removeTracksByDirectory(dirPath: string): Promise<number> {
    const prefix = dirPath.replace(/\/$/g, '').replace(/\\/g, '/').toLowerCase() + '/'
    return this.serializedWrite(() => {
      const removed: string[] = []
      this.data.tracks = this.data.tracks.filter(t => {
        const key = t.path.replace(/\\/g, '/').toLowerCase()
        if (key.startsWith(prefix)) { removed.push(t.id); return false }
        return true
      })
      const rs = new Set(removed)
      this.data.playlistTracks = this.data.playlistTracks.filter(pt => !rs.has(pt.trackId))
      return removed.length
    })
  }

  search(query: string): Promise<TrackRecord[]> {
    if (!query) return this.getAllTracks()
    const q = query.toLowerCase()
    const results = this.data.tracks.filter(t =>
      t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q))
    results.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
    return Promise.resolve(results.slice(0, 500))
  }

  getTrackCount(): Promise<number> { return Promise.resolve(this.data.tracks.length) }

  getAllMtimes(): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    for (const t of this.data.tracks) map.set(t.path, t.mtime)
    return Promise.resolve(map)
  }

  close(): Promise<void> { this.persist(); return Promise.resolve() }

  createPlaylist(name: string, description = ''): Promise<{ id: string }> {
    return this.serializedWrite(() => {
      const id = crypto.createHash('md5').update(`${name}|${Date.now()}`).digest('hex')
      this.data.playlists.push({ id, name, description, coverPath: '', createdAt: now(), updatedAt: now() })
      return { id }
    })
  }

  listPlaylists(): Promise<any[]> {
    const rows = this.data.playlists.map(p => ({ ...p, trackCount: this.data.playlistTracks.filter(pt => pt.playlistId === p.id).length }))
    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return Promise.resolve(rows)
  }

  getPlaylist(id: string): Promise<any | null> {
    const p = this.data.playlists.find(pl => pl.id === id)
    if (!p) return Promise.resolve(null)
    return Promise.resolve({ ...p, trackCount: this.data.playlistTracks.filter(pt => pt.playlistId === id).length })
  }

  deletePlaylist(id: string): Promise<void> {
    return this.serializedWrite(() => {
      this.data.playlists = this.data.playlists.filter(p => p.id !== id)
      this.data.playlistTracks = this.data.playlistTracks.filter(pt => pt.playlistId !== id)
    })
  }

  renamePlaylist(id: string, name: string): Promise<void> {
    return this.serializedWrite(() => {
      const p = this.data.playlists.find(pl => pl.id === id)
      if (p) { p.name = name; p.updatedAt = now() }
    })
  }

  addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    return this.serializedWrite(() => {
      if (this.data.playlistTracks.some(pt => pt.playlistId === playlistId && pt.trackId === trackId)) return
      const max = this.data.playlistTracks.filter(pt => pt.playlistId === playlistId).reduce((m, pt) => Math.max(m, pt.sortOrder), -1)
      this.data.playlistTracks.push({ playlistId, trackId, sortOrder: max + 1, addedAt: now() })
      const p = this.data.playlists.find(pl => pl.id === playlistId)
      if (p) p.updatedAt = now()
    })
  }

  removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    return this.serializedWrite(() => {
      this.data.playlistTracks = this.data.playlistTracks.filter(pt => !(pt.playlistId === playlistId && pt.trackId === trackId))
      const p = this.data.playlists.find(pl => pl.id === playlistId)
      if (p) p.updatedAt = now()
    })
  }

  getPlaylistTracks(playlistId: string): Promise<TrackRecord[]> {
    const trackIds = this.data.playlistTracks.filter(pt => pt.playlistId === playlistId).sort((a, b) => a.sortOrder - b.sortOrder).map(pt => pt.trackId)
    const map = new Map<string, TrackRecord>()
    for (const t of this.data.tracks) map.set(t.id, t)
    return Promise.resolve(trackIds.map(id => map.get(id)).filter(Boolean) as TrackRecord[])
  }

  getRecentTracks(limit = 10): Promise<TrackRecord[]> {
    return Promise.resolve([...this.data.tracks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit))
  }

  getTrackStats() {
    const artists = new Set<string>(); const albums = new Set<string>(); let dur = 0; let size = 0
    for (const t of this.data.tracks) {
      if (t.artist) artists.add(t.artist)
      if (t.album) albums.add(t.album)
      dur += t.duration || 0; size += t.fileSize || 0
    }
    return Promise.resolve({ totalTracks: this.data.tracks.length, totalArtists: artists.size, totalAlbums: albums.size, totalDuration: dur, totalSize: size })
  }
}