<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="playlist-detail-page" :class="[detailPageClassName, embedded && 'playlist-detail-page--embedded']" :style="shellStyle">
    <div v-if="!isSticky && !isUserDetail" class="playlist-detail-back">
      <button class="back-btn" @click="emit('back')">← {{ props.backLabel }}</button>
    </div>

    <DetailStickyHeroHeader
      :sticky="isSticky"
      :embedded="embedded"
      :loading="detailLoading"
      :ready="!!playlist"
      :error="error"
      loading-text="歌单加载中…"
    >
      <template #media>
        <HeroCoverMedia :src="playlist.coverImgUrl" :alt="playlist.name" />
      </template>
      <template #title>
        <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="title">{{ playlist.name }}</AnimatedAppear>
      </template>
      <template #meta>
        <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="sub-row">
          <AnimatedAppear
            v-if="playlist.creator?.avatarUrl"
            tag="img"
            variant="media"
            rhythm="body"
            class-name="creator-avatar"
            :src="playlist.creator.avatarUrl"
            :alt="playlist.creator?.nickname || '用户头像'"
          />
          <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="sub">
            {{ playlist.creator?.nickname || '未知用户' }}
            <span class="sub-dot">·</span>
            歌曲总数：{{ playlist.trackCount || tracks.length }}
          </AnimatedAppear>
        </AnimatedAppear>
        <AnimatedAppear
          v-if="playlistDescription"
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
            {{ playlistDescription }}
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
        <DropdownSelect
          v-if="showDailyHistoryDropdown"
          class="history-dropdown"
          :model-value="historySelectedLabel"
          :options="historySelectOptions"
          :placeholder="historyButtonLabel"
          :option-colors="{}"
          @update:modelValue="onHistorySelect"
        />
        <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="play-all" @click="playAll">播放全部</AnimatedAppear>
        <AnimatedAppear v-if="trackEnriching" tag="span" variant="text" rhythm="actions" class-name="track-loading-tip">歌曲列表补全中…</AnimatedAppear>
      </template>
    </DetailStickyHeroHeader>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="playlist-detail-body">
      <AnimatedAppear v-if="detailLoading && !playlist" tag="div" variant="text" rhythm="body" class-name="state">歌单加载中…</AnimatedAppear>
      <AnimatedAppear v-else-if="error" tag="div" variant="text" rhythm="body" class-name="state error">{{ error }}</AnimatedAppear>
      <AnimatedAppear v-else-if="playlist" tag="ul" variant="content" rhythm="list" class-name="song-list">
        <AnimatedAppear
          v-for="(song, idx) in tracks"
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
          <AnimatedAppear tag="img" variant="media" rhythm="list" :index="idx" class-name="song-cover" :src="song.al?.picUrl || playlist.coverImgUrl" :alt="song.name" />
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
          <div class="song-actions">
            <button class="sa-btn" :class="{ liked: isLiked(song.id) }" title="收藏" @click.stop="toggleLike(song)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </button>
            <button class="sa-btn" title="下一首播放" @click.stop="playNext(song)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>
            </button>
            <button class="sa-btn" title="收藏至歌单" @click.stop="showAddToPlaylist(song)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            </button>
            <button class="sa-btn" title="查看评论" @click.stop="openComment(song.id)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
          </div>
        </AnimatedAppear>
      </AnimatedAppear>
    </AnimatedAppear>
    <!-- 收藏至歌单选择器 -->
    <Teleport to="body">
      <div v-if="showPlaylistPicker" class="pp-mask" @click.self="showPlaylistPicker = false">
        <div class="pp-popup">
          <h3 class="pp-title">选择歌单</h3>
          <ul class="pp-list">
            <li v-for="p in playlistPickerList" :key="p.id" class="pp-item" @click="confirmAddToPlaylist(p.id)">{{ p.name }}</li>
            <li v-if="!playlistPickerList.length" class="pp-empty">暂无可用歌单</li>
          </ul>
          <button class="pp-close" @click="showPlaylistPicker = false">取消</button>
        </div>
      </div>
    </Teleport>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import HeroCoverMedia from './HeroCoverMedia.vue';
