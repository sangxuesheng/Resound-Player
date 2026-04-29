<template>
  <div class="layout" :style="layoutVars">
    <Sidebar
      v-show="!isNarrow || sidebarOpen"
      :active-key="sidebarActiveKey"
      :collapsed="!isNarrow && sidebarCollapsed"
      @select="onSelectMenu"
    />

    <div class="main-area">
      <TopBar @brand-click="onBrandClick" @search-submit="openSearchPage" @user-click="openUserLogin" @open-settings-page="() => openSettings('playback')" />

      <main class="content" :class="{ 'content--user-page': activePage === 'user', 'content--hero-sticky': isHeroStickyPage }">
        <div class="content-shell">
          <HomePanel
            v-if="activePage === 'home'"
            @open-detail="openPlaylistDetail"
            @open-daily-list="openDailyList"
            @open-album-detail="openAlbumDetail"
            @open-playlist-category="openPlaylistByCategory"
            @open-search="openSearchPage"
            @open-artist="openArtistFromHome"
            @open-user="openUserFromHome"
          />
          <SearchPage
            v-else-if="activePage === 'search'"
            :disabled="!apiReady"
            @open-album-detail="(albumId) => openAlbumDetail(albumId, 'search')"
            @open-playlist-detail="(playlistId) => openPlaylistDetail(playlistId, undefined, 'search')"
            @open-podcast-detail="openPodcastDetail"
            @open-user="openUserFromSearch"
            @open-artist="openArtistFromSearch"
            @open-mv-player="openMvFromSearch"
          />
          <PlaylistPanel
            v-else-if="activePage === 'playlist'"
            :initial-cat="playlistInitialCategory"
            @open-detail="openPlaylistDetail"
          />
          <PlaylistDetailPage
            v-else-if="activePage === 'playlist-detail'"
            :playlist-id="activePlaylistId"
            :injected-playlist="dailyInjectedPlaylist"
            :back-label="playlistBackLabel"
            @back="backToPlaylist"
            @open-artist="openArtistFromDetail"
          />
          <AlbumDetailPage
            v-else-if="activePage === 'album-detail'"
            :album-id="activeAlbumId"
            :back-label="albumBackLabel"
            @back="backToAlbum"
            @open-artist="openArtistFromDetail"
          />
          <ArtistDetailPage
            v-else-if="activePage === 'artist-detail'"
            :artist-id="activeArtistId"
            :back-label="artistBackLabel"
            :initial-tab="artistActiveTabState"
            @update:active-tab="artistActiveTabState = $event"
            @back="backToArtist"
            @open-album-detail="(albumId, tab) => { artistActiveTabState = tab || 'songs'; openAlbumDetail(albumId, 'artist-detail'); }"
            @open-artist="openArtistDetail($event, 'artist-detail')"
            @open-mv-player="openMvFromSearch"
          />
          <UserDetailPage
            v-else-if="activePage === 'user-detail'"
            :user-id="activeUserId"
            back-label="返回搜索结果"
            @back="backToUserDetail"
            @open-playlist-detail="(playlistId) => openPlaylistDetail(playlistId, undefined, 'user-detail')"
          />
          <RankPanel v-else-if="activePage === 'rank'" @open-detail="openRankDetail" @open-artist="openArtistFromRank" />
          <PlaylistDetailPage
            v-else-if="activePage === 'rank-detail'"
            :playlist-id="activeRankId"
            back-label="返回排行榜"
            @back="backToRank"
            @open-artist="openArtistFromRank"
          />
          <MvPanel v-else-if="activePage === 'mv'" :initial-mv="activeMvItem" />
          <UserPanel
            v-else-if="activePage === 'user'"
            class="user-page-host"
            @open-podcast-list="() => openPodcastList('user')"
            @open-playlist="(playlistId) => openPlaylistDetail(playlistId, undefined, 'user')"
          />
          <HistoryPanel
            v-else-if="activePage === 'history'"
            class="history-page-host"
            @open-podcast-list="() => openPodcastList('history')"
            @open-podcast-detail="(item) => openPodcastDetail(item, 'history')"
            @open-playlist-detail="(playlistId) => openPlaylistDetail(playlistId, undefined, 'history')"
            @open-album-detail="(albumId) => openAlbumDetail(albumId, 'history')"
          />
          <PodcastListPage
            v-else-if="activePage === 'podcast-list'"
            :items="podcastItems"
            :recent-items="podcastRecentItems"
            :subscribed-items="podcastSubscribedItems"
            :category-options="podcastCategoryOptions"
            :active-category="activePodcastCategory"
            :loading="podcastLoading"
            @back="backToPodcastSource"
            @open-detail="(item) => openPodcastDetail(item, activePodcastSourcePage)"
            @change-category="openPodcastCategory"
            @open-category="openPodcastCategoryPage"
            @open-curated-page="openPodcastCategoryPage"
            @open-subscribed-page="openPodcastSubscribedPage"
          />
          <PodcastSubscribedPage
            v-else-if="activePage === 'podcast-subscribed'"
            :items="podcastSubscribedItems"
            @back="backToPodcastSubscribedSource"
            @open-detail="(item) => openPodcastDetail(item, podcastSubscribedPageSource)"
          />
          <PodcastCategoryPage
            v-else-if="activePage === 'podcast-category' && activePodcastCategoryInfo"
            :category="activePodcastCategoryInfo"
            @back="backToPodcastCategorySource"
            @open-detail="(item) => openPodcastDetail(item, 'podcast-list')"
          />
          <PodcastDetailPage
            v-else-if="activePage === 'podcast-detail'"
            :title="activePodcastTitle"
            :detail="podcastDetailInfo"
            :items="podcastDetailItems"
            :loading="podcastDetailLoading"
            @back="backToPodcastDetailSource"
            @play-item="playPodcastItem"
            @play-all="playPodcastAll"
          />
          <SettingsPage v-else-if="activePage === 'settings'" :initial-tab="settingsInitialTab" @go-login="openUserLogin" />
          <PlaceholderPanel v-else :page-key="activePage" />
        </div>
      </main>
    </div>

    <PlayerBar v-show="!playerStore.expanded" />
    <PlayerExpanded @open-artist="openArtistFromPlayer" />
    <MvPlayerModal :mv="activeMvItem" @close="activeMvItem = null" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch, ref } from 'vue';
