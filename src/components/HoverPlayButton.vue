<template>
  <span v-if="count != null" class="hover-play-button-count">{{ formattedCount }}</span>
  <span class="hover-play-button" :class="[sizeClass, $attrs.class]" aria-hidden="true">
    <span class="hover-play-button__icon" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import '../styles/hover-play-button.css';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    count?: number | string;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    count: undefined,
    size: undefined,
  },
);

const sizeClass = computed(() => {
  if (props.size === 'sm') return 'hover-play-button--sm';
  if (props.size === 'md') return 'hover-play-button--md';
  if (props.size === 'lg') return 'hover-play-button--lg';
  return '';
});

const formattedCount = computed(() => {
  const value = typeof props.count === 'number' ? props.count : Number(props.count ?? 0);
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 100000000) return `${(value / 100000000).toFixed(value >= 1000000000 ? 0 : 1)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  return String(Math.round(value));
});
</script>
