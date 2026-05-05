<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="artist-detail-page" :style="shellStyle">
    <div v-if="!isSticky" class="artist-detail-back">
      <button class="back-btn" @click="emit('back')">← {{ props.backLabel }}</button>
    </div>

    <DetailStickyHeroHeader
      :sticky="isSticky"
      :loading="loading"
      :ready="!!artist"
      :error="error"
      loading-text="歌手详情加载中…"
    >
      <template #media>
        <HeroCoverMedia :src="coverUrl" :alt="artist?.name || '歌手封面'" image-class="artist-cover" />
      </template>
      <template #title>
        <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="title">{{ artist?.name || '未命名歌手' }}</AnimatedAppear>
      </template>
      <template #meta>
        <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="sub-row artist-meta-row">
          <AnimatedAppear tag="span" variant="text" rhythm="body" class-name="meta-pill">{{ artistAreaText }}</AnimatedAppear>
          <AnimatedAppear tag="span" variant="text" rhythm="body" class-name="meta-pill">热门歌曲：{{ topSongs.length }}</AnimatedAppear>
          <AnimatedAppear tag="span" variant="text" rhythm="body" class-name="meta-pill">专辑：{{ albums.length }}</AnimatedAppear>
          <AnimatedAppear tag="span" variant="text" rhythm="body" class-name="meta-pill">MV：{{ mvs.length }}</AnimatedAppear>
        </AnimatedAppear>
        <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="desc-wrap">
          <AnimatedAppear
            tag="p"
            variant="text"
            rhythm="body"
            class-name="desc"
            :class="{ 'desc--collapsed': !isDescriptionExpanded && shouldShowDescriptionToggle }"
          >
            {{ artistDescriptionPreview }}
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
        <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="play-all" @click="playTopSongs">播放热门</AnimatedAppear>
      </template>
    </DetailStickyHeroHeader>

    <AnimatedAppear v-if="artist" tag="div" variant="content" rhythm="body" class-name="artist-tabs" role="tablist" aria-label="歌手详情标签">
      <AnimatedAppear
        v-for="tab in tabs"
        :key="tab.key"
        tag="button"
        variant="control"
        rhythm="actions"
        class-name="artist-tab"
        :class="{ active: activeTab === tab.key }"
        type="button"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </AnimatedAppear>
    </AnimatedAppear>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="artist-detail-body">
      <AnimatedAppear v-if="loading && !artist" tag="div" variant="text" rhythm="body" class-name="state">歌手详情加载中…</AnimatedAppear>
      <AnimatedAppear v-else-if="error" tag="div" variant="text" rhythm="body" class-name="state error">{{ error }}</AnimatedAppear>

      <template v-else-if="artist">
        <AnimatedAppear v-if="activeTab === 'songs'" tag="ul" variant="content" rhythm="list" class-name="song-list">
          <AnimatedAppear
            v-for="(song, idx) in topSongs"
            :key="song.id || idx"
            tag="li"
            variant="text"
            rhythm="list"
            :index="idx"
            class-name="song-item"
            :class="{ 'song-item--playing': isCurrentTrack(song) }"
            @dblclick="onSongItemDblClick($event, idx)"
          >
            <PlayPauseButton :song-id="Number(song?.id || 0)" :index-label="idx + 1" @play="playSong(idx)" />
            <AnimatedAppear tag="img" variant="media" rhythm="list" :index="idx" class-name="song-cover" :src="resolveSongCover(song) || coverUrl" :alt="song.name || '歌曲封面'" />
            <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="song-meta">
              <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="song-name">{{ song.name }}</AnimatedAppear>
              <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="song-artist">
                <button
                  v-for="artistItem in getSongArtists(song)"
                  :key="`${song.id}-${artistItem.id || artistItem.name}`"
                  type="button"
                  class="artist-link"
                  @click.stop="openArtistDetail(artistItem)"
                >
                  {{ artistItem.name || '未知歌手' }}
                </button>
                <span v-if="!getSongArtists(song).length">{{ resolveSongSubtitle(song) }}</span>
              </AnimatedAppear>
            </AnimatedAppear>
            <SongActions :song="song" @play-next="playNext" @add-to-playlist="showAddToPlaylist" @open-comment="openComment" @open-album="(albumId) => emit('open-album-detail', albumId)" @open-artist="openArtistDetail" @open-language="openLanguageDetail" @open-mv-player="(mv) => emit('open-mv-player', mv)" />
          </AnimatedAppear>
        </AnimatedAppear>

        <AnimatedAppear v-else-if="activeTab === 'albums'" tag="div" variant="content" rhythm="list" class-name="album-grid">
          <AnimatedAppear v-for="(album, idx) in albums" :key="album.id || idx" tag="button" variant="content" rhythm="list" :index="idx" class-name="entity-card album-card" type="button" @click="emit('open-album-detail', Number(album.id || 0), activeTab)">
            <img v-if="resolveAlbumCover(album)" class="entity-cover cover-image" :src="resolveAlbumCover(album)" :alt="album.name || '专辑封面'" loading="lazy" />
            <div v-else class="entity-cover album-fallback">AL</div>
            <div class="entity-main">
              <div class="entity-name">{{ album.name || '未命名专辑' }}</div>
              <div class="entity-sub">
                <button
                  v-for="artistItem in getAlbumArtists(album)"
                  :key="`${album.id || idx}-${artistItem.id || artistItem.name}`"
                  type="button"
                  class="artist-link"
                  @click.stop="openArtistDetail(artistItem)"
                >
                  {{ artistItem.name || '未知歌手' }}
                </button>
                <span v-if="!getAlbumArtists(album).length">{{ resolveAlbumSubtitle(album) }}</span>
              </div>
              <div class="entity-sub entity-date">{{ formatAlbumReleaseDate(album) }}</div>
            </div>
          </AnimatedAppear>
        </AnimatedAppear>

        <AnimatedAppear v-else-if="activeTab === 'mvs'" tag="div" variant="content" rhythm="list" class-name="mv-grid">
          <AnimatedAppear v-for="(mv, idx) in mvs" :key="mv.id || mv.vid || idx" tag="button" variant="content" rhythm="list" :index="idx" class-name="mv-card" type="button" @click="emit('open-mv-player', mv)">
            <MvHoverPoster
              :src="resolveMvCover(mv)"
              :alt="mv.name || 'MV 封面'"
              :count="mv.playCount || mv.playTime || 0"
              fallback-class="mv-cover-fallback"
            />
            <div class="mv-info">
              <div class="entity-name">{{ mv.name || '未命名 MV' }}</div>
              <div class="entity-sub">
                <button
                  v-for="artistItem in getMvArtists(mv)"
                  :key="`${mv.id || mv.vid || idx}-${artistItem.id || artistItem.name}`"
                  type="button"
                  class="artist-link"
                  @click.stop="openArtistDetail(artistItem)"
                >
                  {{ artistItem.name || '未知歌手' }}
                </button>
                <span v-if="!getMvArtists(mv).length">{{ mv.publishTime || mv.artistName || artist?.name || 'MV' }}</span>
              </div>
            </div>
          </AnimatedAppear>
        </AnimatedAppear>

        <AnimatedAppear v-else tag="div" variant="content" rhythm="body" class-name="bio-panel">
          <AnimatedAppear v-for="(block, idx) in bioBlocks" :key="`${block.title}-${idx}`" tag="section" variant="content" rhythm="list" :index="idx" class-name="bio-block">
            <AnimatedAppear tag="h3" variant="title" rhythm="title" class-name="bio-title">{{ block.title }}</AnimatedAppear>
            <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="bio-text">{{ block.text }}</AnimatedAppear>
          </AnimatedAppear>
        </AnimatedAppear>
      </template>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDominantColor } from '../composables/useDominantColor';
