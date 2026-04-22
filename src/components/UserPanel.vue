<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="user-page user-page--fixed">
    <div v-if="!isLogin" class="page-header">
      <div>
        <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="title">用户中心</AnimatedAppear>
        <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="subtitle">
          登录后可查看用户详情与歌单数据。
        </AnimatedAppear>
      </div>
      <button class="refresh-btn" :disabled="loading" @click="loadUserData">
        {{ loading ? '加载中…' : '刷新数据' }}
      </button>
    </div>

    <div v-if="!isLogin" class="empty-state">
      <div class="empty-card">
        <h3>当前未登录</h3>
        <p>请先完成登录，系统会自动拉取用户详情和歌单数据。</p>
      </div>
    </div>

    <UserSplitView
      v-else
      v-model:activeTab="activeTab"
      v-model:playlistSubTab="playlistSubTab"
      :detail="detail"
      :profile="profileMeta"
      :playlist-items="currentPlaylistItems"
      :album-items="albumItems"
      :selected-item="selectedItem"
      @select-item="handleSelectItem"
    >
      <template #detail="{ item }">
        <PlaylistDetailPage
          v-if="activeTab === 'playlists' && playlistSubTab !== 'albums'"
          :playlist-id="item.id"
          back-label="返回用户中心"
          :embedded="true"
          scroll-host-selector=".detail-panel"
          @back="selectedItem = null"
        />

        <AlbumDetailPage
          v-else-if="activeTab === 'playlists' && playlistSubTab === 'albums'"
          :album-id="item.id"
          back-label="返回用户中心"
          :embedded="true"
          scroll-host-selector=".detail-panel"
          @back="selectedItem = null"
        />

        <PlaylistDetailPage
          v-else-if="activeTab === 'cloud'"
          :playlist-id="0"
          back-label="返回用户中心"
          :embedded="true"
          :injected-playlist="cloudPseudoPlaylist"
          scroll-host-selector=".detail-panel"
          @back="selectedItem = null"
        />
      </template>
    </UserSplitView>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AnimatedAppear from './AnimatedAppear.vue';
import UserSplitView from './UserSplitView.vue';
import PlaylistDetailPage from './PlaylistDetailPage.vue';
import AlbumDetailPage from './AlbumDetailPage.vue';
import { getUserCollectedPlaylist, getUserCreatedPlaylist, getUserDetail } from '../api/auth';
import { getAlbumDetail, getAlbumSublist, getCloudStorage, getCloudStorageDetail, getSongUrl } from '../api/music';
import { playerStore } from '../stores/player';
import { userStore } from '../stores/user';

const emit = defineEmits<{ (e: 'open-playlist', playlistId: number, returnPage?: string): void }>();

const loading = ref(false);
const detail = ref<any>(null);
const createdPlaylists = ref<any[]>([]);
const collectedPlaylists = ref<any[]>([]);
const albumItems = ref<any[]>([]);
const cloudPlaylists = ref<any[]>([]);
const cloudDetailItems = ref<any[]>([]);
const cloudLoading = ref(false);
const cloudTitle = computed(() => '我的云盘');
const cloudPseudoPlaylist = computed(() => ({
  name: '我的云盘',
  coverImgUrl: cloudPlaylists.value[0]?.coverImgUrl || profileMeta.value.avatarUrl || '',
  description: `${profileMeta.value.nickname} 的云盘歌曲`,
  creator: { nickname: profileMeta.value.nickname, avatarUrl: profileMeta.value.avatarUrl },
  trackCount: cloudPlaylists.value.length,
  tracks: cloudPlaylists.value,
}));
const activeTab = ref<'playlists' | 'cloud'>('playlists');
const playlistSubTab = ref<'created' | 'collected' | 'albums'>('created');
const selectedItem = ref<any>(null);
const albumSongs = ref<any[]>([]);
const albumLoading = ref(false);
const albumError = ref('');

const isLogin = computed(() => userStore.isLogin);
const profileMeta = computed(() => ({
  avatarUrl: detail.value?.profile?.avatarUrl || userStore.profile?.avatarUrl || '',
  nickname: detail.value?.profile?.nickname || userStore.profile?.nickname || '未命名用户',
  signature: detail.value?.profile?.signature || '这里展示用户简介与登录状态信息',
}));

const currentPlaylistItems = computed(() => {
  if (playlistSubTab.value === 'created') return createdPlaylists.value.map(normalizePlaylistItem);
  if (playlistSubTab.value === 'collected') return collectedPlaylists.value.map(normalizePlaylistItem);
  if (playlistSubTab.value === 'albums') return albumItems.value;
  return [];
});

