<template>
  <AnimatedAppear tag="div" variant="content" rhythm="shell" class-name="daily-recommend-root" @click.self="closeHistoryMenu">
    <PageLayoutShell :shell-class="embedded ? '' : 'panel daily-detail-panel'" :header-class="['daily-detail-header', isSticky && 'is-sticky-header']" body-class="daily-detail-body">
    <template #back v-if="!isSticky">
      <button class="back-btn button-surface" @click="emit('back')">← {{ props.backLabel }}</button>
    </template>

    <template #header>
      <PageHeroHeader
        :layout-class="['daily-detail-header', isSticky && 'sticky-mode']"
        media-class="daily-detail-header__media"
        content-class="daily-detail-header__content detail-hero"
      >
        <template #media>
          <div class="hero-media-shell">
            <div class="cover cover-fallback" :style="coverStyle">
              <span class="cover-overlay"></span>
              <span class="cover-label">Daily</span>
              <span class="cover-title">Recommend</span>
            </div>
          </div>
        </template>
        <template #content>
          <div class="hero-main-shell meta">
            <div class="hero-title-shell">
              <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="title">每日推荐</AnimatedAppear>
            </div>
            <div class="hero-meta-shell">
              <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="sub-row">
                <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="sub">当前共 {{ displayedSongs.length }} 首推荐歌曲</AnimatedAppear>
              </AnimatedAppear>
              <AnimatedAppear v-if="hasHistoryDates" tag="p" variant="text" rhythm="body" class-name="desc">根据你的音乐口味生成，每天 6:00 更新</AnimatedAppear>
            </div>
            <div class="hero-actions-shell">
              <AnimatedAppear tag="div" variant="content" rhythm="actions" class-name="ops">
                <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="play-all button-surface" :disabled="!displayedSongs.length" @click="playAll">播放全部</AnimatedAppear>
                <DropdownSelect
                  class="history-dropdown"
                  :model-value="historySelectedLabel"
                  :options="historySelectOptions"
                  :placeholder="historyButtonLabel"
                  :option-colors="{}"
                  @update:modelValue="onHistorySelect"
                />
              </AnimatedAppear>
            </div>
          </div>
        </template>
      </PageHeroHeader>
    </template>

    <template #default>
      <AnimatedAppear v-if="dailyLoading" tag="p" variant="text" rhythm="body" class-name="empty">每日推荐加载中…</AnimatedAppear>
      <AnimatedAppear v-else-if="dailyError" tag="p" variant="text" rhythm="body" class-name="empty">{{ dailyError }}</AnimatedAppear>
      <AnimatedAppear v-else-if="!displayedSongs.length" tag="p" variant="text" rhythm="body" class-name="empty">今日暂无推荐歌曲</AnimatedAppear>

      <ul v-else class="song-list">
        <li
          v-for="(song, idx) in displayedSongs"
          :key="song.id || `${song.name}-${idx}`"
          class="song-item"
          :class="{ 'song-item--playing': isCurrentTrack(song) }"
        >
          <PlayPauseButton :song-id="Number(song.id || 0)" :index-label="idx + 1" @play="playOne(idx)" />
          <img class="song-cover" :src="song.al?.picUrl || song.al?.pic_url || song.album?.picUrl || fallbackCover" :alt="song.name || '歌曲封面'" />
          <div class="song-meta">
            <p class="song-name">{{ song.name || '未命名歌曲' }}</p>
            <p class="song-artist">{{ formatArtists(song) }}</p>
          </div>
        </li>
      </ul>
    </template>
    </PageLayoutShell>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import PageLayoutShell from './PageLayoutShell.vue';
import PageHeroHeader from './PageHeroHeader.vue';
import DropdownSelect from './ui/DropdownSelect.vue';
import PlayPauseButton from './ui/PlayPauseButton.vue';
import { getHistoryRecommendSongDates, getHistoryRecommendSongDetail, getRecommendSongs } from '../api/music';
import { playerStore } from '../stores/player';
import { userStore } from '../stores/user';