import HomePanel from './components/HomePanel.vue';
import PlayerBar from './components/PlayerBar.vue';
import PlayerExpanded from './components/PlayerExpanded.vue';
import PlaceholderPanel from './components/PlaceholderPanel.vue';
import PlaylistDetailPage from './components/PlaylistDetailPage.vue';
import AlbumDetailPage from './components/AlbumDetailPage.vue';
import ArtistDetailPage from './components/ArtistDetailPage.vue';
import UserDetailPage from './components/UserDetailPage.vue';
import PlaylistPanel from './components/PlaylistPanel.vue';
import SearchPage from './components/SearchPage.vue';
import SettingsPage from './components/SettingsPage.vue';
import RankPanel from './components/RankPanel.vue';
import MvPanel from './components/MvPanel.vue';
import MvPlayerModal from './components/MvPlayerModal.vue';
import PodcastListPage from './components/PodcastListPage.vue';
import PodcastCategoryPage from './components/PodcastCategoryPage.vue';
import PodcastDetailPage from './components/PodcastDetailPage.vue';
import PodcastSubscribedPage from './components/PodcastSubscribedPage.vue';
import UserPanel from './components/UserPanel.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import Sidebar from './components/Sidebar.vue';
import TopBar from './components/TopBar.vue';
import { waitForApiReady } from './api/client';
import { getDjCategoryRecommend, getDjDetail, getDjProgram, getDjRecommend, getDjRecommendType, getDjSublist, getRecentDj, getVoiceListDetail, getVoiceListItems, getVoiceListSearch } from './api/music';
import { playerStore } from './stores/player';
import { uiStore } from './stores/ui';
import { userStore } from './stores/user';
import { recordLocalHistoryEntry } from './utils/localHistory';

const SIDEBAR_COLLAPSED_KEY = 'tm_sidebar_collapsed';

