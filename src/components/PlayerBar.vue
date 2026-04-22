<template>
  <AnimatedAppear tag="footer" variant="content" rhythm="overlay" class-name="bar">
    <AnimatedAppear tag="div" variant="text" rhythm="body" class-name="left">
      <AnimatedAppear tag="button" variant="media" rhythm="list" class-name="cover" :style="coverStyle" @click="playerStore.openExpanded()" />
      <div class="meta">
        <AnimatedAppear tag="div" variant="text" rhythm="body" class-name="title">{{ playerStore.currentTrack?.name || '未在播放' }}</AnimatedAppear>
        <AnimatedAppear tag="div" variant="text" rhythm="body" :index="1" class-name="artist">{{ artistText }}</AnimatedAppear>
      </div>
    </AnimatedAppear>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="center">
      <div class="controls-row">
        <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="ctrl" @click="playerStore.prev()" aria-label="上一首">
          <SkipBack :size="16" />
        </AnimatedAppear>
        <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="1" class-name="ctrl main" @click="playerStore.togglePlay()" aria-label="播放或暂停">
          <Pause v-if="playerStore.isPlaying" :size="18" />
          <Play v-else :size="18" />
        </AnimatedAppear>
        <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="2" class-name="ctrl" @click="playerStore.next()" aria-label="下一首">
          <SkipForward :size="16" />
        </AnimatedAppear>
      </div>
      <div class="progress-row">
        <span class="time">{{ formatTime(playerStore.currentTime) }}</span>
        <input
          class="progress"
          type="range"
          min="0"
          :max="Math.max(1, Math.floor(playerStore.duration || 0))"
          :value="Math.floor(playerStore.currentTime || 0)"
          @input="onSeek"
        />
        <span class="time">{{ formatTime(playerStore.duration) }}</span>
      </div>
    </AnimatedAppear>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="right">
      <AnimatedAppear tag="div" variant="control" rhythm="actions" class-name="vol">
        <Volume2 :size="16" />
        <input type="range" min="0" max="100" :value="Math.round(playerStore.volume * 100)" @input="onVolume" />
      </AnimatedAppear>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="1" class-name="icon" aria-label="歌词"><Captions :size="14" /></AnimatedAppear>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="2" class-name="icon" :class="{ saved: isCurrentLiked, loading: likeLoading }" :aria-pressed="isCurrentLiked" :aria-label="isCurrentLiked ? '取消收藏' : '收藏'" :disabled="likeLoading || !currentTrackId" @click="toggleCurrentLike"><Heart :size="14" /></AnimatedAppear>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="3" class-name="icon" aria-label="设置"><Settings :size="14" /></AnimatedAppear>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="4" class-name="icon" aria-label="切换播放模式" @click="playerStore.cyclePlayMode()">
        <Repeat v-if="playerStore.playMode === 'loop'" :size="14" />
        <Repeat1 v-else-if="playerStore.playMode === 'single'" :size="14" />
        <Shuffle v-else :size="14" />
      </AnimatedAppear>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="5" class-name="icon" aria-label="播放列表"><ListMusic :size="14" /></AnimatedAppear>
    </AnimatedAppear>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Captions,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-vue-next';
import { playerStore } from '../stores/player';
import { toggleSongLike } from '../api/music';
import { userStore } from '../stores/user';
import AnimatedAppear from './AnimatedAppear.vue';

const currentTrackId = computed(() => playerStore.currentTrack?.id);
const isCurrentLiked = computed(() => (currentTrackId.value ? userStore.likedSongIds.includes(currentTrackId.value) : false));
const likeLoading = ref(false);

watch(
  currentTrackId,
  () => {
    likeLoading.value = false;
  },
  { immediate: true },
);

const artistText = computed(() => {
  const ar = playerStore.currentTrack?.ar || [];
  if (!ar.length) return 'Unknown Artist';
  return ar.map((a) => a.name).join('/');
});

const coverStyle = computed(() => {
  const url = playerStore.currentTrack?.al?.picUrl;
  if (!url) return {};
  return { backgroundImage: `url(${url})` };
});

function onVolume(e: Event) {
  const value = Number((e.target as HTMLInputElement).value) / 100;
  playerStore.setVolume(value);
}

function onSeek(e: Event) {
  const t = Number((e.target as HTMLInputElement).value);
  playerStore.seek(t);
}

async function toggleCurrentLike() {
  const id = currentTrackId.value;
  if (!id || likeLoading.value) return;

  const next = !isCurrentLiked.value;
  likeLoading.value = true;

  try {
    const response = await toggleSongLike({
      id,
      like: next,
      uid: userStore.profile?.userId,
    });
    const code = response?.data?.code ?? response?.data?.data?.code;
    if (typeof code === 'number' && code !== 200) {
      throw new Error(`收藏失败，接口返回 ${code}`);
    }

    if (next) {
      if (!userStore.likedSongIds.includes(id)) {
        userStore.likedSongIds = [...userStore.likedSongIds, id];
      }
    } else {
      userStore.likedSongIds = userStore.likedSongIds.filter((songId) => songId !== id);
    }
  } catch (error) {
    console.error('[player-bar] toggle like failed', error);
  } finally {
    likeLoading.value = false;
  }
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
</script>

<style scoped>
.bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 84px;
  background: var(--bg-solid) !important;
  background-image: none !important;
  opacity: 1 !important;
  filter: none !important;
  border-top: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  animation: none !important;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  padding: 0 var(--space-5);
  z-index: 20;
  min-width: 0;
  overflow-x: clip;
}

.left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.cover {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #e5e7eb center/cover no-repeat;
  cursor: pointer;
  transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
}

.cover:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 36%, var(--border));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 22%, transparent);
}

.meta {
  min-width: 0;
}

.title {
  color: #111827;
  font-weight: 600;
}

.artist {
  color: #6b7280;
  font-size: 12px;
}

.center {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  min-width: 0;
}

.controls-row {
  display: flex;
  gap: var(--space-2);
}

.progress-row {
  width: min(420px, 100%);
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  gap: var(--space-2);
  align-items: center;
}

.progress {
  width: 100%;
}

.time {
  color: var(--text-sub);
  font-size: 11px;
  text-align: center;
}

.ctrl {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  background: color-mix(in srgb, var(--bg-surface) 92%, #fff 8%);
  color: var(--text-main);
  cursor: pointer;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease, border-color 0.16s ease;
}

.ctrl:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.ctrl:active {
  transform: translateY(0);
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.ctrl.main {
  width: 42px;
  height: 42px;
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
  background: color-mix(in srgb, var(--accent) 22%, var(--bg-surface));
  color: var(--text-main);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--accent) 20%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.ctrl:focus-visible,
.icon:focus-visible,
.cover:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.vol {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: #374151;
}

.vol input {
  width: 88px;
}

.icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform 0.16s ease, border-color 0.16s ease, color 0.16s ease, background 0.16s ease;
}

.icon:hover {
  transform: translateY(-1px);
  border-color: #86efac;
  color: #16a34a;
}

.icon.saved {
  border-color: color-mix(in srgb, var(--accent) 48%, #d1d5db);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, #fff);
}

.icon.loading {
  opacity: 0.72;
  cursor: progress;
}
</style>
