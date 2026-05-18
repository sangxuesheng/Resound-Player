import path from "path";
import fs from "fs";
import crypto from "crypto";
import { app } from "electron";

const DB_PATH = path.join(app.getPath("userData"), "local-music.json");

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

class LocalMusicDB {
  data;
  dirty = false;

  async init() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, "utf-8");
        this.data = JSON.parse(raw);
      } catch {
        this.data = this.emptyStore();
      }
    } else {
      this.data = this.emptyStore();
    }
    this.persist();
  }

  emptyStore() {
    return { tracks: [], scanDirs: [], playlists: [], playlistTracks: [] };
  }

  persist() {
    if (!this.dirty) return;
    fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 1));
    this.dirty = false;
  }

  serializedWrite(fn) {
    try {
      const result = fn();
      this.persist();
      return Promise.resolve(result);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  getAllTracks() {
    const sorted = [...this.data.tracks].sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
    return Promise.resolve(sorted);
  }

  getTrackByPath(filePath) {
    const norm = filePath.replace(/\\/g, "/");
    const found = this.data.tracks.find((t) => t.path.replace(/\\/g, "/") === norm);
    return Promise.resolve(found || null);
  }

  upsertTracks(tracks) {
    if (!tracks.length) return Promise.resolve();
    return this.serializedWrite(() => {
      const pathMap = new Map();
      this.data.tracks.forEach((t, i) => pathMap.set(t.path.replace(/\\/g, "/").toLowerCase(), i));
      for (const t of tracks) {
        const key = t.path.replace(/\\/g, "/").toLowerCase();
        const idx = pathMap.get(key);
        if (idx !== undefined) {
          this.data.tracks[idx] = { ...this.data.tracks[idx], ...t, updatedAt: now() };
        } else {
          pathMap.set(key, this.data.tracks.length);
          this.data.tracks.push({ ...t, id: t.id || crypto.randomUUID(), createdAt: now(), updatedAt: now() });
        }
      }
    });
  }

  removeTracks(paths) {
    if (!paths.length) return Promise.resolve();
    return this.serializedWrite(() => {
      const toRemove = new Set(paths.map((p) => p.replace(/\\/g, "/").toLowerCase()));
      const removedIds = new Set();
      this.data.tracks = this.data.tracks.filter((t) => {
        const key = t.path.replace(/\\/g, "/").toLowerCase();
        if (toRemove.has(key)) { removedIds.add(t.id); return false; }
        return true;
      });
      this.data.playlistTracks = this.data.playlistTracks.filter((pt) => !removedIds.has(pt.trackId));
    });
  }

  clearAllTracks() {
    return this.serializedWrite(() => {
      const count = this.data.tracks.length;
      this.data.tracks = [];
      this.data.playlistTracks = [];
      this.data.scanDirs = [];
      return count;
    });
  }

  removeTracksByDirectory(dirPath) {
    const prefix = dirPath.replace(/\/$/g, "").replace(/\\/g, "/").toLowerCase() + "/";
    return this.serializedWrite(() => {
      const removed = [];
      this.data.tracks = this.data.tracks.filter((t) => {
        const key = t.path.replace(/\\/g, "/").toLowerCase();
        if (key.startsWith(prefix)) { removed.push(t.id); return false; }
        return true;
      });
      const removedSet = new Set(removed);
      this.data.playlistTracks = this.data.playlistTracks.filter((pt) => !removedSet.has(pt.trackId));
      return removed.length;
    });
  }

  search(query) {
    if (!query) return this.getAllTracks();
    const q = query.toLowerCase();
    const results = this.data.tracks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q)
    );
    results.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
    return Promise.resolve(results.slice(0, 500));
  }

  getTrackCount() {
    return Promise.resolve(this.data.tracks.length);
  }

  getAllMtimes() {
    const map = new Map();
    for (const t of this.data.tracks) map.set(t.path, t.mtime);
    return Promise.resolve(map);
  }

  close() {
    this.persist();
    return Promise.resolve();
  }

  createPlaylist(name, description = "") {
    return this.serializedWrite(() => {
      const id = crypto.createHash("md5").update(`${name}|${Date.now()}`).digest("hex");
      this.data.playlists.push({ id, name, description, coverPath: "", createdAt: now(), updatedAt: now() });
      return { id };
    });
  }

  listPlaylists() {
    const rows = this.data.playlists.map((p) => {
      const trackCount = this.data.playlistTracks.filter((pt) => pt.playlistId === p.id).length;
      return { ...p, trackCount };
    });
    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return Promise.resolve(rows);
  }

  getPlaylist(id) {
    const p = this.data.playlists.find((pl) => pl.id === id);
    if (!p) return Promise.resolve(null);
    const trackCount = this.data.playlistTracks.filter((pt) => pt.playlistId === id).length;
    return Promise.resolve({ ...p, trackCount });
  }

  deletePlaylist(id) {
    return this.serializedWrite(() => {
      this.data.playlists = this.data.playlists.filter((p) => p.id !== id);
      this.data.playlistTracks = this.data.playlistTracks.filter((pt) => pt.playlistId !== id);
    });
  }

  renamePlaylist(id, name) {
    return this.serializedWrite(() => {
      const p = this.data.playlists.find((pl) => pl.id === id);
      if (p) { p.name = name; p.updatedAt = now(); }
    });
  }

  addTrackToPlaylist(playlistId, trackId) {
    return this.serializedWrite(() => {
      const exists = this.data.playlistTracks.some((pt) => pt.playlistId === playlistId && pt.trackId === trackId);
      if (exists) return;
      const maxOrder = this.data.playlistTracks
        .filter((pt) => pt.playlistId === playlistId)
        .reduce((max, pt) => Math.max(max, pt.sortOrder), -1);
      this.data.playlistTracks.push({ playlistId, trackId, sortOrder: maxOrder + 1, addedAt: now() });
      const p = this.data.playlists.find((pl) => pl.id === playlistId);
      if (p) p.updatedAt = now();
    });
  }

  removeTrackFromPlaylist(playlistId, trackId) {
    return this.serializedWrite(() => {
      this.data.playlistTracks = this.data.playlistTracks.filter((pt) => !(pt.playlistId === playlistId && pt.trackId === trackId));
      const p = this.data.playlists.find((pl) => pl.id === playlistId);
      if (p) p.updatedAt = now();
    });
  }

  getPlaylistTracks(playlistId) {
    const trackIds = this.data.playlistTracks
      .filter((pt) => pt.playlistId === playlistId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((pt) => pt.trackId);
    const trackMap = new Map();
    for (const t of this.data.tracks) trackMap.set(t.id, t);
    const result = trackIds.map((id) => trackMap.get(id)).filter(Boolean);
    return Promise.resolve(result);
  }

  getRecentTracks(limit = 10) {
    const sorted = [...this.data.tracks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
    return Promise.resolve(sorted);
  }

  getTrackStats() {
    const artists = new Set();
    const albums = new Set();
    let totalDuration = 0;
    let totalSize = 0;
    for (const t of this.data.tracks) {
      if (t.artist) artists.add(t.artist);
      if (t.album) albums.add(t.album);
      totalDuration += t.duration || 0;
      totalSize += t.fileSize || 0;
    }
    return Promise.resolve({
      totalTracks: this.data.tracks.length,
      totalArtists: artists.size,
      totalAlbums: albums.size,
      totalDuration,
      totalSize,
    });
  }
}

export { LocalMusicDB };