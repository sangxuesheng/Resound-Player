<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="playlist-detail-page" :class="[detailPageClassName, embedded && 'playlist-detail-page--embedded']" :style="shellStyle">
    <div v-if="!isSticky && !embedded" class="playlist-detail-back">
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
        <HeroCoverMedia :src="album.picUrl" :alt="album.name" />
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
          <SongActions :song="song" @play-next="playNext" @add-to-playlist="showAddToPlaylist" @open-comment="openComment" @open-album="openAlbum" @open-artist="openArtistDetail" @open-language="openLanguageDetail" @open-mv-player="(mv) => emit('open-mv-player', mv)" />
        </AnimatedAppear>
      </AnimatedAppear>
    </AnimatedAppear>
  </AnimatedAppear>
  <!-- 收藏至歌单选择器 -->
  <Teleport to="body">
    <div v-if="showPlaylistPicker" class="pp-mask" @click.self="showPlaylistPicker = false">
      <div class="pp-popup">
        <h3 class="pp-title">添加至歌单</h3>
        <ul class="pp-list">
          <li v-for="p in playlistPickerList" :key="p.id" class="pp-item" :class="{ 'pp-item--selected': selectedPlaylistId === p.id }" @click="selectedPlaylistId = p.id">
            <img v-if="p.coverImgUrl" class="pp-cover" :src="p.coverImgUrl + '?param=40y40'" alt="" loading="lazy" />
            <span class="pp-name">{{ p.name }}</span>
          </li>
          <li v-if="!playlistPickerList.length" class="pp-empty">暂无可用歌单</li>
        </ul>
        <div class="pp-actions">
          <button class="pp-close" @click="showPlaylistPicker = false">取消</button>
          <button class="pp-confirm" :disabled="!selectedPlaylistId" @click="confirmAddToPlaylist()">确认添加</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import HeroCoverMedia from './HeroCoverMedia.vue';
import DetailStickyHeroHeader from './DetailStickyHeroHeader.vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDominantColor } from '../composables/useDominantColor';
import { playerStore } from '../stores/player';
import { recordLocalHistoryEntry } from '../utils/localHistory';
import AnimatedAppear from './AnimatedAppear.vue';
import PlayPauseButton from './ui/PlayPauseButton.vue';
import SongActions from './ui/SongActions.vue';
import { userStore } from '../stores/user';
import { useAuthAction } from '../composables/useAuthAction';
import { getAlbumDetail, addTrackToPlaylist, getUserPlaylist } from '../api/music';

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
  (e: 'open-comment', songId: number): void;
  (e: 'open-album', albumId: number): void;
  (e: 'open-language', language: string): void;
  (e: 'open-mv-player', mv: any): void;
}>();

const loading = ref(false);
const error = ref('');
const album = ref<any>(null);
const isDescriptionExpanded = ref(false);
const songs = computed<any[]>(() => album.value?.songs || []);
const coverUrl = computed(() => album.value?.picUrl || '');
useDominantColor(coverUrl);
const albumDescription = computed(() => album.value?.description?.trim() || '');
const shouldShowDescriptionToggle = computed(() => albumDescription.value.length > DESC_COLLAPSE_THRESHOLD);
const isUserDetail = computed(() => props.backLabel === '返回用户中心');
const shellStyle = computed<Record<string, string>>(() => {
  const coverUrl = album.value?.picUrl?.trim();
  return coverUrl ? { '--cover-bg': `url("${coverUrl}")` } : {};
});
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