const props = withDefaults(
  defineProps<{
    songs: any[];
    backLabel?: string;
    embedded?: boolean;
  }>(),
  {
    songs: () => [],
    backLabel: '返回首页',
    embedded: false,
  },
);

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const baseSongs = computed(() => (Array.isArray(props.songs) ? props.songs : []));
const currentSongs = ref<any[]>([]);
const displayedSongs = computed(() => currentSongs.value);
const dailyCoverUrl = computed(() => currentSongs.value[0]?.al?.picUrl || currentSongs.value[0]?.album?.picUrl || currentSongs.value[0]?.album?.blurPicUrl || '');
const historyDates = ref<Array<{ value: string; label: string }>>([]);
const selectedHistoryDate = ref('');
const historyLoading = ref(false);
const dailyLoading = ref(false);
const dailyError = ref('');
let dailyRequestSeq = 0;
let historyDatesRequestSeq = 0;
let historyDetailRequestSeq = 0;
const historyButtonLabel = computed(() => (historyLoading.value ? '历史日推加载中…' : '历史日推'));
const historySelectOptions = computed(() => ['返回今日推荐', ...historyDates.value.map((item) => item.label)]);
const historySelectedLabel = computed(() => {
  if (!selectedHistoryDate.value) return historyButtonLabel.value;
  return historyDates.value.find((item) => item.value === selectedHistoryDate.value)?.label || historyButtonLabel.value;
});
const hasHistoryDates = computed(() => historyDates.value.length > 0);
const fallbackCover = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#f59e0b"/>
        <stop offset="1" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="56" fill="url(#g)"/>
    <circle cx="256" cy="256" r="116" fill="rgba(255,255,255,.16)"/>
    <circle cx="256" cy="256" r="42" fill="rgba(255,255,255,.34)"/>
  </svg>