import DetailStickyHeroHeader from './DetailStickyHeroHeader.vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getHistoryRecommendSongDates, getHistoryRecommendSongDetail, getPlaylistDetail, getPlaylistTrackAll, getSongDetailBatch, getRecommendSongs, toggleSongLike, getUserPlaylist, addTrackToPlaylist } from '../api/music';
import { playerStore } from '../stores/player';
import { userStore } from '../stores/user';
import { recordLocalHistoryEntry } from '../utils/localHistory';
import { showLoginModal } from '../stores/loginModal';
import AnimatedAppear from './AnimatedAppear.vue';
import PlayPauseButton from './ui/PlayPauseButton.vue';
import DropdownSelect from './ui/DropdownSelect.vue';

const DESC_COLLAPSE_THRESHOLD = 60;

const props = withDefaults(
  defineProps<{
    playlistId: number;
    backLabel?: string;
    embedded?: boolean;
    injectedPlaylist?: {
      name?: string;
      coverImgUrl?: string;
      description?: string;
      creator?: { nickname?: string; avatarUrl?: string };
      trackCount?: number;
      tracks?: any[];
    } | null;
    scrollHostSelector?: string;
  }>(),
  {
    backLabel: '返回歌单分类',
    embedded: false,
    injectedPlaylist: null,
    scrollHostSelector: '.content',
  },
);

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'open-artist', artist: any): void;
  (e: 'open-comment', songId: number): void;
}>();

const detailLoading = ref(false);
const trackEnriching = ref(false);
const error = ref('');
const playlist = ref<any>(null);
const isDescriptionExpanded = ref(false);
const historyDates = ref<Array<{ value: string; label: string }>>([]);
const selectedHistoryDate = ref('');
const historyLoading = ref(false);

const tracks = computed<any[]>(() => playlist.value?.tracks || []);
const playlistDescription = computed(() => playlist.value?.description?.trim() || '');
const shouldShowDescriptionToggle = computed(() => playlistDescription.value.length > DESC_COLLAPSE_THRESHOLD);
const injectedPlaylist = computed(() => props.injectedPlaylist || null);
const isInjectedDailyRecommend = computed(() => injectedPlaylist.value?.name === '每日推荐');
const isUserDetail = computed(() => props.backLabel === '返回用户中心');
const historyButtonLabel = computed(() => (historyLoading.value ? '历史日推加载中…' : '历史日推'));
const historySelectOptions = computed(() => ['返回今日推荐', ...historyDates.value.map((item) => item.label)]);
const historySelectedLabel = computed(() => {
  if (!selectedHistoryDate.value) return historyButtonLabel.value;
  return historyDates.value.find((item) => item.value === selectedHistoryDate.value)?.label || historyButtonLabel.value;
});
const showDailyHistoryDropdown = computed(() => isInjectedDailyRecommend.value && userStore.isLogin && historyDates.value.length > 0);
const detailPageClassName = computed(() => {  
  const classNames: string[] = [];
  if (props.backLabel === '返回排行榜') classNames.push('rank-detail-panel');
  if (isUserDetail.value) classNames.push('user-detail-panel');
  if (props.embedded) classNames.push('playlist-detail-page--embedded');
  return classNames.join(' ');
});
const shellStyle = computed<Record<string, string>>(() => {
  const coverUrl = playlist.value?.coverImgUrl?.trim();
  return coverUrl ? { '--cover-bg': `url("${coverUrl}")` } : {};
});

