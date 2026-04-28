import { reactive } from 'vue';
import { getSongDetail, getSongUrlV1, trashPersonalFm } from '../api/music';
import { tryUnblockMatch } from '../api/unblock';
import { userStore } from './user';

type Artist = { name: string };
type Album = { name?: string; picUrl?: string };
type TrackSource = 'song' | 'podcast';
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
};

const PLAYER_STORAGE_KEY = 'gm_player_state_v1';

function formatTrack(raw: any): Track {
  return {
    id: raw.id,
    name: raw.name,
    ar: raw.ar || raw.artists || [],
    al: raw.al || raw.album || {},
    url: raw.url,
    source: raw.source === 'podcast' ? 'podcast' : 'song',
    podcast: raw.podcast,
    liked: Boolean(raw.liked || raw.isLiked),
    isLiked: Boolean(raw.isLiked || raw.liked),
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
    const payload = {
      playlist: this.playlist,
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
      personalFmTrackIds: this.personalFmTrackIds,
      personalFmHasMore: this.personalFmHasMore,
      defaultPlaylist: this.defaultPlaylist,
    };
    const json = JSON.stringify(payload);
    localStorage.setItem(PLAYER_STORAGE_KEY, json);
    console.debug('[player] persist saved, defaultQuality:', payload.defaultQuality);
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
      try {
        const level = toApiLevel(this.defaultQuality);
        const cookie = userStore.loginCookie || undefined;
        const { data: urlRes } = await getSongUrlV1(track.id, level, cookie);
        const results = Array.isArray(urlRes?.data) ? urlRes.data : [];
        playUrl = results[0]?.url || playUrl;
        const br = Number(results[0]?.br || 0);
        if (br > 0) this.currentQualityBr = br;
      } catch {
        // ignore url fetch failures and fall back to cached/attached url
      }

      // 音源替换开启时，优先尝试 Unblock 匹配（无论官方是否返回 URL）
      const { uiStore } = await import('../stores/ui');
      if (uiStore.unblockEnabled) {
        console.log('[unblock] trying match for track:', track.id, track.name);
        try {
          const result = await tryUnblockMatch(track.id, uiStore.unblockSources || ['kugou', 'migu', 'bilibili']);
          if (result?.url) {
            playUrl = result.url;
            this.currentSource = result.source || 'unblock';
            if (result.br > 0) this.currentQualityBr = result.br;
            console.log('[unblock] matched:', result.source, 'br:', result.br, 'size:', result.size);
          } else {
            console.log('[unblock] no match result, fallback to official');
          }
        } catch (e) {
          console.log('[unblock] match error:', e);
        }
      } else {
        console.log('[unblock] disabled, using official source');
      }

      const wasPlaying = this.isPlaying;
      if (typeof seekTo === 'number') {
        console.log('[quality] playTrack with seekTo:', seekTo, '| wasPlaying:', wasPlaying, '| level:', this.defaultQuality);
      }
      let merged = track;
      try {
        const { data: detailRes } = await getSongDetail(track.id);
        const detail = detailRes?.songs?.[0];
        if (detail) {
          const normalizedDetail = formatTrack(detail);
          merged = {
            ...normalizedDetail,
            name: track.name || normalizedDetail.name,
            ar: track.ar?.length ? track.ar : normalizedDetail.ar,
            al: track.al?.picUrl || track.al?.name ? track.al : normalizedDetail.al,
            url: track.url || normalizedDetail.url,
            source: track.source || normalizedDetail.source,
            podcast: track.podcast || normalizedDetail.podcast,
          };
        }
      } catch {
        // cloud tracks may not have /song/detail support in this environment
      }

      this.currentTrack = merged;
      this.currentSongId = Number(merged?.id || 0);
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

      if (this.currentIndex === -1) {
        const idx = this.playlist.findIndex((x) => x.id === merged.id);
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
});
