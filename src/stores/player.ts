import { reactive } from 'vue';
import { getSongDetail, getSongUrlV1, trashPersonalFm } from '../api/music';
import { tryUnblockMatch } from '../api/unblock';
import { userStore } from './user';
import { hydrateCache, getCache, setCache } from './unblock-cache';
import { recordLocalHistoryEntry } from '../utils/localHistory';

type Artist = { name: string };
type Album = { name?: string; picUrl?: string };
type TrackSource = 'song' | 'podcast' | 'cloud';
type PodcastMeta = { rid?: number; programId?: number; createTime?: number };
type ThemeMode = '浅色' | '深色' | '跟随系统';
type PersonalFmFetcher = () => Promise<any[]>;

export type Track = {
  id: number;
  name: string;
  ar?: Artist[];
  al?: Album;
  url?: string;
  source?: TrackSource;
  podcast?: PodcastMeta;
  liked?: boolean;
  isLiked?: boolean;
  // 播客单集简介
  description?: string;
  // 云盘歌曲专用
  cloudSid?: number;
  cloudOwnerId?: number;
  uid?: number;
};

const PLAYER_STORAGE_KEY = 'gm_player_state_v1';
let _persistTimer: ReturnType<typeof setTimeout> | null = null;

function formatTrack(raw: any): Track {
  return {
    id: raw.id,
    name: raw.name,
    ar: raw.ar || raw.artists || [],
    al: raw.al || raw.album || {},
    url: raw.url,
    source: raw.source === 'podcast' ? 'podcast' : raw.source === 'cloud' ? 'cloud' : 'song',
    podcast: raw.podcast,
    liked: Boolean(raw.liked || raw.isLiked),
    isLiked: Boolean(raw.isLiked || raw.liked),
    description: raw.description,
    cloudSid: raw.cloudSid,
    cloudOwnerId: raw.cloudOwnerId,
    uid: raw.uid,
  };
}


const QUALITY_LEVELS: Record<string, string> = {
  '标准': 'standard',
  '较高': 'higher',
  '极高(HQ)': 'exhigh',
  '无损(SQ)': 'lossless',
  'Hi-Res': 'hires',
  '高清臻音': 'jyeffect',
  '高清环绕声': 'jyeffect',
  '沉浸环绕声': 'sky',
  '杜比全景声': 'dolby',
  '超清母带': 'jymaster',
};

/** 各音质等级的最低比特率阈值，低于此值判定为 API 静默降级 */
const QUALITY_MIN_BR: Record<string, number> = {
  'standard': 128000,
  'higher': 192000,
  'exhigh': 320000,
  'lossless': 800000,
  'hires': 1920000,
  'jyeffect': 1920000,
  'sky': 1920000,
  'dolby': 1920000,
  'jymaster': 1920000,
};

/** 需要 VIP 的音质 API level（免费用户不可请求） */
const VIP_ONLY_API_LEVELS = new Set([
  'lossless',
  'hires',
  'jyeffect',
  'sky',
  'dolby',
  'jymaster',
]);


function formatQualityBr(br: number): string {
  if (br >= 1920000) return 'Hi-Res';
  if (br >= 999000) return '无损(SQ)';
  if (br >= 320000) return '极高(HQ)';
  if (br >= 192000) return '较高';
  if (br >= 128000) return '标准';
  return '';
}

function toApiLevel(label: string): string {
  return QUALITY_LEVELS[label] || 'exhigh';
}

