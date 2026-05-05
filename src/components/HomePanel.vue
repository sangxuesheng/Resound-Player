<template>
  <AnimatedAppear tag="div" variant="content" rhythm="shell" class-name="home-page">
    <div class="home-actions">
      <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="edit-btn" :class="{ active: showEditor }" @click="showEditor = !showEditor">
        {{ showEditor ? '收起首页布局编辑器' : '编辑首页组件布局' }}
      </AnimatedAppear>
    </div>

    <AnimatedAppear tag="section" variant="content" rhythm="head" class-name="home-top-reco">
      <AnimatedAppear tag="article" variant="content" rhythm="body" class-name="top-mini-card radar-card" :index="0">
        <button v-if="dailyRecommendSongs.length" class="radar-hero poster" :title="dailyRecommendHeroTitle" @click="openDailyRecommendDetail">
          <span class="radar-bg" :style="{ backgroundImage: `url(${dailyRecommendCoverUrl || ''})` }"></span>
          <span class="radar-poster-top">
            <span class="radar-top-title">每日推荐</span>
          </span>
          <span class="radar-bottom-zone">
            <span class="radar-poster-bottom">每日推荐｜从「{{ dailyRecommendHeroSubtitle || '今日为你更新' }}」听起</span>
            <span class="radar-hover-list">
              <span
                v-for="(track, idx) in dailyRecommendTracks"
                :key="track.id || `${track.name}-${idx}`"
                class="radar-hover-item"
                @click.stop="playDailyRecommendByIndex(idx)"
              >
                <span class="radar-hover-rank">{{ idx + 1 }}</span>
                <span class="radar-hover-name">{{ track.name }}</span>
                <span class="radar-hover-artist">
                  <button
                    v-for="artist in getTrackArtists(track)"
                    :key="`${track.id || idx}-${artist.id || artist.name}`"
                    type="button"
                    class="artist-inline-btn"
                    @click.stop="openArtistDetail(artist)"
                  >
                    {{ artist.name || '未知歌手' }}
                  </button>
                  <span v-if="!getTrackArtists(track).length">未知歌手</span>
                </span>
              </span>
            </span>
          </span>
        </button>
        <p v-else class="mini-desc">{{ dailyRecommendLoading ? '每日推荐加载中…' : dailyRecommendError || '登录后可查看每日推荐' }}</p>
      </AnimatedAppear>

      <AnimatedAppear v-if="userStore.isLogin" tag="article" variant="content" rhythm="body" class-name="top-mini-card radar-card" :index="1">
        <button v-if="topRecoCard" class="radar-hero poster" :title="topRecoCard.name" @click="openRecoDetail(topRecoCard.id)">
          <span class="radar-bg" :style="{ backgroundImage: `url(${topRecoCardCoverUrl})` }"></span>
          <span class="radar-poster-top">
            <span class="radar-top-title">{{ topRecoCardTitle }}</span>
            <button
              v-if="resolvePlaylistCreatorId(topRecoCard)"
              type="button"
              class="creator-inline-btn"
              @click.stop="openUserDetailById(resolvePlaylistCreatorId(topRecoCard))"
            >
              {{ resolvePlaylistCreatorName(topRecoCard) }}
            </button>
          </span>
          <span class="radar-bottom-zone">
            <span class="radar-poster-bottom">{{ topRecoCardSubtitle }}</span>
            <span class="radar-hover-list">
              <span
                v-for="(track, idx) in topRecoTracks.slice(0, 3)"
                :key="track.id || `${track.name}-${idx}`"
                class="radar-hover-item"
                @click.stop="playRecoByIndex(idx)"
              >
                <span class="radar-hover-rank">{{ idx + 1 }}</span>
                <span class="radar-hover-name">{{ track.name }}</span>
                <span class="radar-hover-artist">
                  <button
                    v-for="artist in getTrackArtists(track)"
                    :key="`${track.id || idx}-${artist.id || artist.name}`"
                    type="button"
                    class="artist-inline-btn"
                    @click.stop="openArtistDetail(artist)"
                  >
                    {{ artist.name || '未知歌手' }}
                  </button>
                  <span v-if="!getTrackArtists(track).length">未知歌手</span>
                </span>
              </span>
            </span>
          </span>
        </button>
        <p v-else class="mini-desc">{{ topRecoLoading ? `${topRecoCardTitle}加载中…` : topRecoError || topRecoEmptyText }}</p>
      </AnimatedAppear>

      <AnimatedAppear tag="article" variant="content" rhythm="body" class-name="top-mini-card fm-card" :index="2">
        <p v-if="personalFmLoading" class="mini-desc">正在获取私人 FM…</p>
        <p v-else-if="personalFmError" class="mini-desc error">{{ personalFmError }}</p>
        <button v-else-if="personalFmTracks.length" class="fm-hero poster" :title="personalFmTracks[0]?.name" @click="playPersonalFmByIndex(0)">
          <span class="fm-bg" :style="{ backgroundImage: `url(${personalFmCoverUrl})` }"></span>
          <span class="fm-poster-top">
            <span class="fm-top-title">私人 FM</span>
          </span>
          <span class="fm-bottom-zone">
            <span class="fm-poster-bottom">私人 FM｜从「{{ personalFmTracks[0]?.name || '今日漫游' }}」听起</span>
            <span class="fm-control-panel" @click.stop>
              <button
                type="button"
                class="fm-control-btn fm-control-btn--ghost"
                :title="fmDislikeTitle"
                aria-label="不喜欢当前私人 FM"
                @click.stop="dislikePersonalFm"
              >
                <span class="fm-control-icon" v-html="dislikeIconSvg"></span>
              </button>
              <button
                type="button"
                class="fm-control-btn fm-control-btn--primary"
                :title="fmPlayTitle"
                :aria-label="fmPlayTitle"
                @click.stop="togglePersonalFmPlayback"
              >
                <span class="fm-control-icon" v-html="playToggleIconSvg"></span>
              </button>
              <button
                type="button"
                class="fm-control-btn fm-control-btn--ghost"
                :title="fmNextTitle"
                aria-label="下一首私人 FM"
                @click.stop="nextPersonalFm"
              >
                <span class="fm-control-icon" v-html="nextIconSvg"></span>
              </button>
            </span>
          </span>
        </button>
        <p v-else class="mini-desc">登录后可使用私人 FM</p>
      </AnimatedAppear>
    </AnimatedAppear>

    <section class="top-artists-section">
      <p v-if="topArtistsLoading" class="custom-tip">热门歌手加载中…</p>
      <p v-else-if="topArtistsError" class="custom-tip">{{ topArtistsError }}</p>
      <HorizontalScrollRail
        v-else
        aria-label="热门歌手"
        content-class="top-artists-row"
        content-layout="flex"
      >
        <button v-for="artist in topArtists" :key="artist.id" class="artist-chip" @click="openArtistDetail(artist)">
          <span class="artist-avatar hover-scale-image" :style="{ backgroundImage: `url(${artist.picUrl || artist.img1v1Url || ''})` }"></span>
          <span class="artist-name">{{ artist.name }}</span>
        </button>
        <span
          ref="topArtistsSentinel"
          class="top-artists-sentinel"
          aria-hidden="true"
        ></span>
      </HorizontalScrollRail>
      <p v-if="topArtistsLoading && topArtists.length" class="custom-tip artists-loading">加载更多歌手中…</p>
    </section>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="home-grid" :style="gridStyle">
      <AnimatedAppear
        v-for="widget in widgets"
        :key="widget.id"
        tag="section"
        variant="content"
        rhythm="body"
        class-name="card"
        :class="widget.id"
        :style="cellStyle(widget)"
        :ref="widget.id === 'list' ? setHotListCardRef : widget.id === 'albums' ? setAlbumCardRef : null"
      >
        <template v-if="widget.id === 'tags'">
          <AnimatedAppear tag="h3" variant="title" rhythm="head">分类</AnimatedAppear>
          <div class="tag-grid">
            <AnimatedAppear
              v-for="(tag, idx) in tags"
              :key="tag"
              tag="button"
              variant="control"
              rhythm="list"
              :index="idx"
              class-name="tag"
              @click="openPlaylistCategory(tag)"
            >
              {{ tag }}
            </AnimatedAppear>
          </div>
        </template>

        <template v-else-if="widget.id === 'list'">
          <AnimatedAppear tag="h3" variant="title" rhythm="head">本周最热音乐</AnimatedAppear>
          <ul class="music-list">
            <AnimatedAppear
              v-for="(song, idx) in songs"
              :key="song.id"
              tag="li"
              variant="text"
              rhythm="list"
              :index="idx"
              class-name="song"
              :class="{ 'song-item--playing': Number(song?.id) > 0 && Number(song?.id) === Number(playerStore.currentSongId || 0), playing: Number(song?.id) > 0 && Number(song?.id) === Number(playerStore.currentSongId || 0) }"
              @dblclick="onSongRowDblClick($event, idx)"
            >
              <AnimatedAppear tag="div" variant="media" rhythm="list" :index="idx" class-name="cover hover-scale-image" :style="{ backgroundImage: `url(${song.al?.picUrl || ''})` }" />
              <div class="meta">
                <div class="name">{{ song.name }}</div>
                <div class="artist">
                  <button
                    v-for="artist in getTrackArtists(song)"
                    :key="`${song.id}-${artist.id || artist.name}`"
                    type="button"
                    class="artist-inline-btn"
                    @click.stop="openArtistDetail(artist)"
                  >
                    {{ artist.name || '未知歌手' }}
                  </button>
                  <span v-if="!getTrackArtists(song).length">未知歌手</span>
                </div>
              </div>
              <div class="ops">
                <AnimatedAppear tag="div" variant="control" rhythm="actions" :index="idx" class-name="icon-btn-wrap"><BookmarkIconButton :song-id="song.id" :liked="typeof song?.liked === 'boolean' ? song.liked : typeof song?.isLiked === 'boolean' ? song.isLiked : undefined" /></AnimatedAppear>
                <PlayPauseIconButton :song-id="Number(song?.id || 0)" @play="playSong(idx)" />
              </div>
            </AnimatedAppear>
          </ul>
          <p v-if="hotSongsLoading" class="list-hint">加载中…</p>
          <p v-else-if="!hotSongsHasMore && songs.length" class="list-hint">已经到底啦</p>
          <div :ref="setHotSongsSentinelRef" class="list-sentinel" aria-hidden="true"></div>
        </template>

        <template v-else-if="widget.id === 'albums'">
          <AnimatedAppear tag="h3" variant="title" rhythm="head">最新专辑推荐</AnimatedAppear>
          <p v-if="albumLoading" class="custom-tip">专辑加载中…</p>
          <p v-else-if="!albums.length" class="custom-tip">{{ albumLoadNote || '未获取到专辑数据' }}</p>
          <div class="album-grid" v-if="albums.length">
            <AnimatedAppear
              v-for="(item, idx) in visibleAlbums"
              :key="item.id"
              tag="button"
              variant="media"
              rhythm="list"
              :index="idx"
              class-name="album album-gradient-card hover-play-button-trigger"
              :style="{ '--album-cover': `url(${item.pic || ''})` }"
              @click="openAlbumDetail(item.id)"
            >
              <div class="album-media-shell album-cover" :style="{ backgroundImage: `url(${item.pic})` }">
                <div class="album-cover-motion-shell"></div>
                <HoverPlayButton class="hover-play-button--sm" />
              </div>
              <div class="album-name">{{ item.name }}</div>
              <div class="album-artist">
                <button
                  v-for="artist in getAlbumArtists(item)"
                  :key="`${item.id}-${artist.id || artist.name}`"
                  type="button"
                  class="artist-inline-btn"
                  @click.stop="openArtistDetail(artist)"
                >
                  {{ artist.name || '未知歌手' }}
                </button>
                <span v-if="!getAlbumArtists(item).length">{{ item.artist }}</span>
              </div>
            </AnimatedAppear>
          </div>
          <p v-if="albums.length && visibleAlbumCount >= albums.length" class="list-hint">已经到底啦</p>
          <div :ref="setAlbumSentinelRef" class="list-sentinel" aria-hidden="true"></div>
        </template>

        <template v-else-if="widget.id === 'latest-music'">
          <AnimatedAppear tag="h3" variant="title" rhythm="head">新歌速递</AnimatedAppear>
          <p v-if="latestMusicLoading" class="custom-tip">最新音乐加载中…</p>
          <p v-else-if="latestMusicError" class="custom-tip">{{ latestMusicError }}</p>
          <HorizontalScrollRail
            v-else
            ref="latestScrollRailRef"
            aria-label="新歌速递"
            content-class="latest-scroll"
            content-layout="block"
            :min-scroll="320"
            @rail-scroll="onLatestScroll"
            @rail-wheel="onLatestWheel"
          >
            <div class="latest-track">
              <div v-for="(band, bandIdx) in latestBands" :key="`band-${bandIdx}`" class="latest-band">
                <div v-for="(col, colIdx) in band" :key="`band-${bandIdx}-col-${colIdx}`" class="latest-column">
                  <AnimatedAppear
                    v-for="(song, rowIdx) in col"
                    :key="song.id"
                    tag="button"
                    variant="text" rhythm="body"
                    :index="bandIdx * 12 + colIdx * 4 + rowIdx"
                    class-name="latest-row"
                    :class="{ 'song-item--playing': Number(song?.id) > 0 && Number(song?.id) === Number(playerStore.currentSongId || 0) }"
                    @click="playLatestSong(song.__idx)"
                  >
                    <div class="latest-cover" :style="{ backgroundImage: `url(${song.al?.picUrl || song.album?.picUrl || ''})` }"></div>
                    <div class="latest-meta">
                      <div class="latest-name">{{ song.name }}</div>
                      <div class="latest-artist">
                        <button
                          v-for="artist in getTrackArtists(song)"
                          :key="`${song.id}-${artist.id || artist.name}`"
                          type="button"
                          class="artist-inline-btn"
                          @click.stop="openArtistDetail(artist)"
                        >
                          {{ artist.name || '未知歌手' }}
                        </button>
                        <span v-if="!getTrackArtists(song).length">{{ song.__artistDisplay || '未知歌手' }}</span>
                      </div>
                    </div>
                  </AnimatedAppear>
                </div>
              </div>
            </div>
          </HorizontalScrollRail>
        </template>

        <template v-else-if="widget.id === 'search-hot'">
          <AnimatedAppear tag="h3" variant="title" rhythm="head">热搜榜</AnimatedAppear>
          <ol class="hot-list">
            <li v-for="(item, idx) in hotList" :key="item" class="hot-item" @click="quickSearch(item)">
              <span class="rank">{{ idx + 1 }}</span>
              <span class="kw">{{ item }}</span>
            </li>
          </ol>
        </template>

        <template v-else-if="widget.id === 'search-history'">
          <AnimatedAppear tag="h3" variant="title" rhythm="head">搜索历史</AnimatedAppear>
          <div class="history-tags">
            <button v-for="item in searchHistory" :key="item" class="tag" @click="quickSearch(item)">{{ item }}</button>
            <p v-if="!searchHistory.length" class="custom-tip">暂无搜索历史</p>
          </div>
        </template>

        <template v-else-if="widget.id === 'settings-theme'">
          <AnimatedAppear tag="h3" variant="title" rhythm="head">主题模式</AnimatedAppear>
          <p class="custom-desc">快速切换浅色/深色/跟随系统</p>
          <select class="theme-select" :value="uiStore.themeMode" @change="onThemeChange">
            <option value="浅色">浅色</option>
            <option value="深色">深色</option>
            <option value="跟随系统">跟随系统</option>
          </select>
        </template>

        <template v-else>
          <AnimatedAppear tag="h3" variant="title" rhythm="head">{{ widget.title }}</AnimatedAppear>
          <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="custom-desc">{{ widget.content }}</AnimatedAppear>
          <AnimatedAppear tag="p" variant="text" rhythm="body" :index="1" class-name="custom-tip">来自其他页面组件，可继续扩展真实内容。</AnimatedAppear>
        </template>
      </AnimatedAppear>
    </AnimatedAppear>

    <div v-if="showEditor" class="editor-overlay" @click.self="showEditor = false">
      <AnimatedAppear tag="div" variant="modal" rhythm="overlay" class-name="editor-modal">
        <div class="editor-modal-head">
          <h3>首页布局编辑</h3>
          <button class="close-btn" @click="showEditor = false">关闭</button>
        </div>

        <GridLayoutEditor
          storage-key="tm_home_widget_layout_v1"
          :initial-layout="defaultLayout"
          :catalog="catalog"
          @saved="onHomeLayoutSaved"
        />
      </AnimatedAppear>
    </div>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getArtistDetail, getPersonalFm, getPlaylistDetail, getRecommendPlaylists, getRecommendSongs, getNewestAlbums, getTopAlbums, getTopArtists, getTopSongs, searchMusic } from '../api/music';
