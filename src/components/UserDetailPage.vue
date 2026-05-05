<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="user-detail-page" :style="shellStyle">
    <div v-if="!isSticky" class="user-detail-back">
      <button class="back-btn" @click="emit('back')">← {{ props.backLabel }}</button>
    </div>

    <DetailStickyHeroHeader
      :sticky="isSticky"
      :loading="loading"
      :ready="!!userDetail"
      :error="error"
      loading-text="用户详情加载中…"
    >
      <template #media>
        <HeroCoverMedia :src="avatarUrl" :alt="displayName" />
      </template>
      <template #title>
        <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="title">{{ displayName }}</AnimatedAppear>
      </template>
      <template #meta>
        <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="sub-row user-meta-row">
          <AnimatedAppear tag="span" variant="text" rhythm="body" class-name="meta-pill">创建歌单：{{ createdPlaylists.length }}</AnimatedAppear>
          <AnimatedAppear tag="span" variant="text" rhythm="body" class-name="meta-pill">收藏歌单：{{ collectedPlaylists.length }}</AnimatedAppear>
        </AnimatedAppear>
        <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="desc">{{ userSignature }}</AnimatedAppear>
      </template>
      <template #actions>
        <AnimatedAppear
          tag="button"
          variant="control"
          rhythm="actions"
          class-name="play-all"
          @click="openFirstPlaylist"
        >打开首个歌单</AnimatedAppear>
      </template>
    </DetailStickyHeroHeader>

    <AnimatedAppear v-if="userDetail" tag="div" variant="content" rhythm="body" class-name="user-tabs" role="tablist" aria-label="用户歌单标签">
      <AnimatedAppear
        v-for="tab in tabs"
        :key="tab.key"
        tag="button"
        variant="control"
        rhythm="actions"
        class-name="user-tab"
        :class="{ active: activeTab === tab.key }"
        type="button"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </AnimatedAppear>
    </AnimatedAppear>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="user-detail-body">
      <AnimatedAppear v-if="loading && !userDetail" tag="div" variant="text" rhythm="body" class-name="state">用户详情加载中…</AnimatedAppear>
      <AnimatedAppear v-else-if="error" tag="div" variant="text" rhythm="body" class-name="state error">{{ error }}</AnimatedAppear>
      <AnimatedAppear v-else-if="playlistList.length" tag="ul" variant="content" rhythm="list" class-name="song-list">
        <AnimatedAppear
          v-for="(playlist, idx) in playlistList"
          :key="playlist.id || idx"
          tag="li"
          variant="text"
          rhythm="list"
          :index="idx"
          class-name="song-item"
          @dblclick="onPlaylistItemDblClick($event, playlist.id)"
        >
          <AnimatedAppear tag="div" variant="text" rhythm="list" :index="idx" class-name="idx">{{ idx + 1 }}</AnimatedAppear>
          <AnimatedAppear tag="img" variant="media" rhythm="list" :index="idx" class-name="song-cover" :src="resolvePlaylistCover(playlist)" :alt="playlist.name || '歌单封面'" />
          <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="song-meta">
            <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="song-name">{{ playlist.name || '未命名歌单' }}</AnimatedAppear>
            <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="song-artist">{{ resolvePlaylistSubtitle(playlist) }}</AnimatedAppear>
          </AnimatedAppear>
          <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="idx" class-name="play-btn" @click="emitOpenPlaylist(playlist.id)">查看</AnimatedAppear>
        </AnimatedAppear>
      </AnimatedAppear>
      <AnimatedAppear v-else-if="userDetail" tag="div" variant="text" rhythm="body" class-name="state">暂无{{ activeTab === 'created' ? '创建' : '收藏' }}歌单</AnimatedAppear>
    </AnimatedAppear>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import HeroCoverMedia from './HeroCoverMedia.vue';
import { useDominantColor } from '../composables/useDominantColor';
import AnimatedAppear from './AnimatedAppear.vue';
import DetailStickyHeroHeader from './DetailStickyHeroHeader.vue';
import { getUserCollectedPlaylist, getUserCreatedPlaylist, getUserDetail } from '../api/auth';

