<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="settings-page">
    <AnimatedAppear tag="header" variant="content" rhythm="head" class-name="top-tabs-wrap">
      <nav class="top-tabs" aria-label="设置分组">
        <AnimatedAppear
          v-for="(tab, idx) in tabs"
          :key="tab.key"
          tag="button"
          variant="control"
          rhythm="actions"
          :index="idx"
          class-name="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </AnimatedAppear>
      </nav>
    </AnimatedAppear>

    <AnimatedAppear
      v-for="(group, gIdx) in currentGroups"
      :key="group.title"
      tag="section"
      variant="content" rhythm="body"
      :index="gIdx"
      class-name="setting-group"
    >
      <AnimatedAppear tag="h3" variant="title" rhythm="title" class-name="group-title">{{ group.title }}</AnimatedAppear>

      <div class="rows">
        <AnimatedAppear
          v-for="(item, idx) in group.items"
          :key="item.key"
          tag="div"
          variant="text" rhythm="body"
          :index="idx"
          class-name="row"
        >
          <div class="left">
            <p class="label">{{ item.label }}</p>
            <p v-if="item.desc" class="desc">{{ item.desc }}</p>
          </div>

          <div class="right">
            <div v-if="item.type === 'switch'" class="control-slot switch-slot">
              <FancySwitch v-model="switchState[item.key]" />
            </div>

            <DropdownSelect
              v-else-if="item.type === 'select'"
              v-model="selectState[item.key]"
              :options="item.options || []"
              :option-colors="item.key === 'accent' ? accentColors : {}"
            />

            <input
              v-else-if="item.type === 'range'"
              class="range"
              type="range"
              :min="item.min || 0"
              :max="item.max || 100"
              v-model="rangeState[item.key]"
            />

            <template v-else-if="item.key === 'accentCustomColor'">
              <div class="color-picker-wrap">
                <input class="color-picker" type="color" v-model="accentCustomColor" aria-label="选择自定义主题色" />
                <span class="color-hex">{{ accentCustomColor }}</span>
              </div>
            </template>

            <div v-else-if="item.type === 'input'" class="input-action-wrap">
              <input
                v-model="inputState[item.key]"
                class="inline-input"
                type="text"
                :placeholder="item.placeholder || ''"
                @keydown.enter.prevent="handleAction(item.key)"
              />
              <AnimatedAppear
                tag="button"
                variant="control"
                rhythm="actions"
                class-name="action-btn"
                @click="handleAction(item.key)"
              >
                {{ item.actionText || '保存' }}
              </AnimatedAppear>
            </div>

            <AnimatedAppear
              v-else
              tag="button"
              variant="control"
              rhythm="actions"
              class-name="action-btn"
              @click="handleAction(item.key)"
            >
              {{ item.actionText || '操作' }}
            </AnimatedAppear>
          </div>
        </AnimatedAppear>
      </div>
    </AnimatedAppear>

    <AnimatedAppear
      v-if="showEmptyAccountState"
      tag="section"
      variant="content"
      rhythm="body"
      class-name="setting-group account-empty-state"
    >
      <AnimatedAppear tag="h3" variant="title" rhythm="title" class-name="group-title">账号设置</AnimatedAppear>
      <div class="empty-card">
        <p class="empty-title">当前未登录</p>
        <p class="empty-desc">登录后可管理账号同步、隐私和退出登录等选项。</p>
        <button class="empty-action-btn" type="button" @click="goToLogin">去登录</button>
      </div>
    </AnimatedAppear>

    <transition name="toast-fade">
      <div v-if="logoutMessage" class="toast" role="status" aria-live="polite">
        {{ logoutMessage }}
      </div>
    </transition>

    <GridLayoutEditor storage-key="tm_home_widget_layout_v1" :initial-layout="homeWidgetLayout" @saved="onHomeLayoutSaved" />
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

type SettingsTabKey = 'playback' | 'appearance' | 'account';

const props = withDefaults(
  defineProps<{
    initialTab?: SettingsTabKey;
  }>(),
  {
    initialTab: 'appearance',
  },
);

import AnimatedAppear from './AnimatedAppear.vue';