import { getUserCreatedPlaylist } from '../api/auth';
import { playerStore } from '../stores/player';
import { uiStore } from '../stores/ui';
import { userStore } from '../stores/user';
import AnimatedAppear from './AnimatedAppear.vue';
import HoverPlayButton from './HoverPlayButton.vue';
import GridLayoutEditor from './GridLayoutEditor.vue';
import BookmarkIconButton from './ui/BookmarkIconButton.vue';
import PlayPauseIconButton from './ui/PlayPauseIconButton.vue';
import HorizontalScrollRail from './ui/HorizontalScrollRail.vue';
import type { GridItem } from './GridLayoutEditor.vue';

const emit = defineEmits<{
  (e: 'open-detail', playlistId: number, coverUrl?: string, returnPage?: string): void;
  (e: 'open-daily-list', songs: any[]): void;
  (e: 'open-album-detail', albumId: number): void;
  (e: 'open-playlist-category', category: string): void;
  (e: 'open-search', keyword: string): void;
  (e: 'open-artist', artist: any): void;
  (e: 'open-user', userId: number): void;
}>();

const GRID_COLS = 12;
const GRID_ROW_HEIGHT = 72;
const GRID_GAP = 12;
const HOME_LAYOUT_KEY = 'tm_home_widget_layout_v1';

const showEditor = ref(false);

const defaultLayout: GridItem[] = [
  { id: 'tags', x: 0, y: 0, w: 8, h: 2, title: '分类模块', content: '首页分类标签区域' },
  { id: 'list', x: 0, y: 2, w: 8, h: 8, title: '热门音乐模块', content: '首页热门音乐列表区域' },
  { id: 'albums', x: 8, y: 0, w: 4, h: 10, title: '专辑推荐模块', content: '首页专辑推荐区域' },
  { id: 'latest-music', x: 0, y: 10, w: 12, h: 4, title: '最新音乐组件', content: '首页最新音乐卡片流' },
];