function resolvePlaylistCover(playlistLike: any) {
  const firstTrack = Array.isArray(playlistLike?.tracks) ? playlistLike.tracks[0] : null;
  const firstTrackCover = firstTrack?.al?.picUrl || firstTrack?.album?.picUrl || '';

  if (playlistLike?.name === '私人雷达') {
    return firstTrackCover || '';
  }

  return playlistLike?.coverImgUrl || playlistLike?.coverUrl || firstTrackCover || '';
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

let fetchToken = 0;

async function fetchDetail(id: number) {
  if (injectedPlaylist.value) {
    playlist.value = {
      name: injectedPlaylist.value.name || '每日推荐',
      coverImgUrl: injectedPlaylist.value.coverImgUrl || '',
      description: injectedPlaylist.value.description || '根据你的音乐口味生成，每天更新',
      creator: injectedPlaylist.value.creator || { nickname: '每日推荐' },
      trackCount: injectedPlaylist.value.trackCount || injectedPlaylist.value.tracks?.length || 0,
      tracks: Array.isArray(injectedPlaylist.value.tracks) ? injectedPlaylist.value.tracks : [],
    };
    detailLoading.value = false;
    trackEnriching.value = false;
    error.value = '';
    return;
  }

  if (!id) return;

  const currentToken = ++fetchToken;
  detailLoading.value = true;
  trackEnriching.value = false;
  error.value = '';

  try {
    const { data } = await getPlaylistDetail(id, 30);
    if (currentToken !== fetchToken) return;

    const detail = data?.playlist || null;
    if (!detail) {
      playlist.value = null;
      return;
    }

    const rawTracks = Array.isArray(detail.tracks) ? detail.tracks : [];
    const trackIds = Array.isArray(detail.trackIds) ? detail.trackIds.map((x: any) => Number(x?.id)).filter(Boolean) : [];

    // 先把已有数据渲染出来，避免用户长时间看到空白
    playlist.value = {
      ...detail,
      coverImgUrl: resolvePlaylistCover(detail),
      tracks: rawTracks,
    };
    detailLoading.value = false;

    if (!trackIds.length) return;

    const needEnrich = trackIds.length > rawTracks.length || rawTracks.length === 0;
    if (!needEnrich) return;

    trackEnriching.value = true;

    try {
      const CHUNK_SIZE = 30;
      let offset = rawTracks.length;

      while (offset < trackIds.length) {
        if (currentToken !== fetchToken) return;

        const { data: chunkRes } = await getPlaylistTrackAll({ id, limit: CHUNK_SIZE, offset });
        if (currentToken !== fetchToken) return;

        const newSongs = Array.isArray(chunkRes?.songs) ? chunkRes.songs : [];
        if (newSongs.length) {
          playlist.value = {
            ...playlist.value,
            tracks: [...playlist.value.tracks, ...newSongs],
          };
          offset += newSongs.length;
        } else {
          break;
        }
      }

      if (currentToken !== fetchToken) return;
      const remaining = trackIds.length - playlist.value.tracks.length;
      if (remaining > 0) {
        const remainingIds = trackIds.slice(-remaining);
        const BATCH_SIZE = 100;
        for (let i = 0; i < remainingIds.length; i += BATCH_SIZE) {
          if (currentToken !== fetchToken) return;
          const batchIds = remainingIds.slice(i, i + BATCH_SIZE);
          const { data: batchRes } = await getSongDetailBatch(batchIds);
          if (currentToken !== fetchToken) return;
          const batchSongs = Array.isArray(batchRes?.songs) ? batchRes.songs : [];
          if (batchSongs.length) {
            playlist.value = {
              ...playlist.value,
              tracks: [...playlist.value.tracks, ...batchSongs],
            };
          }
        }
      }
    } catch {
      // 补全失败时保留已显示的数据
    } finally {
      if (currentToken === fetchToken) {
        trackEnriching.value = false;
      }
    }
  } catch (e: any) {
    if (currentToken !== fetchToken) return;
    error.value = e?.message || '歌单详情加载失败';
    playlist.value = null;
    detailLoading.value = false;
    trackEnriching.value = false;
  }
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
  if (!isInjectedDailyRecommend.value || !userStore.isLogin) {
    historyDates.value = [];
    return;
  }
  historyLoading.value = true;
  try {
    const { data } = await getHistoryRecommendSongDates(userStore.loginCookie || undefined);
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
        const rawValue = String(item?.date || item?.day || item);
        const normalizedValue = normalizeHistoryDateLabel(rawValue);
        return normalizedValue ? { value: normalizedValue, label: normalizedValue } : null;
      })
      .filter(Boolean) as Array<{ value: string; label: string }>;
  } catch {
    historyDates.value = [];
  } finally {
    historyLoading.value = false;
  }
}