export const playerStore = reactive({
  audio: new Audio(),
  playlist: [] as Track[],
  currentIndex: -1,
  currentTrack: null as Track | null,
  currentSongId: 0,
  currentQualityBr: 0,
  currentQualityDowngraded: false,
  qualityDowngradeInfo: null as { from: string; to: string } | null,
  currentSource: 'official' as string,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  muted: false,
  volumeBeforeMute: 0.7,
  loading: false,
  defaultPlaylist: [] as any[],
  expanded: false,
  themePrimary: 'var(--theme-primary)',
  themeMode: '跟随系统' as ThemeMode,
  isDarkMode: false,
  personalFmTrackIds: [] as number[],
  personalFmFetcher: null as PersonalFmFetcher | null,
  personalFmLoadingMore: false,
  personalFmHasMore: true,
  personalFmPrefetchThreshold: 2,
  autoplayNext: true,
  playMode: 'loop' as 'loop' | 'single' | 'shuffle',
  crossfadeSec: 0,
  playbackRate: 1,
  defaultPlaybackRate: 1,
  defaultQuality: '较高' as '标准' | '较高' | '极高(HQ)' | '无损(SQ)' | 'Hi-Res' | '高清臻音' | '高清环绕声' | '沉浸环绕声' | '杜比全景声' | '超清母带',
  lyricsOffset: 0,

  init() {
    hydrateCache();
    this.audio.volume = this.volume;

    this.audio.ontimeupdate = () => {
      this.currentTime = this.audio.currentTime || 0;
    };

    this.audio.onloadedmetadata = () => {
      this.duration = this.audio.duration || 0;
    };

    this.audio.onended = () => {
      if (this.autoplayNext) this.next();
      else this.isPlaying = false;
    };

    this.audio.onplay = () => {
      this.isPlaying = true;
    };

    this.audio.onpause = () => {
      this.isPlaying = false;
    };

    this.hydrate();
  },

  persist() {
    if (_persistTimer) clearTimeout(_persistTimer);
    _persistTimer = setTimeout(() => {
      _persistTimer = null;
      const playlist = this.trimPlaylistForStorage();
    const defaultPlaylist = Array.isArray(this.defaultPlaylist) ? this.defaultPlaylist.slice(0, 50).map((t: any) =>
      t ? { id: t.id, name: t.name, ar: t.ar?.slice(0, 3) || [], al: t.al ? { name: t.al.name } : undefined } : t
    ) : [];
    const personalFmTrackIds = this.personalFmTrackIds.slice(0, 200);
    const payload = {
      playlist,
      currentIndex: this.currentIndex,
      volume: this.volume,
      muted: this.muted,
      volumeBeforeMute: this.volumeBeforeMute,
      autoplayNext: this.autoplayNext,
      playMode: this.playMode,
      crossfadeSec: this.crossfadeSec,
      defaultPlaybackRate: this.defaultPlaybackRate,
      defaultQuality: this.defaultQuality,
      themePrimary: this.themePrimary,
      themeMode: this.themeMode,
      isDarkMode: this.isDarkMode,
      personalFmTrackIds,
      personalFmHasMore: this.personalFmHasMore,
      defaultPlaylist,
    };
    try {
      const json = JSON.stringify(payload);
      localStorage.setItem(PLAYER_STORAGE_KEY, json);
      console.debug('[player] persist saved, defaultQuality:', payload.defaultQuality);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('[player] quota exceeded, trimming to 10 tracks');
        payload.playlist = this.trimPlaylistForStorage(10);
        payload.defaultPlaylist = [];
        payload.personalFmTrackIds = [];
        try {
          const json = JSON.stringify(payload);
          localStorage.setItem(PLAYER_STORAGE_KEY, json);
          console.debug('[player] persist saved (trimmed), defaultQuality:', payload.defaultQuality);
        } catch {
          console.warn('[player] quota still exceeded, removing key and retrying with empty data');
          try {
            localStorage.removeItem(PLAYER_STORAGE_KEY);
            localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify({ ...payload, playlist: [], defaultPlaylist: [] }));
            console.debug('[player] persist saved (empty fallback)');
          } catch (e2) {
            if (e2 instanceof DOMException && e2.name === 'QuotaExceededError') {
              console.warn('[player] localStorage full — other data consuming all quota, skipping persist');
            }
          }
        }
      }
    }
    }, 0);
  },

  trimPlaylistForStorage(maxEntries = 50) {
    if (this.playlist.length <= maxEntries) {
      return this.playlist.map((t) => ({
        id: t.id,
        name: t.name,
        ar: t.ar?.slice(0, 3) || [],
        al: t.al ? { name: t.al.name } : undefined,
        source: t.source,
        podcast: t.podcast,
      }));
    }
    const start = Math.max(0, this.currentIndex - 10);
    const trimmed = this.playlist.slice(start, start + maxEntries);
    return trimmed.map((t) => ({
      id: t.id,
      name: t.name,
      ar: t.ar?.slice(0, 3) || [],
      al: t.al ? { name: t.al.name } : undefined,
      source: t.source,
      podcast: t.podcast,
    }));
  },

  hydrate() {
    try {
      const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
      if (!raw) {
        this.syncThemeState();
        return;
      }
      const parsed = JSON.parse(raw);
      // 不恢复播放列表和播放状态，用户需要主动点击歌单或播放时才加载内容
      this.playlist = [];
      this.currentIndex = -1;
      this.currentTrack = null;
      this.currentSongId = 0;
      this.volume = typeof parsed.volume === 'number' ? parsed.volume : 0.7;
      this.muted = typeof parsed.muted === 'boolean' ? parsed.muted : false;
      this.volumeBeforeMute = typeof parsed.volumeBeforeMute === 'number' ? parsed.volumeBeforeMute : this.volume;
      this.audio.volume = this.muted ? 0 : this.volume;
      this.autoplayNext = typeof parsed.autoplayNext === 'boolean' ? parsed.autoplayNext : true;
      this.playMode = parsed.playMode === 'single' || parsed.playMode === 'shuffle' ? parsed.playMode : 'loop';
      this.crossfadeSec = typeof parsed.crossfadeSec === 'number' ? parsed.crossfadeSec : 0;
      this.playbackRate = 1;
      this.defaultPlaybackRate = typeof parsed.defaultPlaybackRate === 'number' ? parsed.defaultPlaybackRate : 1;
      const savedQuality = localStorage.getItem('gm_quality_v1');
      this.defaultQuality = QUALITY_LEVELS[savedQuality] != null ? savedQuality : (QUALITY_LEVELS[parsed.defaultQuality] != null ? parsed.defaultQuality : '较高');
      console.debug('[player] hydrate defaultQuality:', parsed.defaultQuality, '→', this.defaultQuality);
      this.themePrimary = typeof parsed.themePrimary === 'string' && parsed.themePrimary ? parsed.themePrimary : 'var(--theme-primary)';
      this.themeMode = parsed.themeMode === '浅色' || parsed.themeMode === '深色' || parsed.themeMode === '跟随系统' ? parsed.themeMode : '跟随系统';
      this.isDarkMode = typeof parsed.isDarkMode === 'boolean' ? parsed.isDarkMode : false;
      this.personalFmTrackIds = Array.isArray(parsed.personalFmTrackIds) ? parsed.personalFmTrackIds.map((id: unknown) => Number(id || 0)).filter((id: number) => id > 0) : [];
      this.personalFmHasMore = typeof parsed.personalFmHasMore === 'boolean' ? parsed.personalFmHasMore : true;
      this.defaultPlaylist = Array.isArray(parsed.defaultPlaylist) ? parsed.defaultPlaylist : [];
      this.audio.playbackRate = this.playbackRate;
      this.syncThemeState();
    } catch {
      this.syncThemeState();
    }
  },

  setPlaylist(list: any[], startIndex = 0) {
    this.playlist = list.map((x) => formatTrack(x));
    this.currentIndex = startIndex;
    this.persist();
  },

  setPersonalFmPlaylist(list: any[], startIndex = 0) {
    this.personalFmTrackIds = list.map((x) => Number(x?.id || 0)).filter((id) => id > 0);
    this.setPlaylist(list, startIndex);
  },

  appendPersonalFmTracks(list: any[]) {
    const incoming = list.map((x) => formatTrack(x));
    const existingIds = new Set(this.playlist.map((track) => track.id));
    const uniqueIncoming = incoming.filter((track) => track.id && !existingIds.has(track.id));

    if (!uniqueIncoming.length) return 0;

    this.playlist.push(...uniqueIncoming);
    this.personalFmTrackIds = [...new Set([...this.personalFmTrackIds, ...uniqueIncoming.map((track) => track.id)])];
    this.persist();
    return uniqueIncoming.length;
  },

  setPersonalFmFetcher(fetcher: PersonalFmFetcher | null) {
    this.personalFmFetcher = fetcher;
  },

  clearPersonalFmContext() {
    this.personalFmTrackIds = [];
    this.personalFmFetcher = null;
    this.personalFmLoadingMore = false;
    this.personalFmHasMore = true;
    this.persist();
  },

  isPersonalFmTrack(track?: Track | null) {
    const trackId = Number(track?.id || 0);
    return trackId > 0 && this.personalFmTrackIds.includes(trackId);
  },

  async ensurePersonalFmQueue(minRemaining?: number) {
    if (!this.personalFmFetcher || this.personalFmLoadingMore || !this.personalFmHasMore) return 0;
    const threshold = typeof minRemaining === 'number' ? minRemaining : this.personalFmPrefetchThreshold;
    const remaining = this.playlist.length - this.currentIndex - 1;
    if (remaining >= threshold) return 0;

    this.personalFmLoadingMore = true;
    try {
      const nextBatch = await this.personalFmFetcher();
      const appendedCount = this.appendPersonalFmTracks(nextBatch || []);
      this.personalFmHasMore = Array.isArray(nextBatch) && nextBatch.length > 0;
      this.persist();
      return appendedCount;
    } catch {
      this.personalFmHasMore = false;
      this.persist();
      return 0;
    } finally {
      this.personalFmLoadingMore = false;
    }
  },

  syncThemeState(themeMode?: ThemeMode) {
    if (themeMode) {
      this.themeMode = themeMode;
    }

    if (typeof window === 'undefined') {
      this.isDarkMode = this.themeMode === '深色';
      return;
    }

    const root = document.documentElement;
    const resolvedTheme = getComputedStyle(root).getPropertyValue('--theme-primary').trim();
    this.themePrimary = resolvedTheme || 'var(--theme-primary)';
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    const explicitTheme = root.dataset.theme;

    if (this.themeMode === '深色') {
      this.isDarkMode = true;
    } else if (this.themeMode === '浅色') {
      this.isDarkMode = false;
    } else if (explicitTheme === 'dark' || explicitTheme === 'light') {
      this.isDarkMode = explicitTheme === 'dark';
    } else {
      this.isDarkMode = prefersDark;
    }
  },

  async playByIndex(index: number) {
    if (!this.playlist[index]) {
      if (this.personalFmFetcher) {
        await this.ensurePersonalFmQueue(0);
      }
      if (!this.playlist[index]) return;
    }
    this.currentIndex = index;
    this.currentTrack = this.playlist[index];
    this.currentSongId = Number(this.currentTrack?.id || 0);
    this.persist();
    await this.playTrack(this.currentTrack);
    if (this.isPersonalFmTrack(this.currentTrack)) {
      void this.ensurePersonalFmQueue();
    }
  },

  async playTrack(track: Track, seekTo?: number) {
    this.qualityDowngradeInfo = null;
    // 切歌时重置播放速度为全局默认
    this.playbackRate = this.defaultPlaybackRate;
    this.audio.playbackRate = this.defaultPlaybackRate;
    this.loading = true;
    try {
      let playUrl = track.url || '';
      // 直连获取 URL + fee（绕过 proxy 拦截器，不重复调用）

      // 并行：fee 探测 + uiStore 导入 + 音源匹配（三者同时发起）
      const nocookie = userStore.loginCookie || undefined;
      let level = toApiLevel(this.defaultQuality);
      // 免费用户请求 VIP 音质时强制降为极高(HQ)
      if (!userStore.isVip && VIP_ONLY_API_LEVELS.has(level)) {
        level = 'exhigh';
      }
      const qs = `id=${track.id}&level=${level}${nocookie ? '&cookie=' + encodeURIComponent(nocookie) : ''}`;
      const feePromise = fetch(`/api/song/url/v1?${qs}`);
      const uiImport = import("../stores/ui");
      const cached = getCache(track.id);
      const { uiStore } = await uiImport;
      const matchPromise = (!cached && uiStore.unblockEnabled)
        ? tryUnblockMatch(track.id, uiStore.unblockSources)
        : null;

      // 1. 先等 fee 结果
      let isFreePlayable = false;
      let fee = 0;
      let hasTrial = false;
      try {
        const directRes = await feePromise;
        const directData = await directRes.json();
        const officialItem = Array.isArray(directData?.data) ? directData.data[0] : null;
        const officialCode = Number(officialItem?.code || 0);
        fee = Number(officialItem?.fee ?? 0);
        if (officialItem?.url) playUrl = officialItem.url;
        if (officialItem?.br > 0) this.currentQualityBr = officialItem.br;
        hasTrial = Boolean(officialItem?.freeTrialInfo);
        // 无试听限制 = 用户有完整播放权限（含 VIP 登录后 fee=1 的场景）
        isFreePlayable = officialCode === 200 && Boolean(playUrl) && !hasTrial;
        // 检测 API 静默降级：返回 br 低于该音质最低阈值
        const minBr = QUALITY_MIN_BR[level] || 0;
        this.currentQualityDowngraded = minBr > 0 && this.currentQualityBr > 0 && this.currentQualityBr < minBr;
        if (this.currentQualityDowngraded) {
          const actualQ = formatQualityBr(this.currentQualityBr);
          this.qualityDowngradeInfo = { from: this.defaultQuality, to: actualQ };
          // 仅记录降级信息，不修改用户偏好：下一首歌仍会以 defaultQuality 请求
          console.warn(
            `[quality-downgrade] API 静默降级: 请求 ${this.qualityDowngradeInfo.from} (level=${level}, minBr=${minBr}) → 实际 br=${this.currentQualityBr} ≥ 交付 ${actualQ}（用户偏好 ${this.defaultQuality} 未变）`
          );
        }
        console.log('[debug] direct fee:', { fee, hasTrial, officialCode, hasUrl: Boolean(playUrl), isFreePlayable });
      } catch (e) {
        console.warn('[debug] direct check failed:', e);
      }

      // 2. 官方可播 → 直接用；不可播 → 缓存/音源匹配
      if (isFreePlayable) {
        this.currentSource = "official";
      } else if (cached) {
        playUrl = cached.url;
        this.currentSource = cached.source;
        if (cached.br > 0) this.currentQualityBr = cached.br;
      } else if (matchPromise) {
        // 3. 付费/试听歌曲 - 等待匹配结果
        const result = await matchPromise;
        if (result?.url) {
          playUrl = result.url;
          this.currentSource = result.source || 'unblock';
          if (result.br > 0) this.currentQualityBr = result.br;
          setCache(track.id, { url: result.url, source: result.source || 'unblock', br: result.br || 0, size: result.size || 0, songName: track.name });
        }
      } else {
        this.currentSource = "official";
      }

      // ── 音质切换决策链路日志 ──
      const downgradeInfo = this.qualityDowngradeInfo;
      console.log(
        '[quality-switch] ═══════════════════════════════\n' +
        `  歌曲: ${track.name} (id=${track.id})\n` +
        `  请求音质: ${downgradeInfo?.from || this.defaultQuality} → API level: ${level}\n` +
        `  官方返回: br=${this.currentQualityBr}  fee=${fee}  hasTrial=${hasTrial}\n` +
        `  可直播: ${isFreePlayable}  |  缓存命中: ${!!cached}  |  unblock启用: ${uiStore.unblockEnabled}\n` +
        `  决策: ${isFreePlayable ? '✅ 使用官方音源' : cached ? '📦 命中缓存' : this.currentSource === 'official' ? '⚠️ 回退官方(无可替换)' : '🔀 unblock替换'}\n` +
        `  降级: ${downgradeInfo ? `⚠️ 是 (${downgradeInfo.from} → ${downgradeInfo.to})` : '否'}\n` +
        `  最终音源: ${this.currentSource}  |  比特率: ${this.currentQualityBr}  |  显示音质: ${this.defaultQuality}\n` +
        '[quality-switch] ═══════════════════════════════'
      );

      const wasPlaying = this.isPlaying;
      if (typeof seekTo === 'number') {
        console.log('[quality] playTrack with seekTo:', seekTo, '| wasPlaying:', wasPlaying, '| level:', this.defaultQuality);
      }
      // 背景获取歌曲详情，不阻塞播放
      if (track.id) {
        getSongDetail(track.id).then(res => {
          const detail = res?.data?.songs?.[0];
          if (detail && this.currentSongId === track.id) {
            const n = formatTrack(detail);
            this.currentTrack = {
              ...n, name: track.name || n.name,
              ar: track.ar?.length ? track.ar : n.ar,
              al: track.al?.picUrl || track.al?.name ? track.al : n.al,
              url: track.url || n.url, source: track.source || n.source,
              podcast: track.podcast || n.podcast,
              description: track.description || n.description,
              cloudSid: track.cloudSid || n.cloudSid,
              cloudOwnerId: track.cloudOwnerId || n.cloudOwnerId,
              uid: track.uid || n.uid,
            };
          }
        }).catch(() => {});
      }

      this.currentTrack = track;
      this.currentSongId = Number(track.id || 0);
	console.log("[playback] source:", this.currentSource, "| br:", this.currentQualityBr, "| id:", this.currentSongId, "| song:", track.name);
      if (!playUrl) {
          this.audio.removeAttribute('src');
        this.audio.load();
        this.isPlaying = false;
        this.persist();
        return false;
      }

      this.audio.src = playUrl;
      if (typeof seekTo === 'number' && seekTo > 0) {
        this.audio.currentTime = seekTo;
      }
      try {
        await this.audio.play();
      } catch {
        this.isPlaying = false;
        this.persist();
        return false;
      }
      this.isPlaying = true;
      if (typeof seekTo === 'number' && seekTo > 0 && wasPlaying) {
        this.audio.currentTime = seekTo;
      }

      this.recordCurrentTrackToHistory();

      if (this.currentIndex === -1) {
        const idx = this.playlist.findIndex((x) => x.id === this.currentSongId);
        this.currentIndex = idx;
      }

      this.persist();
      return true;
    } finally {
      this.loading = false;
    }
  },

  async togglePlay() {
    if (!this.currentTrack && this.playlist.length === 0 && this.defaultPlaylist.length > 0) {
      this.setPlaylist(this.defaultPlaylist, 0);
      await this.playByIndex(0);
      return;
    }
    if (!this.currentTrack && this.playlist.length > 0) {
      await this.playByIndex(Math.max(0, this.currentIndex));
      return;
    }

    // 刷新后可能仅恢复了歌曲信息，但 audio.src 尚未恢复
    // 此时直接 audio.play() 会失败，需要先重新拉取播放地址
    if (this.audio.paused) {
      const hasSource = Boolean(this.audio.src || this.audio.currentSrc);
      if (!hasSource && this.currentTrack) {
        await this.playTrack(this.currentTrack);
        return;
      }

      try {
        await this.audio.play();
        this.isPlaying = true;
      } catch {
        // 若播放地址失效或被浏览器策略拦截，回退到重新拉取地址再播放
        if (this.currentTrack) {
          await this.playTrack(this.currentTrack);
        }
      }
    } else {
      this.audio.pause();
      this.isPlaying = false;
    }
  },

  async next() {
    if (this.playlist.length === 0) return;

    const isPersonalFmMode = this.isPersonalFmTrack(this.currentTrack) && Boolean(this.personalFmFetcher);

    if (this.playMode === 'single' && !isPersonalFmMode) {
      await this.playByIndex(this.currentIndex);
      return;
    }

    if (this.playMode === 'shuffle' && !isPersonalFmMode) {
      const nextIndex = Math.floor(Math.random() * this.playlist.length);
      await this.playByIndex(nextIndex);
      return;
    }

    if (isPersonalFmMode) {
      const targetIndex = this.currentIndex + 1;
      if (!this.playlist[targetIndex]) {
        await this.ensurePersonalFmQueue(0);
      }
      if (!this.playlist[targetIndex]) {
        return;
      }
      await this.playByIndex(targetIndex);
      return;
    }

    const nextIndex = (this.currentIndex + 1 + this.playlist.length) % this.playlist.length;
    await this.playByIndex(nextIndex);
  },

  async dislikeCurrentPersonalFm(cookie?: string) {
    const trackId = Number(this.currentTrack?.id || 0);
    if (!trackId || !this.isPersonalFmTrack(this.currentTrack)) return false;

    try {
      await trashPersonalFm(trackId, cookie);
    } catch {
      // ignore network failure and still skip locally for responsiveness
    }

    this.personalFmTrackIds = this.personalFmTrackIds.filter((id) => id !== trackId);

    const removedIndex = this.currentIndex;
    this.playlist.splice(removedIndex, 1);

    if (!this.playlist.length) {
      await this.ensurePersonalFmQueue(0);
    } else if (removedIndex >= this.playlist.length - this.personalFmPrefetchThreshold) {
      void this.ensurePersonalFmQueue();
    }

    if (!this.playlist.length) {
      this.audio.pause();
      this.isPlaying = false;
      this.currentIndex = -1;
      this.currentTrack = null;
      this.currentSongId = 0;
      this.persist();
      return true;
    }

    const nextIndex = removedIndex >= this.playlist.length ? this.playlist.length - 1 : removedIndex;
    this.currentIndex = Math.max(0, nextIndex);
    this.persist();
    await this.playByIndex(this.currentIndex);
    return true;
  },

  async prev() {
    if (this.playlist.length === 0) return;

    if (this.playMode === 'shuffle') {
      const prevIndex = Math.floor(Math.random() * this.playlist.length);
      await this.playByIndex(prevIndex);
      return;
    }

    const prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    await this.playByIndex(prevIndex);
  },

  seek(time: number) {
    this.audio.currentTime = Math.max(0, Math.min(time, this.duration || 0));
    this.currentTime = this.audio.currentTime;
  },

  setVolume(v: number) {
    const val = Math.max(0, Math.min(v, 1));
    this.volume = val;
    if (this.muted) {
      this.muted = false;
    }
    this.audio.volume = val;
    this.persist();
  },

  toggleMute() {
    if (this.muted) {
      this.muted = false;
      this.audio.volume = this.volumeBeforeMute;
    } else {
      this.volumeBeforeMute = this.volume;
      this.muted = true;
      this.audio.volume = 0;
    }
    this.persist();
  },

  setAutoplayNext(enabled: boolean) {
    this.autoplayNext = enabled;
    this.persist();
  },

  setPlayMode(mode: 'loop' | 'single' | 'shuffle') {
    this.playMode = mode;
    this.persist();
  },

  cyclePlayMode() {
    const order: Array<'loop' | 'single' | 'shuffle'> = ['loop', 'single', 'shuffle'];
    const idx = order.indexOf(this.playMode);
    this.playMode = order[(idx + 1) % order.length];
    this.persist();
  },

  setCrossfadeSec(sec: number) {
    this.crossfadeSec = Math.max(0, Math.min(12, Math.floor(sec || 0)));
    this.persist();
  },

  setPlaybackRate(rate: number) {
    const r = Math.max(0.5, Math.min(3, Number(rate || 1)));
    this.playbackRate = r;
    this.audio.playbackRate = r;
  },

  setDefaultPlaybackRate(rate: number) {
    const r = Math.max(0.5, Math.min(3, Number(rate || 1)));
    this.defaultPlaybackRate = r;
    this.playbackRate = r;
    this.audio.playbackRate = r;
    this.persist();
  },

  setCurrentSource(source: string) {
    this.currentSource = source || 'official';
  },

  setDefaultQuality(quality: '标准' | '较高' | '极高(HQ)' | '无损(SQ)' | 'Hi-Res' | '高清臻音' | '高清环绕声' | '沉浸环绕声' | '杜比全景声' | '超清母带') {
    this.defaultQuality = quality;
    console.log('[quality] setDefaultQuality:', quality);
    localStorage.setItem('gm_quality_v1', quality);
    this.persist();
  },

  adjustLyricsOffset(delta: number) {
    this.lyricsOffset = Math.max(-10, Math.min(10, this.lyricsOffset + delta));
  },

  resetLyricsOffset() {
    this.lyricsOffset = 0;
  },

  openExpanded() {
    this.expanded = true;
  },

  closeExpanded() {
    this.expanded = false;
  },

  toggleExpanded() {
    this.expanded = !this.expanded;
  },

  /* ---- queue management ---- */

  removeFromPlaylist(index: number) {
    if (index < 0 || index >= this.playlist.length) return;
    this.playlist.splice(index, 1);

    if (this.playlist.length === 0) {
      this.currentIndex = -1;
      this.currentTrack = null;
      this.currentSongId = 0;
      this.audio.pause();
      this.isPlaying = false;
    } else if (index < this.currentIndex) {
      this.currentIndex -= 1;
    } else if (index === this.currentIndex) {
      const nextIndex = Math.min(this.currentIndex, this.playlist.length - 1);
      this.currentIndex = nextIndex;
      this.currentTrack = this.playlist[nextIndex] || null;
      this.currentSongId = Number(this.currentTrack?.id || 0);
      this.persist();
      if (this.isPlaying || this.autoplayNext) {
        void this.playByIndex(nextIndex);
        return;
      }
    }
    this.persist();
  },

  clearPlaylist() {
    this.playlist = [];
    this.currentIndex = -1;
    this.currentTrack = null;
    this.currentSongId = 0;
    this.audio.pause();
    this.isPlaying = false;
    this.persist();
  },

  moveTrack(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || fromIndex >= this.playlist.length) return;
    if (toIndex < 0 || toIndex >= this.playlist.length) return;
    if (fromIndex === toIndex) return;
    const [track] = this.playlist.splice(fromIndex, 1);
    this.playlist.splice(toIndex, 0, track);
    if (this.currentIndex === fromIndex) {
      this.currentIndex = toIndex;
    } else {
      if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) this.currentIndex -= 1;
      else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) this.currentIndex += 1;
    }
    this.persist();
  },

  recordCurrentTrackToHistory() {
    const track = this.currentTrack;
    if (!track?.id || !track?.name) return;
    const artistNames = (track.ar || []).map((a) => a.name).join('/');
    const entry = {
      key: `song-${track.id}`,
      title: track.name,
      subtitle: artistNames || '未知歌手',
      source: 'local_play_history',
      sourceTip: '当前设备本地播放记录',
      summary: artistNames || '单曲',
      typeLabel: '单曲',
      countLabel: '0',
      updatedAt: String(Date.now()),
      playableLabel: '播放',
      playActionTip: '',
      coverUrl: track.al?.picUrl || '',
      playTracks: [track],
      playableItem: track,
      manageType: 'song' as const,
      canUnlike: false,
      canOpenDetail: false,
      sortKey: Date.now(),
    };
    recordLocalHistoryEntry(entry as any);
  },
});