const catalog = [
  ...defaultLayout,
  { id: 'search-hot', x: 0, y: 14, w: 4, h: 3, title: '热搜榜组件', content: '来自搜索页：热搜关键词榜单', defaultW: 4, defaultH: 3 },
  { id: 'search-history', x: 4, y: 14, w: 4, h: 3, title: '搜索历史组件', content: '来自搜索页：历史记录与快捷复用', defaultW: 4, defaultH: 3 },
  { id: 'settings-theme', x: 8, y: 14, w: 4, h: 3, title: '主题设置组件', content: '来自设置页：主题模式快速切换', defaultW: 4, defaultH: 3 },
];

const widgets = ref<GridItem[]>(JSON.parse(JSON.stringify(defaultLayout)));

const tags = ['综艺', '流行', '影视原声', '华语', 'ACG', '摇滚', '民谣', '电子', '说唱', '轻音乐'];
const hotList = ['周杰伦', '林俊杰', '邓紫棋', '告五人', '影视原声', '华语热歌', '王菲', '陈奕迅'];
const searchHistory = ref<string[]>(JSON.parse(localStorage.getItem('tm_search_history') || '[]'));
const topArtists = ref<any[]>([]);
const topArtistsLoading = ref(false);
const topArtistsError = ref('');
const topArtistsOffset = ref(0);
const topArtistsHasMore = ref(true);
const ARTISTS_PAGE_SIZE = 24;
const songs = ref<any[]>([]);
const hotSongsLoading = ref(false);
const hotSongsHasMore = ref(true);
const hotSongsOffset = ref(0);
const hotSongsLimit = 12;
const hotSongsSentinel = ref<HTMLElement | null>(null);
const hotListCardRef = ref<HTMLElement | null>(null);
let hotSongsObserver: IntersectionObserver | null = null;

function setHotListCardRef(el: any) {
  const element = el instanceof HTMLElement ? el : el?.$el instanceof HTMLElement ? el.$el : null;
  hotListCardRef.value = element;
}

function setHotSongsSentinelRef(el: any) {
  const element = el instanceof HTMLElement ? el : el?.$el instanceof HTMLElement ? el.$el : null;
  hotSongsSentinel.value = element;
}

function setAlbumCardRef(el: any) {
  const element = el instanceof HTMLElement ? el : el?.$el instanceof HTMLElement ? el.$el : null;
  albumCardRef.value = element;
}

function setAlbumSentinelRef(el: any) {
  const element = el instanceof HTMLElement ? el : el?.$el instanceof HTMLElement ? el.$el : null;
  albumSentinel.value = element;
}

const dailyRecommendSongs = ref<any[]>([]);
const dailyRecommendLoading = ref(false);
const dailyRecommendError = ref('');
const radarTopTracks = ref<any[]>([]);
const radarCoverUrl = ref('');
const privateRadar = ref<Array<{ id: number; name: string; picUrl?: string }>>([]);
const privateRadarLoading = ref(false);
const privateRadarError = ref('');
const publicRecoLoading = ref(false);
const publicRecoError = ref('');
const dailyRecommendCoverUrl = computed(() => dailyRecommendSongs.value[0]?.al?.picUrl || dailyRecommendSongs.value[0]?.album?.picUrl || dailyRecommendSongs.value[0]?.album?.blurPicUrl || dailyRecommendSongs.value[0]?.picUrl || dailyRecommendSongs.value[0]?.coverImgUrl || '');
const dailyRecommendHeroTitle = computed(() => dailyRecommendSongs.value[0]?.name || '每日推荐');
const dailyRecommendHeroSubtitle = computed(() => dailyRecommendSongs.value[0]?.ar?.map((a: any) => a.name).join('/') || '每日为你更新的歌曲');
const dailyRecommendTracks = computed(() => dailyRecommendSongs.value.slice(0, 3));
const isUidLogin = computed(() => userStore.loginMode === 'uid');
const publicRecoPlaylists = ref<Array<{ id: number; name: string; coverImgUrl?: string; picUrl?: string; creator?: any }>>([]);
const publicRecoTracks = ref<any[]>([]);
const publicRecoCoverUrl = ref('');
const dailyRecoRadar = computed(() => privateRadar.value.find((item) => item.name.includes('私人雷达')) || null);
const topRecoCard = computed(() => (isUidLogin.value ? publicRecoPlaylists.value[0] || null : dailyRecoRadar.value));
const topRecoTracks = computed(() => (isUidLogin.value ? publicRecoTracks.value : radarTopTracks.value));
const topRecoCardTitle = computed(() => (isUidLogin.value ? '我的喜欢' : '私人雷达'));
const topRecoCardSubtitle = computed(() => {
  const fallback = isUidLogin.value ? '当前账号的公开创建歌单' : '你的偏好音乐';
  return `${topRecoCardTitle.value}｜从「${topRecoTracks.value[0]?.name || fallback}」听起`;
});
const topRecoCardCoverUrl = computed(() => (
  isUidLogin.value
    ? userStore.profile?.avatarUrl || publicRecoCoverUrl.value || topRecoCard.value?.coverImgUrl || topRecoCard.value?.picUrl || ''
    : radarCoverUrl.value
));
const topRecoLoading = computed(() => (isUidLogin.value ? publicRecoLoading.value : privateRadarLoading.value));
const topRecoError = computed(() => (isUidLogin.value ? publicRecoError.value : privateRadarError.value));
const topRecoEmptyText = computed(() => (isUidLogin.value ? '该用户暂未公开创建歌单' : '暂无推荐内容'));
const personalFmTracks = ref<any[]>([]);
const personalFmLoading = ref(false);
const personalFmError = ref('');
const personalFmCoverUrl = computed(() => {
  const first = personalFmTracks.value[0];
  return first?.album?.picUrl || first?.al?.picUrl || first?.artists?.[0]?.img1v1Url || '';
});
const fmControlColor = computed(() => playerStore.themePrimary || 'var(--theme-primary)');
const fmControlContrastColor = computed(() => (playerStore.isDarkMode ? 'rgba(255, 255, 255, 0.96)' : 'rgba(255, 255, 255, 0.92)'));
const isPersonalFmCurrentTrack = computed(() => playerStore.isPersonalFmTrack(playerStore.currentTrack));
const isPersonalFmPlaying = computed(() => isPersonalFmCurrentTrack.value && playerStore.isPlaying);
const playToggleIconSvg = computed(() => {
  const fill = isPersonalFmPlaying.value ? fmControlContrastColor.value : fmControlColor.value;
  return isPersonalFmPlaying.value
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="${fill}" /><rect x="14" y="5" width="4" height="14" rx="1.5" fill="${fill}" /></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6.5v11a1 1 0 0 0 1.53.848l8.5-5.5a1 1 0 0 0 0-1.696l-8.5-5.5A1 1 0 0 0 8 6.5Z" fill="${fill}" /></svg>`;
});
const dislikeIconSvg = computed(() => {
  const stroke = fmControlColor.value;
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.8 5.5H6.9c-.93 0-1.74.64-1.95 1.54l-1.14 4.9a2 2 0 0 0 1.95 2.46h3.38l-.53 3.92a1.85 1.85 0 0 0 3.4 1.18l4.3-6.14c.2-.28.3-.62.3-.97V7.4a1.9 1.9 0 0 0-1.9-1.9h-3.9Zm7.15 0h1.65A1.4 1.4 0 0 1 21 6.9v6.95a1.4 1.4 0 0 1-1.4 1.4h-1.65V5.5Z" fill="none" stroke="${stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
});
const nextIconSvg = computed(() => {
  const stroke = fmControlColor.value;
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6.75v10.5a.85.85 0 0 0 1.34.7L15 12.7a.85.85 0 0 0 0-1.4L7.34 6.05A.85.85 0 0 0 6 6.75Zm10.75-.25v11" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
});
const fmPlayTitle = computed(() => (isPersonalFmPlaying.value ? '暂停私人 FM' : '播放私人 FM'));
const fmDislikeTitle = computed(() => '不喜欢并切换下一首');
const fmNextTitle = computed(() => '下一首私人 FM');
const albums = ref<Array<{ id: number; name: string; artist: string; pic: string }>>([]);
const albumLoading = ref(false);
const albumLoadNote = ref('');
const latestSongs = ref<any[]>([]);
const latestMusicLoading = ref(false);
const latestMusicError = ref('');
const latestMusicType = ref<0 | 7 | 96 | 8 | 16>(0);
const latestSongsLimit = 12;
const latestSongsOffset = ref(0);
const latestSongsHasMore = ref(true);
const latestLoadingMore = ref(false);
const latestScrollRailRef = ref<InstanceType<typeof HorizontalScrollRail> | null>(null);
const latestSongSource = ref<any[]>([]);
const latestArtistNameCache = new Map<number, string>();
const topArtistsSentinel = ref<HTMLElement | null>(null);
const latestBands = computed(() => {
  const bandSize = 12;
  const cols = 3;
  const result: any[][][] = [];
  for (let offset = 0; offset < latestSongs.value.length; offset += bandSize) {
    const chunk = latestSongs.value.slice(offset, offset + bandSize);
    const perCol = Math.max(1, Math.ceil(chunk.length / cols));
    const band = Array.from({ length: cols }, (_, i) => chunk.slice(i * perCol, (i + 1) * perCol)).filter((col) => col.length);
    if (band.length) result.push(band);
  }
  return result;
});
let latestScrollRaf = 0;
let latestWheelRaf = 0;
let latestWheelDelta = 0;

const visibleAlbumCount = ref(0);
const albumPageSize = 4;
const albumSentinel = ref<HTMLElement | null>(null);
const albumCardRef = ref<HTMLElement | null>(null);
let albumObserver: IntersectionObserver | null = null;

const visibleAlbums = computed(() => albums.value.slice(0, visibleAlbumCount.value));

const gridStyle = computed(() => {
  const maxRow = Math.max(...widgets.value.map((w) => w.y + w.h), 8);
  return {
    '--cols': String(GRID_COLS),
    '--row-h': `${GRID_ROW_HEIGHT}px`,
    '--gap': `${GRID_GAP}px`,
    minHeight: `${maxRow * GRID_ROW_HEIGHT + (maxRow - 1) * GRID_GAP}px`,
  };
});

function cellStyle(item: GridItem) {
  return {
    gridColumn: `${item.x + 1} / span ${item.w}`,
    gridRow: `${item.y + 1} / span ${item.h}`,
  };
}

function hydrateHomeLayout() {
  const raw = localStorage.getItem(HOME_LAYOUT_KEY);
  if (!raw) {
    widgets.value = JSON.parse(JSON.stringify(defaultLayout));
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    widgets.value = Array.isArray(parsed) && parsed.length ? parsed : JSON.parse(JSON.stringify(defaultLayout));
  } catch {
    widgets.value = JSON.parse(JSON.stringify(defaultLayout));
  }
}

function onHomeLayoutSaved(payload: unknown) {
  if (Array.isArray(payload)) {
    widgets.value = payload as GridItem[];
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showEditor.value) {
    showEditor.value = false;
  }
}

async function loadMoreHotSongs() {
  if (hotSongsLoading.value || !hotSongsHasMore.value) return;

  hotSongsLoading.value = true;
  try {
    const data = await searchMusic('华语 热门', { limit: hotSongsLimit, offset: hotSongsOffset.value });
    const incoming = (data?.result?.songs || []) as any[];
    const existingIds = new Set(songs.value.map((s) => s.id));
    const uniqueIncoming = incoming.filter((s) => !existingIds.has(s.id));

    songs.value = [...songs.value, ...uniqueIncoming];
    hotSongsOffset.value += incoming.length;
    hotSongsHasMore.value = incoming.length >= hotSongsLimit;
  } catch {
    hotSongsHasMore.value = false;
  } finally {
    hotSongsLoading.value = false;
  }
}

function setupHotSongsObserver() {
  const target = hotSongsSentinel.value;
  if (!(target instanceof Element)) return;
  if (hotSongsObserver) hotSongsObserver.disconnect();

  const rootCandidate = hotListCardRef.value;
  const validRoot = rootCandidate instanceof Element || rootCandidate instanceof Document ? rootCandidate : null;

  hotSongsObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting) {
        void loadMoreHotSongs();
      }
    },
    {
      root: validRoot,
      threshold: 0,
      rootMargin: '80px 0px 80px 0px',
    },
  );

  hotSongsObserver.observe(target);
}