async function loadTodayRecommendTracks() {
  if (!isInjectedDailyRecommend.value || !userStore.isLogin || !playlist.value) return;
  historyLoading.value = true;
  selectedHistoryDate.value = '';
  try {
    const { data } = await getRecommendSongs(userStore.loginCookie || undefined);
    const list = Array.isArray(data?.recommend)
      ? data.recommend
      : Array.isArray(data?.songs)
        ? data.songs
        : Array.isArray(data?.data)
          ? data.data
          : [];
    const normalized = list.map((song: any) => normalizeRecommendSong(song)).filter(Boolean);
    const nextTracks = normalized.length ? normalized : Array.isArray(injectedPlaylist.value?.tracks) ? injectedPlaylist.value?.tracks : [];
    playlist.value = {
      ...playlist.value,
      coverImgUrl: resolvePlaylistCover({
        ...playlist.value,
        tracks: nextTracks,
      }),
      trackCount: normalized.length || injectedPlaylist.value?.trackCount || 0,
      tracks: nextTracks,
    };
  } catch {
    error.value = '历史日推加载失败';
    playlist.value = {
      ...playlist.value,
      tracks: Array.isArray(injectedPlaylist.value?.tracks) ? injectedPlaylist.value?.tracks : playlist.value?.tracks || [],
    };
  } finally {
    historyLoading.value = false;
  }
}

async function loadHistoryByDate(date: string) {
  if (!date || !isInjectedDailyRecommend.value || !playlist.value) return;
  historyLoading.value = true;
  selectedHistoryDate.value = date;
  error.value = '';
  try {
    const { data } = await getHistoryRecommendSongDetail(date, userStore.loginCookie || undefined);
    const list = Array.isArray(data?.data?.songs)
      ? data.data.songs
      : Array.isArray(data?.data?.dailySongs)
        ? data.data.dailySongs
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.songs)
            ? data.songs
            : Array.isArray(data?.dailySongs)
              ? data.dailySongs
              : Array.isArray(data?.list)
                ? data.list
                : [];
    const normalized = list.map((song: any) => normalizeRecommendSong(song)).filter(Boolean);
    playlist.value = {
      ...playlist.value,
      trackCount: normalized.length || playlist.value?.trackCount || 0,
      tracks: normalized.length ? normalized : Array.isArray(injectedPlaylist.value?.tracks) ? injectedPlaylist.value?.tracks : [],
    };
  } catch {
    playlist.value = {
      ...playlist.value,
      tracks: Array.isArray(injectedPlaylist.value?.tracks) ? injectedPlaylist.value?.tracks : playlist.value?.tracks || [],
    };
  } finally {
    historyLoading.value = false;
  }
}

