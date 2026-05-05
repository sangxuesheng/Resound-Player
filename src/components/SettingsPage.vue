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

            <div v-else-if="item.type === 'source-order'" class="source-order-wrap">
              <button
                class="source-order-toggle"
                type="button"
                @click="sourceOrderExpanded = !sourceOrderExpanded"
                :aria-expanded="sourceOrderExpanded"
                aria-controls="source-order-list"
              >
                <span class="source-order-summary">
                  {{ sourceOrder.length }}个音源
                  <span class="source-order-hint">{{ sourceOrderExpanded ? '点击收起' : '点击展开' }}</span>
                </span>
                <svg
                  class="source-order-chevron"
                  :class="{ rotated: sourceOrderExpanded }"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  width="16"
                  height="16"
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </button>
              <div
                v-show="sourceOrderExpanded"
                id="source-order-list"
                class="source-order-list"
              >
                <div
                  v-for="(src, srcIdx) in sourceOrder"
                  :key="src.key"
                  class="source-row"
                >
                  <span class="source-index" :style="{ backgroundColor: src.color + '22', color: src.color }">{{ srcIdx + 1 }}</span>
                  <span class="source-name">{{ src.label }}</span>
                  <div class="source-arrows">
                    <button
                      class="arrow-btn"
                      :disabled="srcIdx === 0"
                      @click="moveSource(srcIdx, -1)"
                      aria-label="上移"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M4 10l4-4 4 4"/></svg>
                    </button>
                    <button
                      class="arrow-btn"
                      :disabled="srcIdx === sourceOrder.length - 1"
                      @click="moveSource(srcIdx, 1)"
                      aria-label="下移"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M4 6l4 4 4-4"/></svg>
                    </button>
                  </div>
                </div>
                <p v-if="sourceOrderFeedback" class="source-order-feedback">{{ sourceOrderFeedback }}</p>
              </div>
            </div>

            <DropdownSelect
              v-else-if="item.type === 'select'"
              v-model="selectState[item.key]"
              :options="item.options || []"
              :option-colors="item.key === 'accent' ? accentColors : {}"
              :option-vip-labels="item.optionVipLabels || {}"
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
import { getSourceMeta } from '../config/musicSources';
import { lyricsSettings } from '../stores/lyricsSettings';

type SettingItem = {
  key: string;
  label: string;
  desc?: string;
  type: 'switch' | 'select' | 'range' | 'action' | 'input' | 'source-order';
  options?: string[];
  optionVipLabels?: Record<string, string>;
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
        { key: 'resumeAfterMv', label: 'MV 关闭后恢复播放', desc: '关闭 MV 播放页后自动恢复歌曲播放', type: 'switch' },
        { key: 'quality', label: '默认音质', desc: '以账号具体权限为准', type: 'select', options: ['标准', '较高', '极高(HQ)', '无损(SQ)', 'Hi-Res', '高清臻音', '沉浸环绕声', '杜比全景声', '超清母带'], optionVipLabels: { '无损(SQ)': '黑胶VIP', 'Hi-Res': '黑胶VIP', '高清臻音': 'SVIP', '沉浸环绕声': 'SVIP', '杜比全景声': 'SVIP', '超清母带': 'SVIP' } },
        { key: 'unblock', label: '音源替换', desc: '非会员用户，建议打开。可享受所有会员歌曲播放。仅对播放音乐有限制，下载不受该选项的管理。启用后自动从波点/酷狗/咪咕等源替换无法播放的歌曲', type: 'switch' },
        { key: 'unblockSources', label: '音源优先级', desc: '按从上到下的顺序逐个尝试，第一个匹配成功的使用，全部失败则使用官方音源', type: 'source-order' },
        { key: 'playMode', label: '默认播放模式', desc: '循环/单曲/随机播放策略', type: 'select', options: ['列表循环', '单曲循环', '随机播放'] },
        { key: 'playbackRate', label: '播放速度', desc: '设置全局默认播放速度，各歌曲可在底部栏单独调整', type: 'select', options: ['0.5x', '0.75x', '1.0x', '1.25x', '1.5x', '2.0x', '2.5x', '3.0x'] },
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
        { key: 'barLyric', label: '底部栏歌词', desc: '播放时底部栏显示歌词', type: 'switch' },
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
        if (item.key === 'unblockSources') return switchState.unblock;
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
  unblock: uiStore.unblockEnabled,
  autoplay: playerStore.autoplayNext,
  liquidGlass: uiStore.liquidGlassEnabled,
  compact: false,
  barLyric: lyricsSettings.showBarLyric,
  resumeAfterMv: uiStore.resumeAfterMv,
});