function loadMoreAlbums() {
  if (!albums.value.length) {
    visibleAlbumCount.value = 0;
    return;
  }
  visibleAlbumCount.value = Math.min(visibleAlbumCount.value + albumPageSize, albums.value.length);
}

function ensureAlbumScrollable() {
  const root = albumCardRef.value;
  if (!root) return;

  let guard = 0;
  while (root.scrollHeight <= root.clientHeight && visibleAlbumCount.value < albums.value.length && guard < 12) {
    loadMoreAlbums();
    guard += 1;
  }
}

function setupAlbumObserver() {
  const target = albumSentinel.value;
  if (!(target instanceof Element)) return;
  if (albumObserver) albumObserver.disconnect();

  const rootCandidate = albumCardRef.value;
  const validRoot = rootCandidate instanceof Element || rootCandidate instanceof Document ? rootCandidate : null;

  albumObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting) {
        loadMoreAlbums();
      }
    },
    {
      root: validRoot,
      threshold: 0,
      rootMargin: '100px 0px 120px 0px',
    },
  );

  albumObserver.observe(target);
}

async function fetchRadarPlaylistDetail() {
  const radar = dailyRecoRadar.value;
  if (!radar?.id) {
    radarTopTracks.value = [];
    radarCoverUrl.value = '';
    return;
  }

  try {
    const { data } = await getPlaylistDetail(radar.id, 8);
    const playlist = data?.playlist;
    radarTopTracks.value = (playlist?.tracks || []).slice(0, 8);

    const trackCover =
      playlist?.tracks?.[0]?.al?.picUrl ||
      playlist?.tracks?.[0]?.album?.picUrl ||
      playlist?.coverImgUrl ||
      playlist?.coverUrl ||
      playlist?.blurCoverImgUrl ||
      '';

    radarCoverUrl.value = trackCover;
  } catch {
    radarTopTracks.value = [];
    radarCoverUrl.value = '';
  }
}

async function fetchPublicRecoPlaylistDetail() {
  const playlist = publicRecoPlaylists.value[0];
  if (!playlist?.id) {
    publicRecoTracks.value = [];
    publicRecoCoverUrl.value = '';
    return;
  }

  try {
    const { data } = await getPlaylistDetail(playlist.id, 8);
    const detail = data?.playlist;
    publicRecoTracks.value = (detail?.tracks || []).slice(0, 8);
    publicRecoCoverUrl.value =
      detail?.coverImgUrl ||
      detail?.coverUrl ||
      detail?.blurCoverImgUrl ||
      detail?.tracks?.[0]?.al?.picUrl ||
      playlist.coverImgUrl ||
      playlist.picUrl ||
      '';
  } catch {
    publicRecoTracks.value = [];
    publicRecoCoverUrl.value = playlist.coverImgUrl || playlist.picUrl || '';
  }
}

async function fetchPublicRecoPlaylists() {
  if (!userStore.isLogin || !isUidLogin.value || !userStore.profile?.userId) {
    publicRecoPlaylists.value = [];
    publicRecoTracks.value = [];
    publicRecoCoverUrl.value = '';
    publicRecoError.value = '';
    publicRecoLoading.value = false;
    return;
  }

  publicRecoLoading.value = true;
  publicRecoError.value = '';

  try {
    const { data } = await getUserCreatedPlaylist(userStore.profile.userId, 8, 0);
    const list = Array.isArray(data?.playlist)
      ? data.playlist
      : Array.isArray(data?.list)
        ? data.list
        : Array.isArray(data?.data?.playlist)
          ? data.data.playlist
          : [];
    const uid = userStore.profile?.userId;
    const createdList = uid ? list.filter((item: any) => Number(item?.creator?.userId || item?.userId || 0) === Number(uid)) : list;

    publicRecoPlaylists.value = createdList
      .filter((item: any) => Number(item?.id || 0) > 0)
      .map((item: any) => ({
        ...item,
        creator: item?.creator || userStore.profile || null,
      }));

    await fetchPublicRecoPlaylistDetail();

    if (!publicRecoPlaylists.value.length) {
      publicRecoError.value = '该用户暂未公开创建歌单';
    }
  } catch (e: any) {
    publicRecoPlaylists.value = [];
    publicRecoTracks.value = [];
    publicRecoCoverUrl.value = '';
    publicRecoError.value = e?.message || '公开歌单获取失败，请稍后重试';
  } finally {
    publicRecoLoading.value = false;
  }
}

async function fetchDailyRecommendPlaylists() {
  privateRadarLoading.value = true;
  privateRadarError.value = '';

  try {
    const { data } = await getRecommendPlaylists(userStore.loginCookie || undefined);
    privateRadar.value = data?.recommend || [];
    await fetchRadarPlaylistDetail();
  } catch (e: any) {
    privateRadar.value = [];
    radarTopTracks.value = [];
    radarCoverUrl.value = '';
    privateRadarError.value = e?.message || '私人雷达歌单获取失败，请稍后重试';
  } finally {
    privateRadarLoading.value = false;
  }
}

async function fetchDailyRecommendSongs() {
  dailyRecommendLoading.value = true;
  dailyRecommendError.value = '';
  try {
    const { data } = await getRecommendSongs(userStore.loginCookie || undefined);
    console.log('[HomePanel][recommend/songs] raw response', data);
    console.log('[HomePanel][recommend/songs] data keys', data ? Object.keys(data) : null);
    console.log('[HomePanel][recommend/songs] nested data keys', data?.data ? Object.keys(data.data) : null);
    console.log('[HomePanel][recommend/songs] nested result keys', data?.result ? Object.keys(data.result) : null);
    const list = Array.isArray(data?.recommend) ? data.recommend : Array.isArray(data?.songs) ? data.songs : Array.isArray(data?.data) ? data.data : Array.isArray(data?.data?.dailySongs) ? data.data.dailySongs : Array.isArray(data?.data?.recommend) ? data.data.recommend : Array.isArray(data?.data?.songs) ? data.data.songs : Array.isArray(data?.result?.songs) ? data.result.songs : [];
    console.log('[HomePanel][recommend/songs] parsed list length', list.length, list[0]);
    dailyRecommendSongs.value = list;
    playerStore.defaultPlaylist = list;
  } catch (e: any) {
    console.error('[HomePanel][recommend/songs] request failed', e);
    dailyRecommendSongs.value = [];
    dailyRecommendError.value = e?.message || '每日推荐加载失败，请稍后重试';
  } finally {
    dailyRecommendLoading.value = false;
  }
}

