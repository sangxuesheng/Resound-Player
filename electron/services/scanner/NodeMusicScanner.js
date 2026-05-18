import * as mm from "music-metadata";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
const SUPPORTED = /* @__PURE__ */ new Set([
  ".mp3",
  ".flac",
  ".wav",
  ".ogg",
  ".m4a",
  ".aac",
  ".wma",
  ".ape",
  ".dsf",
  ".opus",
  ".aiff",
  ".alac"
]);
function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}
class NodeMusicScanner {
  supportedExtensions = [...SUPPORTED];
  async *scanDir(dirPath, cachedMtimes) {
    const files = [];
    try {
      await this.collectFiles(dirPath, files);
    } catch (err) {
      yield { type: "error", path: dirPath, message: `\u65E0\u6CD5\u8BFB\u53D6\u76EE\u5F55: ${err}` };
      return;
    }
    if (!files.length) {
      yield { type: "complete", total: 0 };
      return;
    }
    let scanFiles;
    let skippedCount = 0;
    if (cachedMtimes && cachedMtimes.size > 0) {
      scanFiles = [];
      for (const fp of files) {
        const cachedMtime = cachedMtimes.get(fp);
        if (cachedMtime !== void 0) {
          try {
            const stat = await fs.stat(fp);
            if (stat.mtimeMs === cachedMtime) {
              skippedCount++;
              continue;
            }
          } catch {
          }
        }
        scanFiles.push(fp);
      }
    } else {
      scanFiles = files;
    }
    if (!scanFiles.length) {
      yield { type: "complete", total: skippedCount };
      return;
    }
    const total = scanFiles.length;
    const concurrency = Math.min(8, Math.max(2, os.cpus().length - 1));
    let index = 0;
    let completed = 0;
    let resolveDone = null;
    const donePromise = new Promise((r) => {
      resolveDone = r;
    });
    const results = [];
    const scanErrors = [];
    const worker = async () => {
      while (index < scanFiles.length) {
        const filePath = scanFiles[index++];
        try {
          const track = await this.parseFile(filePath);
          if (track) results.push(track);
        } catch (err) {
          scanErrors.push({ type: "error", path: filePath, message: err.message });
        }
        completed++;
      }
    };
    const workers = Array.from({ length: concurrency }, () => worker());
    Promise.all(workers).then(() => resolveDone(true));
    let done = false;
    while (!done) {
      const pollDone = await Promise.race([
        donePromise,
        new Promise((r) => setTimeout(() => r(false), 250))
      ]);
      done = pollDone === true;
      while (scanErrors.length) yield scanErrors.shift();
      if (results.length >= 20 || done && results.length > 0) {
        yield { type: "batch", tracks: results.splice(0) };
      }
      if (completed > 0) {
        yield { type: "progress", current: completed, total };
      }
    }
    yield { type: "complete", total };
  }
  async collectFiles(dirPath, result) {
    let entries;
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await this.collectFiles(fullPath, result);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED.has(ext)) result.push(fullPath);
      }
    }
  }
  async parseFile(filePath) {
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch {
      return null;
    }
    const base = path.dirname(filePath);
    const name = path.basename(filePath, path.extname(filePath));
    const hasExternalLyric = [".lrc", ".yrc", ".ttml"].some(
      (ext) => existsSync(path.join(base, name + ext))
    );
    const fallback = () => ({
      id: md5(filePath),
      path: filePath,
      title: name,
      artist: "\u672A\u77E5\u827A\u672F\u5BB6",
      album: "\u672A\u77E5\u4E13\u8F91",
      albumArtist: "",
      duration: 0,
      bitrate: 0,
      sampleRate: 0,
      trackNo: 0,
      discNo: 0,
      genre: "",
      year: 0,
      coverPath: "",
      fileSize: stat.size,
      mtime: stat.mtimeMs,
      hasLyrics: hasExternalLyric,
      createdAt: "",
      updatedAt: ""
    });
    let meta;
    try {
      meta = await mm.parseFile(filePath, { duration: true, skipPostHeaders: true });
    } catch {
      return fallback();
    }
    const { common, format } = meta;
    return {
      id: md5(filePath),
      path: filePath,
      title: common.title || name,
      artist: common.artist || "\u672A\u77E5\u827A\u672F\u5BB6",
      album: common.album || "\u672A\u77E5\u4E13\u8F91",
      albumArtist: common.albumartist || "",
      duration: format.duration || 0,
      bitrate: format.bitrate || 0,
      sampleRate: format.sampleRate || 0,
      trackNo: common.track?.no || 0,
      discNo: common.disk?.no || 0,
      genre: (common.genre || []).join(", "),
      year: common.year || 0,
      coverPath: "",
      fileSize: stat.size,
      mtime: stat.mtimeMs,
      hasLyrics: Boolean(common.lyrics?.length) || hasExternalLyric ? 1 : 0,
      createdAt: "",
      updatedAt: ""
    };
  }
}
export {
  NodeMusicScanner
};