`);

const coverStyle = computed(() => ({
  backgroundImage: `url(${dailyCoverUrl.value || fallbackCover})`,
}));

function formatArtists(song: any) {
  return song?.ar?.map((artist: any) => artist?.name).filter(Boolean).join(' / ') || '未知歌手';
}

function normalizeRecommendSong(song: any) {
  return {
    ...song,
    al: song?.al || song?.album || {},
    ar: Array.isArray(song?.ar) ? song.ar : Array.isArray(song?.artists) ? song.artists : [],
  };
}

function normalizeHistoryDateLabel(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function loadHistoryDates() {
  const requestSeq = ++historyDatesRequestSeq;
  if (!userStore.isLogin) {
    if (requestSeq !== historyDatesRequestSeq) return;
    currentSongs.value = baseSongs.value;
    return;
  }
  historyLoading.value = true;
  try {
    const { data } = await getHistoryRecommendSongDates(userStore.loginCookie || undefined);
    if (requestSeq !== historyDatesRequestSeq) return;
    const list = Array.isArray(data?.data?.dates)
      ? data.data.dates
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.dates)
          ? data.dates
          : Array.isArray(data?.list)
            ? data.list
            : [];
    historyDates.value = list
      .map((item: any) => {
        const value = String(item?.date || item?.day || item);
        return value ? { value, label: normalizeHistoryDateLabel(value) } : null;
      })
      .filter(Boolean) as Array<{ value: string; label: string }>;
    if (!currentSongs.value.length) {
      currentSongs.value = baseSongs.value;
    }
  } catch {
    if (requestSeq !== historyDatesRequestSeq) return;
    currentSongs.value = baseSongs.value;
  } finally {
    if (requestSeq === historyDatesRequestSeq) {
      historyLoading.value = false;
    }
  }
}

async function loadDailyRecommend() {
  const requestSeq = ++dailyRequestSeq;
  dailyError.value = '';
  dailyLoading.value = true;
  try {
    const { data } = await getRecommendSongs(userStore.loginCookie || undefined);
    if (requestSeq !== dailyRequestSeq) return;
    const list = Array.isArray(data?.recommend) ? data.recommend : Array.isArray(data?.songs) ? data.songs : Array.isArray(data?.data) ? data.data : [];
    const normalized = list.map((song: any) => normalizeRecommendSong(song)).filter(Boolean);
    currentSongs.value = normalized.length ? normalized : baseSongs.value;
  } catch {
    if (requestSeq !== dailyRequestSeq) return;
    dailyError.value = '每日推荐加载失败';
    currentSongs.value = baseSongs.value;
  } finally {
    if (requestSeq === dailyRequestSeq) {
      dailyLoading.value = false;
    }
  }
}

async function loadHistoryByDate(date: string) {
  if (!date) return;
  const requestSeq = ++historyDetailRequestSeq;
  historyLoading.value = true;
  selectedHistoryDate.value = date;
  try {
    const { data } = await getHistoryRecommendSongDetail(date, userStore.loginCookie || undefined);
    if (requestSeq !== historyDetailRequestSeq) return;
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.songs) ? data.songs : Array.isArray(data?.list) ? data.list : [];
    currentSongs.value = list.length ? list : baseSongs.value;
  } catch {
    if (requestSeq !== historyDetailRequestSeq) return;
    currentSongs.value = baseSongs.value;
  } finally {
    if (requestSeq === historyDetailRequestSeq) {
      historyLoading.value = false;
    }
  }
}

async function loadTodayRecommend() {
  selectedHistoryDate.value = '';
  await loadDailyRecommend();
  await loadHistoryDates();
}

function onHistorySelect(value: string) {
  if (value === '返回今日推荐' || value === historyButtonLabel.value) {
    void loadTodayRecommend();
    return;
  }
  const hit = historyDates.value.find((item) => item.label === value);
  if (hit) void loadHistoryByDate(hit.value);
}

function closeHistoryMenu() {
  // keep root click handler stable
}

function isCurrentTrack(song: any) {
  return Number(song?.id) > 0 && Number(song?.id) === Number(playerStore.currentSongId || 0);
}

async function playAll() {
  if (!displayedSongs.value.length) return;
  playerStore.setPlaylist(displayedSongs.value, 0);
  await playerStore.playByIndex(0);
}

async function playOne(index: number) {
  if (!displayedSongs.value.length) return;
  playerStore.setPlaylist(displayedSongs.value, index);
  await playerStore.playByIndex(index);
}

const isSticky = ref(false);
let stickyRAF = 0;
let scrollHost: HTMLElement | null = null;

function getScrollHost() {
  return document.querySelector('.content') as HTMLElement | null;
}

function updateStickyState() {
  if (!scrollHost) return;
  isSticky.value = scrollHost.scrollTop > 8;
}

function onScroll() {
  cancelAnimationFrame(stickyRAF);
  stickyRAF = requestAnimationFrame(updateStickyState);
}

onMounted(() => {
  currentSongs.value = baseSongs.value;
  scrollHost = getScrollHost();
  updateStickyState();
  scrollHost?.addEventListener('scroll', onScroll, { passive: true });
  void loadDailyRecommend();
  void loadHistoryDates();
});

onBeforeUnmount(() => {
  scrollHost?.removeEventListener('scroll', onScroll);
  cancelAnimationFrame(stickyRAF);
});

watch(
  () => props.songs,
  () => {
    currentSongs.value = baseSongs.value;
    updateStickyState();
  },
  { deep: true },
);
</script>

<style scoped>
@import '../styles/detail-page.css';

.daily-recommend-root {
  position: relative;
}

.daily-detail-shell {
  border-radius: 18px;
  overflow: hidden;
}

.daily-detail-header__content {
  min-width: 0;
}

.hero-main-shell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 10px;
  width: 100%;
}

.hero-title-shell {
  min-width: 0;
  flex: 0 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.hero-meta-shell {
  flex: 0 0 auto;
  display: grid;
  gap: 10px;
  align-items: flex-start;
}

.hero-actions-shell {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.daily-detail-header .title {
  margin: -8px 0 0;
  font-size: 38px;
  line-height: 1.08;
  letter-spacing: 0.2px;
  font-weight: 800;
}

.page-shell__header.is-sticky-header .hero-main-shell {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-shell__header.is-sticky-header .hero-title-shell {
  align-items: center;
  flex: 1 1 auto;
}

.page-shell__header.is-sticky-header .title {
  margin-top: 0;
}

.page-shell__header.is-sticky-header .hero-meta-shell {
  display: none;
}

.page-shell__header.is-sticky-header .hero-actions-shell {
  justify-content: flex-end;
}

.page-shell__header.is-sticky-header .ops {
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.cover-fallback {
  width: 308px;
  height: 308px;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px;
  box-sizing: border-box;
  color: #fff;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
  box-shadow: 0 10px 28px rgba(17, 24, 39, 0.18);
  position: relative;
  overflow: hidden;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(0, 0, 0, 0.18) 100%);
  pointer-events: none;
}

.cover-label {
  position: relative;
  z-index: 1;
  font-size: 14px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.82;
}

.cover-title {
  position: relative;
  z-index: 1;
  font-size: 36px;
  font-weight: 900;
  line-height: 1;
  margin-top: 8px;
}

.desc {
  margin: 0;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
  max-width: 52ch;
}

.ops {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.history-btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-muted);
  color: var(--text-main);
  cursor: pointer;
}

.history-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.history-dropdown {
  width: 120px;
}

.history-dropdown :deep(.dd) {
  width: 120px;
}

.history-dropdown :deep(.dd-trigger) {
  width: 100%;
}

.history-dropdown :deep(.dd-menu) {
  z-index: 1000;
}

.history-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 20;
  min-width: 220px;
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-surface);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
}

.history-menu-item {
  height: 32px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-main);
  cursor: pointer;
  text-align: left;
}

.history-menu-item.active {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
  background: color-mix(in srgb, var(--accent) 14%, var(--bg-surface));
}

.play-all {
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent) 70%, var(--border));
  background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 92%, #fff), color-mix(in srgb, var(--accent) 74%, #000));
  color: #fff;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 34%, transparent), var(--glass-highlight);
  cursor: pointer;
  transition: filter 0.2s ease, transform 0.2s ease;
}

.play-all:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.play-all:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.empty {
  margin: 0;
  padding: 22px 0;
  color: var(--text-soft);
}

.song-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
}

.song-item {
  display: grid;
  grid-template-columns: 40px 52px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 2px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.song-item--playing {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--accent) 72%, transparent);
}

.song-item--playing .song-cover {
  box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 18%, rgba(15, 23, 42, 0.18));
}

.idx {
  color: var(--text-soft);
  text-align: center;
  font-weight: 600;
}

.song-cover {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  object-fit: cover;
}

.song-meta {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.song-name,
.song-artist {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-name {
  color: var(--text-main);
  font-weight: 600;
}

.song-artist {
  color: var(--text-sub);
  font-size: 12px;
}

.play-btn {
  height: 30px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--accent) 70%, var(--border));
  border-radius: 8px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 92%, #fff), color-mix(in srgb, var(--accent) 74%, #000));
  color: #fff;
  cursor: pointer;
}

@media (max-width: 767px) {
  .detail-hero {
    grid-template-columns: 1fr;
  }

  .cover-fallback {
    width: 140px;
    height: 140px;
  }

  .cover-title {
    font-size: 26px;
  }

  .daily-detail-header .title {
    font-size: 30px;
  }

  .song-item {
    grid-template-columns: 34px 44px 1fr auto;
  }

  .song-cover {
    width: 44px;
    height: 44px;
  }
}
</style>
