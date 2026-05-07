import { reactive } from 'vue';

// 10 段 EQ 标准 ISO 频率（单位 Hz）
export const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_FREQ_LABELS = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

export type EqPreset = {
  name: string;
  gains: number[]; // 10 段增益值，范围 -12 ~ +12 dB，每段 0.5dB 步进
};

/** 内置预设列表 */
const BUILTIN_PRESETS: EqPreset[] = [
  { name: '原声',       gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: '流行',       gains: [3, 4, 2, 1, 0, 1, 2, 3, 4, 3] },
  { name: '摇滚',       gains: [5, 4, 3, 2, 1, 0, 1, 3, 4, 5] },
  { name: '古典',       gains: [4, 3, 1, 0, 0, 0, 0, 1, 3, 4] },
  { name: '爵士',       gains: [3, 4, 3, 2, 1, 2, 3, 2, 1, 0] },
  { name: '舞曲',       gains: [6, 5, 3, 1, 0, 1, 2, 3, 4, 5] },
  { name: '人声',       gains: [0, 1, 2, 4, 5, 5, 4, 2, 1, 0] },
  { name: '自定义',     gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
];

export const DEFAULT_PRESETS = BUILTIN_PRESETS;

export type EqSettings = {
  enabled: boolean;       // 全局 EQ 开关
  gains: number[];        // 10 段增益值
  currentPreset: string;  // 当前预设名称（'custom' 表示自定义）
};

const STORAGE_KEY = 'gm_eq_settings_v1';

const defaults: EqSettings = {
  enabled: false,
  gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  currentPreset: '默认（平直）',
};

function hydrate(): EqSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    // 确保 gains 是 10 段
    if (!Array.isArray(parsed.gains) || parsed.gains.length !== 10) {
      parsed.gains = [...defaults.gains];
    }
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

function persist(settings: EqSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* silently fail */ }
}

const initial = hydrate();

export const eqSettings = reactive<EqSettings>({ ...initial }) as EqSettings & { save(): void };

eqSettings.save = function save() {
  persist(this);
};