import { ipcMain, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import jschardet from "jschardet";
import iconv from "iconv-lite";
import { CoverCache } from "../CoverCache.js";
function readLyricFile(lrcPath) {
  const raw = fs.readFileSync(lrcPath);
  const detected = jschardet.detect(raw);
  const encoding = detected.encoding === "GB2312" || detected.encoding === "GBK" || detected.encoding === "gb2312" || detected.encoding === "gbk" ? "gbk" : detected.encoding?.toLowerCase() || "utf-8";
  const text = iconv.decode(raw, encoding);
  return text.replace(/^\uFEFF/, "");
}
ipcMain.handle("select-directory", async () => {
  const { dialog } = await import("electron");
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  return result.canceled ? null : result.filePaths[0];
});
function registerLocalMusicIpc(scanner, db) {
  const coverCache = new CoverCache();
  ipcMain.handle("local:scan", async (event, dirPath) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const send = (data) => {
      if (!win || win.isDestroyed()) return;
      event.sender.send("local:scan-progress", data);
    };
    const dirPrefix = path.normalize(dirPath);
    const cachedMtimes = await db.getAllMtimes();
    for await (const evt of scanner.scanDir(dirPath, cachedMtimes)) {
      send(evt);
      if (evt.type === "batch") await db.upsertTracks(evt.tracks);
    }
    try {
      const allTracks = await db.getAllTracks();
      const toRemove = [];
      for (const t of allTracks) {
        if (!t.path.startsWith(dirPrefix)) continue;
        if (!fs.existsSync(t.path)) toRemove.push(t.path);
      }
      if (toRemove.length) {
        await db.removeTracks(toRemove);
        console.log(`[local:scan] \u6E05\u7406\u4E86 ${toRemove.length} \u6761\u5DF2\u5220\u9664\u6587\u4EF6\u8BB0\u5F55`);
      }
    } catch (e) {
      console.warn("[local:scan] cleanup error:", e);
    }
    return { success: true };
  });
  ipcMain.handle("local:clear-all", async () => {
    console.log("[local:clear-all] \u5F00\u59CB\u6E05\u9664\u6240\u6709\u6B4C\u66F2\u6570\u636E");
    try {
      const deleted = await db.clearAllTracks();
      console.log("[local:clear-all] \u6E05\u9664\u5B8C\u6210, \u5171\u5220\u9664", deleted, "\u6761");
      return { success: true, deleted };
    } catch (e) {
      console.error("[local:clear-all] \u6E05\u9664\u5931\u8D25:", e);
      return { success: false, error: String(e) };
    }
  });
  ipcMain.handle("local:remove-tracks-by-dir", async (_event, dirPath) => {
    console.log("[local:remove-tracks-by-dir] \u6536\u5230\u8BF7\u6C42:", dirPath);
    const result = await db.removeTracksByDirectory(dirPath);
    console.log("[local:remove-tracks-by-dir] \u5B8C\u6210, \u5220\u9664\u4E86", result, "\u884C");
    return { success: true };
  });
  ipcMain.handle("local:remove-tracks", async (_event, paths) => {
    if (!paths.length) return { success: true, deleted: 0 };
    console.log("[local:remove-tracks] \u6536\u5230\u8BF7\u6C42, \u6570\u91CF:", paths.length);
    await db.removeTracks(paths);
    console.log("[local:remove-tracks] \u5B8C\u6210");
    return { success: true };
  });
  ipcMain.handle("local:search", async (_event, query) => {
    return db.search(query || "");
  });
  ipcMain.handle("local:get-all", async () => {
    return db.getAllTracks();
  });
  ipcMain.handle("local:track-count", async () => {
    return db.getTrackCount();
  });
  ipcMain.handle("local:get-lyric", async (_event, filePath) => {
    const base = path.dirname(filePath);
    const name = path.basename(filePath, path.extname(filePath));
    for (const ext of [".lrc", ".yrc", ".ttml"]) {
      const lrcPath = path.join(base, name + ext);
      if (fs.existsSync(lrcPath)) {
        return { text: readLyricFile(lrcPath), format: ext.slice(1) };
      }
    }
    return null;
  });
  ipcMain.handle("local:get-cover", async (_event, filePath) => {
    return coverCache.getCover(filePath);
  });
  ipcMain.handle("local:read-file", async (_event, filePath) => {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath).buffer;
  });
  const playlistDb = db;
  ipcMain.handle("local:playlist-create", async (_event, name, description) => {
    return playlistDb.createPlaylist(name, description || "");
  });
  ipcMain.handle("local:playlist-list", async () => {
    return playlistDb.listPlaylists();
  });
  ipcMain.handle("local:playlist-get", async (_event, id) => {
    return playlistDb.getPlaylist(id);
  });
  ipcMain.handle("local:playlist-delete", async (_event, id) => {
    await playlistDb.deletePlaylist(id);
    return { success: true };
  });
  ipcMain.handle("local:playlist-rename", async (_event, id, name) => {
    await playlistDb.renamePlaylist(id, name);
    return { success: true };
  });
  ipcMain.handle("local:playlist-add-track", async (_event, playlistId, trackId) => {
    await playlistDb.addTrackToPlaylist(playlistId, trackId);
    return { success: true };
  });
  ipcMain.handle("local:playlist-remove-track", async (_event, playlistId, trackId) => {
    await playlistDb.removeTrackFromPlaylist(playlistId, trackId);
    return { success: true };
  });
  ipcMain.handle("local:playlist-tracks", async (_event, playlistId) => {
    return playlistDb.getPlaylistTracks(playlistId);
  });
  ipcMain.handle("local:get-recent", async (_event, limit) => {
    return playlistDb.getRecentTracks(limit || 10);
  });
  ipcMain.handle("local:get-stats", async () => {
    return playlistDb.getTrackStats();
  });
}
export {
  registerLocalMusicIpc
};