const emit = defineEmits<{
  (e: 'go-login'): void;
}>();
import GridLayoutEditor from './GridLayoutEditor.vue';
import DropdownSelect from './ui/DropdownSelect.vue';
import FancySwitch from './ui/FancySwitch.vue';
import { playerStore } from '../stores/player';
import { uiStore } from '../stores/ui';
import { userStore } from '../stores/user';

type SettingItem = {
  key: string;
  label: string;
  desc?: string;
  type: 'switch' | 'select' | 'range' | 'action' | 'input';
  options?: string[];
  min?: number;
  max?: number;
  actionText?: string;
  placeholder?: string;
};

type SettingGroup = {
  title: string;
  items: SettingItem[];
};

const allTabs = [
  { key: 'playback', label: '播放' },
  { key: 'appearance', label: '外观' },
  { key: 'account', label: '账号' },
] as const;

const tabs = computed(() => allTabs);

const activeTab = ref<SettingsTabKey>(props.initialTab);

const groupsMap: Record<string, SettingGroup[]> = {
  playback: [
    {
      title: '播放设置',
      items: [
        { key: 'autoplay', label: '自动播放下一首', desc: '当前歌曲结束后自动切换到下一首', type: 'switch' },
        { key: 'quality', label: '默认音质', desc: '可按网络环境自动调整', type: 'select', options: ['标准', '较高', '极高'] },
        { key: 'playMode', label: '默认播放模式', desc: '循环/单曲/随机播放策略', type: 'select', options: ['列表循环', '单曲循环', '随机播放'] },
        { key: 'playbackRate', label: '播放速度', desc: '影响底部栏与全屏页播放速度', type: 'select', options: ['0.75x', '1.0x', '1.25x', '1.5x'] },
        { key: 'crossfade', label: '淡入淡出时长', desc: '控制切歌时过渡顺滑程度', type: 'range', min: 0, max: 12 },
      ],
    },
  ],
  appearance: [
    {
      title: '外观设置',
      items: [
        { key: 'theme', label: '主题模式', desc: '切换浅色或深色界面', type: 'select', options: ['浅色', '深色', '跟随系统'] },
        { key: 'accent', label: '主题色', desc: '切换系统强调色（带颜色预览）', type: 'select', options: ['绿色', '蓝色', '紫色', '橙色', '自定义'] },
        { key: 'accentCustomColor', label: '自定义主题色', desc: '在调色盘中选择任意颜色', type: 'action' },
        { key: 'liquidGlass', label: '液态玻璃效果', desc: '开启后使用高透明磨砂玻璃视觉风格', type: 'switch' },
        { key: 'compact', label: '紧凑列表模式', desc: '减少列表行高以显示更多信息', type: 'switch' },
        { key: 'fontScale', label: '字体缩放', desc: '调整界面字体大小比例', type: 'range', min: 90, max: 130 },
      ],
    },
  ],
  account: [
    {
      title: '账号设置',
      items: [
        { key: 'cookieEditor', label: 'Cookie 修改', desc: '支持手动输入或编辑 Cookie；扫码登录成功后会自动填入最新 Cookie', type: 'input', actionText: '保存', placeholder: '例如：MUSIC_U=...; __csrf=...' },
        { key: 'logout', label: '退出登录', desc: '退出当前账号并清除本地登录态', type: 'action', actionText: '退出' },
      ],
    },
  ],
};

const logoutMessage = ref('');
let logoutMessageTimer: ReturnType<typeof setTimeout> | null = null;

const showEmptyAccountState = computed(() => activeTab.value === 'account' && !currentGroups.value.length);

watch(
  () => props.initialTab,
  (tab) => {
    activeTab.value = tab;
  },
  { immediate: true },
);

watch(
  () => userStore.loginMode,
  (mode) => {
    if (mode === 'none' && activeTab.value === 'account') {
      activeTab.value = 'appearance';
    }
  },
  { immediate: true },
);