async function requestPersonalFmBatch() {
  const { data } = await getPersonalFm(userStore.loginCookie || undefined);
  return (data?.data || []) as any[];
}

let topArtistsObserver: IntersectionObserver | null = null;

function setupTopArtistsObserver() {
  if (topArtistsObserver) topArtistsObserver.disconnect();
  const sentinel = topArtistsSentinel.value;
  if (!(sentinel instanceof Element)) return;

  topArtistsObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && !topArtistsLoading.value && topArtistsHasMore.value) {
        loadMoreTopArtists();
      }
    },
    { root: sentinel.closest('.horizontal-scroll-rail__content'), threshold: 0.1 },
  );
  topArtistsObserver.observe(sentinel);
}

function syncPersonalFmViewFromPlayer() {
  if (playerStore.personalFmTrackIds.length) {
    const ids = new Set(playerStore.personalFmTrackIds);
    const fmPlaylist = playerStore.playlist.filter((track) => ids.has(Number(track?.id || 0)));
    if (fmPlaylist.length) {
      personalFmTracks.value = fmPlaylist;
      return;
    }
  }
}

async function fetchPersonalFm() {
  personalFmLoading.value = true;
  personalFmError.value = '';

  try {
    playerStore.setPersonalFmFetcher(requestPersonalFmBatch);
    const batch = await requestPersonalFmBatch();
    personalFmTracks.value = batch;
    playerStore.personalFmHasMore = batch.length > 0;
    playerStore.persist();
    if (!personalFmTracks.value.length) {
      personalFmError.value = '暂未获取到私人 FM 内容';
    }
  } catch (e: any) {
    personalFmTracks.value = [];
    playerStore.personalFmHasMore = false;
    playerStore.persist();
    personalFmError.value = e?.message || '私人 FM 获取失败，请稍后重试';
  } finally {
    personalFmLoading.value = false;
  }
}

function normalizeAlbums(list: any[]) {
  return list
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      artist: item.artist?.name || item.artists?.map((a: any) => a.name).join('/') || item.ar?.map((a: any) => a.name).join('/') || '未知歌手',
      pic: item.picUrl || item.blurPicUrl || item.al?.picUrl || '',
    }))
    .filter((x: any) => x.id && x.name);
}

async function resolveArtistDisplay(song: any) {
  const fallbackArtist = song.ar?.map((a: any) => a.name).join('/') || song.artist?.name || song.artists?.map((a: any) => a.name).join('/') || '';
  const artistId = song.ar?.[0]?.id || song.artist?.id || song.artists?.[0]?.id;

  if (!artistId) return fallbackArtist || '未知歌手';

  if (latestArtistNameCache.has(artistId)) {
    return latestArtistNameCache.get(artistId) || fallbackArtist || '未知歌手';
  }

  try {
    const { data: artistData } = await getArtistDetail(artistId);
    const officialName = artistData?.data?.artist?.name || artistData?.artist?.name || fallbackArtist || '未知歌手';
    latestArtistNameCache.set(artistId, officialName);
    return officialName;
  } catch {
    return fallbackArtist || '未知歌手';
  }
}

async function normalizeLatestSongs(list: any[], baseOffset: number) {
  const limited = list.slice(0, latestSongsLimit);
  return Promise.all(
    limited.map(async (song: any, idx: number) => ({
      ...song,
      __artistDisplay: await resolveArtistDisplay(song),
      __idx: baseOffset + idx,
    })),
  );
}

function splitLatestColumns(page: any[]) {
  const colCount = 3;
  const perCol = Math.ceil(page.length / colCount);
  return Array.from({ length: colCount }, (_, c) => page.slice(c * perCol, (c + 1) * perCol)).filter((col) => col.length);
}

async function loadMoreLatestSongs() {
  if (latestLoadingMore.value || !latestSongsHasMore.value) return;

  latestLoadingMore.value = true;
  try {
    const chunk = latestSongSource.value.slice(latestSongsOffset.value, latestSongsOffset.value + latestSongsLimit);
    const normalized = await normalizeLatestSongs(chunk, latestSongs.value.length);

    latestSongs.value = [...latestSongs.value, ...normalized];
    latestSongsOffset.value += chunk.length;
    latestSongsHasMore.value = latestSongsOffset.value < latestSongSource.value.length;
  } catch (e: any) {
    latestMusicError.value = e?.message || '新歌速递获取失败，请稍后重试';
    latestSongsHasMore.value = false;
  } finally {
    latestLoadingMore.value = false;
  }
}

function setTopArtistsSentinelRef(el: any) {
  const element = el instanceof HTMLElement ? el : el?.$el instanceof HTMLElement ? el.$el : null;
  topArtistsSentinel.value = element;
  if (element) {
    setupTopArtistsObserver();
  }
}

function prefetchLatestIfNeeded(root: HTMLElement) {
  if (latestLoadingMore.value || !latestSongsHasMore.value) return;
  const remain = root.scrollWidth - root.clientWidth - root.scrollLeft;
  if (remain < 320) {
    void loadMoreLatestSongs();
  }
}

function onLatestScroll(_event: Event, root: HTMLElement) {
  if (latestScrollRaf) return;

  latestScrollRaf = requestAnimationFrame(() => {
    latestScrollRaf = 0;
    prefetchLatestIfNeeded(root);
  });
}

function onLatestWheel(e: WheelEvent, root: HTMLElement) {
  latestWheelDelta += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

  if (latestWheelRaf) return;

  latestWheelRaf = requestAnimationFrame(() => {
    latestWheelRaf = 0;
    if (!latestWheelDelta) return;
    root.scrollLeft += latestWheelDelta;
    latestWheelDelta = 0;
    prefetchLatestIfNeeded(root);
  });
}

async function fetchLatestMusic() {
  latestMusicLoading.value = true;
  latestMusicError.value = '';
  latestSongs.value = [];
  latestSongsOffset.value = 0;
  latestSongsHasMore.value = true;
  latestSongSource.value = [];

  try {
    const { data } = await getTopSongs(latestMusicType.value);
    latestSongSource.value = (data?.data || []) as any[];

    await loadMoreLatestSongs();
    if (latestSongsHasMore.value) {
      await loadMoreLatestSongs();
    }

    if (!latestSongs.value.length) {
      latestMusicError.value = '暂未获取到新歌速递';
    }

    nextTick(() => {
      if (typeof latestScrollRailRef.value?.scrollToStart === 'function') { latestScrollRailRef.value.scrollToStart(); }
    });
  } catch (e: any) {
    latestSongs.value = [];
    latestSongSource.value = [];
    latestMusicError.value = e?.message || '新歌速递获取失败，请稍后重试';
  } finally {
    latestMusicLoading.value = false;
  }
}

async function fetchTopArtists() {
  topArtistsLoading.value = true;
  topArtistsError.value = '';

  try {
    const { data } = await getTopArtists({ limit: ARTISTS_PAGE_SIZE, offset: 0 });
    const list = (data?.artists || data?.data?.artists || data?.list || []);
    topArtists.value = list;
    topArtistsOffset.value = list.length;
    topArtistsHasMore.value = list.length >= ARTISTS_PAGE_SIZE;
    if (!topArtists.value.length) {
      topArtistsError.value = '暂未获取到热门歌手';
    }
  } catch (e: any) {
    topArtists.value = [];
    topArtistsError.value = e?.message || '热门歌手获取失败，请稍后重试';
  } finally {
    topArtistsLoading.value = false;
  }
  // 首屏加载完成后立即预加载下一页，确保滑动到末端时数据已就位
  if (topArtistsHasMore.value) {
    loadMoreTopArtists();
  }
}

async function loadMoreTopArtists() {
  if (topArtistsLoading.value || !topArtistsHasMore.value) return;
  topArtistsLoading.value = true;
  try {
    const { data } = await getTopArtists({ limit: ARTISTS_PAGE_SIZE, offset: topArtistsOffset.value });
    const list = (data?.artists || data?.data?.artists || data?.list || []);
    if (!list.length) {
      topArtistsHasMore.value = false;
      return;
    }
    const existingIds = new Set(topArtists.value.map((a) => a.id));
    const unique = list.filter((a) => !existingIds.has(a.id));
    topArtists.value = [...topArtists.value, ...unique];
    topArtistsOffset.value += list.length;
    topArtistsHasMore.value = list.length >= ARTISTS_PAGE_SIZE;
  } catch {
    // 静默失败，保留已有数据
  } finally {
    topArtistsLoading.value = false;
    if (topArtistsHasMore.value) {
      requestAnimationFrame(() => setupTopArtistsObserver());
    }
  }
}