function onHistorySelect(value: string) {
  if (value === '返回今日推荐' || value === historyButtonLabel.value) {
    void loadTodayRecommendTracks();
    return;
  }
  const hit = historyDates.value.find((item) => item.label === value);
  if (hit) void loadHistoryByDate(hit.value);
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

function isCurrentTrack(song: any) {
  return Number(song?.id) > 0 && Number(song?.id) === Number(playerStore.currentSongId || 0);
}

function buildLocalPlaylistHistoryEntry() {
  const current = playlist.value;
  const playlistId = Number(props.playlistId || current?.id || 0);
  return {
    key: `playlist-${playlistId || current?.name || 'current'}`,
    title: current?.name || '未命名歌单',
    subtitle: `${current?.trackCount || tracks.value.length || 0} 首 · ${current?.creator?.nickname || '歌单'}`,
    source: 'local_play_history',
    sourceTip: '当前设备本地播放记录',
    summary: current?.description || '当前设备播放过的歌单。',
    typeLabel: '歌单历史',
    countLabel: '0',
    updatedAt: String(Date.now()),
    playableLabel: '歌单播放',
    playActionTip: '从本地历史恢复歌单详情。',
    coverUrl: current?.coverImgUrl || '',
    playableItem: { ...current, id: playlistId || current?.id },
    manageType: 'playlist' as const,
    canUnlike: false,
    canOpenDetail: Boolean(playlistId),
    sortKey: Date.now(),
  };
}

function recordPlaylistLocalHistory() {
  if (!playlist.value) return;
  recordLocalHistoryEntry(buildLocalPlaylistHistoryEntry());
}

async function playAll() {
  if (!tracks.value.length) return;
  try { recordPlaylistLocalHistory(); } catch { /* localStorage may be full */ }
  playerStore.setPlaylist(tracks.value, 0);
  await playerStore.playByIndex(0);
}

function onSongItemDblClick(event: MouseEvent, index: number) {
  const target = event.target as HTMLElement | null;
  if (target?.closest('button, a, input, select, textarea, [role="button"]')) return;
  void playOne(index);
}

async function playOne(index: number) {
  if (!tracks.value.length) return;
  try { recordPlaylistLocalHistory(); } catch { /* localStorage may be full */ }
  playerStore.setPlaylist(tracks.value, index);
  await playerStore.playByIndex(index);
}

onMounted(() => {
  fetchDetail(props.playlistId);
  void loadHistoryDates();
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
  () => [props.playlistId, props.injectedPlaylist],
  ([id]) => {
    isDescriptionExpanded.value = false;
    selectedHistoryDate.value = '';
    fetchDetail(Number(id));
    void loadHistoryDates();
    requestAnimationFrame(() => {
      headerWrapEl = getHeaderWrapEl();
      updateStickyState();
    });
  },
  { deep: true },
);

/* 操作按钮 */
const likeLoading = ref<Set<number>>(new Set());
function isLiked(songId: number) { return userStore.likedSongIds.includes(Number(songId)); }
async function toggleLike(song: any) {
  const id = Number(song.id || 0);
  if (!id || likeLoading.value.has(id)) return;
  if (!userStore.isLogin) { showLoginModal('like'); return; }
  likeLoading.value = new Set([...likeLoading.value, id]);
  try {
    await toggleSongLike({ id, like: !isLiked(id), uid: userStore.profile?.userId, cookie: userStore.loginCookie || undefined });
    if (isLiked(id)) userStore.likedSongIds = userStore.likedSongIds.filter((x) => x !== id);
    else userStore.likedSongIds = [...userStore.likedSongIds, id];
  } catch {}
  finally { const s = new Set(likeLoading.value); s.delete(id); likeLoading.value = s; }
}
function playNext(song: any) {
  const idx = playerStore.currentIndex + 1;
  playerStore.playlist.splice(idx, 0, { ...song });
}
const showPlaylistPicker = ref(false);
const playlistPickerList = ref<any[]>([]);
const pickerTargetSong = ref<any>(null);
async function showAddToPlaylist(song: any) {
  if (!userStore.isLogin) { showLoginModal('playlist'); return; }
  pickerTargetSong.value = song;
  try {
    const res = await getUserPlaylist(userStore.profile?.userId || 0, userStore.loginCookie || undefined);
    playlistPickerList.value = (res.data?.playlist || []).filter((p: any) => !p.subscribed);
  } catch { playlistPickerList.value = []; }
  showPlaylistPicker.value = true;
}
async function confirmAddToPlaylist(pid: number) {
  const song = pickerTargetSong.value;
  if (!song) return;
  try {
    await addTrackToPlaylist(pid, [Number(song.id || 0)], userStore.loginCookie || undefined);
  } catch {}
  showPlaylistPicker.value = false;
}
function openComment(songId: number) {
  emit('open-comment', songId);
}
</script>

<style scoped>
@import '../styles/detail-page.css';

.playlist-detail-body { }
.playlist-detail-back { display: block; }

:deep(.playlist-detail-header-wrap .ops) {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  flex-wrap: nowrap;
}

.history-dropdown {
  width: 120px;
  flex: 0 0 120px;
  order: 0;
}

.history-dropdown :deep(.dd) {
  width: 120px;
}

.history-dropdown :deep(.dd-trigger) {
  width: 100%;
}

.play-all {
  order: 1;
  flex: 0 0 auto;
}

:deep(.playlist-detail-header-wrap .hero-actions-shell) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-width: 0;
}

:deep(.playlist-detail-header-wrap .hero-actions-shell .ops) {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  flex-wrap: nowrap;
  width: auto;
  max-width: 100%;
  margin-top: 0;
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
.playlist-detail-page--embedded::after,
.playlist-detail-page--embedded.user-detail-panel::before,
.playlist-detail-page--embedded.user-detail-panel::after {
  content: none;
}

.playlist-detail-page--embedded .playlist-detail-header {
  padding-left: 0;
  padding-right: 0;
}

.playlist-detail-page--embedded .song-list {
  border-top: 0;
}

.playlist-detail-page--embedded .song-item {
  padding-left: 0;
  padding-right: 0;
  overflow: hidden;
}

.song-item--playing .song-cover {
  box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 18%, rgba(15, 23, 42, 0.18));
}

.playlist-detail-page--embedded.user-detail-panel {
  background: transparent;
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



.playlist-detail-header {
  --hero-media-width: 308px;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-3);
  align-items: center;
}

.cover {
  width: 308px;
  height: 308px;
  border-radius: 18px;
}

.user-detail-panel .playlist-detail-header {
  grid-template-columns: 1fr;
  justify-items: center;
  align-items: start;
  gap: 16px;
}

.user-detail-panel .cover {
  width: 308px;
  height: 308px;
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

.playlist-detail-header-wrap {
  transition:
    margin 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    padding 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    border-radius 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    transform 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    box-shadow 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    background-color 0.46s ease,
    backdrop-filter 0.46s ease,
    -webkit-backdrop-filter 0.46s ease;
}

.playlist-detail-header-wrap.is-sticky-header {
  position: sticky;
  top: 0;
  z-index: 30;
  margin: 0 calc(var(--space-4) * -1) 0;
  padding: 18px var(--space-4) var(--space-2);
  border-radius: 0 0 18px 18px;
  background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(14px) saturate(150%);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
}

.playlist-detail-header-wrap.is-sticky-header.detail-sticky-header--embedded {
  top: -18px;
  margin: 0 -18px 0;
  padding: 18px 18px var(--space-2);
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto;
  align-items: center;
  column-gap: var(--space-3);
  row-gap: 0;
  width: 100%;
  min-height: 54px;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-title-shell) {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  max-width: 100%;
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
  display: none;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-actions-shell) {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-self: end;
  align-self: center;
  min-width: max-content;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-actions-shell .ops) {
  margin-top: 0;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .desc) {
  max-height: 0;
  opacity: 0;
  transform: translate3d(0, -8px, 0);
}


.sub-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.creator-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 6px rgba(2, 6, 23, 0.18);
}

.sub-dot {
  opacity: 0.6;
}

.track-loading-tip {
  font-size: 12px;
  color: #6b7280;
}

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

.artist-link:hover {
  color: var(--accent);
  text-decoration: underline;
}

.artist-link + .artist-link::before {
  content: '/';
  margin: 0 2px;
  color: var(--text-sub);
}

@media (max-width: 767px) {
  .detail-hero .header {
    grid-template-columns: 1fr;
  }

  .detail-hero .cover {
    width: 140px;
    height: 140px;
  }

  .detail-hero .title {
    font-size: 30px;
  }

  .detail-hero .desc {
    font-size: 14px;
  }
}
/* 操作按钮 */
.song-item { position: relative; }
.song-actions { display: none; position: absolute; right: 8px; top: 50%; transform: translateY(-50%); align-items: center; gap: 4px; }
.song-item:hover .song-actions { display: flex; }
.sa-btn { width: 34px; height: 34px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-surface); color: var(--text-soft); cursor: pointer; display: grid; place-items: center; transition: color 0.12s ease, background 0.12s ease, transform 0.12s ease; box-shadow: var(--glass-highlight); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.sa-btn:hover { background: var(--bg-muted); color: var(--text-main); transform: translateY(-1px); border-color: color-mix(in srgb, var(--accent) 32%, var(--border)); }
.sa-btn:active { transform: translateY(0); }
.sa-btn.liked { color: #ff6b8a; }
.sa-btn.liked svg { fill: currentColor; }
.sa-btn:active { transform: translateY(0); }
.sa-btn.liked { color: #ff6b8a; }
.sa-btn.liked svg { fill: currentColor; }
/* 歌单选择器 */
.pp-mask { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.45); display: grid; place-items: center; }
.pp-popup { width: min(380px, calc(100vw - 40px)); max-height: 60vh; background: var(--bg-surface, rgba(26,28,40,0.97)); border-radius: 16px; padding: var(--space-3); display: grid; grid-template-rows: auto 1fr auto; gap: var(--space-2); box-shadow: 0 16px 48px rgba(0,0,0,0.5); }
.pp-title { margin: 0; color: #fff; font-size: 15px; font-weight: 700; padding: var(--space-1) var(--space-2); }
.pp-list { overflow-y: auto; display: grid; gap: 2px; list-style: none; margin: 0; padding: 0; }
.pp-item { padding: var(--space-2) var(--space-3); border-radius: 8px; cursor: pointer; color: rgba(255,255,255,0.82); font-size: 13px; transition: background 0.12s ease; }
.pp-item:hover { background: rgba(255,255,255,0.06); }
.pp-empty { padding: var(--space-4); text-align: center; color: rgba(255,255,255,0.35); font-size: 13px; }
.pp-close { padding: 8px; border: none; border-radius: 10px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); cursor: pointer; font-size: 13px; }
.pp-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
</style>
