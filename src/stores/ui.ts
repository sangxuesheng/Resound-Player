import { reactive } from 'vue';
import { searchMusicDefault } from '../api/music';

type ThemeMode = '浅色' | '深色' | '跟随系统';
type ResolvedTheme = 'light' | 'dark';
type AccentMode = '绿色' | '蓝色' | '紫色' | '橙色' | '自定义';

const STORAGE_KEY = 'tm_theme_mode';
const GLASS_KEY = 'tm_liquid_glass';
const ACCENT_KEY = 'tm_accent_mode';
const ACCENT_COLOR_KEY = 'tm_accent_custom_color';
let mediaQuery: MediaQueryList | null = null;
let mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === '浅色') return 'light';
  if (mode === '深色') return 'dark';
  return getSystemTheme();
}

function applyThemeToDom(theme: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function applyGlassToDom(enabled: boolean) {
  document.documentElement.setAttribute('data-glass', enabled ? 'on' : 'off');
}

function normalizeHexColor(input: string) {
  const v = String(input || '').trim().toLowerCase();
  const full = /^#[0-9a-f]{6}$/;
  const short = /^#[0-9a-f]{3}$/;
  if (full.test(v)) return v;
  if (short.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return '#22c55e';
}

function hexToRgb(hex: string) {
  const n = normalizeHexColor(hex);
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  return { r, g, b };
}

function applyAccentToDom(mode: AccentMode, customColor?: string) {
  const accent = mode === '蓝色' ? 'blue' : mode === '紫色' ? 'purple' : mode === '橙色' ? 'orange' : mode === '自定义' ? 'custom' : 'green';
  document.documentElement.setAttribute('data-accent', accent);

  if (accent === 'custom') {
    const hex = normalizeHexColor(customColor || '#22c55e');
    const { r, g, b } = hexToRgb(hex);
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.2)`);
  } else {
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent-soft');
  }
}

export const uiStore = reactive({
  themeMode: '跟随系统' as ThemeMode,
  resolvedTheme: 'light' as ResolvedTheme,
  accentMode: '绿色' as AccentMode,
  accentCustomColor: '#22c55e',
  liquidGlassEnabled: true,
  searchKeyword: '',
  searchType: 1,
  defaultSearchHint: '',
  defaultSearchKeyword: '',
  defaultSearchLoading: false,
  init() {
    const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) || '跟随系统';
    const savedGlass = localStorage.getItem(GLASS_KEY);
    const savedAccent = (localStorage.getItem(ACCENT_KEY) as AccentMode | null) || '绿色';
    const savedAccentColor = localStorage.getItem(ACCENT_COLOR_KEY) || '#22c55e';

    this.themeMode = saved;
    this.accentMode = savedAccent;
    this.accentCustomColor = normalizeHexColor(savedAccentColor);
    this.liquidGlassEnabled = savedGlass === null ? true : savedGlass === '1';

    this.resolvedTheme = resolveTheme(this.themeMode);
    applyThemeToDom(this.resolvedTheme);
    applyAccentToDom(this.accentMode, this.accentCustomColor);
    applyGlassToDom(this.liquidGlassEnabled);

    if (!mediaQuery) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    }

    if (!mediaListener) {
      mediaListener = () => {
        if (this.themeMode === '跟随系统') {
          this.resolvedTheme = getSystemTheme();
          applyThemeToDom(this.resolvedTheme);
        }
      };
      mediaQuery.addEventListener('change', mediaListener);
    }
  },
  setThemeMode(mode: ThemeMode) {
    this.themeMode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    this.resolvedTheme = resolveTheme(mode);
    applyThemeToDom(this.resolvedTheme);
  },
  setAccentMode(mode: AccentMode) {
    this.accentMode = mode;
    localStorage.setItem(ACCENT_KEY, mode);
    applyAccentToDom(mode, this.accentCustomColor);
  },
  setAccentCustomColor(color: string) {
    const next = normalizeHexColor(color);
    this.accentCustomColor = next;
    localStorage.setItem(ACCENT_COLOR_KEY, next);
    if (this.accentMode === '自定义') {
      applyAccentToDom('自定义', next);
    }
  },
  setLiquidGlass(enabled: boolean) {
    this.liquidGlassEnabled = enabled;
    localStorage.setItem(GLASS_KEY, enabled ? '1' : '0');
    applyGlassToDom(enabled);
  },
  async loadDefaultSearchKeyword(force = false) {
    if (this.defaultSearchLoading) return;
    if (!force && this.defaultSearchKeyword && this.defaultSearchHint) return;

    this.defaultSearchLoading = true;
    try {
      const res = await searchMusicDefault();
      const data = res?.data?.data || res?.data || {};
      this.defaultSearchHint = String(data.showKeyword || data.styleKeyword?.keyWord || data.realkeyword || '').trim();
      this.defaultSearchKeyword = String(data.realkeyword || data.showKeyword || data.styleKeyword?.keyWord || '').trim();
    } catch {
      if (!this.defaultSearchHint) {
        this.defaultSearchHint = '';
      }
      if (!this.defaultSearchKeyword) {
        this.defaultSearchKeyword = '';
      }
    } finally {
      this.defaultSearchLoading = false;
    }
  },
  dispose() {
    if (mediaQuery && mediaListener) {
      mediaQuery.removeEventListener('change', mediaListener);
      mediaListener = null;
    }
  },
});