const activePage = ref('home');
const activePlaylistId = ref(0);
const activeAlbumId = ref(0);
const activeArtistId = ref(0);
const artistActiveTabState = ref('songs');
const activeUserId = ref(0);
const activeRankId = ref(0);
const activeMvItem = ref<any>(null);
const activePlaylistReturnPage = ref('playlist');
const activeAlbumReturnPage = ref('home');
const activeArtistReturnPage = ref('search');
const podcastItems = ref<any[]>([]);
const podcastRecentItems = ref<any[]>([]);
const podcastSubscribedItems = ref<any[]>([]);
const podcastCategoryOptions = ref<any[]>([]);
const activePodcastCategory = ref<number | null>(null);
const activePodcastCategoryInfo = ref<{ id: number; name: string } | null>(null);
const podcastSubscribedPageSource = ref<'user' | 'history' | 'podcast-list'>('podcast-list');
const podcastDetailInfo = ref<any>(null);
const podcastDetailItems = ref<any[]>([]);
const podcastLoading = ref(false);
const podcastDetailLoading = ref(false);
const activePodcastTitle = ref('');
const activePodcastSourcePage = ref<'user' | 'history' | 'podcast-list'>('podcast-list');
const activePodcastCategorySourcePage = ref<'user' | 'history' | 'podcast-list'>('podcast-list');
const activePodcastDetailSourcePage = ref<'user' | 'history' | 'podcast-list'>('podcast-list');
const playlistInitialCategory = ref('');
const dailyListSongs = ref<any[]>([]);
const dailyInjectedPlaylist = ref<any>(null);
const apiReady = ref(false);
const isNarrow = ref(false);
const sidebarOpen = ref(true);
const sidebarCollapsed = ref(false);
const settingsInitialTab = ref<'playback' | 'appearance' | 'account'>('appearance');

const layoutVars = computed<Record<string, string>>(() => {
  if (isNarrow.value) {
    return {
      '--sidebar-width': sidebarOpen.value ? '220px' : '0px',
      '--layout-gap': sidebarOpen.value ? '8px' : '0px',
      '--content-max-width': '100%',
      '--content-padding': '14px',
    };
  }

  return {
    '--sidebar-width': sidebarCollapsed.value ? '76px' : '220px',
  };
});

const sidebarActiveKey = computed(() => {
  if (activePage.value === 'playlist-detail') return 'playlist';
  if (activePage.value === 'rank-detail') return 'rank';
  if (['podcast-category', 'podcast-detail', 'podcast-subscribed'].includes(activePage.value)) return 'podcast-list';
  return activePage.value;
});

const isHeroStickyPage = computed(() => ['playlist-detail', 'rank-detail', 'artist-detail', 'album-detail', 'user-detail'].includes(activePage.value));

function syncViewport() {
  // 平板端沿用桌面布局，仅在移动端（<=767）启用窄屏抽屉逻辑
  isNarrow.value = window.innerWidth <= 767;
  if (isNarrow.value && sidebarOpen.value) {
    sidebarOpen.value = false;
  }
}

function hydrateSidebarCollapsed() {
  const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  sidebarCollapsed.value = saved === '1';
}

function onSelectMenu(key: string) {
  activePage.value = key;
  if (key === 'playlist') {
    playlistInitialCategory.value = '';
  }
  if (key === 'podcast-list' && !podcastItems.value.length) {
    void loadPodcastCenter();
  }
}

function openPlaylistDetail(playlistId: number, _coverUrl?: string, returnPage = 'playlist') {
  activePlaylistId.value = playlistId;
  activePlaylistReturnPage.value = returnPage;
  activePage.value = 'playlist-detail';
}

function openDailyList(songs: any[]) {
  dailyListSongs.value = songs;
  activePlaylistReturnPage.value = 'home';
  if (!songs.length) return;
  dailyInjectedPlaylist.value = {
    name: '每日推荐',
    coverImgUrl: songs[0]?.al?.picUrl || songs[0]?.album?.picUrl || songs[0]?.album?.blurPicUrl || '',
    description: '根据你的音乐口味生成，每天更新',
    creator: { nickname: '每日推荐' },
    trackCount: songs.length,
    tracks: songs,
  };
  activePlaylistId.value = Number(songs[0]?.id || 0);
  activePage.value = 'playlist-detail';
}
const playlistBackLabel = computed(() => {
  if (activePlaylistReturnPage.value === 'search') return '返回搜索结果';
  if (activePlaylistReturnPage.value === 'home') return '返回首页';
  if (activePlaylistReturnPage.value === 'user') return '返回用户中心';
  if (activePlaylistReturnPage.value === 'history') return '返回收藏历史';
  return '返回歌单分类';
});

const albumBackLabel = computed(() => {
  if (activeAlbumReturnPage.value === 'search') return '返回搜索结果';
  if (activeAlbumReturnPage.value === 'artist-detail') return '返回歌手详情';
  if (activeAlbumReturnPage.value === 'history') return '返回收藏历史';
  return '返回首页';
});

const artistBackLabel = computed(() => {
  if (activeArtistReturnPage.value === 'playlist-detail') return '返回歌单详情';
  if (activeArtistReturnPage.value === 'album-detail') return '返回专辑详情';
  if (activeArtistReturnPage.value === 'home') return '返回首页';
  if (activeArtistReturnPage.value === 'rank-detail') return '返回榜单详情';
  if (activeArtistReturnPage.value === 'rank') return '返回排行榜';
  return '返回搜索结果';
});

