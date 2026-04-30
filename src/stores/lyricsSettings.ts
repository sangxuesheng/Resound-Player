import { reactive } from 'vue';

export type BgTheme = 'default' | 'light' | 'dark';
export type BgMode = 'basic' | 'custom';
export type BgCustomMode = 'solid' | 'gradient' | 'image' | 'css';

export type LyricsSettings = {
  pureMode: boolean;
  showCover: boolean;
  centerAlign: boolean;
  showTranslation: boolean;
  showLyrics: boolean;
  showMiniBar: boolean;
  contentWidth: number;
  fontSize: number;
  letterSpacing: number;
  fontWeight: number;
  lineHeight: number;
  bgMode: BgMode;
  bgTheme: BgTheme;
  bgCustomMode: BgCustomMode;
  bgColor: string;
  anchorPos: number;  // 歌词高亮锚点位置 0-10 (对应 0.0~1.0)
};

const STORAGE_KEY = 'gm_lyrics_settings_v1';

const defaults: LyricsSettings = {
  pureMode: false,
  showCover: true,
  centerAlign: false,
  showTranslation: true,
  showLyrics: true,
  showMiniBar: false,
  contentWidth: 60,
  fontSize: 5,
  letterSpacing: 3,
  fontWeight: 4,
  lineHeight: 5,
  bgMode: 'basic',
  bgTheme: 'default',
  bgCustomMode: 'solid',
  bgColor: '#1e293b',
  anchorPos: 3,  // 默认 0.3
};

function hydrate(): LyricsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

function persist(settings: LyricsSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* silently fail */ }
}

const initial = hydrate();

export const lyricsSettings = reactive<LyricsSettings>({ ...initial }) as LyricsSettings & { save(): void };

lyricsSettings.save = function save() {
  persist(this);
};
