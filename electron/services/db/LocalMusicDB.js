import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { app } from "electron";
const DB_PATH = path.join(app.getPath("userData"), "local-music.db");
class LocalMusicDB {
  db;
  writeQueue = Promise.resolve();
  async init() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(DB_PATH);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.createTables();
    this.rebuildFtsIndex();
  }
  /** 重建 FTS 索引（用于首次启用或追加已有数据） */
  rebuildFtsIndex() {
    const count = this.db.prepare("SELECT COUNT(*) as cnt FROM tracks_fts").get();
    const total = this.db.prepare("SELECT COUNT(*) as cnt FROM tracks").get();
    if (count.cnt < total.cnt) {
      this.db.exec(`
        INSERT INTO tracks_fts(tracks_fts) VALUES('rebuild');
      `);
    }
  }
  createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tracks (
        id          TEXT PRIMARY KEY,
        path        TEXT UNIQUE NOT NULL,
        title       TEXT NOT NULL DEFAULT '',
        artist      TEXT DEFAULT '',
        album       TEXT DEFAULT '',
        albumArtist TEXT DEFAULT '',
        duration    REAL DEFAULT 0,
        bitrate     INTEGER DEFAULT 0,
        sampleRate  INTEGER DEFAULT 0,
        trackNo     INTEGER DEFAULT 0,
        discNo      INTEGER DEFAULT 0,
        genre       TEXT DEFAULT '',
        year        INTEGER DEFAULT 0,
        coverPath   TEXT DEFAULT '',
        fileSize    INTEGER DEFAULT 0,
        mtime       INTEGER DEFAULT 0,
        hasLyrics   INTEGER DEFAULT 0,
        createdAt   TEXT DEFAULT (datetime('now')),
        updatedAt   TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path);
      CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
      CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);

      -- FTS5 \u5168\u6587\u641C\u7D22\u865A\u62DF\u8868
      CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
        title, artist, album,
        content='tracks',
        content_rowid='rowid',
        tokenize='unicode61'
      );

      -- \u63D2\u5165\u89E6\u53D1\u5668\uFF1A\u65B0\u884C\u52A0\u5165 FTS
      CREATE TRIGGER IF NOT EXISTS tracks_ai AFTER INSERT ON tracks BEGIN
        INSERT INTO tracks_fts(rowid, title, artist, album)
        VALUES (new.rowid, new.title, new.artist, new.album);
      END;

      -- \u5220\u9664\u89E6\u53D1\u5668\uFF1A\u5220\u9664\u884C\u65F6\u540C\u6B65 FTS
      CREATE TRIGGER IF NOT EXISTS tracks_ad AFTER DELETE ON tracks BEGIN
        INSERT INTO tracks_fts(tracks_fts, rowid, title, artist, album)
        VALUES ('delete', old.rowid, old.title, old.artist, old.album);
      END;

      -- \u66F4\u65B0\u89E6\u53D1\u5668\uFF1A\u884C\u66F4\u65B0\u65F6\u540C\u6B65 FTS
      CREATE TRIGGER IF NOT EXISTS tracks_au AFTER UPDATE ON tracks BEGIN
        INSERT INTO tracks_fts(tracks_fts, rowid, title, artist, album)
        VALUES ('delete', old.rowid, old.title, old.artist, old.album);
        INSERT INTO tracks_fts(rowid, title, artist, album)
        VALUES (new.rowid, new.title, new.artist, new.album);
      END;

      CREATE TABLE IF NOT EXISTS scan_dirs (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        path     TEXT UNIQUE NOT NULL,
        label    TEXT DEFAULT '',
        lastScan TEXT
      );

      CREATE TABLE IF NOT EXISTS playlists (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT DEFAULT '',
        coverPath   TEXT DEFAULT '',
        createdAt   TEXT DEFAULT (datetime('now')),
        updatedAt   TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS playlist_tracks (
        playlistId TEXT NOT NULL,
        trackId    TEXT NOT NULL,
        sortOrder  INTEGER NOT NULL,
        addedAt    TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (playlistId, trackId),
        FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (trackId) REFERENCES tracks(id) ON DELETE CASCADE
      );
    `);
  }
  serializedWrite(fn) {
    this.writeQueue = this.writeQueue.then(fn, fn);
    return this.writeQueue;
  }
  getAllTracks() {
    const rows = this.db.prepare("SELECT * FROM tracks ORDER BY title ASC").all();
    return Promise.resolve(rows);
  }
  getTrackByPath(filePath) {
    const row = this.db.prepare("SELECT * FROM tracks WHERE path = ?").get(filePath);
    return Promise.resolve(row || null);
  }
  async upsertTracks(tracks) {
    if (!tracks.length) return;
    return this.serializedWrite(() => {
      const stmt = this.db.prepare(`
        INSERT INTO tracks (id, path, title, artist, album, albumArtist, duration,
          bitrate, sampleRate, trackNo, discNo, genre, year, coverPath, fileSize, mtime, hasLyrics, updatedAt)
        VALUES (@id, @path, @title, @artist, @album, @albumArtist, @duration,
          @bitrate, @sampleRate, @trackNo, @discNo, @genre, @year, @coverPath, @fileSize, @mtime, @hasLyrics, datetime('now'))
        ON CONFLICT(path) DO UPDATE SET
          title=excluded.title, artist=excluded.artist, album=excluded.album,
          albumArtist=excluded.albumArtist, duration=excluded.duration, bitrate=excluded.bitrate,
          sampleRate=excluded.sampleRate, mtime=excluded.mtime, fileSize=excluded.fileSize,
          hasLyrics=excluded.hasLyrics, coverPath=excluded.coverPath, updatedAt=datetime('now')
      `);
      const insertMany = this.db.transaction((rows) => {
        for (const r of rows) stmt.run(r);
      });
      insertMany(tracks);
    });
  }
  async removeTracks(paths) {
    if (!paths.length) return;
    const stmt = this.db.prepare("DELETE FROM tracks WHERE path = ?");
    const delMany = this.db.transaction((rows) => {
      for (const p of rows) stmt.run(p);
    });
    delMany(paths);
    console.log("[LocalMusicDB] removeTracks: \u5220\u9664\u4E86", paths.length, "\u6761");
  }
  async clearAllTracks() {
    return this.serializedWrite(() => {
      this.db.exec("DELETE FROM playlist_tracks");
      const info = this.db.prepare("DELETE FROM tracks").run();
      this.db.exec("DELETE FROM scan_dirs");
      console.log("[LocalMusicDB] clearAllTracks: \u5220\u9664\u4E86", info.changes, "\u884C");
      return info.changes;
    });
  }
  async removeTracksByDirectory(dirPath) {
    const prefix = dirPath.replace(/\/$/g, "") + "/";
    const result = this.db.prepare("DELETE FROM tracks WHERE path LIKE ?").run(prefix + "%");
    console.log("[LocalMusicDB] removeTracksByDirectory:", dirPath, "prefix:", prefix + "%", "deleted:", result.changes);
    return result.changes;
  }
  search(query) {
    if (!query) return this.getAllTracks();
    const ftsQuery = query.trim().split(/\s+/).map((w) => `"${w}"*`).join(" AND ");
    try {
      const rows2 = this.db.prepare(
        `SELECT tracks.* FROM tracks
         JOIN tracks_fts ON tracks.rowid = tracks_fts.rowid
         WHERE tracks_fts MATCH ?
         ORDER BY rank
         LIMIT 500`
      ).all(ftsQuery);
      if (rows2.length) return Promise.resolve(rows2);
    } catch {
    }
    const like = `%${query}%`;
    const rows = this.db.prepare(
      `SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?
       ORDER BY title ASC LIMIT 500`
    ).all(like, like, like);
    return Promise.resolve(rows);
  }
  getTrackCount() {
    const row = this.db.prepare("SELECT COUNT(*) as cnt FROM tracks").get();
    return Promise.resolve(row?.cnt || 0);
  }
  getAllMtimes() {
    const rows = this.db.prepare("SELECT path, mtime FROM tracks").all();
    const map = /* @__PURE__ */ new Map();
    for (const r of rows) map.set(r.path, r.mtime);
    return Promise.resolve(map);
  }
  close() {
    this.db.close();
    return Promise.resolve();
  }
  // ── 歌单管理 ──
  createPlaylist(name, description = "") {
    const id = crypto.createHash("md5").update(`${name}|${Date.now()}`).digest("hex");
    this.db.prepare(
      "INSERT INTO playlists (id, name, description) VALUES (?, ?, ?)"
    ).run(id, name, description);
    return Promise.resolve({ id });
  }
  listPlaylists() {
    const rows = this.db.prepare(`
      SELECT p.*, COUNT(pt.trackId) as trackCount
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlistId
      GROUP BY p.id
      ORDER BY p.updatedAt DESC
    `).all();
    return Promise.resolve(rows);
  }
  getPlaylist(id) {
    const row = this.db.prepare(`
      SELECT p.*, COUNT(pt.trackId) as trackCount
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlistId
      WHERE p.id = ?
      GROUP BY p.id
    `).get(id);
    return Promise.resolve(row || null);
  }
  deletePlaylist(id) {
    return this.serializedWrite(() => {
      this.db.prepare("DELETE FROM playlist_tracks WHERE playlistId = ?").run(id);
      this.db.prepare("DELETE FROM playlists WHERE id = ?").run(id);
    });
  }
  renamePlaylist(id, name) {
    return this.serializedWrite(() => {
      this.db.prepare("UPDATE playlists SET name = ?, updatedAt = datetime('now') WHERE id = ?").run(name, id);
    });
  }
  addTrackToPlaylist(playlistId, trackId) {
    return this.serializedWrite(() => {
      const maxOrder = this.db.prepare(
        "SELECT COALESCE(MAX(sortOrder), -1) + 1 as next FROM playlist_tracks WHERE playlistId = ?"
      ).get(playlistId);
      this.db.prepare(
        "INSERT OR IGNORE INTO playlist_tracks (playlistId, trackId, sortOrder) VALUES (?, ?, ?)"
      ).run(playlistId, trackId, maxOrder.next);
      this.db.prepare("UPDATE playlists SET updatedAt = datetime('now') WHERE id = ?").run(playlistId);
    });
  }
  removeTrackFromPlaylist(playlistId, trackId) {
    return this.serializedWrite(() => {
      this.db.prepare("DELETE FROM playlist_tracks WHERE playlistId = ? AND trackId = ?").run(playlistId, trackId);
      this.db.prepare("UPDATE playlists SET updatedAt = datetime('now') WHERE id = ?").run(playlistId);
    });
  }
  getPlaylistTracks(playlistId) {
    const rows = this.db.prepare(`
      SELECT t.* FROM tracks t
      JOIN playlist_tracks pt ON t.id = pt.trackId
      WHERE pt.playlistId = ?
      ORDER BY pt.sortOrder ASC
    `).all(playlistId);
    return Promise.resolve(rows);
  }
  getRecentTracks(limit = 10) {
    const rows = this.db.prepare("SELECT * FROM tracks ORDER BY createdAt DESC LIMIT ?").all(limit);
    return Promise.resolve(rows);
  }
  getTrackStats() {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as totalTracks,
        COUNT(DISTINCT artist) as totalArtists,
        COUNT(DISTINCT album) as totalAlbums,
        COALESCE(SUM(duration), 0) as totalDuration,
        COALESCE(SUM(fileSize), 0) as totalSize
      FROM tracks
    `).get();
    return Promise.resolve({
      totalTracks: stats?.totalTracks || 0,
      totalArtists: stats?.totalArtists || 0,
      totalAlbums: stats?.totalAlbums || 0,
      totalDuration: stats?.totalDuration || 0,
      totalSize: stats?.totalSize || 0
    });
  }
}
export {
  LocalMusicDB
};
