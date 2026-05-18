<template>
  <section class="local-page">
    <!-- 扫描目录管理 -->
    <div class="section-header">
      <h3 class="section-title">扫描目录</h3>
    </div>
    <div v-if="!localMusicStore.directories.length" class="local-empty">
      <p>还没有添加扫描目录</p>
    </div>
    <div v-else class="dir-list">
      <div v-for="dir in localMusicStore.directories" :key="dir" class="dir-item">
        <span class="dir-path" :title="dir">{{ dir }}</span>
        <button class="dir-remove" @click="removeDir(dir)" title="移除目录">✕</button>
      </div>
    </div>
    <div class="dir-actions">
      <button class="button-surface" @click="addDir">+ 添加目录</button>
      <button class="button-surface" @click="handleScan" :disabled="localMusicStore.scanning">
        {{ localMusicStore.scanning ? '扫描中…' : '扫描' }}
      </button>
      <button class="button-danger" @click="clearAllData">清除所有数据</button>
    </div>

    <!-- 最近添加 -->
    <div class="section-header">
      <h3 class="section-title">最近添加</h3>
    </div>
    <div v-if="!recent.length" class="local-empty">
      <p>暂无最近添加的歌曲</p>
    </div>
    <div v-else class="recent-list">
      <div v-for="track in recent" :key="track.id" class="recent-row" @dblclick="playTrack(track)">
        <span class="recent-cover">
          <img v-if="track.coverUrl" :src="track.coverUrl" class="recent-img" alt="" />
          <span v-else class="recent-placeholder"></span>
        </span>
        <span class="recent-title" :title="track.title">{{ track.title }}</span>
        <span class="recent-artist" :title="track.artist">{{ track.artist }}</span>
        <span class="recent-date">{{ formatDate(track.createdAt) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { localMusicStore } from '../stores/localMusic'
import { playerStore } from '../stores/player'
import { platform } from '../utils/platform'

const recent = ref<any[]>([])

onMounted(async () => {
  // 从 localStorage 恢复已保存的扫描目录
  if (!localMusicStore.directories.length) localMusicStore.loadDirectories()

  if (!platform.localApi) return
  try {
    recent.value = (await platform.localApi.getRecent(10)) || []
    // 懒加载封面
    for (const t of recent.value) {
      if (t.path) {
        platform.localApi.getCover(t.path).then(url => { if (url) t.coverUrl = url })
      }
    }
  } catch (e) {
    console.error('[localStats] load failed:', e)
  }
})

// 曲目变化时重新加载最近添加列表
watch(() => localMusicStore.tracks.length, () => {
  if (!platform.localApi) return
  platform.localApi.getRecent(10).then(list => {
    recent.value = list || []
    for (const t of recent.value) {
      if (t.path) {
        platform.localApi.getCover(t.path).then(url => { if (url) t.coverUrl = url })
      }
    }
  }).catch(() => {})
})

function addDir() {
  localMusicStore.addDirectory()
}

function handleScan() {
  if (!localMusicStore.directories.length) {
    localMusicStore.addDirectory()
  } else {
    localMusicStore.scanAll()
  }
}

async function clearAllData() {
  if (!confirm('确定清除所有本地歌曲数据？扫描目录和歌曲信息将全部删除。此操作不可撤销。')) return
  await localMusicStore.clearAll()
  recent.value = []
}

async function removeDir(dir: string) {
  const label = getDirLabel(dir)
  if (!confirm(`确定移除扫描目录「${label}」？该目录下的歌曲将从数据库同步删除。`)) return
  try {
    if (platform.localApi) {
      await platform.localApi.deleteTracksByDirectory(dir)
    }
  } catch (e) {
    console.error('[localStats] delete tracks failed:', e)
  }
  localMusicStore.removeDirectoryPath(dir)
  // 先更新 localStorage 中的目录列表，防止 saveDirectories 合并旧数据加回来
  try {
    const saved: string[] = JSON.parse(localStorage.getItem('local_music_dirs') || '[]')
    localStorage.setItem('local_music_dirs', JSON.stringify(saved.filter((d: string) => d !== dir)))
  } catch { /* ignore */ }
  await localMusicStore.loadTracks()
  localMusicStore.saveDirectories()
  // 重新加载最近添加列表
  if (platform.localApi) {
    try {
      recent.value = (await platform.localApi.getRecent(10)) || []
    } catch { /* ignore */ }
  }
}

function getDirLabel(dirPath: string): string {
  const parts = dirPath.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] || dirPath
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${month}-${day}`
}

function playTrack(track: any) {
  const idx = recent.value.findIndex(t => t.id === track.id)
  const playlist = recent.value.map((t: any) => ({
    id: t.id, name: t.title,
    ar: [{ name: t.artist }],
    al: { name: t.album, picUrl: t.coverUrl },
    source: 'local' as const, path: t.path,
  }))
  playerStore.setPlaylist(playlist as any, idx)
  playerStore.playByIndex(idx)
}
</script>

<style scoped>
.local-page { display: grid; gap: var(--space-4); }

.section-header { margin-top: var(--space-2); }
.section-title { margin: 0; font-size: var(--text-headline-md); font-weight: 600; color: var(--text-main); }

.dir-list { display: grid; gap: var(--space-1); }
.dir-actions {
  display: flex;
  gap: var(--space-2);
}
.dir-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.dir-path { font-size: var(--text-body-sm); color: var(--text-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.dir-remove { background: none; border: none; cursor: pointer; color: var(--text-soft); padding: 0 0 0 var(--space-2); font-size: 12px; }
.dir-remove:hover { color: var(--danger); }

.recent-list { display: grid; gap: var(--space-1); }
.recent-row {
  display: grid;
  grid-template-columns: 30px minmax(160px, 2fr) minmax(100px, 1fr) 60px;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  cursor: default;
  font-size: var(--text-body-sm);
  transition: background 0.15s;
}
.recent-row:hover { background: var(--bg-muted); }
.recent-cover { display: flex; align-items: center; }
.recent-img { width: 28px; height: 28px; border-radius: 4px; object-fit: cover; }
.recent-placeholder { display: block; width: 28px; height: 28px; border-radius: 4px; background: var(--bg-muted); }
.recent-title { color: var(--text-main); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent-artist { color: var(--text-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent-date { color: var(--text-soft); font-size: var(--text-label-xs); text-align: right; }
.local-empty { text-align: center; padding: var(--space-4); color: var(--text-soft); font-size: var(--text-body-sm); }
</style>