function openPlaylistByCategory(category: string) {
  playlistInitialCategory.value = category;
  activePlaylistReturnPage.value = 'playlist';
  activePage.value = 'playlist';
}

function backToPlaylist() {
  dailyInjectedPlaylist.value = null;
  activePage.value = activePlaylistReturnPage.value || 'playlist';
}

function openAlbumDetail(albumId: number, returnPage = 'home') {
  activeAlbumId.value = albumId;
  activeAlbumReturnPage.value = returnPage;
  activePage.value = 'album-detail';
}

function backToAlbum() {
  if (activeAlbumReturnPage.value === 'search') {
    activePage.value = 'search';
    return;
  }
  if (activeAlbumReturnPage.value === 'artist-detail') {
    activePage.value = 'artist-detail';
    return;
  }
  if (activeAlbumReturnPage.value === 'history') {
    activePage.value = 'history';
    return;
  }
  activePage.value = 'home';
}

function openRankDetail(playlistId: number) {
  activeRankId.value = playlistId;
  activePage.value = 'rank-detail';
}

function backToRank() {
  activePage.value = 'rank';
}

function backToUser() {
  activePage.value = 'user';
}

function openPodcastList(sourcePage: 'user' | 'history' | 'podcast-list' = 'podcast-list') {
  activePodcastSourcePage.value = sourcePage;
  podcastLoading.value = true;
  activePage.value = 'podcast-list';
  void loadPodcastCenter();
}

function backToPodcastSource() {
  activePage.value = activePodcastSourcePage.value || 'podcast-list';
}

function backToPodcastDetailSource() {
  activePage.value = activePodcastDetailSourcePage.value || 'podcast-list';
}

function backToPodcastCategorySource() {
  activePage.value = activePodcastCategorySourcePage.value || 'podcast-list';
}

function openPodcastSubscribedPage() {
  podcastSubscribedPageSource.value = activePodcastSourcePage.value;
  activePage.value = 'podcast-subscribed';
}

function backToPodcastSubscribedSource() {
  activePage.value = podcastSubscribedPageSource.value || 'podcast-list';
}

function backToPodcastList() {
  activePage.value = 'podcast-list';
}

function openPodcastCategoryPage(category: { id: number; name: string }) {
  if (!category?.id) return;
  activePodcastCategorySourcePage.value = activePodcastSourcePage.value;
  activePodcastCategory.value = category.id;
  activePodcastCategoryInfo.value = { id: Number(category.id), name: category.name || '分类内容' };
  activePage.value = 'podcast-category';
}

function resolvePodcastRid(item: any) {
  return Number(item?.radio?.id || item?.program?.radio?.id || item?.dj?.id || podcastDetailInfo.value?.id || podcastDetailInfo.value?.radio?.id || 0);
}

function normalizePodcastPlayableTrack(item: any) {
  const mainTrackId = Number(item?.mainTrackId || item?.mainSong?.id || item?.song?.id || item?.program?.mainTrackId || item?.program?.mainSong?.id || 0);
  const rid = resolvePodcastRid(item);
  if (!mainTrackId) return null;

  return {
    id: mainTrackId,
    name: item?.name || item?.programName || item?.title || item?.mainSong?.name || '播客节目',
    ar: [{ name: item?.radio?.name || item?.program?.radio?.name || activePodcastTitle.value || '播客' }],
    al: {
      name: item?.radio?.name || item?.program?.radio?.name || activePodcastTitle.value || '播客',
      picUrl: item?.coverUrl || item?.picUrl || item?.imgUrl || item?.program?.coverUrl || item?.program?.blurCoverUrl || item?.radio?.picUrl || '',
    },
    source: 'podcast',
    podcast: rid > 0 ? { rid } : undefined,
  };
}

