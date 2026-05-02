<template>
  <AnimatedAppear tag="footer" variant="content" rhythm="overlay" class-name="bar">
    <AnimatedAppear tag="div" variant="text" rhythm="body" class-name="left">
      <AnimatedAppear tag="div" variant="media" rhythm="list" class-name="cover-wrap">
        <button class="cover" :style="coverStyle" @click="playerStore.openExpanded()" />
        <button class="cover-fullscreen-btn" title="全屏" @click="playerStore.openExpanded()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/></svg></button>
      </AnimatedAppear>
      <div class="meta">
        <div class="title-row">
          <AnimatedAppear tag="div" variant="text" rhythm="body" class-name="title">{{ playerStore.currentTrack?.name || '未在播放' }}</AnimatedAppear>
        </div>
        <AnimatedAppear tag="div" variant="text" rhythm="body" :index="1" class-name="artist"><template v-if="playerStore.isPlaying && currentLyricText"><span class="lyric-text" :title="currentLyricText">{{ currentLyricText }}</span></template><template v-else>{{ artistText }}<span v-if="qualityLabel" class="quality-badge">{{ qualityLabel }}</span><span v-if="uiStore.unblockEnabled && playerStore.currentTrack" class="source-badge">{{ sourceLabel }}</span></template></AnimatedAppear>
      </div>
    </AnimatedAppear>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="center">
      <div class="controls-row">
        <AnimatedAppear v-if="isPersonalFmCurrentTrack" tag="button" variant="control" rhythm="actions" class-name="ctrl ctrl-dislike" @click="dislikeFmTrack" aria-label="不喜欢并切换下一首">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10.8 5.5H6.9c-.93 0-1.74.64-1.95 1.54l-1.14 4.9a2 2 0 0 0 1.95 2.46h3.38l-.53 3.92a1.85 1.85 0 0 0 3.4 1.18l4.3-6.14c.2-.28.3-.62.3-.97V7.4a1.9 1.9 0 0 0-1.9-1.9h-3.9Zm7.15 0h1.65A1.4 1.4 0 0 1 21 6.9v6.95a1.4 1.4 0 0 1-1.4 1.4h-1.65V5.5Z"/></svg>
        </AnimatedAppear>
        <AnimatedAppear v-else tag="button" variant="control" rhythm="actions" class-name="ctrl" @click="playerStore.prev()" aria-label="上一首">
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
        <button class="vol-icon-btn" type="button" :aria-label="playerStore.muted ? '取消静音' : '静音'" @click="playerStore.toggleMute()">
          <VolumeX v-if="playerStore.muted || playerStore.volume === 0" :size="16" />
          <Volume v-else-if="playerStore.volume < 0.33" :size="16" />
          <Volume1 v-else-if="playerStore.volume < 0.66" :size="16" />
          <Volume2 v-else :size="16" />
        </button>
        <input type="range" min="0" max="100" :value="Math.round((playerStore.muted ? 0 : playerStore.volume) * 100)" @input="onVolume" />
      </AnimatedAppear>
      <div class="quality-wrap" ref="qualityWrapRef">
        <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="1" class-name="icon quality-icon" :class="{ active: showQualityPopup }" aria-label="音质选择" @click.stop="toggleQualityPopup">
          <span class="quality-btn-label">{{ playerStore.defaultQuality }}</span>
        </AnimatedAppear>
        <Teleport to="body">
          <transition name="quality-fade">
            <div v-if="showQualityPopup" class="quality-popup-backdrop" @click.self="showQualityPopup = false" @wheel.passive @touchmove.passive>
              <div class="quality-popup" :style="popupStyle">
                <div class="quality-popup__header">音质切换</div>
              <div class="quality-popup__sub">以账号具体权限为准</div>
                <div class="quality-popup__list">
                  <button
                    v-for="q in qualityOptions"
                    :key="q.label"
                    type="button"
                    class="quality-popup__item"
                    :class="{ active: playerStore.defaultQuality === q.label }"
                    @click.stop="selectQuality(q.label)"
                  >
                    <span class="quality-popup__item-label">{{ q.label }}</span>
                    <span class="quality-popup__item-size">{{ qualitySizes[q.label] || '' }}</span>
                    <Check v-if="playerStore.defaultQuality === q.label" :size="14" class="quality-popup__check" />
                  </button>
                </div>
              </div>
            </div>
          </transition>
        </Teleport>
      </div>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="2" class-name="icon" aria-label="歌词"><Captions :size="14" /></AnimatedAppear>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="3" class-name="icon" :class="{ saved: isCurrentLiked, loading: likeLoading }" :aria-pressed="isCurrentLiked" :aria-label="isCurrentLiked ? '取消收藏' : '收藏'" :disabled="likeLoading || !canToggleCurrentLike" @click="toggleCurrentLike"><Heart :size="14" /></AnimatedAppear>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="4" class-name="icon" aria-label="设置"><Settings :size="14" /></AnimatedAppear>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="5" class-name="icon" aria-label="切换播放模式" @click="playerStore.cyclePlayMode()">
        <Repeat v-if="playerStore.playMode === 'loop'" :size="14" />
        <Repeat1 v-else-if="playerStore.playMode === 'single'" :size="14" />
        <Shuffle v-else :size="14" />
      </AnimatedAppear>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="6" class-name="icon" aria-label="播放列表"><ListMusic :size="14" /></AnimatedAppear>
    </AnimatedAppear>
    <transition name="quality-toast-fade">
      <div v-if="qualityToastMsg" class="quality-toast" role="status" aria-live="polite">{{ qualityToastMsg }}</div>
    </transition>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, Teleport } from 'vue';