const activeDetailItem = computed(() => {
  if (activeTab.value === 'cloud') return cloudPseudoPlaylist.value || null;
  return currentPlaylistItems.value[0] || null;
});

watch(
  activeDetailItem,
  (item) => {
    if (item) selectedItem.value = item;
  },
  { immediate: true },
);

watch(activeTab, async (tab) => {
  if (tab === 'cloud' && !cloudPlaylists.value.length) {
    await loadCloudData();
  }
});

watch([activeTab, playlistSubTab], () => {
  if (activeTab.value === 'playlists') {
    selectedItem.value = currentPlaylistItems.value[0] || null;
  } else if (activeTab.value === 'cloud') {
    selectedItem.value = cloudPseudoPlaylist.value || null;
  }
});

watch(
  [currentPlaylistItems, cloudPseudoPlaylist],
  ([playlistItems, cloudItem]) => {
    if (activeTab.value === 'playlists') {
      const nextItems = Array.isArray(playlistItems) ? playlistItems : [];
      const currentId = selectedItem.value?.id;
      const matched = nextItems.find((item: any) => item?.id === currentId);
      selectedItem.value = matched || nextItems[0] || null;
      return;
    }

    if (activeTab.value === 'cloud') {
      selectedItem.value = cloudItem || null;
    }
  },
  { immediate: true },
);

function normalizeCloudItem(item: any) {
  const source = item?.song || item?.simpleSong || item?.data?.[0] || item;
  const songName =
    item.songName ||
    item.name ||
    item.title ||
    source.name ||
    source.title ||
    source.songName ||
    source.name ||
    '云盘歌曲';
  const artists =
    item.ar?.map((a: any) => a.name).join(' / ') ||
    item.simpleSong?.ar?.map((a: any) => a.name).join(' / ') ||
    source.ar?.map((a: any) => a.name).join(' / ') ||
    item.artist ||
    item.singer ||
    source.artist ||
    source.singer ||
    '';
  const album =
    item.al?.name ||
    item.simpleSong?.al?.name ||
    source.al?.name ||
    item.album ||
    item.albumName ||
    source.album ||
    source.albumName ||
    '';
  const coverImgUrl =
    item.al?.picUrl ||
    item.al?.img1v1Url ||
    item.al?.coverImgUrl ||
    item.simpleSong?.al?.picUrl ||
    item.simpleSong?.al?.img1v1Url ||
    item.simpleSong?.al?.coverImgUrl ||
    source.al?.picUrl ||
    source.al?.img1v1Url ||
    source.al?.coverImgUrl ||
    item.coverImgUrl ||
    item.coverUrl ||
    item.picUrl ||
    item.blurPicUrl ||
    item.simpleSong?.coverImgUrl ||
    item.simpleSong?.coverUrl ||
    item.simpleSong?.picUrl ||
    source.coverImgUrl ||
    source.coverUrl ||
    source.picUrl ||
    source.blurPicUrl ||
    source.album?.picUrl ||
    source.album?.blurPicUrl ||
    '';
  const id = item.id || item.songId || item.musicId || item.trackId || source.id || source.songId || source.musicId || source.trackId;

  return {
    ...item,
    ...source,
    id,
    name: songName,
    subtitle: [artists, album].filter(Boolean).join(' · ') || item.description || source.description || '云盘歌曲',
    coverImgUrl,
    type: 'cloud',
    source: 'cloud',
  };
}

async function enrichCloudUrls(items: any[]) {
  const validIds = items.map((item) => item.id).filter(Boolean);
  if (!validIds.length) return items;
  const urlRes = await Promise.all(
    validIds.map(async (id) => {
      try {
        const res = await getSongUrl(Number(id));
        const list = res.data?.data || res.data?.songs || res.data?.url || res.data || [];
        const target = Array.isArray(list) ? list[0] : list;
        return { id, url: target?.url || target?.data?.[0]?.url || '' };
      } catch {
        return { id, url: '' };
      }
    }),
  );
  const urlMap = new Map(urlRes.map((entry) => [String(entry.id), entry.url]));
  return items.map((item) => ({ ...item, url: urlMap.get(String(item.id)) || item.url || '' }));
}

function normalizePlaylistArray(payload: any): any[] {
  const candidates = [payload?.data?.playlist, payload?.data?.data?.playlist, payload?.data?.playlists, payload?.data?.playlist?.playlist, payload?.playlist, payload?.playlists];
  for (const candidate of candidates) if (Array.isArray(candidate)) return candidate;
  return [];
}

function normalizePlaylistItem(item: any) {
  return { ...item, subtitle: `${item.trackCount || 0} 首` };
}