import DetailStickyHeroHeader from './DetailStickyHeroHeader.vue';
import HeroCoverMedia from './HeroCoverMedia.vue';
import AnimatedAppear from './AnimatedAppear.vue';
import PlayPauseButton from './ui/PlayPauseButton.vue';
import MvHoverPoster from './MvHoverPoster.vue';
import SongActions from './ui/SongActions.vue';
import { getArtistAlbums, getArtistDescription, getArtistDetail, getArtistMvs, getArtistTopSongs, getUserPlaylist, addTrackToPlaylist } from '../api/music';
import { resolveArtistImageUrl, normalizeImageUrl } from '../utils/image';
import { playerStore } from '../stores/player';
import { userStore } from '../stores/user';
import { useAuthAction } from '../composables/useAuthAction';

const DESC_COLLAPSE_THRESHOLD = 60;

const props = withDefaults(
  defineProps<{
    artistId: number;
    backLabel?: string;
    scrollHostSelector?: string;
    initialTab?: string;
  }>(),
  {
    backLabel: '返回搜索结果',
    scrollHostSelector: '.content',
    initialTab: 'songs',
  },
);

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'open-album-detail', albumId: number, activeTab?: string): void;
  (e: 'open-artist', artist: any): void;
  (e: 'open-mv-player', item: any): void;
  (e: 'open-comment', songId: number): void;
  (e: 'update:active-tab', tab: string): void;
  (e: 'open-language', language: string): void;
}>();

