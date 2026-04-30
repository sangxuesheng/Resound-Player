import { reactive } from 'vue';
import { getSongDetail, getSongUrlV1, trashPersonalFm } from '../api/music';
import { tryUnblockMatch } from '../api/unblock';
import { userStore } from './user';
import { hydrateCache, getCache, setCache } from './unblock-cache';
import { recordLocalHistoryEntry } from '../utils/localHistory';

type Artist = { name: string };
type Album = { name?: string; picUrl?: string };
type TrackSource = 'song' | 'podcast' | 'cloud';
type PodcastMeta = { rid?: number };
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
  // 云盘歌曲专用
  cloudSid?: number;
  cloudOwnerId?: number;
  uid?: number;
};

const PLAYER_STORAGE_KEY = 'gm_player_state_v1';

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
  '高清环绕声': 'jyeffect',
  '沉浸环绕声': 'sky',
  '杜比全景声': 'dolby',
  '超清母带': 'jymaster',
};


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
  defaultQuality: '较高' as '标准' | '较高' | '极高(HQ)' | '无损(SQ)' | 'Hi-Res' | '高清环绕声' | '沉浸环绕声' | '杜比全景声' | '超清母带',

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
    const playlist = this.trimPlaylistForStorage();
    const defaultPlaylist = Array.isArray(this.defaultPlaylist) ? this.defaultPlaylist.slice(0, 50).map((t: any) =>
      t ? { id: t.id, name: t.name, ar: t.ar?.slice(0, 3) || [], al: t.al ? { name: t.al.name, picUrl: t.al.picUrl } : undefined } : t
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
      playbackRate: this.playbackRate,
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
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('[player] quota exceeded, trimming aggressively');
        payload.playlist = this.trimPlaylistForStorage(10);
        payload.defaultPlaylist = [];
        payload.personalFmTrackIds = [];
        try {
          const json = JSON.stringify(payload);
          localStorage.setItem(PLAYER_STORAGE_KEY, json);
        } catch {
          try {
            localStorage.removeItem(PLAYER_STORAGE_KEY);
            localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify({ ...payload, playlist: [], defaultPlaylist: [] }));
          } catch {}
        }
      }
    }
    console.debug('[player] persist saved, defaultQuality:', payload.defaultQuality);
  },

  trimPlaylistForStorage(maxEntries = 50) {
    if (this.playlist.length <= maxEntries) {
      return this.playlist.map((t) => ({
        id: t.id,
        name: t.name,
        ar: t.ar?.slice(0, 3) || [],
        al: t.al ? { name: t.al.name, picUrl: t.al.picUrl } : undefined,
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
      al: t.al ? { name: t.al.name, picUrl: t.al.picUrl } : undefined,
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
      this.playlist = parsed.playlist || [];
      this.currentIndex = Number.isInteger(parsed.currentIndex) ? parsed.currentIndex : -1;
      this.volume = typeof parsed.volume === 'number' ? parsed.volume : 0.7;
      this.muted = typeof parsed.muted === 'boolean' ? parsed.muted : false;
      this.volumeBeforeMute = typeof parsed.volumeBeforeMute === 'number' ? parsed.volumeBeforeMute : this.volume;
      this.audio.volume = this.muted ? 0 : this.volume;
      this.autoplayNext = typeof parsed.autoplayNext === 'boolean' ? parsed.autoplayNext : true;
      this.playMode = parsed.playMode === 'single' || parsed.playMode === 'shuffle' ? parsed.playMode : 'loop';
      this.crossfadeSec = typeof parsed.crossfadeSec === 'number' ? parsed.crossfadeSec : 0;
      this.playbackRate = typeof parsed.playbackRate === 'number' ? parsed.playbackRate : 1;
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

      if (this.currentIndex >= 0 && this.playlist[this.currentIndex]) {
        this.currentTrack = this.playlist[this.currentIndex];
        this.currentSongId = Number(this.currentTrack?.id || 0);
      } else {
        this.currentSongId = 0;
      }
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
    this.loading = true;
    try {
      let playUrl = track.url || '';
      // 直连获取 URL + fee（绕过 proxy 拦截器，不重复调用）

      // 并行：fee 探测 + uiStore 导入 + 音源匹配（三者同时发起）
      const nocookie = userStore.loginCookie || undefined;
      const level = toApiLevel(this.defaultQuality);
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
      try {
        const directRes = await feePromise;
        const directData = await directRes.json();
        const officialItem = Array.isArray(directData?.data) ? directData.data[0] : null;
        const officialCode = Number(officialItem?.code || 0);
        const fee = Number(officialItem?.fee ?? 0);
        if (officialItem?.url) playUrl = officialItem.url;
        if (officialItem?.br > 0) this.currentQualityBr = officialItem.br;
        const hasTrial = Boolean(officialItem?.freeTrialInfo);
        const isFeeFree = fee === 0 || fee === 8;
        isFreePlayable = officialCode === 200 && Boolean(playUrl) && isFeeFree && !hasTrial;
        console.log('[debug] direct fee:', { fee, hasTrial, officialCode, hasUrl: Boolean(playUrl) });
      } catch (e) {
        console.warn('[debug] direct check failed:', e);
      }

      // 2. 缓存命中 - 直接使用
      if (cached) {
        playUrl = cached.url;
        this.currentSource = cached.source;
        if (cached.br > 0) this.currentQualityBr = cached.br;
      } else if (matchPromise && !isFreePlayable) {
        // 3. 付费歌曲 - 等待匹配结果
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
    const r = Math.max(0.5, Math.min(2, Number(rate || 1)));
    this.playbackRate = r;
    this.audio.playbackRate = r;
    this.persist();
  },

  setCurrentSource(source: string) {
    this.currentSource = source || 'official';
  },

  setDefaultQuality(quality: '标准' | '较高' | '极高(HQ)' | '无损(SQ)' | 'Hi-Res' | '高清环绕声' | '沉浸环绕声' | '杜比全景声' | '超清母带') {
    this.defaultQuality = quality;
    console.log('[quality] setDefaultQuality:', quality);
    localStorage.setItem('gm_quality_v1', quality);
    this.persist();
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