import {
  Captions,
  Check,
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
  Volume,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-vue-next';
import { uiStore } from '../stores/ui';
import { playerStore } from '../stores/player';
import { getSongUrlV1, toggleDjSubscribe, toggleSongLike, trashPersonalFm } from '../api/music';
import { userStore } from '../stores/user';
import AnimatedAppear from './AnimatedAppear.vue';
import { useLyrics } from '../composables/useLyrics';

const qualityOptions = [
  { label: '标准', level: 'standard' },
  { label: '较高', level: 'higher' },
  { label: '极高(HQ)', level: 'exhigh' },
  { label: '无损(SQ)', level: 'lossless' },
  { label: 'Hi-Res', level: 'hires' },
  { label: '高清环绕声', level: 'jyeffect' },
  { label: '沉浸环绕声', level: 'sky' },
  { label: '杜比全景声', level: 'dolby' },
  { label: '超清母带', level: 'jymaster' },
];

const qualityToastMsg = ref('');
let qualityToastTimer: ReturnType<typeof setTimeout> | null = null;

function showQualityToast(msg: string) {
  qualityToastMsg.value = msg;
  if (qualityToastTimer) clearTimeout(qualityToastTimer);
  qualityToastTimer = setTimeout(() => { qualityToastMsg.value = ''; }, 3000);
}

const showQualityPopup = ref(false);
const qualitySizes = ref<Record<string, string>>({});

const isPersonalFmCurrentTrack = computed(() => playerStore.isPersonalFmTrack(playerStore.currentTrack));
async function dislikeFmTrack() {
  const track = playerStore.currentTrack;
  const id = Number(track?.id || 0);
  if (!id) return;
  try { await trashPersonalFm(id, userStore.loginCookie || undefined); } catch { /* ignore */ }
  playerStore.next();
}

async function fetchQualitySizes() {
  const trackId = playerStore.currentTrack?.id;
  if (!trackId) return;
  const cookie = userStore.loginCookie || undefined;
  const sizes: Record<string, string> = {};
  for (const q of qualityOptions) {
    try {
      const { data: body } = await getSongUrlV1(Number(trackId), q.level, cookie);
      const item = Array.isArray(body?.data) ? body.data[0] : null;
      if (item?.size > 0) {
        const mb = item.size / 1048576;
        sizes[q.label] = mb >= 1 ? mb.toFixed(1) + 'M' : Math.round(item.size / 1024) + 'K';
      }
    } catch {
      // skip if this quality level is unavailable
    }
  }
  qualitySizes.value = sizes;
}

const qualityWrapRef = ref<HTMLElement | null>(null);
const popupStyle = ref<Record<string, string>>({});

function updatePopupPosition() {
  if (!qualityWrapRef.value) return;
  const rect = qualityWrapRef.value.getBoundingClientRect();
  popupStyle.value = {
    position: 'absolute',
    bottom: `${window.innerHeight - rect.top + 8}px`,
    right: `${window.innerWidth - rect.right}px`,
    width: '200px',
    maxHeight: '380px',
  };
}

function toggleQualityPopup() {
  showQualityPopup.value = !showQualityPopup.value;
  if (showQualityPopup.value) {
    updatePopupPosition();
    void fetchQualitySizes();
  }
}

function selectQuality(quality: string) {
  playerStore.setDefaultQuality(quality);
  showQualityPopup.value = false;
  console.log('[quality] 切换到:', quality, '| 当前歌曲:', playerStore.currentTrack?.name, '| 进度:', Math.floor(playerStore.currentTime), 's');
  // 如果正在播放，立即以新音质重新拉取播放地址，并保持当前进度
  if (playerStore.currentTrack && playerStore.isPlaying) {
    const currentTime = playerStore.currentTime;
    console.log('[quality] 重新拉取播放地址...');
    playerStore.playTrack(playerStore.currentTrack, currentTime).then((ok) => {
      if (!ok) {
        console.log('[quality] 切换失败，当前账号可能不支持此音质');
        showQualityToast('当前账号不支持 ' + quality + ' 音质');
      }
    });
  }
}

function onResize() {
  if (showQualityPopup.value) updatePopupPosition();
}

onMounted(() => {
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, true);
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
  window.removeEventListener('scroll', onResize, true);
});

