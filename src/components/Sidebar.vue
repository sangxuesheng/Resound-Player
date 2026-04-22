<template>
  <AnimatedAppear tag="aside" variant="sidebar" rhythm="shell" class-name="sidebar" :class="{ collapsed }">
    <AnimatedAppear tag="div" variant="content" rhythm="head" class-name="profile" :class="{ compact: collapsed }">
      <AnimatedAppear tag="div" variant="control" rhythm="actions" class-name="avatar">TW</AnimatedAppear>
      <div class="user" :class="{ collapsedText: collapsed }">
        <AnimatedAppear tag="div" variant="text" rhythm="body" class-name="name">听闻音乐用户</AnimatedAppear>
        <AnimatedAppear tag="div" variant="text" rhythm="body" :index="1" class-name="sub">在线</AnimatedAppear>
      </div>
    </AnimatedAppear>

    <nav class="menu">
      <AnimatedAppear
        v-for="(item, idx) in items"
        :key="item.key"
        tag="button"
        variant="nav"
        rhythm="list"
        :index="idx"
        class-name="menu-item"
        :class="{ active: item.key === activeKey, iconOnly: collapsed }"
        :title="collapsed ? item.label : ''"
        @click="emit('select', item.key)"
      >
        <component :is="item.icon" :size="18" class="icon" />
        <span class="text" :class="{ collapsedText: collapsed }">{{ item.label }}</span>
      </AnimatedAppear>
    </nav>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { Clapperboard, Compass, History, Home, ListMusic, Search, Settings, Trophy, User } from 'lucide-vue-next';
import AnimatedAppear from './AnimatedAppear.vue';

withDefaults(
  defineProps<{
    activeKey: string;
    collapsed?: boolean;
  }>(),
  {
    collapsed: false,
  },
);

const emit = defineEmits<{
  (e: 'select', key: string): void;
}>();

const items = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'search', label: '搜索', icon: Search },
  { key: 'playlist', label: '歌单', icon: ListMusic },
  { key: 'rank', label: '排行榜', icon: Trophy },
  { key: 'mv', label: 'MV', icon: Clapperboard },
  { key: 'history', label: '收藏历史', icon: History },
  { key: 'user', label: '用户', icon: User },
  { key: 'settings', label: '设置', icon: Settings },
  { key: 'discover', label: '发现', icon: Compass },
];
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: var(--layout-top, 8px);
  left: var(--layout-left, 8px);
  width: var(--sidebar-width, 220px);
  height: var(--sidebar-height, 1026px);
  min-width: 0;
  max-width: 100%;
  border-radius: 14px;
  padding: var(--space-3) var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  box-sizing: border-box;
  cursor: default;
  overflow: auto;
  overflow-x: hidden;
  transition: width 0.26s ease, min-width 0.26s ease, padding 0.26s ease;
}

.profile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: 14px;
  transition: padding 0.26s ease, gap 0.26s ease;
}

.profile.compact {
  justify-content: center;
  padding: var(--space-2);
  gap: 0;
}

.user {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  transition: opacity 0.22s ease, max-width 0.22s ease, margin 0.22s ease;
  max-width: 120px;
  opacity: 1;
}

.text {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  transition: opacity 0.2s ease, max-width 0.2s ease, margin 0.2s ease;
  max-width: 120px;
  opacity: 1;
}

.collapsedText {
  opacity: 0;
  max-width: 0;
  margin: 0 !important;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 92%, #fff), color-mix(in srgb, var(--accent) 74%, #000));
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
}

.user .name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.user .sub {
  font-size: 12px;
  color: var(--text-sub);
}

.menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.22s ease;
  min-height: 40px;
  min-width: 0;
  overflow: hidden;
}

.menu-item.iconOnly {
  justify-content: center;
  padding: var(--space-2);
  gap: 0;
}

.menu-item.active {
  color: var(--accent);
  font-weight: 600;
}

.icon {
  flex-shrink: 0;
}
</style>