async function loadUserData() {
  if (!userStore.profile?.userId) return;
  loading.value = true;
  try {
    const uid = userStore.profile.userId;
    const [detailRes, createdRes, collectedRes, albumRes, cloudRes] = await Promise.all([
      getUserDetail(uid),
      getUserCreatedPlaylist(uid, 100, 0),
      getUserCollectedPlaylist(uid, 100, 0),
      getAlbumSublist({ limit: 25, offset: 0 }),
      getCloudStorage({ limit: 30, offset: 0 }),
    ]);

    detail.value = detailRes.data || detailRes;
    createdPlaylists.value = normalizePlaylistArray(createdRes);
    collectedPlaylists.value = normalizePlaylistArray(collectedRes);

    const albumList = albumRes.data?.data || albumRes.data?.albums || albumRes.data?.weekData || albumRes.data || [];
    albumItems.value = Array.isArray(albumList)
      ? albumList.map((item: any) => ({
          ...item,
          name: item.name || item.albumName || item.title || '收藏专辑',
          subtitle: `${item.songCount ?? item.trackCount ?? item.size ?? item.subCount ?? item.albumSize ?? 0} 首`,
          coverImgUrl: item.picUrl || item.coverImgUrl || item.coverUrl || item.blurPicUrl || '',
          type: 'album',
          source: 'album',
        }))
      : [];

    if (activeTab.value === 'cloud') {
      await loadCloudData();
    }

    if (activeTab.value === 'playlists' && playlistSubTab.value === 'albums' && currentPlaylistItems.value.length) {
      selectedItem.value = currentPlaylistItems.value[0];
      await loadAlbumSongs(Number(selectedItem.value.id));
    } else if (activeTab.value === 'playlists' && currentPlaylistItems.value.length && !selectedItem.value) {
      selectedItem.value = currentPlaylistItems.value[0];
    } else if (activeTab.value === 'cloud' && cloudPlaylists.value.length) {
      selectedItem.value = cloudPlaylists.value[0];
    }
  } finally {
    loading.value = false;
  }
}

async function loadCloudData() {
  if (cloudLoading.value) return;
  const uid = userStore.profile?.userId;
  if (!uid) return;
  cloudLoading.value = true;
  try {
    const cloudRes = await getCloudStorage({ limit: 1000, offset: 0 });
    const cloudList = cloudRes.data?.data || cloudRes.data?.list || cloudRes.data?.songs || cloudRes.data || [];
    const normalizedCloud = Array.isArray(cloudList) ? cloudList.map(normalizeCloudItem) : [];
    const ids = normalizedCloud.map((item: any) => item.id).filter(Boolean);
    let detailed = normalizedCloud;
    if (ids.length) {
      try {
        const cloudDetailRes = await getCloudStorageDetail(ids);
        const cloudDetailList = cloudDetailRes.data?.data || cloudDetailRes.data?.songs || cloudDetailRes.data || [];
        const detailItems = Array.isArray(cloudDetailList) ? cloudDetailList.map(normalizeCloudItem) : [];
        const detailMap = new Map(detailItems.map((item: any) => [String(item.id), item]));
        detailed = normalizedCloud.map((item: any) => ({ ...item, ...(detailMap.get(String(item.id)) || {}) }));
      } catch {
        detailed = normalizedCloud;
      }
    }
    cloudDetailItems.value = detailed;
    cloudPlaylists.value = await enrichCloudUrls(detailed);
    if (activeTab.value === 'cloud' && cloudPlaylists.value.length) {
      selectedItem.value = cloudPseudoPlaylist.value;
    }
  } finally {
    cloudLoading.value = false;
  }
}

async function playCloudItem(item: any) {
  if (!item) return;
  selectedItem.value = item;
  if (!item.url) {
    try {
      const res = await getSongUrl(Number(item.id));
      const list = res.data?.data || res.data?.songs || res.data?.url || res.data || [];
      const target = Array.isArray(list) ? list[0] : list;
      item.url = target?.url || target?.data?.[0]?.url || '';
    } catch {
      item.url = item.url || '';
    }
  }
  if (item.url) {
    playerStore.setPlaylist([item], 0);
    await playerStore.playTrack(item);
  }
}

async function loadAlbumSongs(albumId: number) {
  if (!albumId) return;
  albumLoading.value = true;
  albumError.value = '';
  albumSongs.value = [];
  try {
    const { data } = await getAlbumDetail(albumId);
    const detailData = data?.album;
    if (!detailData) {
      albumError.value = '专辑详情为空';
      return;
    }
    albumSongs.value = data?.songs || detailData.songs || [];
  } catch (e: any) {
    albumError.value = e?.message || '专辑歌曲加载失败';
  } finally {
    albumLoading.value = false;
  }
}