function openLanguageDetail(language: string) {
  if (!language) return;
  emit('open-language', language);
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

function buildLocalAlbumHistoryEntry() {
  const current = album.value;
  const albumId = Number(props.albumId || current?.id || 0);
  return {
    key: `album-${albumId || current?.name || 'current'}`,
    title: current?.name || '未命名专辑',
    subtitle: `${songs.value.length || current?.size || 0} 首 · ${current?.artist?.name || '未知歌手'}`,
    source: 'local_play_history',
    sourceTip: '当前设备本地播放记录',
    summary: current?.description || '当前设备播放过的专辑。',
    typeLabel: '专辑历史',
    countLabel: '0',
    updatedAt: String(Date.now()),
    playableLabel: '专辑播放',
    playActionTip: '从本地历史恢复专辑详情。',
    coverUrl: current?.picUrl || current?.blurPicUrl || '',
    playableItem: { ...current, id: albumId || current?.id },
    manageType: 'album' as const,
    canUnlike: false,
    canOpenDetail: Boolean(albumId),
    sortKey: Date.now(),
  };
}

function recordAlbumLocalHistory() {
  if (!album.value) return;
  recordLocalHistoryEntry(buildLocalAlbumHistoryEntry());
}

async function playAll() {
  if (!songs.value.length) return;
  recordAlbumLocalHistory();
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
  recordAlbumLocalHistory();
  playerStore.setPlaylist(songs.value, index);
  await playerStore.playByIndex(index);
}

const { checkAuth, showToast } = useAuthAction(
  '搜索用户方式登录不支持收藏功能，请使用扫码或 Cookie 登录',
  'playlist',
);
const showPlaylistPicker = ref(false);
const playlistPickerList = ref<any[]>([]);
const pickerTargetSong = ref<any>(null);
const selectedPlaylistId = ref<number | null>(null);

function playNext(song: any) {
  const idx = playerStore.currentIndex + 1;
  playerStore.playlist.splice(idx, 0, { ...song });
  showToast('已添加至播放列表', 'success', 3000);
}
async function showAddToPlaylist(song: any) {
  if (!checkAuth()) return;
  pickerTargetSong.value = song;
  try {
    const res = await getUserPlaylist(userStore.profile?.userId || 0, userStore.loginCookie || undefined);
    playlistPickerList.value = (res.data?.playlist || []).filter((p: any) => !p.subscribed);
  } catch {
    playlistPickerList.value = [];
  }
  selectedPlaylistId.value = null;
  showPlaylistPicker.value = true;
}
async function confirmAddToPlaylist() {
  const pid = selectedPlaylistId.value;
  const song = pickerTargetSong.value;
  if (!pid || !song) return;
  try {
    await addTrackToPlaylist(pid, [Number(song.id || 0)], userStore.loginCookie || undefined);
    showToast('已添加至歌单', 'success', 3000);
  } catch {
    showToast('添加失败，请重试', 'error', 3000);
  }
  showPlaylistPicker.value = false;
}
function openComment(songId: number) {
  emit('open-comment', songId);
}
function openAlbum(albumId: number) {
  emit('open-album', albumId);
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

/* 操作按钮：默认隐藏，hover 时显示 */
.song-item { position: relative; }
.song-actions { opacity: 0; visibility: hidden; position: absolute; right: 8px; top: 50%; transform: translateY(-50%); align-items: center; gap: 4px; transition: opacity 0.2s ease, visibility 0.2s ease; }
.song-item:hover .song-actions { opacity: 1; visibility: visible; }

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
/* 歌单选择器 */
.pp-mask { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.45); display: grid; place-items: center; }
.pp-popup { width: min(380px, calc(100vw - 40px)); max-height: 60vh; background: var(--bg-solid); border-radius: 16px; padding: var(--space-3); display: grid; grid-template-rows: auto 1fr auto; gap: var(--space-2); box-shadow: 0 16px 48px rgba(0,0,0,0.5); }
.pp-title { margin: 0; color: var(--text-main); font-size: 15px; font-weight: 700; padding: var(--space-1) var(--space-2); }
.pp-list { overflow-y: auto; display: grid; gap: 2px; list-style: none; margin: 0; padding: 0; scrollbar-width: none; -ms-overflow-style: none; }
.pp-list::-webkit-scrollbar { display: none; }
.pp-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: 8px; cursor: pointer; font-size: 13px; transition: background 0.12s ease; }
.pp-item:hover { background: color-mix(in srgb, var(--accent) 6%, var(--bg-solid)); }
.pp-cover { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; flex-shrink: 0; background: rgba(255,255,255,0.06); }
.pp-name { color: var(--text-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pp-empty { padding: var(--space-4); text-align: center; color: var(--text-soft); font-size: 13px; }
.pp-close { padding: 8px; border: none; border-radius: 10px; background: color-mix(in srgb, var(--accent) 6%, var(--bg-solid)); color: var(--text-sub); cursor: pointer; font-size: 13px; }
.pp-close:hover { background: color-mix(in srgb, var(--accent) 10%, var(--bg-solid)); color: var(--text-main); }
.pp-actions { display: flex; gap: var(--space-2); }
.pp-actions > * { flex: 1; }
.pp-confirm { flex: 1; padding: 8px; border: none; border-radius: 10px; background: var(--accent, #5c6bc0); color: #fff; cursor: pointer; font-size: 13px; font-weight: 600; transition: opacity 0.15s ease; }
.pp-confirm:disabled { opacity: 0.35; cursor: default; }
.pp-confirm:not(:disabled):hover { opacity: 0.85; }
.pp-item--selected { background: color-mix(in srgb, var(--accent) 18%, var(--bg-solid)); }
.pp-item--selected .pp-name { color: var(--text-main); }
</style>