const loading = ref(false);
const error = ref('');
const artist = ref<any>(null);
const topSongs = ref<any[]>([]);
const albums = ref<any[]>([]);
const mvs = ref<any[]>([]);
const bio = ref<any>(null);
const isDescriptionExpanded = ref(false);
const activeTab = computed({
  get: () => (props.initialTab || 'songs') as 'songs' | 'albums' | 'mvs' | 'bio',
  set: (v) => emit('update:active-tab', v),
});
const tabs = [
  { key: 'songs', label: '热门歌曲' },
  { key: 'albums', label: '专辑' },
  { key: 'mvs', label: 'MV' },
  { key: 'bio', label: '简介' },
] as const;

const coverUrl = computed(() => resolveArtistImageUrl(artist.value));
useDominantColor(coverUrl);
const shellStyle = computed<Record<string, string>>(() => {
  return coverUrl.value ? { '--cover-bg': `url("${coverUrl.value}")` } : {};
});
const artistAreaText = computed(() => artist.value?.area ? `地区：${artist.value.area}` : '歌手详情');
const artistDescriptionPreview = computed(() => {
  const brief = bio.value?.briefDesc || artist.value?.briefDesc || '';
  const firstBlock = Array.isArray(bio.value?.introduction) ? bio.value.introduction[0]?.txt || '' : '';
  return (brief || firstBlock || '这里将展示歌手简介、代表作品与创作风格。').trim();
});
const shouldShowDescriptionToggle = computed(() => artistDescriptionPreview.value.length > DESC_COLLAPSE_THRESHOLD);
const bioBlocks = computed(() => {
  const introList = Array.isArray(bio.value?.introduction) ? bio.value.introduction : [];
  const normalized = introList
    .map((item: any) => ({ title: item?.ti || '简介', text: item?.txt || '' }))
    .filter((item: any) => item.text);

  if (normalized.length) return normalized;
  return [{ title: '简介', text: artistDescriptionPreview.value }];
});

function resolveSongCover(song: any) {
  return normalizeImageUrl(song?.al?.picUrl || song?.album?.picUrl || song?.album?.blurPicUrl || song?.picUrl || '');
}

function getSongArtists(song: any) {
  const artists = Array.isArray(song?.ar)
    ? song.ar
    : Array.isArray(song?.artists)
      ? song.artists
      : Array.isArray(song?.album?.artists)
        ? song.album.artists
        : [];
  return artists.filter((artistItem: any) => artistItem?.id || artistItem?.name);
}

function resolveSongSubtitle(song: any) {
  return song?.ar?.map((item: any) => item.name).join('/') || song?.artists?.map((item: any) => item.name).join('/') || song?.al?.name || '未知歌曲';
}

function getAlbumArtists(album: any) {
  const artists = Array.isArray(album?.artists)
    ? album.artists
    : album?.artist
      ? [album.artist]
      : [];
  return artists.filter((artistItem: any) => artistItem?.id || artistItem?.name);
}

function resolveAlbumCover(album: any) {
  return normalizeImageUrl(album?.picUrl || album?.blurPicUrl || album?.coverImgUrl || album?.artist?.img1v1Url || '');
}

function resolveAlbumSubtitle(album: any) {
  return album?.publishTime || album?.artist?.name || album?.size ? `${album?.artist?.name || artist.value?.name || '歌手'} · ${album?.size || 0} 首` : artist.value?.name || '专辑';
}

function formatAlbumReleaseDate(album: any) {
  const rawValue = album?.publishTime ?? album?.publishDate ?? album?.publish_date ?? album?.releaseDate;
  if (rawValue === undefined || rawValue === null || rawValue === '') return '发行日期：未知';

  if (typeof rawValue === 'string') {
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(rawValue)) {
      return `发行日期：${rawValue.replace(/\//g, '-').replace(/\./g, '-')}`;
    }
    if (/^\d{8}$/.test(rawValue)) {
      return `发行日期：${rawValue.slice(0, 4)}-${rawValue.slice(4, 6)}-${rawValue.slice(6, 8)}`;
    }
  }

  const timestamp = Number(rawValue);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '发行日期：未知';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '发行日期：未知';

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `发行日期：${year}-${month}-${day}`;
}

