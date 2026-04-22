<template>
  <AnimatedAppear tag="header" variant="content" rhythm="head" class-name="topbar">
    <AnimatedAppear tag="button" variant="title" rhythm="title" class-name="brand" @click="emit('brand-click')">
      听闻 Music
    </AnimatedAppear>

    <div class="topbar-spacer" />

    <div class="actions">
      <AnimatedAppear
        tag="div"
        variant="content"
        rhythm="body"
        :index="0"
        class-name="search-wrap"
        :class="{ expanded: isExpanded }"
        @mouseenter="onSearchMouseEnter"
        @mouseleave="onSearchMouseLeave"
        @click="onSearchClick"
      >
        <button class="search-trigger" type="button" :aria-expanded="isExpanded" aria-label="打开搜索">
          <Search :size="16" class="icon" />
        </button>
        <div v-if="isExpanded" class="search-input-shell">
          <div class="search-input-wrap">
            <input
              ref="searchInputRef"
              v-model="searchKeyword"
              class="search-input"
              :class="{ 'has-clear': !!searchKeyword }"
              :placeholder="searchPlaceholder"
              @focus="openRecentPanel"
              @input="openRecentPanel"
              @keydown.enter="onSubmitSearch"
              @keydown.escape="onInputEscape"
            />
            <button v-if="searchKeyword" class="clear-btn" type="button" @click.stop="clearSearch" aria-label="清空搜索内容">
              ×
            </button>
          </div>
          <transition name="recent-panel-fade">
            <div v-if="showRecentPanel && recentSearches.length" class="recent-panel">
              <div class="recent-panel-head">
                <span>最近搜索</span>
                <button class="recent-clear" type="button" @click.stop="clearRecentSearches">清空历史</button>
              </div>
              <button
                v-for="item in recentSearches"
                :key="item"
                class="recent-item"
                type="button"
                @click.stop="useRecentSearch(item)"
              >
                <span class="recent-dot" />
                <span class="recent-text">{{ item }}</span>
              </button>
            </div>
          </transition>
        </div>
      </AnimatedAppear>

      <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="1" class-name="msg">
        <Bell :size="16" />
      </AnimatedAppear>
      <AnimatedAppear tag="div" variant="control" rhythm="actions" :index="2" class-name="avatar">TW</AnimatedAppear>
    </div>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Bell, Search } from 'lucide-vue-next';
import AnimatedAppear from './AnimatedAppear.vue';

import { uiStore } from '../stores/ui';

const RECENT_KEY = 'tm_search_history';
const emit = defineEmits<{ (e: 'brand-click'): void; (e: 'search-submit', keyword: string): void }>();
const searchInputRef = ref<HTMLInputElement | null>(null);
const showRecentPanel = ref(false);
const recentSearches = ref<string[]>(readRecentSearches());
const isExpanded = ref(false);
const isClicked = ref(false);

const searchKeyword = computed({
  get: () => uiStore.searchKeyword,
  set: (value: string) => {
    uiStore.searchKeyword = value;
    if (value.trim()) showRecentPanel.value = true;
  },
});
const searchPlaceholder = computed(() => uiStore.defaultSearchHint || '搜索歌曲/歌手，热搜：周杰伦、林俊杰、告五人');

function readRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 8);
  } catch {
    return [];
  }
}

function saveRecentSearches() {
  localStorage.setItem(RECENT_KEY, JSON.stringify(recentSearches.value.slice(0, 8)));
}

function rememberSearch(keyword: string) {
  const clean = keyword.trim();
  if (!clean) return;
  recentSearches.value = [clean, ...recentSearches.value.filter((item) => item !== clean)].slice(0, 8);
  saveRecentSearches();
}

function onSubmitSearch() {
  const keyword = uiStore.searchKeyword.trim() || uiStore.defaultSearchKeyword.trim();
  if (!keyword) return;
  rememberSearch(keyword);
  uiStore.searchKeyword = keyword;
  isExpanded.value = true;
  isClicked.value = true;
  showRecentPanel.value = false;
  emit('search-submit', keyword);
}

function useRecentSearch(keyword: string) {
  uiStore.searchKeyword = keyword;
  isExpanded.value = true;
  isClicked.value = true;
  showRecentPanel.value = false;
  emit('search-submit', keyword);
}

function clearSearch() {
  uiStore.searchKeyword = '';
  isExpanded.value = true;
  isClicked.value = true;
  showRecentPanel.value = recentSearches.value.length > 0;
  searchInputRef.value?.focus();
}

function onSearchMouseEnter() {
  isExpanded.value = true;
}

function onSearchMouseLeave() {
  if (!isClicked.value) {
    isExpanded.value = false;
    showRecentPanel.value = false;
  }
}

function onSearchClick() {
  isClicked.value = true;
  isExpanded.value = true;
  requestAnimationFrame(() => {
    searchInputRef.value?.focus();
  });
}

function collapseSearch() {
  isClicked.value = false;
  isExpanded.value = false;
  showRecentPanel.value = false;
}

