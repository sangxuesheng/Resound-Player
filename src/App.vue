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
            @back="backToArtist"
            @open-album-detail="(albumId) => openAlbumDetail(albumId, 'artist-detail')"
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
            @open-podcast-list="openPodcastList"
            @open-playlist="(playlistId) => openPlaylistDetail(playlistId, undefined, 'user')"
          />
          <HistoryPanel v-else-if="activePage === 'history'" class="history-page-host" />
          <PodcastListPage v-else-if="activePage === 'podcast-list'" :items="podcastItems" :loading="podcastLoading" @back="backToUser" @open-detail="openPodcastDetail" />
          <PodcastDetailPage v-else-if="activePage === 'podcast-detail'" :title="activePodcastTitle" :items="podcastDetailItems" :loading="podcastDetailLoading" @back="backToPodcastList" />
          <SettingsPage v-else-if="activePage === 'settings'" :initial-tab="settingsInitialTab" @go-login="openUserLogin" />
          <PlaceholderPanel v-else :page-key="activePage" />
        </div>
      </main>
    </div>

    <PlayerBar v-show="!playerStore.expanded" />
    <PlayerExpanded />
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
import PodcastDetailPage from './components/PodcastDetailPage.vue';
import UserPanel from './components/UserPanel.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import Sidebar from './components/Sidebar.vue';
import TopBar from './components/TopBar.vue';
import { waitForApiReady } from './api/client';
import { getRecentDj, getVoiceListDetail, getVoiceListItems, getVoiceListSearch } from './api/music';
import { playerStore } from './stores/player';
import { uiStore } from './stores/ui';
import { userStore } from './stores/user';

const SIDEBAR_COLLAPSED_KEY = 'tm_sidebar_collapsed';

const activePage = ref('home');
const activePlaylistId = ref(0);
const activeAlbumId = ref(0);
const activeArtistId = ref(0);
const activeUserId = ref(0);
const activeRankId = ref(0);
const activeMvItem = ref<any>(null);
const activePlaylistReturnPage = ref('playlist');
const activeAlbumReturnPage = ref('home');
const activeArtistReturnPage = ref('search');
const podcastItems = ref<any[]>([]);
const podcastDetailItems = ref<any[]>([]);
const podcastLoading = ref(false);
const podcastDetailLoading = ref(false);
const activePodcastTitle = ref('');
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
  if (activePlaylistReturnPage.value === 'user-detail') return '返回用户详情';
  return '返回歌单分类';
});

const albumBackLabel = computed(() => {
  if (activeAlbumReturnPage.value === 'search') return '返回搜索结果';
  if (activeAlbumReturnPage.value === 'artist-detail') return '返回歌手详情';
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

function openPodcastList() {
  podcastLoading.value = true;
  activePage.value = 'podcast-list';
  // 先进入列表页，再异步加载数据，避免空白感
  void loadPodcastList();
}

function backToPodcastList() {
  activePage.value = 'podcast-list';
}

function extractVoiceDetailItems(payload: any): any[] {
  const candidates = [
    payload?.data,
    payload?.result,
    payload?.list,
    payload?.voiceList,
    payload?.data?.list,
    payload?.data?.voiceList,
    payload?.data?.result?.list,
    payload?.data?.result?.voiceList,
    payload?.data?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

async function openPodcastDetail(item: any) {
  const id = item?.id || item?.voiceListId || item?.program?.radio?.id;
  activePodcastTitle.value = item?.name || item?.program?.radio?.name || '播客';
  if (!id) {
    podcastDetailItems.value = [];
    activePage.value = 'podcast-detail';
    return;
  }
  podcastDetailLoading.value = true;
  activePage.value = 'podcast-detail';
  try {
    const [detailRes, listRes] = await Promise.all([
      getVoiceListDetail(Number(id)),
      getVoiceListItems({ voiceListId: Number(id), limit: 200, offset: 0 }),
    ]);
    const detailPayload = detailRes.data || detailRes;
    const detailItems = extractVoiceDetailItems(detailPayload);
    podcastDetailItems.value = detailItems.length ? detailItems : extractVoiceDetailItems(listRes);
    const detailTitle = detailPayload?.name || detailPayload?.voiceList?.name || detailPayload?.data?.name;
    if (detailTitle) activePodcastTitle.value = detailTitle;
  } finally {
    podcastDetailLoading.value = false;
  }
}

function extractVoiceListItems(payload: any): any[] {
  const candidates = [
    payload?.data,
    payload?.result,
    payload?.list,
    payload?.voiceList,
    payload?.data?.list,
    payload?.data?.voiceList,
    payload?.data?.result?.list,
    payload?.data?.result?.voiceList,
    payload?.data?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

async function loadPodcastList() {
  podcastLoading.value = true;
  try {
    const recent = await getRecentDj(100);
    let list: any[] = extractVoiceListItems(recent);

    if (!list.length) {
      const keywords = [userStore.profile?.nickname, '播客'].filter(Boolean) as string[];
      for (const keyword of keywords) {
        const res = await getVoiceListSearch({ keyword, limit: 10, offset: 0 });
        list = extractVoiceListItems(res);
        if (list.length) break;
      }
    }

    podcastItems.value = list;
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
  --content-max-width: 100%;
  --content-padding: 16px;

  --main-height: calc(100vh - (var(--layout-top) * 2));
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
  padding-bottom: 112px;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg-app);
  box-sizing: border-box;
  cursor: auto;
}

.content.content--hero-sticky {
  padding-top: 0;
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