function getMvArtists(item: any) {
  const artists = Array.isArray(item?.artists)
    ? item.artists
    : item?.artist
      ? [item.artist]
      : item?.artistName
        ? [{ id: item.artistId || 0, name: item.artistName }]
        : artist.value
          ? [{ id: artist.value.id || 0, name: artist.value.name || '' }]
          : [];
  return artists.filter((artistItem: any) => artistItem?.id || artistItem?.name);
}

function resolveMvCover(item: any) {
  return normalizeImageUrl(item?.imgurl16v9 || item?.cover || item?.picUrl || item?.coverImgUrl || '');
}

function openArtistDetail(artistItem: any) {
  const artistId = Number(artistItem?.id || artistItem?.artistId || 0);
  if (!artistId) return;
  emit('open-artist', artistItem);
}

function openLanguageDetail(language: string) {
  if (!language) return;
  emit('open-language', language);
}

let fetchToken = 0;

async function fetchArtistDetail(id: number) {
  if (!id) return;
  const currentToken = ++fetchToken;
  loading.value = true;
  error.value = '';

  try {
    const [detailRes, topSongsRes, albumsRes, mvsRes, descRes] = await Promise.all([
      getArtistDetail(id),
      getArtistTopSongs(id),
      getArtistAlbums(id),
      getArtistMvs(id),
      getArtistDescription(id),
    ]);

    if (currentToken !== fetchToken) return;

    const detailData = detailRes?.data || detailRes;
    artist.value = detailData?.data?.artist || detailData?.artist || detailData?.data || null;

    const topSongsData = topSongsRes?.data || topSongsRes;
    topSongs.value = Array.isArray(topSongsData?.songs) ? topSongsData.songs : Array.isArray(topSongsData?.hotSongs) ? topSongsData.hotSongs : [];

    const albumsData = albumsRes?.data || albumsRes;
    albums.value = Array.isArray(albumsData?.hotAlbums) ? albumsData.hotAlbums : Array.isArray(albumsData?.artist?.album) ? albumsData.artist.album : Array.isArray(albumsData?.albums) ? albumsData.albums : [];

    const mvsData = mvsRes?.data || mvsRes;
    mvs.value = Array.isArray(mvsData?.mvs) ? mvsData.mvs : [];

    const descData = descRes?.data || descRes;
    bio.value = descData;
  } catch (e: any) {
    if (currentToken !== fetchToken) return;
    error.value = e?.message || '歌手详情加载失败';
    artist.value = null;
    topSongs.value = [];
    albums.value = [];
    mvs.value = [];
    bio.value = null;
  } finally {
    if (currentToken === fetchToken) {
      loading.value = false;
    }
  }
}

async function playTopSongs() {
  if (!topSongs.value.length) return;
  playerStore.setPlaylist(topSongs.value, 0);
  await playerStore.playByIndex(0);
}

function isCurrentTrack(song: any) {
  return Number(song?.id) > 0 && Number(song?.id) === Number(playerStore.currentSongId || 0);
}

function onSongItemDblClick(event: MouseEvent, index: number) {
  const target = event.target as HTMLElement | null;
  if (target?.closest('button, a, input, select, textarea, [role="button"]')) return;
  void playSong(index);
}

async function playSong(index: number) {
  if (!topSongs.value.length) return;
  playerStore.setPlaylist(topSongs.value, index);
  await playerStore.playByIndex(index);
}

/* 操作按钮 */
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
  } catch { playlistPickerList.value = []; }
  selectedPlaylistId.value = null;
  showPlaylistPicker.value = true;
}
async function confirmAddToPlaylist() {
  const pid = selectedPlaylistId.value;
  const song = pickerTargetSong.value;
  if (!pid || !song) return;
  try {
    await addTrackToPlaylist(pid, [Number(song.id || 0)], userStore.loginCookie || undefined);
  } catch {}
  showPlaylistPicker.value = false;
}
function openComment(songId: number) {
  emit('open-comment', songId);
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
  fetchArtistDetail(props.artistId);
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
  () => props.artistId,
  (id) => {
    activeTab.value = 'songs';
    isDescriptionExpanded.value = false;
    fetchArtistDetail(Number(id));
    requestAnimationFrame(() => {
      headerWrapEl = getHeaderWrapEl();
      updateStickyState();
    });
  },
);
</script>