function buildLocalPodcastHistoryEntry() {
  const detail = podcastDetailInfo.value || {};
  const firstItem = podcastDetailItems.value[0] || {};
  const radio = detail?.radio || firstItem?.radio || firstItem?.program?.radio || {};
  const id = Number(detail?.id || detail?.voiceListId || radio?.id || firstItem?.voiceListId || firstItem?.program?.radio?.id || firstItem?.radio?.id || 0);
  const title = activePodcastTitle.value || detail?.name || radio?.name || '当前播客';
  const coverUrl = detail?.picUrl || detail?.coverUrl || detail?.imgUrl || detail?.imageUrl || detail?.blurCoverUrl || detail?.intervenePicUrl || radio?.picUrl || firstItem?.coverUrl || firstItem?.picUrl || firstItem?.program?.coverUrl || '';
  return {
    key: `podcast-${id || title}`,
    title,
    subtitle: `${podcastDetailItems.value.length || 0} 条声音 · ${detail?.category || radio?.category || '播客'}`,
    source: 'local_play_history',
    sourceTip: '当前设备本地播放记录',
    summary: detail?.description || detail?.desc || radio?.desc || '当前设备播放过的播客。',
    typeLabel: '播客历史',
    countLabel: '0',
    updatedAt: String(Date.now()),
    playableLabel: '播客播放',
    playActionTip: '从本地历史恢复播客详情。',
    coverUrl,
    playableItem: { ...detail, id, name: title, coverUrl, items: podcastDetailItems.value },
    manageType: 'podcast' as const,
    canUnlike: false,
    canOpenDetail: true,
    sortKey: Date.now(),
  };
}

function recordPodcastLocalHistory() {
  if (!podcastDetailItems.value.length && !podcastDetailInfo.value) return;
  recordLocalHistoryEntry(buildLocalPodcastHistoryEntry());
}

async function playPodcastItem(payload: { item: any; index: number }) {
  const playableTracks = podcastDetailItems.value.map(normalizePodcastPlayableTrack).filter(Boolean);
  if (!playableTracks.length) return;

  const targetTrackId = Number(payload?.item?.mainTrackId || payload?.item?.mainSong?.id || payload?.item?.song?.id || payload?.item?.program?.mainTrackId || payload?.item?.program?.mainSong?.id || 0);
  const startIndex = Math.max(0, playableTracks.findIndex((track: any) => Number(track?.id || 0) === targetTrackId));
  recordPodcastLocalHistory();
  playerStore.setPlaylist(playableTracks, startIndex >= 0 ? startIndex : 0);
  await playerStore.playByIndex(startIndex >= 0 ? startIndex : 0);
}

async function playPodcastAll(items: any[]) {
  const playableTracks = (items || []).map(normalizePodcastPlayableTrack).filter(Boolean);
  if (!playableTracks.length) return;
  recordPodcastLocalHistory();
  playerStore.setPlaylist(playableTracks, 0);
  await playerStore.playByIndex(0);
}