const currentTrackId = computed(() => Number(playerStore.currentTrack?.id || 0));
const currentPodcastRid = computed(() => Number(playerStore.currentTrack?.podcast?.rid || 0));
const isCurrentPodcast = computed(() => playerStore.currentTrack?.source === 'podcast' && currentPodcastRid.value > 0);
const canToggleCurrentLike = computed(() => (isCurrentPodcast.value ? currentPodcastRid.value > 0 : currentTrackId.value > 0));
const likedSongSignature = computed(() => userStore.likedSongIds.join(','));
const subscribedDjSignature = computed(() => userStore.subscribedDjIds.join(','));
const isCurrentLiked = computed(() => {
  void likedSongSignature.value;
  void subscribedDjSignature.value;
  if (isCurrentPodcast.value) return userStore.subscribedDjIds.includes(currentPodcastRid.value);
  return currentTrackId.value > 0 ? userStore.likedSongIds.includes(currentTrackId.value) : false;
});
const likeLoading = ref(false);

/* 加载歌词 */
watch(() => playerStore.currentTrack?.id, async (id) => {
  if (!id) return;
  await loadLyrics(playerStore.currentTrack);
}, { immediate: true });

watch(
  () => `${currentTrackId.value}-${currentPodcastRid.value}-${playerStore.currentTrack?.source || 'song'}`,
  () => {
    likeLoading.value = false;
  },
  { immediate: true },
);

/* 播放时显示当前歌词行 */
const { lyricLines, currentLyricIndex, effectiveTime, startTick, isLoading, loadLyrics } = useLyrics();
startTick();

const currentLyricText = computed(() => {
  const idx = currentLyricIndex.value;
  if (idx < 0 || idx >= lyricLines.value.length) return '';
  const line = lyricLines.value[idx];
  if (!line || !line.text) return '';
  if (line.translation) return `${line.text} · ${line.translation}`;
  return line.text;
});

const artistText = computed(() => {
  const ar = playerStore.currentTrack?.ar || [];
  if (!ar.length) return 'Unknown Artist';
  return ar.map((a) => a.name).join('/');
});

const sourceLabel = computed(() => {
  const s = playerStore.currentSource;
  if (s === 'official' || !s) return '官方';
  return s;
});

