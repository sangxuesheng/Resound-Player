<template>
  <div v-if="!isEmpty" class="search-history" :style="historyStyle">
    <div class="history-top">
      <div class="history-heading">
        <h4 class="history-title">搜索记录</h4>
      </div>
      <button v-if="!isEmpty" class="history-clear" type="button" @click="$emit('clear-all')">清空全部</button>
    </div>

    <div class="history-list">
      <button
        v-for="item in items"
        :key="`${item.keyword}-${item.time}`"
        class="history-item"
        type="button"
        @click="$emit('select', item.keyword)"
      >
        <span class="history-main">
          <span class="history-keyword">{{ item.keyword }}</span>
          <span class="history-time">{{ formatTime(item.time) }}</span>
        </span>
        <span class="history-actions">
          <span class="history-arrow">↗</span>
          <button
            class="history-delete"
            type="button"
            aria-label="删除记录"
            @click.stop="$emit('delete-item', item.keyword)"
          >
            ×
          </button>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type SearchHistoryRecord = {
  keyword: string;
  time: number;
};

const props = defineProps<{
  items: SearchHistoryRecord[];
}>();

defineEmits<{
  (e: 'select', keyword: string): void;
  (e: 'delete-item', keyword: string): void;
  (e: 'clear-all'): void;
}>();

const isEmpty = computed(() => props.items.length === 0);
const historyStyle = computed(() => ({ '--i': 0, '--rhythm-offset': 3 }));

function formatTime(time: number) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return '刚刚';
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前`;
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))} 小时前`;
  return `${date.getMonth() + 1}/${date.getDate()} ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}
</script>

<style scoped>
.history-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.history-heading {
  min-width: 0;
  flex: 1;
}

.history-title {
  margin: 0;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 700;
}

.history-sub {
  margin: 6px 0 0;
  color: var(--text-sub);
  font-size: 13px;
}

.history-clear {
  border: 1px solid color-mix(in srgb, var(--theme-primary, var(--accent)) 24%, var(--border));
  background: color-mix(in srgb, var(--theme-primary, var(--accent)) 10%, var(--bg-muted));
  color: var(--theme-primary, var(--accent));
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  transition: transform .18s ease, background .18s ease, border-color .18s ease;
}

.history-clear:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--theme-primary, var(--accent)) 18%, var(--bg-muted));
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.history-item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  min-width: 0;
  max-width: min(100%, 320px);
  border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
  background: var(--bg-muted);
  color: var(--text-main);
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease, transform .18s ease, box-shadow .18s ease;
}

.history-item:hover {
  background: color-mix(in srgb, var(--theme-primary, var(--accent)) 14%, var(--bg-surface));
  border-color: color-mix(in srgb, var(--theme-primary, var(--accent)) 30%, var(--border));
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}

.history-main {
  display: grid;
  min-width: 0;
  max-width: 100%;
  text-align: left;
}

.history-keyword {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-sub);
}

.history-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.history-arrow {
  display: none;
  color: var(--theme-primary, var(--accent));
  font-size: 12px;
  border-radius: 999px;
  padding: 2px;
  transition: color .18s ease, background .18s ease, opacity .18s ease;
}

.history-item:hover .history-arrow {
  display: block;
  background: color-mix(in srgb, var(--theme-primary, var(--accent)) 14%, var(--bg-surface));
}

.history-delete {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-sub);
  display: grid;
  place-items: center;
  opacity: 0;
  cursor: pointer;
  transition: opacity .18s ease, background .18s ease, color .18s ease;
}

.history-item:hover .history-delete {
  opacity: 1;
}

.history-delete:hover {
  background: color-mix(in srgb, var(--theme-primary, var(--accent)) 16%, var(--bg-surface));
  color: var(--theme-primary, var(--accent));
}

@media (max-width: 767px) {
  .history-top {
    align-items: center;
  }

  .history-item {
    width: 100%;
  }
}
</style>