function clearRecentSearches() {
  recentSearches.value = [];
  saveRecentSearches();
  showRecentPanel.value = false;
}

function openRecentPanel() {
  isExpanded.value = true;
  showRecentPanel.value = recentSearches.value.length > 0;
}

function closeRecentPanel() {
  showRecentPanel.value = false;
}

function onInputEscape() {
  closeRecentPanel();
  if (!uiStore.searchKeyword.trim()) {
    collapseSearch();
  }
}

function onDocClick(e: MouseEvent) {
  const target = e.target as Node;
  const root = searchInputRef.value?.closest('.search-wrap');
  if (root && !root.contains(target)) {
    closeRecentPanel();
    if (!uiStore.searchKeyword.trim()) {
      collapseSearch();
    } else {
      isClicked.value = false;
    }
  }
}

onMounted(() => {
  window.addEventListener('click', onDocClick);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', onDocClick);
});
</script>

<style scoped>
.topbar {
  height: 100%;
  border-bottom: 1px solid var(--border);
  border-radius: 14px 14px 0 0 !important;
  background: var(--glass-reflection), var(--bg-surface) !important;
  backdrop-filter: blur(var(--glass-blur)) saturate(145%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(145%);
  box-shadow: var(--glass-shadow), var(--glass-highlight);
  display: grid;
  grid-template-columns: minmax(140px, 180px) minmax(0, 1fr) auto;
  align-items: center;
  padding: 0 var(--space-4);
  gap: var(--space-3);
  box-sizing: border-box;
  min-width: 0;
}
.brand {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-main);
  cursor: pointer;
  justify-self: start;
  text-align: left;
}
.brand:hover {
  color: #16a34a;
}
.brand:active {
  transform: translateY(0) scale(0.99);
}
.topbar-spacer {
  min-width: 0;
}
.search-wrap {
  position: relative;
  width: 36px;
  min-width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--glass-reflection), var(--bg-muted);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  display: flex;
  align-items: center;
  overflow: visible;
  transition: width 0.28s ease, min-width 0.28s ease, height 0.28s ease, border-radius 0.28s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}
.search-wrap.expanded {
  width: min(596px, calc(100vw - 320px));
  min-width: min(596px, calc(100vw - 320px));
  height: 46px;
  border-radius: 16px;
  border-color: color-mix(in srgb, var(--accent) 38%, var(--border));
  box-shadow: 0 14px 32px color-mix(in srgb, var(--accent-soft) 55%, rgba(0, 0, 0, 0.08));
}
.search-wrap.expanded:focus-within {
  border-color: color-mix(in srgb, var(--accent) 58%, var(--border));
  box-shadow: 0 16px 36px color-mix(in srgb, var(--accent-soft) 72%, rgba(0, 0, 0, 0.08));
}
.search-trigger {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: inherit;
  background: transparent;
  color: var(--text-main);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: 0 0 36px;
}
.search-trigger:hover {
  color: var(--accent);
}
.icon {
  margin: 0 auto;
  color: currentColor;
}
.search-input-shell {
  position: relative;
  min-width: 0;
  height: 100%;
  flex: 1;
  overflow: visible;
}
.search-input-wrap {
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: stretch;
  position: relative;
}
.search-input {
  min-width: 0;
  flex: 1;
  height: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text-main);
  padding: 0 44px 0 var(--space-2);
  box-sizing: border-box;
  font-size: 14px;
}
.search-input::placeholder {
  color: var(--text-sub);
}
.clear-btn {
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-muted) 72%, transparent);
  color: var(--text-soft);
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  font-size: 18px;
  transition: background 0.16s ease, color 0.16s ease, transform 0.16s ease;
}
.clear-btn:hover {
  color: var(--text-main);
  background: color-mix(in srgb, var(--accent-soft) 65%, var(--bg-muted));
}
.clear-btn:active {
  transform: translateY(-50%) scale(0.96);
}
.recent-panel {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + var(--space-2));
  z-index: 40;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-surface);
  box-shadow: var(--glass-shadow);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.recent-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: 0;
  color: var(--text-sub);
  font-size: 12px;
}
.recent-clear {
  border: 0;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  padding: 0;
  font-size: 12px;
}
.recent-clear:hover {
  text-decoration: underline;
}
.recent-item {
  border: 0;
  background: transparent;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) 6px;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
}
.recent-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex: 0 0 auto;
}
.recent-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recent-panel-fade-enter-active,
.recent-panel-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.recent-panel-fade-enter-from,
.recent-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}
.msg {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--glass-reflection), var(--bg-muted);
  color: var(--text-main);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.msg:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  background: var(--glass-reflection), color-mix(in srgb, var(--accent) 12%, var(--bg-muted));
  transform: translateY(-1px);
}
.msg:active {
  transform: translateY(0) scale(0.99);
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 92%, #fff), color-mix(in srgb, var(--accent) 74%, #000));
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
</style>