<style scoped>
@import '../styles/detail-page.css';

.artist-detail-page {
  min-height: 100%;
}

.artist-detail-back {
  display: block;
}

.artist-cover {
  background: linear-gradient(135deg, #fb923c, #f97316 42%, #7c3aed 100%);
}

.artist-meta-row {
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

.artist-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 18px 0 20px;
}

.artist-tab {
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

.artist-tab:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 32%, var(--border));
  box-shadow: 0 12px 22px color-mix(in srgb, var(--accent) 10%, transparent);
}

.artist-tab.active {
  background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 90%, #fff), color-mix(in srgb, var(--accent) 68%, #000));
  color: #fff;
  border-color: color-mix(in srgb, var(--accent) 70%, var(--border));
}

.artist-detail-body {
  min-height: 320px;
}

.album-grid,
.mv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.entity-card,
.mv-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
  background: color-mix(in srgb, var(--bg-surface) 90%, transparent);
  text-align: left;
  cursor: pointer;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}

.entity-card:hover,
.mv-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 34%, var(--border));
  box-shadow: 0 16px 28px rgba(15, 23, 42, 0.1);
}

.entity-cover,
.album-fallback {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  object-fit: cover;
  display: block;
  background: var(--bg-muted);
}

.album-fallback {
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(135deg, #f97316, #ef4444);
}

.entity-main,
.mv-info {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.entity-name {
  color: var(--text-main);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entity-sub,
.bio-text {
  color: var(--text-sub);
  font-size: 13px;
  line-height: 1.6;
}

.song-artist,
.entity-sub {
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

.entity-date {
  font-size: 12px;
  opacity: 0.88;
}

.mv-cover-fallback {
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
}

.bio-panel {
  display: grid;
  gap: 16px;
}

.bio-block {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
}

.bio-title {
  margin: 0 0 10px;
  font-size: 18px;
  color: var(--text-main);
}

.bio-text {
  margin: 0;
  white-space: pre-wrap;
}

:deep(.playlist-detail-header) {
  --hero-media-width: 308px;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-3);
  align-items: center;
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
:deep(.playlist-detail-header-wrap .sub-row),
:deep(.playlist-detail-header-wrap .sub),
:deep(.playlist-detail-header-wrap .desc),
:deep(.playlist-detail-header-wrap .play-all),
:deep(.playlist-detail-header-wrap .artist-meta-row),
:deep(.playlist-detail-header-wrap .artist-tabs),
:deep(.playlist-detail-header-wrap .meta-pill),
:deep(.playlist-detail-header-wrap .artist-tab) {
  transition:
    opacity 0.42s ease,
    transform 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    width 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    height 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    max-width 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    max-height 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    margin 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    padding 0.56s cubic-bezier(0.2, 0.9, 0.22, 1);
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
  width: 308px;
  height: 308px;
  border-radius: 18px;
  transform: translate3d(0, 0, 0) scale(1);
  transform-origin: left center;
  filter: saturate(1) blur(0);
}

:deep(.playlist-detail-header-wrap .playlist-detail-header__content) {
  min-width: 0;
  width: 100%;
  transform: translate3d(0, 0, 0);
}

:deep(.playlist-detail-header-wrap .hero-main-shell) {
  min-width: 0;
}

:deep(.playlist-detail-header-wrap .hero-title-shell) {
  min-width: 0;
  max-width: 100%;
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
  width: 100%;
  min-height: 36px;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-title-shell) {
  flex: 1;
  min-width: 0;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-title-shell .title) {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: 0;
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
  .artist-tabs {
    gap: 10px;
  }

  .artist-tab {
    min-width: auto;
    padding: 0 14px;
    height: 36px;
  }

  .album-grid,
  .mv-grid {
    grid-template-columns: 1fr;
  }
}
/* 操作按钮 */
.song-item { position: relative; }
:deep(.song-actions) { opacity: 0; visibility: hidden; position: absolute; right: 8px; top: 50%; transform: translateY(-50%); align-items: center; gap: 4px; transition: opacity 0.2s ease, visibility 0.2s ease; }
.song-item:hover :deep(.song-actions) { opacity: 1; visibility: visible; }
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