async function fetchTopAlbums() {
  albumLoading.value = true;
  albumLoadNote.value = '';

  try {
    const now = new Date();
    const topResp = await getTopAlbums({
      area: 'ALL',
      type: 'new',
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      limit: 12,
      offset: 0,
    });

    const topData = topResp?.data || {};
    const topPayload = topData?.monthData || topData?.weekData || topData?.data?.monthData || topData?.data?.weekData || [];
    albums.value = normalizeAlbums(topPayload).slice(0, 12);

    if (albums.value.length) {
      albumLoadNote.value = '来源：/top/album';
      return;
    }

    const newestResp = await getNewestAlbums();
    const newestData = newestResp?.data || {};
    const newestPayload = newestData?.albums || newestData?.data?.albums || newestData?.result?.albums || [];
    albums.value = normalizeAlbums(newestPayload).slice(0, 12);
    if (albums.value.length) {
      albumLoadNote.value = '来源：/album/newest';
      return;
    }

    const songFallback = await searchMusic('新歌 热门', { limit: 60, offset: 0 });
    const songAlbums = (songFallback?.result?.songs || []).map((s: any) => s.al || s.album).filter(Boolean);
    const uniq = new Map<number, any>();
    songAlbums.forEach((al: any) => {
      if (al?.id && !uniq.has(al.id)) uniq.set(al.id, al);
    });
    albums.value = Array.from(uniq.values())
      .map((al: any) => ({
        id: al.id,
        name: al.name,
        artist: al.artist?.name || al.artists?.map((a: any) => a.name).join('/') || '未知歌手',
        pic: al.picUrl || al.blurPicUrl || '',
      }))
      .filter((x: any) => x.id && x.name)
      .slice(0, 12);

    if (albums.value.length) {
      albumLoadNote.value = '来源：搜索兜底';
      return;
    }

    albums.value = [
      { id: 1, name: '暂无可用专辑数据', artist: '请检查后端 API', pic: '' },
    ];
    albumLoadNote.value = '接口返回为空（/top/album 与兜底均为空）';
  } catch {
    albums.value = [
      { id: 1, name: '专辑接口请求失败', artist: '请检查 API 服务', pic: '' },
    ];
    albumLoadNote.value = '请求失败：请确认后端已开启并支持 /top/album';
  } finally {
    albumLoading.value = false;
    visibleAlbumCount.value = 0;
    loadMoreAlbums();
    nextTick(() => {
      ensureAlbumScrollable();
      setupAlbumObserver();
    });
  }
}

onMounted(async () => {
  hydrateHomeLayout();
  window.addEventListener('keydown', onKeydown);

  await loadMoreHotSongs();
  await nextTick();
  setupHotSongsObserver();

  await Promise.all([fetchDailyRecommendSongs(), fetchDailyRecommendPlaylists(), fetchPublicRecoPlaylists(), fetchPersonalFm(), fetchTopArtists(), fetchTopAlbums(), fetchLatestMusic()]);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  if (hotSongsObserver) {
    hotSongsObserver.disconnect();
    hotSongsObserver = null;
  }
  if (albumObserver) {
    albumObserver.disconnect();
    albumObserver = null;
  }
  if (latestScrollRaf) {
    cancelAnimationFrame(latestScrollRaf);
    latestScrollRaf = 0;
  }
  if (topArtistsObserver) {
    topArtistsObserver.disconnect();
    topArtistsObserver = null;
  }
  if (topArtistsSentinel.value) {
    topArtistsSentinel.value = null;
  }
  if (latestWheelRaf) {
    cancelAnimationFrame(latestWheelRaf);
    latestWheelRaf = 0;
  }
});

watch(
  () => [userStore.isLogin, userStore.loginMode, userStore.profile?.userId],
  async () => {
    await Promise.all([fetchDailyRecommendSongs(), fetchDailyRecommendPlaylists(), fetchPublicRecoPlaylists(), fetchPersonalFm()]);
  },
);

watch(
  () => uiStore.themeMode,
  (mode) => {
    playerStore.syncThemeState(mode);
    playerStore.persist();
  },
  { immediate: true },
);

watch(
  () => [playerStore.playlist.length, playerStore.currentIndex, playerStore.personalFmTrackIds.length],
  () => {
    syncPersonalFmViewFromPlayer();
  },
);

function quickSearch(keyword: string) {
  const clean = keyword.trim();
  if (!clean) return;
  const next = [clean, ...searchHistory.value.filter((x) => x !== clean)].slice(0, 12);
  searchHistory.value = next;
  localStorage.setItem('tm_search_history', JSON.stringify(next));
  emit('open-search', clean);
}

function onThemeChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value;
  if (value === '浅色' || value === '深色' || value === '跟随系统') {
    uiStore.setThemeMode(value);
  }
}

function getTrackArtists(track: any) {
  const artists = Array.isArray(track?.ar)
    ? track.ar
    : Array.isArray(track?.artists)
      ? track.artists
      : Array.isArray(track?.album?.artists)
        ? track.album.artists
        : [];
  return artists.filter((artist: any) => artist?.id || artist?.name);
}

function getAlbumArtists(item: any) {
  const artists = Array.isArray(item?.artists)
    ? item.artists
    : item?.artist
      ? [item.artist]
      : [];
  return artists.filter((artist: any) => artist?.id || artist?.name);
}

function resolvePlaylistCreatorId(item: any) {
  return Number(item?.creator?.userId || item?.creator?.id || item?.userId || item?.uid || 0);
}

function resolvePlaylistCreatorName(item: any) {
  return item?.creator?.nickname || item?.creator?.userName || item?.nickname || item?.userName || '创建者';
}

function openPlaylistCategory(category: string) {
  if (!category?.trim()) return;
  emit('open-playlist-category', category.trim());
}

function openArtistDetail(artist: any) {
  const artistId = Number(artist?.id || artist?.artistId || 0);
  if (!artistId) return;
  emit('open-artist', artist);
}

function openUserDetailById(userId: number) {
  const normalizedId = Number(userId || 0);
  if (!normalizedId) return;
  emit('open-user', normalizedId);
}

function openDailyRecommendDetail() {
  if (!dailyRecommendSongs.value.length) return;
  emit('open-daily-list', dailyRecommendSongs.value);
}

function openRecoDetail(playlistId: number) {
  if (!playlistId) return;
  const cover = topRecoCardCoverUrl.value || '';
  emit('open-detail', playlistId, cover, 'home');
}

function openAlbumDetail(albumId: number) {
  if (!albumId) return;
  emit('open-album-detail', albumId);
}

async function playDailyRecommendByIndex(index: number) {
  if (!dailyRecommendSongs.value.length) return;
  playerStore.setPlaylist(dailyRecommendSongs.value, index);
  await playerStore.playByIndex(index);
}

async function playRadarTop() {
  if (!radarTopTracks.value.length) return;
  playerStore.setPlaylist(radarTopTracks.value, 0);
  await playerStore.playByIndex(0);
}

async function playRecoByIndex(index: number) {
  if (!topRecoTracks.value.length) return;
  playerStore.setPlaylist(topRecoTracks.value, index);
  await playerStore.playByIndex(index);
}

async function playPersonalFmByIndex(index: number) {
  if (!personalFmTracks.value.length) return;
  playerStore.setPersonalFmFetcher(requestPersonalFmBatch);
  playerStore.personalFmHasMore = true;
  playerStore.setPersonalFmPlaylist(personalFmTracks.value, index);
  await playerStore.playByIndex(index);
  syncPersonalFmViewFromPlayer();
}

async function togglePersonalFmPlayback() {
  if (!personalFmTracks.value.length) return;

  if (!isPersonalFmCurrentTrack.value) {
    await playPersonalFmByIndex(0);
    return;
  }

  await playerStore.togglePlay();
}

async function nextPersonalFm() {
  if (!personalFmTracks.value.length) return;

  if (!isPersonalFmCurrentTrack.value) {
    await playPersonalFmByIndex(0);
    return;
  }

  await playerStore.next();
  syncPersonalFmViewFromPlayer();
}

async function dislikePersonalFm() {
  if (!personalFmTracks.value.length) return;

  if (!isPersonalFmCurrentTrack.value) {
    await playPersonalFmByIndex(0);
  }

  const disliked = await playerStore.dislikeCurrentPersonalFm(userStore.loginCookie || undefined);
  syncPersonalFmViewFromPlayer();

  if (!disliked) {
    await nextPersonalFm();
    return;
  }

  if (!personalFmTracks.value.length) {
    await fetchPersonalFm();
  }
}

function onSongRowDblClick(event: MouseEvent, index: number) {
  const target = event.target as HTMLElement | null;
  if (target?.closest('button, a, input, select, textarea, [role="button"]')) return;
  void playSong(index);
}

async function playSong(index: number) {
  if (!songs.value.length) return;
  playerStore.setPlaylist(songs.value, index);
  await playerStore.playByIndex(index);
}

async function playLatestSong(index: number) {
  if (!latestSongs.value.length) return;
  playerStore.setPlaylist(latestSongs.value, index);
  await playerStore.playByIndex(index);
}
</script>