const currentGroups = computed(() => {
  const groups = groupsMap[activeTab.value] || [];
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (item.key === 'accentCustomColor') return selectState.accent === '自定义';
        if (item.key === 'logout') return userStore.isLogin;
        if (item.key === 'cookieEditor') return userStore.isLogin;
        if (!userStore.isLogin && activeTab.value === 'account') {
          return false;
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
});

const switchState = reactive<Record<string, boolean>>({
  autoplay: playerStore.autoplayNext,
  liquidGlass: uiStore.liquidGlassEnabled,
  compact: false,
});

const selectState = reactive<Record<string, string>>({
  quality: playerStore.defaultQuality,
  playMode: playerStore.playMode === 'single' ? '单曲循环' : playerStore.playMode === 'shuffle' ? '随机播放' : '列表循环',
  playbackRate: `${playerStore.playbackRate.toFixed(2).replace(/\.00$/, '.0')}x`,
  theme: uiStore.themeMode,
  accent: uiStore.accentMode,
});

const accentCustomColor = ref(uiStore.accentCustomColor);

watch(
  () => uiStore.themeMode,
  (value) => {
    selectState.theme = value;
  },
  { immediate: true },
);

watch(
  () => uiStore.accentMode,
  (value) => {
    selectState.accent = value;
  },
  { immediate: true },
);

watch(
  () => uiStore.accentCustomColor,
  (value) => {
    accentCustomColor.value = value;
  },
  { immediate: true },
);

const accentColors = computed<Record<string, string>>(() => ({
  绿色: 'var(--accent-green, #22c55e)',
  蓝色: 'var(--accent-blue, #3b82f6)',
  紫色: 'var(--accent-purple, #a855f7)',
  橙色: 'var(--accent-orange, #f97316)',
  自定义: accentCustomColor.value,
}));

const rangeState = reactive<Record<string, number>>({
  crossfade: playerStore.crossfadeSec,
  fontScale: 100,
});

const inputState = reactive<Record<string, string>>({
  cookieEditor: userStore.loginCookie || '',
});

const homeWidgetLayout = [
  { id: 'tags', x: 0, y: 0, w: 8, h: 2, title: '分类模块', content: '首页分类标签区域' },
  { id: 'list', x: 0, y: 2, w: 8, h: 8, title: '热门音乐模块', content: '首页热门音乐列表区域' },
  { id: 'albums', x: 8, y: 0, w: 4, h: 10, title: '专辑推荐模块', content: '首页专辑推荐区域' },
];

watch(
  () => selectState.theme,
  (next) => {
    if (next === '浅色' || next === '深色' || next === '跟随系统') {
      uiStore.setThemeMode(next);
    }
  },
);

watch(
  () => selectState.accent,
  (next) => {
    if (next === '绿色' || next === '蓝色' || next === '紫色' || next === '橙色' || next === '自定义') {
      uiStore.setAccentMode(next);
    }
  },
);

watch(
  accentCustomColor,
  (next) => {
    uiStore.setAccentCustomColor(next);
  },
);

watch(
  () => switchState.liquidGlass,
  (enabled) => {
    uiStore.setLiquidGlass(Boolean(enabled));
  },
);

watch(
  () => switchState.autoplay,
  (enabled) => {
    playerStore.setAutoplayNext(Boolean(enabled));
  },
);

watch(
  () => selectState.quality,
  (value) => {
    if (value === '标准' || value === '较高' || value === '极高') {
      playerStore.setDefaultQuality(value);
    }
  },
);

watch(
  () => selectState.playMode,
  (value) => {
    if (value === '单曲循环') playerStore.setPlayMode('single');
    else if (value === '随机播放') playerStore.setPlayMode('shuffle');
    else playerStore.setPlayMode('loop');
  },
);

watch(
  () => selectState.playbackRate,
  (value) => {
    const rate = Number(String(value).replace('x', ''));
    if (Number.isFinite(rate)) playerStore.setPlaybackRate(rate);
  },
);

watch(
  () => rangeState.crossfade,
  (value) => {
    playerStore.setCrossfadeSec(Number(value));
  },
);

watch(
  () => selectState.playMode,
  (value) => {
    const mode = value === '单曲循环' ? 'single' : value === '随机播放' ? 'shuffle' : 'loop';
    playerStore.setPlayMode(mode);
  },
);

watch(
  () => selectState.playbackRate,
  (value) => {
    const n = Number(String(value).replace('x', ''));
    if (Number.isFinite(n)) playerStore.setPlaybackRate(n);
  },
);

watch(
  () => userStore.loginCookie,
  (value) => {
    inputState.cookieEditor = value || '';
  },
  { immediate: true },
);

function showLogoutMessage(message: string) {
  logoutMessage.value = message;

  if (logoutMessageTimer) {
    clearTimeout(logoutMessageTimer);
  }

  logoutMessageTimer = setTimeout(() => {
    logoutMessage.value = '';
    logoutMessageTimer = null;
  }, 2200);
}

function goToLogin() {
  emit('go-login');
}

async function handleAction(key: string) {
  if (key === 'cookieEditor') {
    const normalizedCookie = String(inputState.cookieEditor || '').trim();
    userStore.saveCookie(normalizedCookie);
    showLogoutMessage(normalizedCookie ? 'Cookie 已保存' : 'Cookie 已清空');
    return;
  }

  if (key === 'logout') {
    await userStore.logout();
    activeTab.value = 'account';
    showLogoutMessage('已退出登录');
  }
}

function onHomeLayoutSaved(payload: unknown) {
  window.dispatchEvent(
    new CustomEvent('tm-home-layout-updated', {
      detail: payload,
    }),
  );
}
</script>

<style scoped>
.settings-page {
  width: 100%;
  display: grid;
  gap: var(--space-3);
}

.top-tabs-wrap {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-surface);
  padding: calc(var(--space-2) + 2px) var(--space-2) var(--space-2);
  overflow: visible;
}