const props = withDefaults(
  defineProps<{
    userId: number;
    backLabel?: string;
    scrollHostSelector?: string;
  }>(),
  {
    backLabel: '返回搜索结果',
    scrollHostSelector: '.content',
  },
);

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'open-playlist-detail', playlistId: number): void;
}>();

const loading = ref(false);
const error = ref('');
const userDetail = ref<any>(null);
const createdPlaylists = ref<any[]>([]);
const collectedPlaylists = ref<any[]>([]);
const activeTab = ref<'created' | 'collected'>('created');
const tabs = [
  { key: 'created', label: '创建歌单' },
  { key: 'collected', label: '收藏歌单' },
] as const;

const displayName = computed(() => userDetail.value?.profile?.nickname || userDetail.value?.nickname || '未命名用户');
const avatarUrl = computed(() => normalizeImageUrl(userDetail.value?.profile?.avatarUrl || userDetail.value?.avatarUrl || ''));
useDominantColor(avatarUrl);
const shellStyle = computed<Record<string, string>>(() => {
  const coverUrl = avatarUrl.value?.trim();
  return coverUrl ? { '--cover-bg': `url("${coverUrl}")` } : {};
});
const userSignature = computed(() => userDetail.value?.profile?.signature || userDetail.value?.signature || '这个用户还没有留下签名。');
const playlistList = computed(() => activeTab.value === 'created' ? createdPlaylists.value : collectedPlaylists.value);

