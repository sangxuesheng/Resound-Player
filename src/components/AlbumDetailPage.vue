<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="playlist-detail-page" :class="[detailPageClassName, embedded && 'playlist-detail-page--embedded']">
    <div v-if="!isSticky" class="playlist-detail-back">
      <button class="back-btn" @click="emit('back')">← {{ props.backLabel }}</button>
    </div>

    <DetailStickyHeroHeader
      :sticky="isSticky"
      :embedded="embedded"
      :loading="loading"
      :ready="!!album"
      :error="error"
      loading-text="专辑加载中…"
    >
      <template #media>
        <AnimatedAppear tag="img" variant="media" rhythm="body" class-name="cover" :src="album.picUrl" :alt="album.name" />
      </template>
      <template #title>
        <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="title">{{ album.name }}</AnimatedAppear>
      </template>
      <template #meta>
        <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="sub">
          <button v-if="album.artist?.id || album.artist?.name" type="button" class="artist-link artist-link--inline" @click="openAlbumArtistDetail">
            {{ album.artist?.name || '未知歌手' }}
          </button>
          <span v-else>未知歌手</span>
          <span class="sub-dot">·</span>
          歌曲总数：{{ songs.length }}
        </AnimatedAppear>
        <AnimatedAppear
          v-if="albumDescription"
          tag="div"
          variant="content"
          rhythm="body"
          class-name="desc-wrap"
        >
          <AnimatedAppear
            tag="p"
            variant="text"
            rhythm="body"
            class-name="desc"
            :class="{ 'desc--collapsed': !isDescriptionExpanded && shouldShowDescriptionToggle }"
          >
            {{ albumDescription }}
          </AnimatedAppear>
          <button
            v-if="shouldShowDescriptionToggle"
            type="button"
            class="desc-toggle"
            @click="isDescriptionExpanded = !isDescriptionExpanded"
          >
            {{ isDescriptionExpanded ? '收起' : '展开' }}
          </button>
        </AnimatedAppear>
      </template>
      <template #actions>
        <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="play-all" @click="playAll">播放全部</AnimatedAppear>
      </template>
    </DetailStickyHeroHeader>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="playlist-detail-body">
      <AnimatedAppear v-if="loading && !album" tag="div" variant="text" rhythm="body" class-name="state">专辑加载中…</AnimatedAppear>
      <AnimatedAppear v-else-if="error" tag="div" variant="text" rhythm="body" class-name="state error">{{ error }}</AnimatedAppear>
      <AnimatedAppear v-else-if="album" tag="ul" variant="content" rhythm="list" class-name="song-list">
        <AnimatedAppear
          v-for="(song, idx) in songs"
          :key="song.id"
          tag="li"
          variant="text"
          rhythm="list"
          :index="idx"
          class-name="song-item"
          :class="{ 'song-item--playing': isCurrentTrack(song) }"
          @dblclick="onSongItemDblClick($event, idx)"
        >
          <PlayPauseButton :song-id="Number(song.id || 0)" :index-label="idx + 1" @play="playOne(idx)" />
          <AnimatedAppear tag="img" variant="media" rhythm="list" :index="idx" class-name="song-cover" :src="song.al?.picUrl || album.picUrl" :alt="song.name" />
          <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="song-meta">
            <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="song-name">{{ song.name }}</AnimatedAppear>
            <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="song-artist">
              <button
                v-for="artist in getSongArtists(song)"
                :key="`${song.id}-${artist.id || artist.name}`"
                type="button"
                class="artist-link"
                @click="openArtistDetail(artist)"
              >
                {{ artist.name || '未知歌手' }}
              </button>
              <span v-if="!getSongArtists(song).length">未知歌手</span>
            </AnimatedAppear>
          </AnimatedAppear>
        </AnimatedAppear>
      </AnimatedAppear>
    </AnimatedAppear>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import DetailStickyHeroHeader from './DetailStickyHeroHeader.vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getAlbumDetail } from '../api/music';
import { playerStore } from '../stores/player';
import AnimatedAppear from './AnimatedAppear.vue';
import PlayPauseButton from './ui/PlayPauseButton.vue';

const DESC_COLLAPSE_THRESHOLD = 60;

const props = withDefaults(
  defineProps<{
    albumId: number;
    backLabel?: string;
    embedded?: boolean;
    scrollHostSelector?: string;
  }>(),
  {
    backLabel: '返回首页',
    embedded: false,
    scrollHostSelector: '.content',
  },
);

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'open-artist', artist: any): void;
}>();

const loading = ref(false);
const error = ref('');
const album = ref<any>(null);
const isDescriptionExpanded = ref(false);
const songs = computed<any[]>(() => album.value?.songs || []);
const albumDescription = computed(() => album.value?.description?.trim() || '');
const shouldShowDescriptionToggle = computed(() => albumDescription.value.length > DESC_COLLAPSE_THRESHOLD);
const isUserDetail = computed(() => props.backLabel === '返回用户中心');
const detailPageClassName = computed(() => {
  const classNames: string[] = [];
  if (isUserDetail.value) classNames.push('user-detail-panel');
  if (props.embedded) classNames.push('playlist-detail-page--embedded');
  return classNames.join(' ');
});
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

async function fetchDetail(id: number) {
  if (!id) return;
  loading.value = true;
  error.value = '';
  try {
    const { data } = await getAlbumDetail(id);
    const detail = data?.album;
    const list = data?.songs || [];
    if (!detail) {
      album.value = null;
      error.value = '专辑详情为空';
      return;
    }
    album.value = { ...detail, songs: list };
  } catch (e: any) {
    album.value = null;
    error.value = e?.message || '专辑详情加载失败';
  } finally {
    loading.value = false;
  }
}

