import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import * as mm from 'music-metadata'

/**
 * 封面磁盘缓存服务
 *
 * 将音频文件中提取的封面图片缓存到磁盘，避免每次请求都重新解析音频。
 * 缓存键 = md5(filePath + mtime)，文件变更时自动失效。
 */
export class CoverCache {
  private readonly cacheDir: string

  constructor() {
    this.cacheDir = path.join(app.getPath('userData'), 'covers')
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  /**
   * 获取封面 base64 URL
   * 优先走磁盘缓存，未命中则从音频文件提取并缓存
   */
  async getCover(filePath: string): Promise<string | null> {
    let mtime: number
    try {
      mtime = fs.statSync(filePath).mtimeMs
    } catch {
      return null
    }

    const cacheKey = this.buildCacheKey(filePath, mtime)
    const cacheFile = path.join(this.cacheDir, cacheKey)

    // 命中缓存 → 直接返回
    if (fs.existsSync(cacheFile)) {
      try {
        return fs.readFileSync(cacheFile, 'utf-8')
      } catch {
        // 缓存损坏，重新提取
      }
    }

    // 从音频文件提取封面
    try {
      const meta = await mm.parseFile(filePath, { duration: false, skipPostHeaders: true })
      const pic = meta.common.picture?.[0]
      if (pic) {
        const base64 = `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}`
        try { fs.writeFileSync(cacheFile, base64, 'utf-8') } catch { /* ignore */ }
        return base64
      }
    } catch {
      // 解析失败，继续尝试外部封面文件
    }

    // 兜底：查找同目录下的外部封面文件
    const dir = path.dirname(filePath)
    const base = path.basename(filePath, path.extname(filePath))
    const coverNames = [
      'cover.jpg', 'cover.png', 'cover.jpeg',
      'folder.jpg', 'folder.png', 'folder.jpeg',
      `${base}.jpg`, `${base}.png`, `${base}.jpeg`,
    ]
    for (const name of coverNames) {
      const coverPath = path.join(dir, name)
      try {
        if (fs.existsSync(coverPath)) {
          const ext = path.extname(coverPath).slice(1)
          const mime = ext === 'jpg' ? 'jpeg' : ext
          const data = fs.readFileSync(coverPath)
          const base64 = `data:image/${mime};base64,${data.toString('base64')}`
          try { fs.writeFileSync(cacheFile, base64, 'utf-8') } catch { /* ignore */ }
          return base64
        }
      } catch { /* try next */ }
    }

    return null
  }

  /** 构建缓存文件名：md5(path + '|' + mtime) */
  private buildCacheKey(filePath: string, mtime: number): string {
    const hash = crypto.createHash('md5').update(`${filePath}|${mtime}`).digest('hex')
    return hash
  }

  /** 清理所有缓存文件 */
  clearCache(): void {
    if (!fs.existsSync(this.cacheDir)) return
    const files = fs.readdirSync(this.cacheDir)
    for (const f of files) {
      fs.unlinkSync(path.join(this.cacheDir, f))
    }
  }

  /** 获取缓存文件数量 */
  getCacheSize(): number {
    if (!fs.existsSync(this.cacheDir)) return 0
    return fs.readdirSync(this.cacheDir).length
  }
}