function normalizeImageUrl(url?: string) {
  return url ? String(url).replace(/^http:\/\//, 'https://') : '';
}

function resolvePlaylistCover(item: any) {
  return normalizeImageUrl(item?.coverImgUrl || item?.picUrl || item?.coverUrl || avatarUrl.value);
}

function resolvePlaylistSubtitle(item: any) {
  const creator = item?.creator?.nickname || displayName.value;
  const count = Number(item?.trackCount || item?.songCount || 0);
  return `${creator} · ${count} 首`;
}

function emitOpenPlaylist(playlistId: number) {
  if (!playlistId) return;
  emit('open-playlist-detail', Number(playlistId));
}

function onPlaylistItemDblClick(event: MouseEvent, playlistId: number) {
  const target = event.target as HTMLElement | null;
  if (target?.closest('button, a, input, select, textarea, [role="button"]')) return;
  emitOpenPlaylist(playlistId);
}

function openFirstPlaylist() {
  const first = playlistList.value[0] || createdPlaylists.value[0] || collectedPlaylists.value[0];
  if (first?.id) emitOpenPlaylist(Number(first.id));
}

let fetchToken = 0;
async function fetchUserDetail(id: number) {
  if (!id) return;
  const currentToken = ++fetchToken;
  loading.value = true;
  error.value = '';
  try {
    const [detailRes, createdRes, collectedRes] = await Promise.all([
      getUserDetail(id),
      getUserCreatedPlaylist(id, 100, 0),
      getUserCollectedPlaylist(id, 100, 0),
    ]);
    if (currentToken !== fetchToken) return;
    userDetail.value = detailRes?.data || detailRes;
    const allCreated = normalizePlaylistArray(createdRes);
    const allCollected = normalizePlaylistArray(collectedRes);
    createdPlaylists.value = allCreated.filter((item: any) => Number(item?.creator?.userId || item?.userId || 0) === Number(id));
    collectedPlaylists.value = allCollected.filter((item: any) => Number(item?.creator?.userId || item?.userId || 0) !== Number(id));
    activeTab.value = 'created';
  } catch (e: any) {
    if (currentToken !== fetchToken) return;
    userDetail.value = null;
    createdPlaylists.value = [];
    collectedPlaylists.value = [];
    error.value = e?.message || '用户详情加载失败';
  } finally {
    if (currentToken === fetchToken) loading.value = false;
  }
}

function normalizePlaylistArray(payload: any): any[] {
  const candidates = [
    payload?.data?.playlist,
    payload?.data?.playlists,
    payload?.data?.data?.playlist,
    payload?.playlist,
    payload?.playlists,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

const isSticky = ref(false);
let stickyRAF = 0;
let scrollHost: HTMLElement | null = null;
let headerWrapEl: HTMLElement | null = null;
const STICKY_ENTER_THRESHOLD = 12;
const STICKY_EXIT_THRESHOLD = 4;
const STICKY_SCROLL_SAFETY_GAP = 32;

function getScrollHost() {
  return document.querySelector(props.scrollHostSelector || '.content') as HTMLElement | null;
}

function getHeaderWrapEl() {
  return document.querySelector('.playlist-detail-header-wrap') as HTMLElement | null;
}

function getStickyRequiredScrollRange() {
  if (!headerWrapEl) return Number.POSITIVE_INFINITY;
  const headerHeight = headerWrapEl.getBoundingClientRect().height;
  const stickyCollapsedHeight = 72;
  return Math.max(0, headerHeight - stickyCollapsedHeight) + STICKY_SCROLL_SAFETY_GAP;
}

function updateStickyState() {
  if (!scrollHost) return;
  const scrollRange = scrollHost.scrollHeight - scrollHost.clientHeight;
  const requiredScrollRange = getStickyRequiredScrollRange();
  if (scrollRange <= requiredScrollRange) {
    isSticky.value = false;
    return;
  }
  const nextScrollTop = scrollHost.scrollTop;
  if (isSticky.value) {
    isSticky.value = nextScrollTop > STICKY_EXIT_THRESHOLD;
    return;
  }
  isSticky.value = nextScrollTop > STICKY_ENTER_THRESHOLD;
}

function onScroll() {
  cancelAnimationFrame(stickyRAF);
  stickyRAF = requestAnimationFrame(updateStickyState);
}

onMounted(() => {
  fetchUserDetail(props.userId);
  scrollHost = getScrollHost();
  headerWrapEl = getHeaderWrapEl();
  updateStickyState();
  scrollHost?.addEventListener('scroll', onScroll, { passive: true });
});

onBeforeUnmount(() => {
  scrollHost?.removeEventListener('scroll', onScroll);
  cancelAnimationFrame(stickyRAF);
});

watch(
  () => props.userId,
  (id) => {
    fetchUserDetail(Number(id));
    requestAnimationFrame(() => {
      headerWrapEl = getHeaderWrapEl();
      updateStickyState();
    });
  },
);
</script>

<style scoped>
@import '../styles/detail-page.css';

.user-detail-page {
  min-height: 100%;
}

.user-detail-back {
  display: block;
}

.cover {
  width: 308px;
  height: 308px;
  border-radius: 18px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.user-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-surface) 82%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  color: var(--text-sub);
  font-size: 12px;
}

.user-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 18px 0 20px;
}

.user-tab {
  min-width: 96px;
  height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
  color: var(--text-sub);
  cursor: pointer;
  transition: transform .18s ease, background .18s ease, border-color .18s ease, color .18s ease, box-shadow .18s ease;
}

.user-tab:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 32%, var(--border));
  box-shadow: 0 12px 22px color-mix(in srgb, var(--accent) 10%, transparent);
}

.user-tab.active {
  background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 90%, #fff), color-mix(in srgb, var(--accent) 68%, #000));
  color: #fff;
  border-color: color-mix(in srgb, var(--accent) 70%, var(--border));
}

.user-detail-body {
  min-height: 320px;
}

:deep(.playlist-detail-header-wrap .page-hero-header) {
  transition: grid-template-columns 0.56s cubic-bezier(0.2, 0.9, 0.22, 1), gap 0.56s cubic-bezier(0.2, 0.9, 0.22, 1);
}