function getSongArtists(song: any) {
  const artists = Array.isArray(song?.ar)
    ? song.ar
    : Array.isArray(song?.artists)
      ? song.artists
      : Array.isArray(song?.album?.artists)
        ? song.album.artists
        : [];
  return artists.filter((artist: any) => artist?.id || artist?.name);
}

function openArtistDetail(artist: any) {
  const artistId = Number(artist?.id || artist?.artistId || 0);
  if (!artistId) return;
  emit('open-artist', artist);
}

function openAlbumArtistDetail() {
  const artist = album.value?.artist;
  const artistId = Number(artist?.id || artist?.artistId || 0);
  if (!artistId) return;
  emit('open-artist', artist);
}

function isCurrentTrack(song: any) {
  return Number(song?.id) > 0 && Number(song?.id) === Number(playerStore.currentSongId || 0);
}

async function playAll() {
  if (!songs.value.length) return;
  playerStore.setPlaylist(songs.value, 0);
  await playerStore.playByIndex(0);
}

function onSongItemDblClick(event: MouseEvent, index: number) {
  const target = event.target as HTMLElement | null;
  if (target?.closest('button, a, input, select, textarea, [role="button"]')) return;
  void playOne(index);
}

async function playOne(index: number) {
  if (!songs.value.length) return;
  playerStore.setPlaylist(songs.value, index);
  await playerStore.playByIndex(index);
}

onMounted(() => {
  fetchDetail(props.albumId);
  scrollHost = getScrollHost();
  headerWrapEl = getHeaderWrapEl();
  updateStickyState();
  scrollHost?.addEventListener('scroll', onScroll, { passive: true });
});

onBeforeUnmount(() => {
  scrollHost?.removeEventListener('scroll', onScroll);
  cancelAnimationFrame(stickyRAF);
});

watch(() => props.albumId, (id) => {
  isDescriptionExpanded.value = false;
  fetchDetail(id);
  requestAnimationFrame(() => {
    headerWrapEl = getHeaderWrapEl();
    updateStickyState();
  });
});
</script>

<style scoped>
@import '../styles/detail-page.css';

.song-item--playing .song-cover {
  box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 18%, rgba(15, 23, 42, 0.18));
}

.user-detail-panel {
  border: 0;
  box-shadow: none;
  background:
    radial-gradient(1100px 520px at 50% 0%, rgba(254, 205, 56, 0.18) 0%, rgba(254, 205, 56, 0.08) 28%, rgba(254, 205, 56, 0) 62%),
    linear-gradient(180deg, rgba(255, 251, 242, 0.98) 0%, rgba(250, 247, 239, 0.96) 18%, rgba(245, 247, 250, 0.94) 52%, rgba(239, 242, 247, 0.92) 100%);
}

.user-detail-panel::before {
  opacity: 1;
  background:
    radial-gradient(circle at 50% 12%, rgba(255, 224, 138, 0.48) 0%, rgba(255, 224, 138, 0.18) 25%, rgba(255, 224, 138, 0) 58%),
    radial-gradient(circle at 18% 8%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0) 30%),
    radial-gradient(circle at 82% 16%, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0) 26%);
  background-position: center top;
  background-repeat: no-repeat;
  background-size: cover;
}

.user-detail-panel::after {
  background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.16) 20%, rgba(255,255,255,0.28) 42%, rgba(255,255,255,0.42) 68%, rgba(255,255,255,0) 100%);
}

.playlist-detail-page--embedded {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.playlist-detail-page--embedded::before,
.playlist-detail-page--embedded::after {
  content: none;
}

.playlist-detail-page--embedded .playlist-detail-header {
  padding-left: 0;
  padding-right: 0;
}

.playlist-detail-page--embedded.user-detail-panel .playlist-detail-header {
  grid-template-columns: 308px minmax(0, 1fr);
  justify-items: stretch;
  align-items: center;
  gap: var(--space-4);
}

.playlist-detail-page--embedded.user-detail-panel .meta {
  min-height: unset;
  display: grid;
  justify-items: start;
  align-content: center;
  gap: 12px;
  text-align: left;
  padding: 0;
  width: 100%;
}

.playlist-detail-page--embedded.user-detail-panel .sub-row {
  justify-content: flex-start;
}

.playlist-detail-page--embedded.user-detail-panel .cover,
.playlist-detail-page--embedded.user-detail-panel .creator-avatar,
.playlist-detail-page--embedded.user-detail-panel .play-all {
  box-shadow: none;
}

.playlist-detail-page--embedded .song-list {
  border-top: 0;
}

.playlist-detail-page--embedded .song-item {
  padding-left: 0;
  padding-right: 0;
}

.playlist-detail-body { }

.user-detail-panel .playlist-detail-header {
  grid-template-columns: 1fr;
  justify-items: center;
  align-items: start;
  gap: 16px;
}

.user-detail-panel .meta {
  min-height: unset;
  display: grid;
  justify-items: center;
  gap: 12px;
  padding-top: 0;
  width: 100%;
  text-align: center;
}

.user-detail-panel .title {
  margin: 0;
  font-size: 34px;
  line-height: 1.1;
  letter-spacing: 0.2px;
}

.user-detail-panel .sub-row {
  margin-top: 2px;
  justify-content: center;
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

.sub-dot { opacity: 0.6; }

.song-artist {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
}

.artist-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.artist-link--inline {
  display: inline;
}

.artist-link:hover,
.artist-link:focus-visible {
  color: var(--accent);
  text-decoration: underline;
}

.artist-link + .artist-link::before {
  content: '/';
  margin: 0 2px;
  color: var(--text-sub);
}

@media (max-width: 767px) { .playlist-detail-header__content .title { font-size: 30px; } }
</style>