const selectState = reactive<Record<string, string>>({
  quality: playerStore.defaultQuality,
  playMode: playerStore.playMode === 'single' ? '单曲循环' : playerStore.playMode === 'shuffle' ? '随机播放' : '列表循环',
  playbackRate: `${playerStore.defaultPlaybackRate.toFixed(2).replace(/\.00$/, '.0')}x`,
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

// --- Source order ---

const sourceOrder = computed({
  get: () =>
    uiStore.unblockSources.map((key) => {
      const meta = getSourceMeta(key);
      return { key, label: meta?.label || key, color: meta?.color || '#888' };
    }),
  set: (value) => {
    uiStore.setUnblockSources(value.map((s) => s.key));
  },
});

const sourceOrderExpanded = ref(false);
const sourceOrderFeedback = ref('');
let sourceOrderFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

function showSourceFeedback(message: string) {
  sourceOrderFeedback.value = message;
  if (sourceOrderFeedbackTimer) clearTimeout(sourceOrderFeedbackTimer);
  sourceOrderFeedbackTimer = setTimeout(() => {
    sourceOrderFeedback.value = '';
  }, 4000);
}

function moveSource(index: number, direction: number) {
  const list = [...sourceOrder.value];
  const target = index + direction;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  uiStore.setUnblockSources(list.map((s) => s.key));
  showSourceFeedback('音源顺序已更新，播放下首歌曲时生效');
}

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
  () => switchState.unblock,
  (enabled) => {
    uiStore.setUnblockEnabled(Boolean(enabled));
    showSourceFeedback(enabled ? '音源替换已开启' : '音源替换已关闭');
  },
);

watch(
  () => switchState.autoplay,
  (enabled) => {
    playerStore.setAutoplayNext(Boolean(enabled));
  },
);

watch(
  () => switchState.barLyric,
  (enabled) => {
    lyricsSettings.showBarLyric = Boolean(enabled);
    lyricsSettings.save();
  },
);

watch(
  () => switchState.resumeAfterMv,
  (enabled) => {
    uiStore.setResumeAfterMv(Boolean(enabled));
  },
);

// 从 playerStore 持久化数据同步到 selectState
watch(() => playerStore.defaultQuality, (val) => {
  selectState.quality = val;
});

watch(
  () => selectState.quality,
  (value) => {
    const validQualities = ['标准', '较高', '极高(HQ)', '无损(SQ)', 'Hi-Res', '高清臻音', '沉浸环绕声', '杜比全景声', '超清母带'];
    if (validQualities.includes(value)) {
      playerStore.setDefaultQuality(value);
      console.log('[quality] 设置页切换为:', value, '| 歌曲:', playerStore.currentTrack?.name);
      if (playerStore.currentTrack && playerStore.isPlaying) {
        const ct = playerStore.currentTime;
        console.log('[quality] 设置页触发重拉, 进度:', Math.floor(ct), 's');
        void playerStore.playTrack(playerStore.currentTrack, ct);
      }
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
    if (Number.isFinite(rate)) playerStore.setDefaultPlaybackRate(rate);
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
    try {
      const normalizedCookie = String(inputState.cookieEditor || '').trim();
      userStore.saveCookie(normalizedCookie);
      showLogoutMessage(normalizedCookie ? 'Cookie 已保存' : 'Cookie 已清空');
    } catch (e: any) {
      showLogoutMessage(e?.message || 'Cookie 保存失败');
    }
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

.source-order-feedback {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--accent);
  text-align: center;
  transition: opacity 0.3s ease;
}

.source-order-wrap {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  max-width: 280px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.source-order-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 40px;
  padding: 0 var(--space-3);
  border: none;
  background: var(--bg-muted);
  color: var(--text-main);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.source-order-toggle:hover {
  background: color-mix(in srgb, var(--accent) 6%, var(--bg-muted));
}

.source-order-summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 13px;
  font-weight: 500;
}

.source-order-hint {
  font-size: 11px;
  color: var(--text-soft);
  font-weight: 400;
}

.source-order-chevron {
  transition: transform 0.2s ease;
  color: var(--text-sub);
}

.source-order-chevron.rotated {
  transform: rotate(180deg);
}

.source-order-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-2);
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
}

.source-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 36px;
  padding: 0 var(--space-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-muted);
}

.source-index {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.source-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-main);
}

.source-arrows {
  display: flex;
  gap: 2px;
}

.arrow-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-sub);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.arrow-btn:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}

.arrow-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
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
  background: var(--bg-solid);
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
