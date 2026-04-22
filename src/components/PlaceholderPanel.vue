<template>
  <AnimatedAppear tag="section" variant="content" rhythm="body" class-name="placeholder-panel">
    <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="title">{{ title }}</AnimatedAppear>
    <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="desc">
      该模块正在开发中，后续将提供完整功能与交互体验。
    </AnimatedAppear>

    <div class="chips">
      <AnimatedAppear v-for="(item, idx) in hints" :key="item" tag="span" variant="control" rhythm="actions" :index="idx" class-name="chip">
        {{ item }}
      </AnimatedAppear>
    </div>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AnimatedAppear from './AnimatedAppear.vue';

const props = withDefaults(
  defineProps<{
    pageKey: string;
  }>(),
  {
    pageKey: 'unknown',
  },
);

const titleMap: Record<string, string> = {
  rank: '排行榜模块开发中',
  mv: 'MV 模块开发中',
  history: '收藏历史模块开发中',
  settings: '设置模块开发中',
};

const hintsMap: Record<string, string[]> = {
  rank: ['榜单分类', '热度排序', '更新时间'],
  mv: ['MV 列表', '清晰度切换', '相关推荐'],
  history: ['最近播放', '收藏记录', '快速恢复'],
  settings: ['播放设置', '外观设置', '账号设置'],
};

const title = computed(() => titleMap[props.pageKey] || '模块开发中');
const hints = computed(() => hintsMap[props.pageKey] || ['功能规划中', '敬请期待', '持续更新']);
</script>

<style scoped>
.placeholder-panel {
  width: 100%;
  min-height: 280px;
  border: 1px dashed #d1d5db;
  border-radius: 16px;
  padding: 24px;
  box-sizing: border-box;
  background: #fff;
  display: grid;
  gap: 12px;
  align-content: center;
}

.title {
  margin: 0;
  color: #111827;
  font-size: 20px;
  font-weight: 700;
}

.desc {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  height: 28px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #f9fafb;
  color: #374151;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
}
</style>