:deep(.playlist-detail-header-wrap .playlist-detail-header__media),
:deep(.playlist-detail-header-wrap .playlist-detail-header__content),
:deep(.playlist-detail-header-wrap .hero-media-shell),
:deep(.playlist-detail-header-wrap .hero-main-shell),
:deep(.playlist-detail-header-wrap .hero-title-shell),
:deep(.playlist-detail-header-wrap .hero-meta-shell),
:deep(.playlist-detail-header-wrap .hero-actions-shell),
:deep(.playlist-detail-header-wrap .ops),
:deep(.playlist-detail-header-wrap .cover),
:deep(.playlist-detail-header-wrap .title),
:deep(.playlist-detail-header-wrap .sub),
:deep(.playlist-detail-header-wrap .desc),
:deep(.playlist-detail-header-wrap .play-all) {
  transition:
    opacity 0.42s ease,
    transform 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    width 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    height 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    max-width 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    max-height 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    margin 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    padding 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    gap 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    font-size 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    letter-spacing 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    line-height 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    box-shadow 0.42s ease,
    background-color 0.42s ease,
    color 0.42s ease,
    border-color 0.42s ease,
    filter 0.42s ease,
    border-radius 0.56s cubic-bezier(0.2, 0.9, 0.22, 1);
}

:deep(.playlist-detail-header-wrap .playlist-detail-header__media) {
  width: 308px;
  max-width: 308px;
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  transform-origin: left center;
  overflow: hidden;
}

:deep(.playlist-detail-header-wrap .hero-media-shell) {
  transform: translate3d(0, 0, 0) scale(1);
  transform-origin: left center;
}

:deep(.playlist-detail-header-wrap .cover) {
  transform: translate3d(0, 0, 0) scale(1);
  transform-origin: left center;
  filter: saturate(1) blur(0);
}

:deep(.playlist-detail-header-wrap .playlist-detail-header__content) {
  width: 100%;
  min-width: 0;
  transform: translate3d(0, 0, 0);
}

:deep(.playlist-detail-header-wrap .hero-main-shell) {
  min-width: 0;
}

:deep(.playlist-detail-header-wrap .hero-title-shell) {
  min-width: 0;
}

:deep(.playlist-detail-header-wrap .hero-meta-shell) {
  display: grid;
  min-width: 0;
  max-height: 240px;
  opacity: 1;
  transform: translate3d(0, 0, 0);
  overflow: hidden;
}

:deep(.playlist-detail-header-wrap .title) {
  max-width: 100%;
  letter-spacing: 0.2px;
}

:deep(.playlist-detail-header-wrap .desc) {
  max-height: 120px;
  opacity: 1;
  transform: translate3d(0, 0, 0);
  overflow: hidden;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .page-hero-header) {
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
  align-items: center;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .playlist-detail-header__media) {
  width: 0;
  max-width: 0;
  height: 0;
  opacity: 0;
  transform: translate3d(-18px, 0, 0) scale(0.84);
  margin: 0;
  pointer-events: none;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-media-shell) {
  transform: translate3d(-10px, -4px, 0) scale(0.76);
}

:deep(.playlist-detail-header-wrap.is-sticky-header .cover) {
  opacity: 0;
  transform: translate3d(-14px, -6px, 0) scale(0.7);
  filter: saturate(0.88) blur(6px);
  border-radius: 14px;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .playlist-detail-header__content) {
  width: 100%;
  min-width: 0;
  transform: translate3d(0, 0, 0);
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-main-shell) {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
  min-height: 36px;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-title-shell) {
  min-width: 0;
  flex: 1 1 auto;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-title-shell .title) {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-meta-shell) {
  max-height: 0;
  opacity: 0;
  transform: translate3d(0, -10px, 0);
  pointer-events: none;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-actions-shell) {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-actions-shell .ops) {
  margin-top: 0;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .desc) {
  max-height: 0;
  opacity: 0;
  transform: translate3d(0, -8px, 0);
}

@media (max-width: 767px) {
  .user-tabs {
    gap: 10px;
  }

  .user-tab {
    min-width: auto;
    padding: 0 14px;
    height: 36px;
  }
}
</style>
