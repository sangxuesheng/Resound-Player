<template>
  <section class="local-page">
    <div v-if="!tracks.length" class="local-empty">暂无歌手数据</div>
    <div v-else class="local-song-list">
      <div class="local-song-header">
        <span class="local-song-idx">#</span>
        <span class="local-song-cover"></span>
        <span class="local-song-title">标题</span>
        <span class="local-song-artist">歌手</span>
        <span class="local-song-album">专辑</span>
        <span class="local-song-duration">时长</span>
      </div>
      <div
        v-for="(track, idx) in tracks"
        :key="track.id"
        class="local-song-row"
        :class="{ playing: nowPlayingId === track.id }"
        @dblclick="playTrack(track, idx)"
        @contextmenu.prevent=""
      >
        <span class="local-song-idx">{{ idx + 1 }}</span>
        <span class="local-song-cover">
          <img v-if="track.coverUrl" :src="track.coverUrl" class="local-cover-img" alt="" />
          <span v-else class="local-cover-placeholder"></span>
        </span>
        <span class="local-song-title" :title="track.title">
          <span v-if="track.hasLyrics" class="local-lyric-icon" title="有歌词">♪</span>
          {{ track.title }}
        </span>
        <span class="local-song-artist" :title="track.artist">{{ track.artist }}</span>
        <span class="local-song-album" :title="track.album">{{ track.album }}</span>
        <span class="local-song-duration">{{ localMusicStore.formatDuration(track.duration) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { localMusicStore } from '../stores/localMusic'
import { playerStore } from '../stores/player'

const nowPlayingId = computed(() => playerStore.currentTrack?.id ?? null)
const tracks = computed(() => localMusicStore.selectedArtistTracks)

function playTrack(track: any, index: number) {
  const playlist = tracks.value.map((t: any) => ({
    id: t.id, name: t.title,
    ar: [{ name: t.artist }],
    al: { name: t.album, picUrl: t.coverUrl },
    source: 'local' as const, path: t.path,
  }))
  playerStore.setPlaylist(playlist as any, index)
  playerStore.playByIndex(index)
}
</script>

<style scoped>
.local-page { display: grid; gap: var(--space-4); }
.local-song-list { display: grid; gap: 2px; }
.local-song-header,
.local-song-row {
  display: grid;
  grid-template-columns: 32px 36px minmax(160px, 2fr) minmax(120px, 1fr) minmax(120px, 1fr) 60px;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2) var(--space-2);
  font-size: var(--text-body-sm);
}
.local-song-header {
  color: var(--text-soft); font-size: var(--text-label-xs); text-transform: uppercase;
  border-bottom: 1px solid var(--border); padding-bottom: var(--space-1);
}
.local-song-row {
  border-radius: var(--radius-sm); cursor: default; transition: background 0.15s;
}
.local-song-row:hover { background: var(--bg-muted); }
.local-song-row.playing { background: var(--accent-soft); }
.local-song-row.playing .local-song-title { color: var(--accent); }
.local-song-idx { color: var(--text-soft); text-align: right; font-size: var(--text-label-sm); }
.local-song-cover { display: flex; align-items: center; justify-content: center; }
.local-cover-img { width: 30px; height: 30px; border-radius: 4px; object-fit: cover; }
.local-cover-placeholder { display: block; width: 30px; height: 30px; border-radius: 4px; background: var(--bg-muted); }
.local-song-title { color: var(--text-main); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 4px; }
.local-lyric-icon { font-size: 13px; color: var(--accent); flex-shrink: 0; }
.local-song-artist { color: var(--text-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.local-song-album { color: var(--text-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.local-song-duration { color: var(--text-soft); text-align: right; font-size: var(--text-label-sm); }
.local-empty { text-align: center; padding: var(--space-6); color: var(--text-soft); font-size: var(--text-body-sm); }
</style>