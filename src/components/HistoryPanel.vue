<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="history-page history-page--userlike">
    <div class="history-shell">
      <aside class="history-sidebar">
        <div class="sidebar-card hero-card">
          <div class="hero-top">
            <div>
              <div class="hero-kicker">History Center</div>
              <h3>收藏历史总览</h3>
              <p>保持和用户页一致的左右布局，但内容变成历史记录管理、播放入口和恢复入口。</p>
            </div>
          </div>

          <div class="hero-stats">
            <div><strong>{{ stats.played }}</strong><span>歌曲</span></div>
            <div><strong>{{ stats.playlists }}</strong><span>歌单</span></div>
            <div><strong>{{ stats.albums }}</strong><span>专辑</span></div>
            <div><strong>{{ stats.podcast }}</strong><span>播客</span></div>
          </div>
        </div>

        <div class="sidebar-card">
          <div class="card-title-row">
            <h4>历史分栏</h4>
            <span>{{ tabs.length }} 项</span>
          </div>
          <div class="tab-row">
            <button v-for="tab in tabs" :key="tab.key" class="tab" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
              {{ tab.title }}
            </button>
          </div>
        </div>

        <div class="sidebar-card">
          <div class="card-title-row">
            <h4>{{ leftPanelTitle }}</h4>
            <span>{{ leftItems.length }} 条</span>
          </div>
          <div class="history-list">
            <button
              v-for="item in leftItems"
              :key="item.key"
              type="button"
              class="history-item"
              :class="{ active: selectedGroup === item.key, selected: selectedKeys.includes(item.key) }"
              @click="selectItem(item)"
              @dblclick="openManageItem(item)"
            >
              <div v-if="item.coverStyle" class="item-cover" :style="item.coverStyle"></div>
              <div class="item-main">
                <strong>{{ item.title }}</strong>
                <span>{{ item.subtitle }}</span>
              </div>
            </button>
          </div>
        </div>
      </aside>

      <section class="history-detail">
        <div class="detail-hero">
          <div class="detail-kicker">{{ activeDetail?.typeLabel || '收藏历史详情' }}</div>
          <div class="detail-head">
            <img class="detail-cover" :src="activeDetail?.coverUrl || fallbackCover" alt="封面" />
            <div>
              <h3>{{ activeDetail?.title || '等待选择' }}</h3>
              <p>{{ activeDetail?.subtitle || '请选择左侧任一分栏或条目，右侧会显示对应摘要和可操作动作。' }}</p>
              <div class="detail-badges">
                <span>{{ activeDetail?.source || 'API' }}</span>
                <span>{{ activeDetail?.countLabel || '0 条' }}</span>
                <span>{{ activeDetail?.updatedAt || '刚刚' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-grid">
          <button class="detail-card action-card" type="button" @click="playCurrent">
            <span class="detail-label">播放记录</span>
            <strong>从当前条目开始播放</strong>
            <p>{{ activeDetail?.playActionTip || '歌曲和播客可直接播放，歌单会先载入前几首歌曲。' }}</p>
          </button>

          <button class="detail-card action-card" type="button" @click="restoreCurrent">
            <span class="detail-label">快速恢复</span>
            <strong>恢复到最近选中项</strong>
            <p>回到当前条目对应的历史上下文，后续可扩展到恢复播放位置。</p>
          </button>

          <button class="detail-card action-card" type="button" @click="openSelectedPlaylistDetail">
            <span class="detail-label">收藏记录</span>
            <strong>{{ leftPanelTitle }}</strong>
            <p>{{ activeDetail?.summary || '这里展示该维度下的真实摘要信息。' }}</p>
          </button>
        </div>

        <div class="manage-toolbar">
          <div class="manage-tabs">
            <button v-for="tab in manageTabs" :key="tab.key" type="button" class="manage-tab" :class="{ active: manageFilter === tab.key }" @click="manageFilter = tab.key">{{ tab.label }}</button>
          </div>
          <div class="manage-actions">
            <button class="manage-btn" :disabled="!selectedKeys.length" @click="clearSelection">清空选择</button>
            <button class="manage-btn manage-btn--danger" :disabled="!selectedKeys.length" @click="removeSelected">取消收藏</button>
            <select v-model="sortBy" class="manage-select" aria-label="按时间排序">
              <option value="time-desc">时间倒序</option>
              <option value="time-asc">时间正序</option>
              <option value="name-asc">名称排序</option>
            </select>
          </div>
        </div>

        <div class="detail-body-grid">
          <div class="history-meta-panel">
            <div class="meta-row">
              <span>数据来源</span>
              <strong>{{ activeDetail?.sourceTip || '网易云 API' }}</strong>
            </div>
            <div class="meta-row">
              <span>播放目标</span>
              <strong>{{ activeDetail?.playableLabel || '可播放' }}</strong>
            </div>
            <div class="meta-row">
              <span>分栏类型</span>
              <strong>{{ leftPanelTitle }}</strong>
            </div>
            <div class="meta-row">
              <span>操作建议</span>
              <strong>播放 / 收藏 / 恢复</strong>
            </div>
          </div>

          <div class="timeline-shell">
            <div class="timeline-header">
              <h4>历史详情</h4>
              <span>{{ detailCards.length }} 个节点</span>
            </div>
            <div class="timeline-list">
              <button v-for="card in detailCards" :key="card.title" type="button" class="timeline-item timeline-item--button" @click="selectDetailCard(card)">
                <div class="dot"></div>
                <div>
                  <strong>{{ card.title }}</strong>
                  <p>{{ card.desc }}</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="selection-summary">
          <span>已选 {{ selectedKeys.length }} 项</span>
          <button class="manage-btn manage-btn--ghost" type="button" @click="selectVisibleAll">全选当前分栏</button>
        </div>
      </section>
    </div>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AnimatedAppear from './AnimatedAppear.vue';
import { getAlbumSublist, getPlaylistTrackAll, getRecentSongs, getRecentPlaylists, getRecentAlbums, getRecentDj, getHistoryRecommendSongDates, getHistoryRecommendSongDetail, toggleSongLike } from '../api/music';
import { getUserCollectedPlaylist, getUserCreatedPlaylist, getUserRecord } from '../api/auth';
import { playerStore } from '../stores/player';
import { userStore } from '../stores/user';

type TabKey = 'songs' | 'playlists' | 'albums' | 'podcasts';

type UserRecordItem = {
  playCount?: number;
  playTime?: number;
  time?: number;
  song?: any;
  songs?: any[];
  addTime?: number;
  resource?: any;
  data?: any;
};

type ListItem = {
  key: string;
  title: string;
  subtitle: string;
  source: string;
  sourceTip: string;
  summary: string;
  typeLabel: string;
  countLabel: string;
  updatedAt: string;
  playableLabel: string;
  playActionTip: string;
  coverUrl?: string;
  coverStyle?: Record<string, string>;
  playTracks?: Array<{ id: number; name: string; ar?: Array<{ name: string }>; al?: { name?: string; picUrl?: string } }>;
  playableItem?: any;
  manageType: 'song' | 'playlist' | 'album' | 'podcast';
  canUnlike?: boolean;
  sortKey?: number;
};

const loading = ref(false);
const activeTab = ref<TabKey>('songs');
const selectedGroup = ref('songs-recent');
const songs = ref<ListItem[]>([]);
const playlists = ref<ListItem[]>([]);
const albums = ref<ListItem[]>([]);
const podcasts = ref<ListItem[]>([]);
const selectedDetailCardKey = ref('source');
const manageFilter = ref<'all' | 'song' | 'playlist' | 'album' | 'podcast'>('all');
const sortBy = ref<'time-desc' | 'time-asc' | 'name-asc'>('time-desc');
const selectedKeys = ref<string[]>([]);

const fallbackCover = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="32" fill="#e2e8f0"/><circle cx="100" cy="84" r="40" fill="#cbd5e1"/><rect x="46" y="136" width="108" height="20" rx="10" fill="#cbd5e1"/></svg>`);

const tabs = computed(() => [
  { key: 'songs' as const, title: '歌曲', count: songs.value.length },
  { key: 'playlists' as const, title: '歌单', count: playlists.value.length },
  { key: 'albums' as const, title: '专辑', count: albums.value.length },
  { key: 'podcasts' as const, title: '播客', count: podcasts.value.length },
]);

const leftItems = computed(() => {
  const base = activeTab.value === 'songs' ? songs.value : activeTab.value === 'playlists' ? playlists.value : activeTab.value === 'albums' ? albums.value : podcasts.value;
  const filtered = manageFilter.value === 'all' ? base : base.filter((item) => item.manageType === manageFilter.value);
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy.value === 'name-asc') return a.title.localeCompare(b.title, 'zh-Hans-CN');
    const aKey = Number(a.sortKey || 0);
    const bKey = Number(b.sortKey || 0);
    return sortBy.value === 'time-asc' ? aKey - bKey : bKey - aKey;
  });
  return sorted;
});

const leftPanelTitle = computed(() => ({ songs: '歌曲', playlists: '歌单', albums: '专辑', podcasts: '播客' }[activeTab.value]));
const activeDetail = computed(() => leftItems.value.find((item) => item.key === selectedGroup.value) || leftItems.value[0]);

const stats = computed(() => ({
  played: songs.value.length,
  playlists: playlists.value.length,
  albums: albums.value.length,
  podcast: podcasts.value.length,
  selected: selectedKeys.value.length,
}));

const manageTabs = computed(() => [
  { key: 'all' as const, label: '全部' },
  { key: 'song' as const, label: '歌曲' },
  { key: 'playlist' as const, label: '歌单' },
  { key: 'album' as const, label: '专辑' },
  { key: 'podcast' as const, label: '播客' },
]);

const detailCards = computed(() => {
  const item = activeDetail.value;
  return [
    { title: '来源摘要', desc: item?.sourceTip || '当前内容来自网易云 API。', key: 'source' },
    { title: '播放动作', desc: item?.playActionTip || '可直接进入播放或先恢复上下文。', key: 'play' },
    { title: '收藏上下文', desc: item?.summary || '用于回溯历史与后续定制。', key: 'summary' },
  ];
});

function safeText(value: any, fallback: string) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function buildGradient(index: number) {
  return { background: `linear-gradient(135deg, hsl(${(index * 71) % 360} 80% 58%), hsl(${(index * 71 + 38) % 360} 72% 42%))` };
}

function buildSongItem(item: any, index: number): ListItem {
  const track = item.song || item;
  const timeValue = Number(item.playTime || item.time || item.createTime || item.addTime || Date.now() - index);
  return {
    key: `songs-${track.id || index}`,
    title: safeText(track.name, `最近播放 ${index + 1}`),
    subtitle: safeText(track.ar?.[0]?.name || track.artists?.[0]?.name || item.creator?.nickname, '最近播放记录'),
    source: 'record_recent_song / history recommend',
    sourceTip: '最近播放与历史推荐歌曲接口',
    summary: safeText(track.al?.name || track.album?.name || item.reason, '歌曲历史数据'),
    typeLabel: '歌曲历史',
    countLabel: '歌曲',
    updatedAt: String(timeValue),
    playableLabel: '单曲播放',
    playActionTip: '将当前歌曲加入播放器并直接播放。',
    coverUrl: track.al?.picUrl || item.coverUrl,
    coverStyle: buildGradient(index),
    playTracks: [{ id: Number(track.id), name: track.name, ar: track.ar || track.artists || [], al: track.al || track.album || {} }],
    playableItem: track,
    manageType: 'song',
    canUnlike: true,
    sortKey: timeValue,
  };
}

function buildPlaylistItem(item: any, index: number, sourceName: string, sourceTip: string): ListItem {
  const timeValue = Number(item.updateTime || item.lastUpdateTime || item.createTime || Date.now() - index);
  return {
    key: `playlists-${item.id || index}-${sourceName}`,
    title: safeText(item.name, `歌单 ${index + 1}`),
    subtitle: `${item.trackCount || 0} 首 · ${item.creator?.nickname || '歌单'}`,
    source: sourceName,
    sourceTip,
    summary: safeText(item.description, '歌单历史数据'),
    typeLabel: '歌单历史',
    countLabel: `${item.trackCount || 0} 首`,
    updatedAt: String(timeValue),
    playableLabel: '歌单播放',
    playActionTip: '会优先载入歌单中的前几首歌曲到播放器。',
    coverUrl: item.coverImgUrl,
    coverStyle: buildGradient(index),
    playableItem: item,
    manageType: 'playlist',
    canUnlike: true,
    sortKey: timeValue,
  };
}

function buildAlbumItem(item: any, index: number): ListItem {
  const timeValue = Number(item.subTime || item.publishTime || item.createTime || Date.now() - index);
  return {
    key: `albums-${item.id || index}`,
    title: safeText(item.name, `专辑 ${index + 1}`),
    subtitle: safeText(item.artist?.name || item.artistName, '收藏专辑'),
    source: 'album/sublist',
    sourceTip: '专辑收藏接口',
    summary: safeText(item.alias?.join?.(' / ') || item.description, '专辑历史数据'),
    typeLabel: '专辑历史',
    countLabel: '专辑',
    updatedAt: String(timeValue),
    playableLabel: '专辑浏览',
    playActionTip: '专辑通常先进入详情页，再选择其中曲目播放。',
    coverUrl: item.picUrl,
    coverStyle: buildGradient(index),
    playableItem: item,
    manageType: 'album',
    canUnlike: true,
    sortKey: timeValue,
  };
}

function buildPodcastItem(item: any, index: number): ListItem {
  const timeValue = Number(item.playTime || item.time || item.updateTime || Date.now() - index);
  return {
    key: `podcasts-${item.id || index}`,
    title: safeText(item.name || item.program?.name, `播客 ${index + 1}`),
    subtitle: safeText(item.program?.radio?.name || item.radio?.name, '最近听歌/播客'),
    source: 'record_recent_dj',
    sourceTip: '播客 / DJ 最近播放接口',
    summary: safeText(item.program?.description || item.reason, '播客历史数据'),
    typeLabel: '播客历史',
    countLabel: '播客',
    updatedAt: String(timeValue),
    playableLabel: '播客播放',
    playActionTip: '播客条目会直接载入播放器并继续播放。',
    coverUrl: item.program?.coverUrl || item.program?.radio?.picUrl || item.coverUrl,
    coverStyle: buildGradient(index),
    playTracks: item.program?.mainSong ? [{ id: Number(item.program.mainSong.id), name: item.program.mainSong.name, ar: item.program.mainSong.ar || [], al: item.program.mainSong.al || {} }] : undefined,
    playableItem: item,
    manageType: 'podcast',
    canUnlike: true,
    sortKey: timeValue,
  };
}

async function refreshAll() {
  if (!userStore.profile?.userId) return;
  loading.value = true;
  try {
    const uid = userStore.profile.userId;
    const [createdRes, collectedRes, albumRes, djRes, recentSongRes, recentPlaylistRes, recentAlbumRes] = await Promise.all([
      getUserCreatedPlaylist(uid, 50, 0),
      getUserCollectedPlaylist(uid, 50, 0),
      getAlbumSublist({ limit: 20, offset: 0 }),
      getRecentDj(30),
      getRecentSongs(50),
      getRecentPlaylists(50),
      getRecentAlbums(50),
    ]);

    const created = (createdRes as any)?.data?.playlist || (createdRes as any)?.data?.data || [];
    const collected = (collectedRes as any)?.data?.playlist || (collectedRes as any)?.data?.data || [];
    const albumListRaw = (albumRes as any)?.data?.data || (albumRes as any)?.data?.albums || (albumRes as any)?.data || [];
    const djListRaw = (djRes as any)?.data?.data || (djRes as any)?.data?.list || (djRes as any)?.data || [];
    const recentSongListRaw = (recentSongRes as any)?.data?.data || (recentSongRes as any)?.data?.list || (recentSongRes as any)?.data || [];
    const recentPlaylistListRaw = (recentPlaylistRes as any)?.data?.data || (recentPlaylistRes as any)?.data?.list || (recentPlaylistRes as any)?.data || [];
    const recentAlbumListRaw = (recentAlbumRes as any)?.data?.data || (recentAlbumRes as any)?.data?.list || (recentAlbumRes as any)?.data || [];

    let recentSongsRaw: any[] = [];
    try {
      const dateRes = await getHistoryRecommendSongDates(userStore.loginCookie || undefined);
      const dates = (dateRes as any)?.data?.data || (dateRes as any)?.data?.dates || (dateRes as any)?.data || [];
      if (Array.isArray(dates) && dates.length) {
        const firstDate = dates[0].time || dates[0].date || dates[0];
        const detailRes = await getHistoryRecommendSongDetail(String(firstDate), userStore.loginCookie || undefined);
        recentSongsRaw = (detailRes as any)?.data?.data || (detailRes as any)?.data?.songs || (detailRes as any)?.data || [];
      }
    } catch {
      // fallback below
    }

    const combinedSongSource = [...recentSongsRaw, ...recentSongListRaw, ...djListRaw].filter(Boolean);
    songs.value = combinedSongSource.map((item: any, index: number) => buildSongItem(item, index)).slice(0, 12);
    if (!songs.value.length) songs.value = [{ ...buildSongItem({ name: '暂无歌曲记录' }, 0), key: 'songs-empty', subtitle: '接口未返回歌曲历史', summary: '后续可继续按文档补充更精细的歌曲历史。', manageType: 'song', canUnlike: false, sortKey: Date.now() }];

    const recentPlaylistCombined = [...recentPlaylistListRaw, ...created, ...collected].filter(Boolean);
    playlists.value = [
      { key: 'playlists-created', title: '创建歌单', subtitle: `${created.length} 个歌单`, source: 'user_playlist_create', sourceTip: '用户创建歌单接口', summary: '个人创建的歌单集合。', typeLabel: '歌单历史', countLabel: `${created.length} 组`, updatedAt: '最近', playableLabel: '歌单浏览', playActionTip: '点击可进入歌单详情或批量播放。', playableItem: created[0], manageType: 'playlist', canUnlike: true, sortKey: Number(created[0]?.updateTime || created[0]?.createTime || Date.now()) },
      { key: 'playlists-collected', title: '收藏歌单', subtitle: `${collected.length} 个歌单`, source: 'user_playlist_collect', sourceTip: '用户收藏歌单接口', summary: '收藏到个人主页的歌单集合。', typeLabel: '歌单历史', countLabel: `${collected.length} 组`, updatedAt: '最近', playableLabel: '歌单浏览', playActionTip: '收藏歌单可继续进入详情和播放。', playableItem: collected[0], manageType: 'playlist', canUnlike: true, sortKey: Number(collected[0]?.updateTime || collected[0]?.createTime || Date.now()) },
      ...((recentPlaylistCombined as any[]).slice(0, 8).map((item, index) => buildPlaylistItem(item, index, 'record_recent_playlist / user_playlist', '最近播放歌单与用户歌单接口'))),
    ];

    const recentAlbumCombined = [...recentAlbumListRaw, ...albumListRaw].filter(Boolean);
    albums.value = (Array.isArray(recentAlbumCombined) ? recentAlbumCombined : []).map((item: any, index: number) => buildAlbumItem(item, index));
    if (!albums.value.length) albums.value = [{ ...buildAlbumItem({ name: '暂无专辑记录' }, 0), key: 'albums-empty', subtitle: '接口未返回收藏专辑', summary: '后续可根据账号状态补充更完整内容。', manageType: 'album', canUnlike: false, sortKey: Date.now() }];

    podcasts.value = (Array.isArray(djListRaw) ? djListRaw : []).map((item: any, index: number) => buildPodcastItem(item, index));
    if (!podcasts.value.length) podcasts.value = [{ ...buildPodcastItem({ name: '暂无播客记录' }, 0), key: 'podcasts-empty', subtitle: '接口未返回最近播客', summary: '后续可继续接入播客详情与恢复动作。', manageType: 'podcast', canUnlike: false, sortKey: Date.now() }];

    activeTab.value = 'songs';
    selectedGroup.value = songs.value[0]?.key || playlists.value[0]?.key || albums.value[0]?.key || podcasts.value[0]?.key || 'songs-empty';
    selectedKeys.value = [];
  } finally {
    loading.value = false;
  }
}

function selectItem(item: ListItem) {
  selectedGroup.value = item.key;
  if (!selectedKeys.value.includes(item.key)) selectedKeys.value = [...selectedKeys.value, item.key];
}

function toggleSelectItem(item: ListItem) {
  selectedKeys.value = selectedKeys.value.includes(item.key)
    ? selectedKeys.value.filter((key) => key !== item.key)
    : [...selectedKeys.value, item.key];
}

function selectDetailCard(card: { key: string }) {
  selectedDetailCardKey.value = card.key;
}

function clearSelection() {
  selectedKeys.value = [];
}

function selectVisibleAll() {
  selectedKeys.value = leftItems.value.map((item) => item.key);
}

async function removeSelected() {
  const targets = leftItems.value.filter((item) => selectedKeys.value.includes(item.key) && item.canUnlike);
  if (!targets.length) return;
  const updated = new Set(targets.map((item) => item.key));
  for (const item of targets) {
    if (item.manageType === 'song' && item.playableItem?.id) {
      // songs like/unlike
      // eslint-disable-next-line no-await-in-loop
      await toggleSongLike({ id: Number(item.playableItem.id), like: false });
    }
  }
  selectedKeys.value = selectedKeys.value.filter((key) => !updated.has(key));
}

function openSelectedPlaylistDetail() {
  const item = activeDetail.value;
  if (!item || activeTab.value !== 'playlists') return;
  const playlistId = Number(item.playableItem?.id || 0);
  if (!playlistId) return;
  playerStore.toggleExpanded();
}

function openManageItem(item: ListItem) {
  selectedGroup.value = item.key;
  toggleSelectItem(item);
}

function playCurrent() {
  const item = activeDetail.value;
  if (!item) return;

  if (activeTab.value === 'songs' || activeTab.value === 'podcasts') {
    const track = item.playTracks?.[0] || item.playableItem;
    if (!track) return;
    playerStore.setPlaylist(item.playTracks || [track], 0);
    void playerStore.playByIndex(0);
    playerStore.openExpanded();
    return;
  }

  if (activeTab.value === 'playlists') {
    const playlistId = Number(item.playableItem?.id || 0);
    if (!playlistId) return;
    void getPlaylistTrackAll({ id: playlistId, limit: 12, offset: 0 }).then(async (res) => {
      const tracks = (res as any)?.data?.songs || (res as any)?.data?.playlist?.tracks || (res as any)?.data?.tracks || [];
      const list = tracks.slice(0, 12).map((track: any) => ({ id: track.id, name: track.name, ar: track.ar || track.artists || [], al: track.al || track.album || {} }));
      if (!list.length) return;
      playerStore.setPlaylist(list, 0);
      await playerStore.playByIndex(0);
      playerStore.openExpanded();
    });
    return;
  }

  if (activeTab.value === 'albums') {
    // 专辑先只负责恢复到详情，不直接播放整张专辑，避免误操作
    restoreCurrent();
  }
}

function restoreCurrent() {
  selectedGroup.value = activeDetail.value?.key || selectedGroup.value;
  if (activeTab.value === 'songs' && activeDetail.value?.playTracks?.length) {
    playerStore.setPlaylist(activeDetail.value.playTracks, 0);
  }
}

onMounted(() => {
  refreshAll();
});
</script>

<style scoped>
.history-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-4);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--text-main);
}

.title { margin: 0; font-size: 24px; font-weight: 800; }
.subtitle { margin: var(--space-1) 0 0; color: var(--text-sub); max-width: 56ch; line-height: 1.6; }
.refresh-btn {
  height: 38px;
  padding: 0 var(--space-3);
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-main);
  font: inherit;
}
.refresh-btn--ghost { background: var(--bg-muted); }

.history-shell {
  display: grid;
  grid-template-columns: minmax(360px, 420px) minmax(0, 1fr);
  gap: var(--space-4);
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.history-sidebar,
.history-detail {
  min-height: 0;
  overflow: auto;
  max-height: 100%;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.history-sidebar::-webkit-scrollbar,
.history-detail::-webkit-scrollbar { width: 0; height: 0; }
.history-sidebar { display: grid; gap: var(--space-3); }

.sidebar-card,
.history-detail {
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg-surface);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}
.sidebar-card { padding: var(--space-4); display: grid; gap: var(--space-3); }
.hero-card {
  min-height: 160px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 24%, transparent) 0%, transparent 48%),
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 100%),
    var(--bg-surface);
}
.hero-kicker,
.detail-kicker {
  display: inline-flex;
  width: fit-content;
  padding: var(--space-1) var(--space-2);
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-sub);
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.hero-top h3, .detail-hero h3, .timeline-header h4, .card-title-row h4 { margin: 0; }
.hero-top p, .detail-hero p, .detail-card p, .timeline-item p { margin: 0; color: var(--text-sub); line-height: 1.6; }
.hero-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); }
.hero-stats div { padding: var(--space-3); border-radius: 14px; background: var(--bg-muted); display: grid; gap: var(--space-1); }
.hero-stats strong { font-size: 20px; }
.hero-stats span { color: var(--text-sub); font-size: 12px; }

.card-title-row,
.timeline-header,
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.tab-row { display: flex; gap: var(--space-2); padding: var(--space-2); border-radius: 18px; background: var(--bg-muted); }
.tab {
  height: 44px;
  flex: 1 1 0;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: var(--text-sub);
  font: inherit;
  font-weight: 600;
}
.tab.active { background: var(--bg-surface); color: var(--text-main); box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08); }

.history-list { display: grid; gap: var(--space-2); }
.history-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3);
  border-radius: 16px;
  border: 1px solid transparent;
  background: var(--bg-muted);
  color: inherit;
  font: inherit;
  text-align: left;
}
.history-item.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 9%, var(--bg-muted)); }
.history-item.selected { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent); }
.item-cover { width: 48px; height: 48px; border-radius: 14px; flex: 0 0 auto; }
.item-main { min-width: 0; display: grid; gap: var(--space-1); }
.item-main strong, .item-main span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-main span { color: var(--text-sub); font-size: 13px; }

.history-detail { padding: var(--space-4); display: grid; gap: var(--space-4); }
.detail-hero {
  padding: var(--space-4);
  border-radius: 18px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, transparent), transparent 56%),
    var(--bg-muted);
  display: grid;
  gap: var(--space-2);
}
.detail-cover { width: 84px; height: 84px; border-radius: 18px; object-fit: cover; flex: 0 0 auto; }
.detail-badges { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }
.detail-badges span {
  padding: var(--space-1) var(--space-2);
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--text-sub);
  font-size: 12px;
}
.detail-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-3); }
.detail-card, .timeline-shell { padding: var(--space-4); border-radius: 18px; background: var(--bg-muted); display: grid; gap: var(--space-2); }
.action-card { border: 1px solid transparent; text-align: left; font: inherit; color: inherit; }
.action-card:hover { border-color: var(--accent); }
.detail-label { color: var(--text-sub); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
.manage-toolbar { display: flex; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; align-items: center; }
.manage-tabs, .manage-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.manage-tab, .manage-btn, .manage-select {
  height: 38px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-main);
  font: inherit;
  padding: 0 var(--space-3);
}
.manage-tab.active { background: var(--bg-muted); border-color: var(--accent); }
.manage-btn--danger { border-color: color-mix(in srgb, #ef4444 50%, var(--border)); color: #ef4444; }
.manage-btn--ghost { background: var(--bg-muted); }
.manage-btn:disabled { opacity: 0.5; }
.manage-select { padding-right: 28px; }
.detail-body-grid { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: var(--space-3); }
.selection-summary { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); padding: var(--space-3) 0 2px; color: var(--text-sub); }
.history-meta-panel {
  padding: var(--space-4);
  border-radius: 18px;
  background: var(--bg-muted);
  display: grid;
  gap: var(--space-3);
}
.meta-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  border-radius: 14px;
  background: var(--bg-surface);
}
.meta-row span { color: var(--text-sub); font-size: 12px; }
.meta-row strong { font-size: 14px; }
.timeline-shell { gap: var(--space-3); }
.timeline-list { display: grid; gap: var(--space-3); }
.timeline-item {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  padding: 0;
}
.timeline-item--button { cursor: pointer; }
.dot { width: 10px; height: 10px; border-radius: 999px; margin-top: 8px; background: var(--accent); box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 14%, transparent); flex: 0 0 auto; }

@media (max-width: 1180px) {
  .history-shell, .detail-grid, .detail-body-grid { grid-template-columns: 1fr; }
  .history-shell { height: auto; overflow: visible; }
  .history-sidebar,
  .history-detail {
    max-height: none;
  }
  .manage-toolbar { align-items: flex-start; }
}

@media (max-width: 767px) {
  .page-header { align-items: flex-start; flex-direction: column; }
  .sidebar-card, .history-detail { border-radius: 16px; }
}
</style>