const qualityLabel = computed(() => {
  const br = playerStore.currentQualityBr;
  if (br >= 1920000) return 'Hi-Res';
  if (br >= 999000) return '无损(SQ)';
  if (br >= 320000) return '极高(HQ)';
  if (br >= 192000) return '较高';
  if (br >= 128000) return '标准';
  return playerStore.currentTrack ? playerStore.defaultQuality : '';
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
  if (likeLoading.value || !canToggleCurrentLike.value) return;
  const next = !isCurrentLiked.value;
  likeLoading.value = true;
  try {
    const response = isCurrentPodcast.value
      ? await toggleDjSubscribe({ rid: currentPodcastRid.value, subscribe: next, cookie: userStore.loginCookie || undefined })
      : await toggleSongLike({ id: currentTrackId.value, like: next, uid: userStore.profile?.userId, cookie: userStore.loginCookie || undefined });
    const code = response?.data?.code ?? response?.data?.data?.code;
    if (typeof code === 'number' && code !== 200) throw new Error(`收藏失败，接口返回 ${code}`);
    if (isCurrentPodcast.value) {
      const rid = currentPodcastRid.value;
      const exists = userStore.subscribedDjIds.includes(rid);
      if (next && !exists) userStore.subscribedDjIds = [...userStore.subscribedDjIds, rid];
      if (!next && exists) userStore.subscribedDjIds = userStore.subscribedDjIds.filter((id) => id !== rid);
      return;
    }
    const id = currentTrackId.value;
    if (next) { if (!userStore.likedSongIds.includes(id)) userStore.likedSongIds = [...userStore.likedSongIds, id]; }
    else { userStore.likedSongIds = userStore.likedSongIds.filter((songId) => songId !== id); }
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
.ctrl-dislike { color: var(--text-main) !important; }
.ctrl-dislike:hover { color: var(--text-main) !important; opacity: 0.7; }
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  padding: 0 var(--space-5);
  z-index: 20;
  min-width: 0;
  overflow-x: clip;
}
.left { display: flex; align-items: center; gap: var(--space-2); min-width: 0; overflow: hidden; }
.cover-wrap { position: relative; flex-shrink: 0; }
.cover-wrap:hover .cover-fullscreen-btn { opacity: 1; pointer-events: auto; }
.cover { width: 52px; height: 52px; border-radius: 12px; border: 1px solid var(--border); background: #e5e7eb center/cover no-repeat; cursor: pointer; transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease; }
.cover:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--accent) 36%, var(--border)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 22%, transparent); }
.cover-fullscreen-btn {
  position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 12px;
  border: none; background: rgba(0,0,0,0.45); color: #fff; cursor: pointer;
  display: grid; place-items: center; opacity: 0; pointer-events: none;
  transition: opacity 0.18s ease;
}
.meta { min-width: 0; max-width: 100%; overflow: hidden; flex: 1; }
.title-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.title { color: #111827; font-weight: 600; }
.artist { color: #6b7280; font-size: 12px; display: flex; align-items: center; gap: 4px; overflow: hidden; height: 18px; line-height: 18px; max-width: 100%; }
.lyric-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--accent, #6b7280); font-size: 12px; height: 18px; line-height: 18px; max-width: 100%; }
.quality-badge { display: inline-flex; align-items: center; flex-shrink: 0; height: 16px; padding: 0 5px; border-radius: 3px; background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); font-size: 10px; font-weight: 700; letter-spacing: 0.04em; line-height: 1; }
.source-badge { display: inline-flex; align-items: center; flex-shrink: 0; height: 16px; padding: 0 5px; border-radius: 3px; background: color-mix(in srgb, #6366f1 18%, transparent); color: #6366f1; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; line-height: 1; margin-left: 4px; }
.center { display: grid; justify-items: center; gap: var(--space-1); min-width: 0; }
.controls-row { height: 42px; display: flex; align-items: center; gap: var(--space-2); }
.progress-row { width: min(420px, 100%); display: grid; grid-template-columns: 44px 1fr 44px; gap: var(--space-2); align-items: center; }
.progress { width: 100%; }
.time { color: var(--text-sub); font-size: 11px; text-align: center; }
.ctrl { width: 36px; height: 36px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--border) 78%, transparent); background: color-mix(in srgb, var(--bg-surface) 92%, #fff 8%); color: var(--text-main); cursor: pointer; display: grid; place-items: center; line-height: 1; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.35); transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease, border-color 0.16s ease; }
.ctrl:hover { transform: translateY(-1px); box-shadow: 0 8px 16px rgba(15, 23, 42, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.4); }
.ctrl:active { transform: translateY(0); box-shadow: 0 3px 8px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.28); }
.ctrl.main { width: 42px; height: 42px; border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); background: color-mix(in srgb, var(--accent) 22%, var(--bg-surface)); color: var(--text-main); box-shadow: 0 8px 18px color-mix(in srgb, var(--accent) 20%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.35); }
.ctrl:focus-visible, .icon:focus-visible, .cover:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.right { display: flex; justify-content: flex-end; align-items: center; gap: var(--space-2); min-width: 0; }
.vol { display: flex; align-items: center; gap: var(--space-1); color: #374151; }
.vol input { width: 88px; }
.vol-icon-btn { width: 24px; height: 24px; border: none; background: transparent; color: inherit; cursor: pointer; display: inline-grid; place-items: center; border-radius: 5px; transition: color 0.16s ease, background 0.16s ease; flex-shrink: 0; }
.vol-icon-btn:hover { color: #111827; background: rgba(0,0,0,0.06); }
.vol-icon-btn:active { color: #6b7280; }
.quality-wrap { position: relative; flex-shrink: 0; }
.icon.quality-icon { width: auto; min-width: 32px; padding: 0 8px; }
.quality-btn-label { font-size: 10px; font-weight: 700; line-height: 1; white-space: nowrap; }
.icon { width: 32px; height: 32px; border-radius: 10px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; display: grid; place-items: center; transition: transform 0.16s ease, border-color 0.16s ease, color 0.16s ease, background 0.16s ease; }
.icon:hover { transform: translateY(-1px); border-color: #86efac; color: #16a34a; }
.icon.active { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, #fff); }
.icon.saved { border-color: color-mix(in srgb, var(--accent) 48%, #d1d5db); color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, #fff); }
.icon.loading { opacity: 0.72; cursor: progress; }

.quality-popup-backdrop { position: fixed; inset: 0; z-index: 9999; }
.quality-popup { position: fixed; background: var(--bg-solid); border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 16px 48px rgba(15, 23, 42, 0.18); overflow: hidden; display: flex; flex-direction: column; z-index: 10000; }
.quality-popup__header { padding: 12px 16px 4px; font-size: 11px; font-weight: 700; color: var(--text-sub); text-transform: uppercase; letter-spacing: 0.06em; }
.quality-popup__sub { padding: 0 16px 8px; font-size: 11px; color: var(--text-soft); }
.quality-popup__list { overflow-y: auto; max-height: 340px; padding: 0 6px 6px; display: grid; gap: 2px; }
.quality-popup__item { display: flex; align-items: center; gap: 6px; width: 100%; padding: 8px 12px; border: none; border-radius: 10px; background: transparent; color: var(--text-main); font-size: 13px; cursor: pointer; transition: background 0.12s ease; text-align: left; }
.quality-popup__item-size { margin-left: auto; font-size: 10px; color: var(--text-soft); white-space: nowrap; letter-spacing: 0.03em; }
.quality-popup__item:hover { background: color-mix(in srgb, var(--accent) 6%, var(--bg-solid)); }
.quality-popup__item.active { background: color-mix(in srgb, var(--accent) 12%, var(--bg-solid)); color: var(--accent); font-weight: 600; }
.quality-popup__check { color: var(--accent); flex-shrink: 0; }

.quality-fade-enter-active, .quality-fade-leave-active { transition: opacity 0.18s ease; }
.quality-fade-enter-from, .quality-fade-leave-to { opacity: 0; }
.quality-fade-enter-active .quality-popup { transition: transform 0.18s ease, opacity 0.18s ease; }
.quality-fade-enter-from .quality-popup { transform: translateY(8px); opacity: 0; }
.quality-fade-leave-active .quality-popup { transition: transform 0.18s ease, opacity 0.18s ease; }
.quality-fade-leave-to .quality-popup { transform: translateY(8px); opacity: 0; }

.quality-toast {
  position: fixed;
  left: 50%;
  bottom: 100px;
  transform: translateX(-50%);
  z-index: 10001;
  padding: 10px 16px;
  border: 1px solid color-mix(in srgb, var(--danger) 30%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--danger) 10%, var(--bg-solid));
  color: var(--text-main);
  font-size: 13px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  pointer-events: none;
}
.quality-toast-fade-enter-active,
.quality-toast-fade-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.quality-toast-fade-enter-from,
.quality-toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }

</style>