function handleSelectItem(item: any) {
  selectedItem.value = item;
  if (activeTab.value === 'playlists' && playlistSubTab.value === 'albums') {
    void loadAlbumSongs(Number(item.id));
  }
}


function openPlaylist(playlistId: number) {
  if (!playlistId) return;
  emit('open-playlist', playlistId, 'user');
}

onMounted(loadUserData);

watch(
  () => selectedItem.value?.id,
  (id) => {
    if (activeTab.value === 'playlists' && playlistSubTab.value === 'albums' && id) {
      void loadAlbumSongs(Number(id));
    }
  },
);
</script>

<style scoped>
.user-page { display: grid; gap: var(--space-4); color: var(--text-main); height: 100%; min-height: 0; overflow: hidden; }
.user-page--fixed { max-height: 100%; }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--space-3); }
.title { margin: 0; font-size: 24px; font-weight: 800; }
.subtitle { margin: var(--space-1) 0 0; color: var(--text-sub); }
.refresh-btn { height: 38px; padding: 0 var(--space-3); border-radius: 999px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-main); }
.empty-state { min-height: 320px; display: grid; place-items: center; }
.empty-card { width: min(480px, 100%); padding: var(--space-6); border: 1px dashed var(--border); border-radius: 18px; background: var(--bg-surface); text-align: center; }
.empty-card h3 { margin: 0 0 var(--space-2); }
.empty-card p { margin: 0; color: var(--text-sub); }
.detail-inside { display: grid; gap: var(--space-3); }
.detail-hero { display: flex; gap: var(--space-3); align-items: center; padding: var(--space-3); border-radius: 18px; background: var(--bg-muted); }
.detail-cover { width: 84px; height: 84px; border-radius: 18px; object-fit: cover; flex: 0 0 auto; }
.detail-meta { display: grid; gap: var(--space-1); }
.detail-title { margin: 0; font-size: 22px; }
.detail-subtitle { margin: 0; color: var(--text-sub); line-height: 1.6; }
.lyric-panel { display: grid; gap: var(--space-2); padding: var(--space-4); border-radius: 18px; background: var(--bg-muted); }
.cloud-panel { display: grid; gap: var(--space-3); min-height: 0; height: 100%; grid-template-rows: auto 1fr; }
.cloud-hero-header {
  display: grid;
  grid-template-columns: 308px 1fr;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-radius: 18px;
  background: var(--bg-muted);
}
.cloud-hero-media { display: flex; align-items: center; justify-content: center; }
.cloud-hero-cover { width: 308px; height: 308px; border-radius: 18px; object-fit: cover; }
.cloud-hero-content { display: grid; gap: var(--space-3); }
.cloud-hero-title { margin: 0; font-size: 34px; line-height: 1.1; color: var(--text-main); }
.cloud-hero-subrow { display: flex; align-items: center; gap: var(--space-2); }
.cloud-hero-avatar { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; }
.cloud-hero-sub { margin: 0; font-size: 13px; color: #4b5563; }
.cloud-hero-actions { display: flex; align-items: center; gap: var(--space-2); }
.cloud-state { min-height: 240px; display: grid; place-items: center; color: var(--text-sub); }
.cloud-list-wrap { min-height: 0; height: 100%; overflow: auto; padding-right: var(--space-1); }
.cloud-list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); min-height: 0; }
.cloud-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); border-radius: 16px; background: var(--bg-muted); cursor: pointer; }
.cloud-item.active { outline: none; }
.cloud-idx { width: 24px; text-align: center; color: var(--text-sub); font-size: 13px; }
.cloud-cover { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; flex: 0 0 auto; }
.cloud-meta { display: grid; gap: var(--space-1); min-width: 0; flex: 1; }
.cloud-meta strong, .cloud-meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cloud-meta strong { font-size: 14px; }
.cloud-meta span { font-size: 12px; color: var(--text-sub); }
.cloud-play { margin-left: auto; height: 30px; padding: 0 var(--space-2); font-size: 12px; }
.cloud-play-all { height: 36px; padding: 0 var(--space-3); font-size: 14px; }
.user-page--fixed :deep(.split-stage) {
  min-height: 0;
  height: calc(100vh - 220px);
  max-height: calc(100vh - 220px);
}

.user-page--fixed :deep(.left-panel),
.user-page--fixed :deep(.detail-panel) {
  height: 100%;
  max-height: 100%;
}
</style>