.top-tabs {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  overflow: visible;
}

.tab-btn {
  height: 34px;
  padding: 0 var(--space-3);
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-muted);
  color: var(--text-sub);
  cursor: pointer;
}

.tab-btn.active {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.setting-group {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-surface);
  padding: var(--space-3);
  overflow: visible;
}

.account-empty-state {
  min-height: 220px;
}

.group-title {
  margin: 0 0 var(--space-3);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

.rows {
  display: grid;
  gap: var(--space-2);
}

.empty-card {
  min-height: 144px;
  display: grid;
  place-content: center;
  gap: var(--space-2);
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: var(--bg-muted);
  text-align: center;
}

.empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

.empty-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-sub);
}

.empty-action-btn {
  justify-self: center;
  height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent) 44%, var(--border));
  background: color-mix(in srgb, var(--accent) 14%, var(--bg-surface));
  color: var(--accent);
  font-weight: 600;
  cursor: pointer;
}

.row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-3);
  border-top: 1px solid var(--border-soft);
  border-radius: 10px;
  position: relative;
  z-index: 1;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
}

.row:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
}

.row:focus-within {
  z-index: 50;
}

.row:first-child {
  border-top: 0;
}

.label {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.desc {
  margin: var(--space-1) 0 0;
  font-size: 12px;
  color: var(--text-sub);
}

 .right {
  min-width: 180px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.input-action-wrap {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  width: min(560px, 100%);
}

.inline-input {
  width: min(440px, 100%);
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0 var(--space-3);
  background: var(--bg-muted);
  color: var(--text-main);
  outline: none;
}

.inline-input:focus {
  border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
}

.control-slot {
  width: 120px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.switch-slot {
  justify-content: center;
  padding-right: 0;
  box-sizing: border-box;
}

.select {
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0 10px;
  background: var(--bg-muted);
  color: var(--text-main);
}

.range {
  width: 180px;
}

.action-btn {
  height: 34px;
  padding: 0 var(--space-3);
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #ef4444 34%, var(--border));
  background: color-mix(in srgb, #ef4444 12%, var(--bg-surface));
  color: color-mix(in srgb, #ef4444 74%, var(--text-main));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  white-space: nowrap;
  writing-mode: horizontal-tb;
}

.color-picker-wrap {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.color-picker {
  width: 42px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: transparent;
  padding: 2px;
  cursor: pointer;
}

.color-hex {
  font-size: 12px;
  color: var(--text-soft);
  min-width: 74px;
  text-transform: lowercase;
}

.toast {
  position: fixed;
  right: 28px;
  bottom: 132px;
  z-index: 120;
  min-width: 132px;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--accent) 26%, var(--border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-surface) 86%, rgba(15, 23, 42, 0.08));
  color: var(--text-main);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(12px);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

</style>