<style scoped>
@import '../styles/hover-play-button.css';
.home-page { display: grid; gap: var(--space-3); min-width: 0; overflow-x: clip; }
.home-actions { display: flex; justify-content: flex-end; }
.top-artists-section { display: grid; gap: var(--space-2); padding: 0; }
:deep(.top-artists-row) { --horizontal-scroll-gap: var(--space-5); --horizontal-scroll-padding-bottom: 0; display: flex; align-items: flex-start; padding-top: var(--space-1); scroll-snap-type: none !important; }
:deep(.top-artists-row) > * { flex: 0 0 auto; }
.artist-chip {
  flex: 0 0 auto;
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  border: none !important;
  background: transparent !important;
  padding: 0;
  margin: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
  line-height: inherit;
  appearance: none;
  -webkit-appearance: none;
  outline: none !important;
  box-shadow: none !important;
  -webkit-tap-highlight-color: transparent;
}
.artist-chip::-moz-focus-inner { border: 0; padding: 0; }
.artist-chip::before,
.artist-chip::after {
  content: none !important;
  display: none !important;
}
.artist-chip:hover,
.artist-chip:active,
.artist-chip:focus,
.artist-chip:focus-visible {
  background: transparent !important;
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}
.artist-avatar { width: 92px; height: 92px; border-radius: 999px; background: center/cover no-repeat; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12); }
.artist-name { color: var(--text-main); font-size: 14px; font-weight: 600; max-width: 96px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.artist-inline-btn + .artist-inline-btn.latest-splitter::before { color: var(--text-soft); }
.creator-inline-btn {
  margin-top: 10px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
  font-weight: 600;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.home-actions { display: flex; justify-content: flex-end; }
.edit-btn { height: 34px; padding: 0 var(--space-3); border-radius: 10px; border: 1px solid var(--border); background: var(--bg-muted); color: var(--text-main); cursor: pointer; transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease, color 0.16s ease; }
.edit-btn:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--accent) 34%, var(--border)); box-shadow: 0 10px 18px color-mix(in srgb, var(--accent) 10%, transparent); }
.edit-btn:active { transform: translateY(0) scale(0.99); }
.edit-btn.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.home-top-reco { display: flex; gap: var(--space-3); }
.top-mini-card { flex: 1; min-width: 0; padding: var(--space-3); display: grid; gap: var(--space-2); }
.mini-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
.mini-head h3 { margin: 0; color: var(--text-main); font-size: 16px; }
.mini-tip { font-size: 12px; color: var(--text-soft); }
.mini-desc { margin: 0; color: var(--text-sub); font-size: 13px; line-height: 1.5; }
.mini-desc.error { color: color-mix(in srgb, #ef4444 76%, var(--text-main)); }
.daily-card { padding: 0; border-radius: 12px; overflow: hidden; }
.daily-hero.poster { position: relative; width: 100%; height: 344px; border: none; padding: 0; margin: 0; background: var(--bg-soft); cursor: pointer; overflow: hidden; display: block; }
.daily-bg { position: absolute; inset: 0; background: center/cover no-repeat; filter: saturate(0.88) contrast(0.9); }
.daily-hero.poster::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(17, 24, 39, 0.08) 0%, rgba(75, 85, 99, 0.22) 38%, rgba(107, 114, 128, 0.58) 72%, rgba(107, 114, 128, 0.86) 100%); }
.daily-poster-top { position: absolute; left: 16px; top: 14px; display: flex; align-items: center; gap: var(--space-2); z-index: 2; }
.daily-calendar { width: 26px; height: 26px; border-radius: 8px; background: rgba(255,255,255,0.86); color: var(--text-soft); font-size: 12px; font-weight: 700; display: grid; place-items: center; }
.daily-top-title { color: #fff; font-size: 40px; font-weight: 800; letter-spacing: 1px; text-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.daily-bottom-zone { position: absolute; left: 0; right: 0; bottom: 0; z-index: 4; display: grid; gap: 0; background: linear-gradient(180deg, rgba(107, 114, 128, 0.04) 0%, rgba(107, 114, 128, 0.22) 26%, rgba(107, 114, 128, 0.56) 58%, rgba(107, 114, 128, 0.84) 100%); }
.daily-poster-bottom { display: block; padding: var(--space-4) var(--space-4) var(--space-5); color: #fff; font-size: 18px; font-weight: 700; line-height: 1.35; text-align: left; transform: translateY(0); transition: transform 320ms ease, opacity 320ms ease; }
.daily-hover-list { display: grid; gap: 6px; padding: 0 var(--space-3) var(--space-3); opacity: 0; max-height: 0; overflow: hidden; transform: translateY(12px); transition: max-height 320ms ease, transform 320ms ease, opacity 320ms ease; pointer-events: none; }
.daily-hover-item { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; gap: 8px; color: #fff; border: none; background: transparent; padding: 0; text-align: left; cursor: pointer; }
.daily-hover-item:hover .daily-hover-name { text-decoration: underline; }
.daily-hover-rank { font-size: 12px; font-weight: 700; text-align: center; color: rgba(255, 255, 255, 0.95); }
.daily-hover-name { display: block; justify-self: start; width: 100%; text-align: left; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.daily-hover-artist { justify-self: end; text-align: right; font-size: 12px; color: rgba(255, 255, 255, 0.82); max-width: 96px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.daily-hero.poster:hover .daily-poster-bottom,
.daily-hero.poster:focus-visible .daily-poster-bottom,
.daily-bottom-zone:hover .daily-poster-bottom,
.daily-bottom-zone:focus-within .daily-poster-bottom { transform: translateY(-8px); }
.daily-hero.poster:hover .daily-hover-list,
.daily-hero.poster:focus-visible .daily-hover-list,
.daily-bottom-zone:hover .daily-hover-list,
.daily-bottom-zone:focus-within .daily-hover-list { opacity: 1; max-height: 140px; transform: translateY(0); }

.radar-card { padding: 0; border-radius: 12px; overflow: hidden; }
.radar-hero.poster { position: relative; width: 100%; height: 344px; border: none; padding: 0; margin: 0; background: #9ca3af; cursor: pointer; overflow: hidden; display: block; }
.radar-bg { position: absolute; inset: 0; background: center/cover no-repeat; filter: saturate(0.88) contrast(0.9); }
.radar-hero.poster::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(17, 24, 39, 0.08) 0%, rgba(75, 85, 99, 0.22) 38%, rgba(107, 114, 128, 0.58) 72%, rgba(107, 114, 128, 0.86) 100%); }
.radar-poster-top { position: absolute; left: 16px; top: 14px; display: flex; align-items: center; gap: var(--space-2); z-index: 2; }
.radar-calendar { width: 26px; height: 26px; border-radius: 8px; background: rgba(255,255,255,0.86); color: var(--text-soft); font-size: 12px; font-weight: 700; display: grid; place-items: center; }
.radar-top-title { color: #fff; font-size: 40px; font-weight: 800; letter-spacing: 1px; text-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.radar-bottom-zone { position: absolute; left: 0; right: 0; bottom: 0; z-index: 4; display: grid; gap: 0; background: linear-gradient(180deg, rgba(107, 114, 128, 0.04) 0%, rgba(107, 114, 128, 0.22) 26%, rgba(107, 114, 128, 0.56) 58%, rgba(107, 114, 128, 0.84) 100%); }
.radar-poster-bottom { display: block; padding: 16px 18px 20px; color: #fff; font-size: 18px; font-weight: 700; line-height: 1.35; text-align: left; transform: translateY(0); transition: transform 320ms ease, opacity 320ms ease; }
.radar-hover-list { display: grid; gap: 6px; padding: 0 14px 14px; opacity: 0; max-height: 0; overflow: hidden; transform: translateY(12px); transition: max-height 320ms ease, transform 320ms ease, opacity 320ms ease; pointer-events: none; }
.radar-hover-item { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; gap: 8px; color: #fff; }
.radar-hover-rank { font-size: 12px; font-weight: 700; text-align: center; color: rgba(255, 255, 255, 0.95); }
.radar-hover-name { display: block; justify-self: start; width: 100%; text-align: left; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.radar-hover-artist { justify-self: end; text-align: right; font-size: 12px; color: rgba(255, 255, 255, 0.82); max-width: 96px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.radar-hero.poster:hover .radar-poster-bottom,
.radar-hero.poster:focus-visible .radar-poster-bottom,
.radar-bottom-zone:hover .radar-poster-bottom,
.radar-bottom-zone:focus-within .radar-poster-bottom { transform: translateY(-8px); }
.radar-hero.poster:hover .radar-hover-list,
.radar-hero.poster:focus-visible .radar-hover-list,
.radar-bottom-zone:hover .radar-hover-list,
.radar-bottom-zone:focus-within .radar-hover-list { opacity: 1; max-height: 140px; transform: translateY(0); }

.fm-card { padding: 0; border-radius: 12px; overflow: hidden; }
.fm-hero.poster { position: relative; width: 100%; height: 344px; border: none; padding: 0; margin: 0; background: #9ca3af; cursor: pointer; overflow: hidden; display: block; }
.fm-bg { position: absolute; inset: 0; background: center/cover no-repeat; filter: saturate(0.88) contrast(0.9); }
.fm-hero.poster::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(17, 24, 39, 0.08) 0%, rgba(75, 85, 99, 0.22) 38%, rgba(107, 114, 128, 0.58) 72%, rgba(107, 114, 128, 0.86) 100%); }
.fm-poster-top { position: absolute; left: 16px; top: 14px; display: flex; align-items: center; gap: 10px; z-index: 2; }
.fm-top-title { color: #fff; font-size: 40px; font-weight: 800; letter-spacing: 1px; text-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.fm-bottom-zone { position: absolute; left: 0; right: 0; bottom: 0; z-index: 4; display: grid; gap: 12px; background: linear-gradient(180deg, rgba(107, 114, 128, 0.04) 0%, rgba(107, 114, 128, 0.22) 26%, rgba(107, 114, 128, 0.56) 58%, rgba(107, 114, 128, 0.84) 100%); }
.fm-poster-bottom { display: block; padding: 16px 18px 0; color: #fff; font-size: 18px; font-weight: 700; line-height: 1.35; text-align: left; transform: translateY(0); transition: transform 320ms ease, opacity 320ms ease; }
.fm-control-panel { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 4px 18px 18px; opacity: 0; max-height: 0; overflow: visible; transform: translateY(12px); transition: max-height 320ms ease, transform 320ms ease, opacity 320ms ease; pointer-events: none; will-change: transform, opacity; }
.fm-control-btn {
  border: none;
  background: transparent;
  color: var(--theme-primary);
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 180ms ease, filter 180ms ease;
  pointer-events: auto;
  will-change: transform, filter;
}
.fm-control-btn--ghost {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: var(--glass-reflection), color-mix(in srgb, rgba(255, 255, 255, 0.18) 82%, transparent);
  backdrop-filter: blur(var(--glass-blur, 10px));
  -webkit-backdrop-filter: blur(var(--glass-blur, 10px));
  box-shadow: var(--glass-highlight), 0 10px 24px rgba(15, 23, 42, 0.16);
}
.fm-control-btn--primary {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: var(--glass-reflection), color-mix(in srgb, var(--theme-primary) 26%, rgba(255, 255, 255, 0.3));
  backdrop-filter: blur(var(--glass-blur, 10px));
  -webkit-backdrop-filter: blur(var(--glass-blur, 10px));
  box-shadow: var(--glass-highlight), 0 14px 32px color-mix(in srgb, var(--theme-primary) 24%, rgba(15, 23, 42, 0.28));
}
:global(.dark) .fm-control-btn--ghost,
:global([data-theme='dark']) .fm-control-btn--ghost {
  background: var(--glass-reflection), color-mix(in srgb, rgba(15, 23, 42, 0.72) 86%, transparent);
}
:global(.dark) .fm-control-btn--primary,
:global([data-theme='dark']) .fm-control-btn--primary {
  background: var(--glass-reflection), color-mix(in srgb, var(--theme-primary) 34%, rgba(15, 23, 42, 0.44));
}
.fm-control-btn:hover,
.fm-control-btn:focus-visible {
  transform: scale(1.08);
  filter: saturate(1.08) brightness(0.94);
}
.fm-control-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, #fff 64%, var(--theme-primary));
  outline-offset: 3px;
}
.fm-control-icon { display: inline-flex; width: 24px; height: 24px; }
.fm-control-btn--primary .fm-control-icon { width: 24px; height: 24px; }
.fm-control-icon :deep(svg) { width: 100%; height: 100%; }
.fm-hero.poster:hover .fm-poster-bottom,
.fm-hero.poster:focus-visible .fm-poster-bottom,
.fm-bottom-zone:hover .fm-poster-bottom,
.fm-bottom-zone:focus-within .fm-poster-bottom { transform: translateY(-8px); }
.fm-hero.poster:hover .fm-control-panel,
.fm-hero.poster:focus-visible .fm-control-panel,
.fm-bottom-zone:hover .fm-control-panel,
.fm-bottom-zone:focus-within .fm-control-panel { opacity: 1; max-height: 140px; transform: translateY(0); pointer-events: auto; }
.home-grid { width: 100%; min-width: 0; display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); grid-auto-rows: var(--row-h); gap: var(--gap); }
.card { border: 1px solid var(--border); border-radius: 16px; background: var(--bg-surface); padding: var(--layout-card-padding); padding-top: calc(var(--layout-card-padding) + 10px); overflow: hidden; }
.card.list,
.card.albums { overflow-y: auto; overflow-x: hidden; }
.card.list::-webkit-scrollbar,
.card.albums::-webkit-scrollbar { width: 0; height: 0; }
.card.list,
.card.albums { scrollbar-width: none; }
.card h3 { margin: 0 0 var(--space-3); color: var(--text-main); }
.tag-grid { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.tag { border: 1px solid var(--border); background: var(--bg-muted); color: var(--text-sub); border-radius: 999px; padding: var(--space-1) var(--space-3); cursor: pointer; transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease; }
.tag:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--accent) 34%, var(--border)); box-shadow: 0 10px 18px color-mix(in srgb, var(--accent) 10%, transparent); }
.tag:active { transform: translateY(0) scale(0.99); }
.music-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; }
.list-hint { margin: var(--space-2) 0 0; text-align: center; font-size: 12px; color: var(--text-soft); }
.list-sentinel { width: 100%; height: 1px; }
.song { display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; }
.song.playing { border: 1px solid color-mix(in srgb, var(--accent) 44%, var(--border)); background: color-mix(in srgb, var(--accent) 15%, var(--bg-surface)); }
.cover { width: 56px; height: 56px; border-radius: 12px; background: var(--bg-soft) center/cover no-repeat; }
.name { color: var(--text-main); font-weight: 600; }
.artist { color: var(--text-soft); font-size: 12px; }
.ops { display: flex; gap: 8px; }
.icon-btn-wrap { display: inline-flex; align-items: center; }
.album-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.album {
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  border-radius: 12px;
}
.album-gradient-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--album-cover);
  background-size: cover;
  background-position: center;
  opacity: 0.9;
  filter: saturate(0.92) contrast(0.96);
}
.album-gradient-card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.2) 28%,
    rgba(255, 255, 255, 0.52) 62%,
    rgba(255, 255, 255, 0.92) 100%
  );
}
.album-gradient-card .album-cover,
.album-gradient-card .album-name,
.album-gradient-card .album-artist {
  position: relative;
  z-index: 2;
}
.album-cover { --hover-play-button-size: 30px; --hover-play-button-offset: 8px; position: relative; overflow: hidden; width: 100%; aspect-ratio: 1; border-radius: 12px; background: var(--bg-soft) center/cover no-repeat; }
.album-media-shell {
  transform: translateZ(0);
}
.album-cover-motion-shell {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: inherit;
  background-size: cover;
  background-position: center;
  transition:
    transform var(--image-hover-duration, var(--an-duration-base)) var(--image-hover-ease, var(--an-ease)),
    filter var(--image-hover-duration, var(--an-duration-base)) var(--image-hover-ease, var(--an-ease));
  transform: scale(1);
  transform-origin: center center;
  will-change: transform;
}
@media (hover: hover) and (pointer: fine) {
  .album-media-shell:hover .album-cover-motion-shell,
  .album-media-shell:focus-within .album-cover-motion-shell {
    transform: scale(var(--image-hover-scale, 1.04));
    filter: saturate(var(--image-hover-saturate, 1.04));
  }
}
.album-name {
  margin: 8px var(--space-2) 0;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.42;
}
.album-artist {
  margin: 2px var(--space-2) var(--space-2);
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.35;
}
:deep(.latest-scroll) {
  --horizontal-scroll-gap: 0;
  --horizontal-scroll-padding-bottom: 0;
}
.latest-track {
  display: flex;
  gap: var(--space-4);
  width: max-content;
  min-width: 100%;
  will-change: transform;
  contain: layout paint;
}
.latest-band {
  display: flex;
  gap: var(--space-3);
  flex: 0 0 auto;
  contain: content;
}
.latest-column {
  display: grid;
  gap: var(--space-2);
  width: 300px;
  flex: 0 0 300px;
  contain: content;
}
.latest-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 10px;
  padding: var(--space-1) var(--space-2);
  text-align: left;
  cursor: pointer;
  transition: background-color 180ms ease, transform 180ms ease;
}
.latest-row:hover,
.latest-row:focus-visible {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  transform: translateX(2px);
}
.latest-cover {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: var(--bg-soft) center/cover no-repeat;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
  flex-shrink: 0;
}
.latest-meta { min-width: 0; }
.latest-name {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.latest-artist {
  color: var(--text-soft);
  font-size: 12px;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.latest-artist .artist-inline-btn + .artist-inline-btn::before,
.artist .artist-inline-btn + .artist-inline-btn::before,
.album-artist .artist-inline-btn + .artist-inline-btn::before {
  color: var(--text-soft);
}
.custom-desc { color: var(--text-sub); margin: 0; }
.custom-tip { color: var(--text-soft); font-size: 12px; margin: var(--space-2) 0 0; }
.hot-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.hot-item { display: grid; grid-template-columns: 24px 1fr; gap: 8px; padding: 6px 8px; border-radius: 8px; cursor: pointer; }
.hot-item:hover { background: var(--bg-muted); }
.rank { font-weight: 700; color: var(--accent); text-align: center; }
.kw { color: var(--text-main); }
.history-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.theme-select { margin-top: 8px; height: 34px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-muted); color: var(--text-main); padding: 0 10px; }
.editor-overlay { position: fixed; inset: 0; background: color-mix(in srgb, #000 28%, transparent); display: grid; place-items: center; z-index: 120; padding: 24px; box-sizing: border-box; }
.editor-modal { width: min(1080px, calc(100vw - 72px)); max-height: calc(100vh - 96px); background: var(--bg-surface); border: 1px solid var(--border); border-radius: 16px; padding: var(--space-3); box-sizing: border-box; overflow: auto; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.35); }
.editor-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.editor-modal-head h3 { margin: 0; font-size: 16px; color: var(--text-main); }
.close-btn { height: 32px; padding: 0 var(--space-3); border-radius: 10px; border: 1px solid var(--border); background: var(--bg-muted); color: var(--text-main); cursor: pointer; }
@media (max-width: 980px) {
  .home-top-reco { flex-direction: column; }
  :deep(.top-artists-row) { --horizontal-scroll-gap: 16px; }
  .artist-avatar { width: 78px; height: 78px; }
  .latest-column { width: 280px; flex-basis: 280px; }
}

@media (max-width: 767px) {
  .home-grid { grid-template-columns: repeat(8, minmax(0, 1fr)); }
  :deep(.top-artists-row) { --horizontal-scroll-gap: 14px; }
  .artist-avatar { width: 72px; height: 72px; }
  .card { grid-column: 1 / -1 !important; grid-row: auto !important; }
  .latest-column { width: 260px; flex-basis: 260px; }
  .editor-overlay { padding: 12px; }
  .editor-modal { width: calc(100vw - 24px); max-height: calc(100vh - 24px); padding: 10px; }
}
</style>
