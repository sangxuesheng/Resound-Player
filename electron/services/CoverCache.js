import { app } from "electron";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as mm from "music-metadata";
class CoverCache {
  cacheDir;
  constructor() {
    this.cacheDir = path.join(app.getPath("userData"), "covers");
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }
  /**
   * 获取封面 base64 URL
   * 优先走磁盘缓存，未命中则从音频文件提取并缓存
   */
  async getCover(filePath) {
    let mtime;
    try {
      mtime = fs.statSync(filePath).mtimeMs;
    } catch {
      return null;
    }
    const cacheKey = this.buildCacheKey(filePath, mtime);
    const cacheFile = path.join(this.cacheDir, cacheKey);
    if (fs.existsSync(cacheFile)) {
      try {
        return fs.readFileSync(cacheFile, "utf-8");
      } catch {
      }
    }
    try {
      const meta = await mm.parseFile(filePath, { duration: false, skipPostHeaders: true });
      const pic = meta.common.picture?.[0];
      if (pic) {
        const base64 = `data:${pic.format};base64,${Buffer.from(pic.data).toString("base64")}`;
        try {
          fs.writeFileSync(cacheFile, base64, "utf-8");
        } catch {
        }
        return base64;
      }
    } catch {
    }
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const coverNames = [
      "cover.jpg",
      "cover.png",
      "cover.jpeg",
      "folder.jpg",
      "folder.png",
      "folder.jpeg",
      `${base}.jpg`,
      `${base}.png`,
      `${base}.jpeg`
    ];
    for (const name of coverNames) {
      const coverPath = path.join(dir, name);
      try {
        if (fs.existsSync(coverPath)) {
          const ext = path.extname(coverPath).slice(1);
          const mime = ext === "jpg" ? "jpeg" : ext;
          const data = fs.readFileSync(coverPath);
          const base64 = `data:image/${mime};base64,${data.toString("base64")}`;
          try {
            fs.writeFileSync(cacheFile, base64, "utf-8");
          } catch {
          }
          return base64;
        }
      } catch {
      }
    }
    return null;
  }
  /** 构建缓存文件名：md5(path + '|' + mtime) */
  buildCacheKey(filePath, mtime) {
    const hash = crypto.createHash("md5").update(`${filePath}|${mtime}`).digest("hex");
    return hash;
  }
  /** 清理所有缓存文件 */
  clearCache() {
    if (!fs.existsSync(this.cacheDir)) return;
    const files = fs.readdirSync(this.cacheDir);
    for (const f of files) {
      fs.unlinkSync(path.join(this.cacheDir, f));
    }
  }
  /** 获取缓存文件数量 */
  getCacheSize() {
    if (!fs.existsSync(this.cacheDir)) return 0;
    return fs.readdirSync(this.cacheDir).length;
  }
}
export {
  CoverCache
};
