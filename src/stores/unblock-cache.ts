// 匹配结果缓存：避免同一切歌重复请求音源替换
// 策略：Map<songId, CacheEntry> + localStorage 持久化
// 限制：最多 200 条，10 分钟过期，LRU 淘汰

const CACHE_TTL = 10 * 60 * 1000; // 10 分钟过期
const MAX_ENTRIES = 200;          // 最多缓存 200 首歌
const STORAGE_KEY = 'gm_unblock_cache_v1';

export interface CacheEntry {
  url: string;
  source: string;
  br: number;
  size: number;
  timestamp: number;
  songId: number;
  songName?: string;
}

// 内存缓存（读写最快）
const memCache = new Map<number, CacheEntry>();

// 防抖写入 localStorage
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const all: Record<number, CacheEntry> = {};
      for (const [k, v] of memCache) {
        if (Date.now() - v.timestamp <= CACHE_TTL) {
          all[k] = v;
        }
      }
      const json = JSON.stringify(all);
      if (json.length > 4 * 1024 * 1024) {
        // 超过 4MB，只保留最近的 100 条
        const recent = [...Object.entries(all)]
          .sort(([, a], [, b]) => b.timestamp - a.timestamp)
          .slice(0, 100);
        const slim: Record<number, CacheEntry> = {};
        for (const [k, v] of recent) slim[Number(k)] = v;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
        // 同步清理内存
        memCache.clear();
        for (const [k, v] of recent) memCache.set(Number(k), v);
      } else {
        localStorage.setItem(STORAGE_KEY, json);
      }
    } catch {
      // localStorage 容量不够则清空重建
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  }, 2000); // 2s 内多次 setCache 合并为一次写入
}

// 定时清理过期 + 超出数量限制的条目
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    // 1. 删除过期条目
    for (const [id, entry] of memCache) {
      if (now - entry.timestamp > CACHE_TTL) memCache.delete(id);
    }
    // 2. 超出数量限制则删除最旧的
    if (memCache.size > MAX_ENTRIES) {
      const sorted = [...memCache.entries()].sort(([, a], [, b]) => a.timestamp - b.timestamp);
      const toDelete = sorted.slice(0, memCache.size - MAX_ENTRIES);
      for (const [id] of toDelete) memCache.delete(id);
    }
    if (memCache.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, 60 * 1000);
}

export function getCache(id: number): CacheEntry | null {
  const entry = memCache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    memCache.delete(id);
    schedulePersist();
    return null;
  }
  // LRU：最近访问的放到最后（方便淘汰最旧的）
  memCache.delete(id);
  memCache.set(id, entry);
  return entry;
}

export function setCache(id: number, data: Omit<CacheEntry, 'timestamp' | 'songId'> & { songName?: string }): void {
  const entry: CacheEntry = {
    ...data,
    songId: id,
    timestamp: Date.now(),
  };
  // 更新或插入（Map 自动去重）
  memCache.set(id, entry);
  ensureCleanup();
  schedulePersist();
}

// 从 localStorage 还原
export function hydrateCache(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<number, CacheEntry>;
    const now = Date.now();
    for (const [id, entry] of Object.entries(all)) {
      if (now - entry.timestamp <= CACHE_TTL) {
        memCache.set(Number(id), entry);
      }
    }
    if (memCache.size > 0) ensureCleanup();
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
}

export function clearCache(): void {
  memCache.clear();
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function clearCacheEntry(id: number): void {
  memCache.delete(id);
  schedulePersist();
}

export function getCacheSize(): number {
  return memCache.size;
}