function extractVoiceDetailItems(payload: any): any[] {
  const candidates = [
    payload?.data,
    payload?.result,
    payload?.list,
    payload?.voiceList,
    payload?.programs,
    payload?.djPrograms,
    payload?.data?.list,
    payload?.data?.voiceList,
    payload?.data?.programs,
    payload?.data?.djPrograms,
    payload?.data?.result?.list,
    payload?.data?.result?.voiceList,
    payload?.data?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

async function openPodcastDetail(item: any, sourcePage: 'user' | 'history' | 'podcast-list' = activePodcastSourcePage.value) {
  activePodcastDetailSourcePage.value = sourcePage;
  const matchedCategory = podcastCategoryOptions.value.find((category: any) => Number(category?.id || 0) === Number(item?.categoryId || item?.radio?.categoryId || item?.program?.radio?.categoryId || 0));
  if (matchedCategory) {
    activePodcastCategoryInfo.value = { id: Number(matchedCategory.id), name: matchedCategory.name || '分类内容' };
  }
  const djRid = item?.radio?.id || item?.program?.radio?.id || item?.dj?.id || item?.id;
  const voiceListId = item?.voiceListId || item?.voiceList?.id || item?.detail?.id;
  const isDjItem = Boolean(item?.radio || item?.program || item?.dj || item?.djPrograms || item?.programCount || item?.subCount || item?.categoryId);

  activePodcastTitle.value = item?.name || item?.program?.radio?.name || item?.radio?.name || '播客';
  podcastDetailInfo.value = null;
  podcastDetailItems.value = [];
  activePage.value = 'podcast-detail';

  if (!djRid && !voiceListId) {
    return;
  }

  podcastDetailLoading.value = true;
  try {
    if (isDjItem && djRid) {
      const [detailRes, programRes] = await Promise.all([
        getDjDetail(Number(djRid)),
        getDjProgram({ rid: Number(djRid), limit: 200, offset: 0 }),
      ]);
      const detailPayload = detailRes.data || detailRes;
      const programPayload = programRes.data || programRes;
      podcastDetailInfo.value = detailPayload?.data || detailPayload?.djRadio || detailPayload?.radio || detailPayload || item;
      podcastDetailItems.value = extractVoiceDetailItems(programPayload);
      const detailTitle = detailPayload?.data?.name || detailPayload?.djRadio?.name || detailPayload?.radio?.name || item?.name;
      if (detailTitle) activePodcastTitle.value = detailTitle;
      return;
    }

    if (voiceListId) {
      const [detailRes, listRes] = await Promise.all([
        getVoiceListDetail(Number(voiceListId)),
        getVoiceListItems({ voiceListId: Number(voiceListId), limit: 200, offset: 0 }),
      ]);
      const detailPayload = detailRes.data || detailRes;
      const detailItems = extractVoiceDetailItems(detailPayload);
      podcastDetailInfo.value = detailPayload?.data?.voiceList || detailPayload?.data || detailPayload?.voiceList || detailPayload?.result || detailPayload || item;
      podcastDetailItems.value = detailItems.length ? detailItems : extractVoiceDetailItems(listRes);
      const detailTitle = detailPayload?.data?.voiceList?.name || detailPayload?.name || detailPayload?.voiceList?.name || detailPayload?.data?.name;
      if (detailTitle) activePodcastTitle.value = detailTitle;
    }
  } finally {
    podcastDetailLoading.value = false;
  }
}

function extractVoiceListItems(payload: any): any[] {
  const root = payload?.data || payload || {};
  const nested = root?.data || {};
  const candidates = [
    payload?.data,
    payload?.result,
    payload?.list,
    payload?.voiceList,
    payload?.programs,
    payload?.djRadios,
    payload?.data?.list,
    payload?.data?.records,
    payload?.data?.programs,
    payload?.data?.djRadios,
    payload?.data?.history,
    payload?.data?.radios,
    payload?.data?.data,
    payload?.data?.data?.list,
    payload?.data?.data?.records,
    payload?.data?.data?.programs,
    payload?.data?.data?.djRadios,
    payload?.data?.data?.history,
    payload?.data?.data?.radios,
    root?.list,
    root?.voiceList,
    root?.records,
    root?.programs,
    root?.djRadios,
    root?.weekData,
    root?.items,
    root?.history,
    root?.radios,
    nested,
    nested?.list,
    nested?.records,
    nested?.programs,
    nested?.djRadios,
    nested?.weekData,
    nested?.items,
    nested?.history,
    nested?.radios,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  const objectCandidates = [payload, payload?.data, payload?.result, root, nested, payload?.data?.data];
  for (const candidate of objectCandidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    for (const value of Object.values(candidate)) {
      if (Array.isArray(value) && value.length) return value;
      if (value && typeof value === 'object') {
        for (const nestedValue of Object.values(value)) {
          if (Array.isArray(nestedValue) && nestedValue.length) return nestedValue;
        }
      }
    }
  }

  return [];
}

function normalizeRecentDjItems(items: any[]): any[] {
  return items
    .map((item) => {
      const radio = item?.radio || item?.program?.radio || item?.data?.radio || item?.resource?.radio || item?.resourceExtInfo?.radio || null;
      const program = item?.program || item?.data?.program || item?.resource?.program || item?.resourceExtInfo?.program || item?.data || null;
      const source = radio || program || item;
      const id = source?.id || radio?.id || program?.id || item?.id || item?.resourceId || item?.rid || item?.programId || 0;
      const name = source?.name || program?.name || radio?.name || item?.name || item?.title || item?.data?.name || '';
      if (!id && !name) return null;
      return {
        ...item,
        ...source,
        id,
        name: name || '播客节目',
        coverUrl: source?.picUrl || source?.coverUrl || source?.blurCoverUrl || source?.intervenePicUrl || radio?.picUrl || radio?.coverUrl || radio?.intervenePicUrl || program?.coverUrl || program?.blurCoverUrl || program?.radio?.picUrl || item?.coverUrl || item?.picUrl || item?.imgUrl || item?.data?.coverUrl || item?.data?.radio?.picUrl || item?.program?.coverUrl || item?.program?.blurCoverUrl || item?.program?.radio?.picUrl || item?.program?.mainSong?.al?.picUrl || item?.mainSong?.al?.picUrl || '',
        description: source?.desc || source?.description || program?.description || radio?.desc || item?.description || item?.reason || item?.data?.description || '',
        category: source?.category || source?.rcmdtext || item?.category || item?.data?.category || '',
        program,
        radio,
      };
    })
    .filter(Boolean);
}

function normalizeRecentPlayDjItems(items: any[]): any[] {
  return items
    .map((item) => {
      const program = item?.data || item?.program || item?.resource?.program || item?.resourceExtInfo?.program || item;
      const radio = program?.radio || item?.radio || item?.resource?.radio || item?.resourceExtInfo?.radio || null;
      const id = program?.id || item?.id || item?.resourceId || item?.programId || radio?.id || 0;
      const name = program?.name || radio?.name || item?.name || item?.title || '';
      if (!id && !name) return null;
      return {
        ...item,
        ...program,
        id,
        name: name || '播客节目',
        coverUrl: program?.coverUrl || program?.blurCoverUrl || radio?.picUrl || radio?.coverUrl || item?.coverUrl || item?.picUrl || item?.imgUrl || '',
        description: program?.description || radio?.desc || item?.description || item?.reason || '',
        category: radio?.category || item?.category || '',
        program,
        radio,
      };
    })
    .filter(Boolean);
}

async function loadPodcastCenter() {
  podcastLoading.value = true;
  podcastSubscribedItems.value = [];
  podcastCategoryOptions.value = [];
  activePodcastCategory.value = null;

  try {
    const tasks: Promise<any>[] = [];
    tasks.push(getRecentDj(100));
    tasks.push(getDjSublist());
    tasks.push(getDjRecommend());
    tasks.push(getDjCategoryRecommend());

    const isFullLogin = userStore.loginMode === 'cookie' || userStore.loginMode === 'qr';
    const [recentRes, sublistRes, recommendRes, categoryRes] = await Promise.all(tasks);

    podcastRecentItems.value = normalizeRecentPlayDjItems(extractVoiceListItems(recentRes));
    podcastSubscribedItems.value = isFullLogin ? normalizeRecentDjItems(extractVoiceListItems(sublistRes)) : [];
    podcastItems.value = normalizeRecentDjItems(extractVoiceListItems(recommendRes));
    const categoryItems = extractVoiceListItems(categoryRes);
    podcastCategoryOptions.value = categoryItems.map((item: any) => ({ id: Number(item?.id || item?.categoryId || item?.type || 0), name: item?.name || item?.categoryName || item?.title || '分类' })).filter((item: any) => item.id > 0 && item.name);
    activePodcastCategory.value = podcastCategoryOptions.value[0]?.id || null;

    if (!podcastItems.value.length) {
      const [podcastRes, bookRes] = await Promise.all([
        getVoiceListSearch({ keyword: '播客', limit: 8, offset: 0 }),
        getVoiceListSearch({ keyword: '有声书', limit: 8, offset: 0 }),
      ]);

      podcastItems.value = [...extractVoiceListItems(podcastRes), ...extractVoiceListItems(bookRes)];
    }
  } finally {
    podcastLoading.value = false;
  }
}

async function openPodcastCategory(categoryId: number) {
  if (!categoryId) return;
  activePodcastCategory.value = categoryId;
  podcastLoading.value = true;
  try {
    const { data } = await getDjRecommendType(categoryId);
    podcastItems.value = normalizeRecentDjItems(extractVoiceListItems(data || { data }));
  } finally {
    podcastLoading.value = false;
  }
}

function onBrandClick() {
  if (isNarrow.value) {
    sidebarOpen.value = !sidebarOpen.value;
    return;
  }

  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function openSearchPage(keyword: string) {
  uiStore.searchKeyword = keyword;
  uiStore.searchType = 1;
  activePage.value = 'search';
}

function openUserFromSearch(userId: number) {
  activeUserId.value = Number(userId || 0);
  activePage.value = 'user-detail';
}

function resolveArtistId(artist: any) {
  if (typeof artist === 'number') return Number(artist || 0);
  return Number(artist?.id || artist?.artistId || artist?.userId || 0);
}

function openArtistDetail(artist: any, returnPage = 'search') {
  activeArtistId.value = resolveArtistId(artist);
  activeArtistReturnPage.value = returnPage;
  activePage.value = 'artist-detail';
}

function openArtistFromSearch(artist: any) {
  openArtistDetail(artist, 'search');
}

function openArtistFromHome(artist: any) {
  openArtistDetail(artist, 'home');
}

function openArtistFromPlayer(artist: any) {
  playerStore.closeExpanded();
  openArtistDetail(artist, activePage.value);
}

function openUserFromHome(userId: number) {
  activeUserId.value = Number(userId || 0);
  activePage.value = 'user-detail';
}

function openUserLogin() {
  activePage.value = 'user';
}

function openSettings(tab: 'playback' | 'appearance' | 'account' = 'appearance') {
  settingsInitialTab.value = tab;
  activePage.value = 'settings';
}

function openArtistFromRank(artist: any) {
  openArtistDetail(artist, activePage.value === 'rank-detail' ? 'rank-detail' : 'rank');
}

function openArtistFromDetail(artist: any) {
  openArtistDetail(artist, activePage.value === 'album-detail' ? 'album-detail' : 'playlist-detail');
}

function backToArtist() {
  if (activeArtistReturnPage.value === 'rank-detail') {
    activePage.value = 'rank-detail';
    return;
  }
  activePage.value = activeArtistReturnPage.value || 'search';
}

function backToUserDetail() {
  activePage.value = 'search';
}

function openMvFromSearch(item: any) {
  activeMvItem.value = item || null;
}

watch(
  () => uiStore.searchType,
  () => {
    if (activePage.value === 'search') {
      // 搜索类型变更后保持在搜索页，实际检索由搜索页读取全局状态
      activePage.value = 'search';
    }
  },
);

onMounted(async () => {
  hydrateSidebarCollapsed();
  syncViewport();
  window.addEventListener('resize', syncViewport);

  userStore.hydrate();
  playerStore.init();
  uiStore.init();

  apiReady.value = await waitForApiReady({ maxAttempts: 30, intervalMs: 500 });
  if (apiReady.value) {
    try {
      await Promise.all([userStore.refreshLoginStatus(), uiStore.loadDefaultSearchKeyword()]);
    } catch {
      // ignore
    }
  }
});

watch(sidebarCollapsed, (next) => {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport);
});
</script>

<style scoped>
.layout {
  --layout-top: 8px;
  --layout-left: 8px;
  --layout-gap: 8px;
  --sidebar-width: 220px;
  --topbar-height: 74px;
  --player-bar-height: 84px;
  --content-max-width: 100%;
  --content-padding: 16px;

  --main-height: calc(100vh - (var(--layout-top) * 2) - var(--player-bar-height));
  --sidebar-height: var(--main-height);
  --main-width: calc(100% - (var(--layout-left) * 2) - var(--sidebar-width) - var(--layout-gap));
  --content-height: calc(var(--main-height) - var(--topbar-height));

  width: 100%;
  height: 100vh;
  position: relative;
  background: var(--bg-app);
  overflow-x: clip;
}

.main-area {
  position: fixed;
  top: var(--layout-top);
  left: calc(var(--layout-left) + var(--sidebar-width) + var(--layout-gap));
  width: var(--main-width);
  height: var(--main-height);
  display: grid;
  grid-template-rows: var(--topbar-height) minmax(0, 1fr);
  min-width: 0;
  transition: left 0.26s ease, width 0.26s ease;
}

.content {
  position: relative;
  width: 100%;
  height: var(--content-height);
  min-height: 0;
  padding: var(--content-padding);
  padding-bottom: var(--content-padding);
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg-app);
  box-sizing: border-box;
  cursor: auto;
}

.content.content--hero-sticky {
  padding-top: 0;
}

.content::before {
  content: '';
  position: absolute;
  top: 0;
  left: -20px;
  right: -20px;
  height: 360px;
  z-index: 0;
  background-image:
    linear-gradient(
      180deg,
      rgba(17, 24, 39, 0.56) 0%,
      rgba(17, 24, 39, 0.34) 28%,
      rgba(17, 24, 39, 0.14) 56%,
      rgba(17, 24, 39, 0.04) 80%,
      transparent 100%
    ),
    var(--cover-bg-url, none);
  background-size: cover, cover;
  background-position: center, var(--detail-head-bg-position, center);
  transform: scale(1.1);
  transform-origin: top center;
  filter: blur(24px) saturate(155%) contrast(1.08);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.6s ease;
}

.content.content--hero-sticky::before {
  opacity: 1;
}

.content.content--user-page,
.content:has(.history-page-host) {
  overflow: hidden;
  padding-bottom: 16px;
}

.content-shell {
  width: min(var(--content-max-width), 100%);
  min-height: 100%;
  margin: 0;
  height: 100%;
}

@media (max-width: 1919px) {
  .layout {
    --sidebar-width: 212px;
    --topbar-height: 72px;
    --content-max-width: 100%;
    --content-padding: 14px;
  }
}

@media (max-width: 767px) {
  .layout {
    --sidebar-width: 196px;
    --topbar-height: 68px;
    --content-max-width: 100%;
    --content-padding: 12px;
  }
}

:deep(.user-page-host) {
  height: 100%;
}
</style>
