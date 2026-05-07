<template>
  <AnimatedAppear
    tag="button"
    variant="control"
    rhythm="actions"
    type="button"
    class-name="user-follow-button"
    :class="[`user-follow-button--${status}`, { loading }]"
    :aria-pressed="status !== 'none'"
    :aria-label="buttonLabel"
    :disabled="loading"
    @click="$emit('toggle')"
  >
    <span class="follow-core">
      <!-- 互相关注：双箭头 -->
      <svg v-if="status === 'mutual'" class="follow-icon" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12 L6 8 L2 4" />
        <path d="M14 12 L10 8 L14 4" />
      </svg>
      <!-- 已关注：勾 -->
      <svg v-else-if="status === 'following'" class="follow-icon" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3,8 7,12 13,4" />
      </svg>
      <!-- 未关注：加号 -->
      <svg v-else class="follow-icon" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <line x1="8" y1="2" x2="8" y2="14" />
        <line x1="2" y1="8" x2="14" y2="8" />
      </svg>
      <span class="follow-text">{{ statusLabel }}</span>
    </span>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AnimatedAppear from '../AnimatedAppear.vue';
import type { FollowStatus } from '../../composables/useUserFollow';

const props = defineProps<{
  status: FollowStatus;
  loading: boolean;
}>();

defineEmits<{
  toggle: [];
}>();

const statusLabel = computed(() => {
  switch (props.status) {
    case 'mutual': return '互相关注';
    case 'following': return '已关注';
    default: return '关注';
  }
});

const buttonLabel = computed(() => {
  switch (props.status) {
    case 'mutual': return '取消关注（互相关注）';
    case 'following': return '取消关注';
    default: return '关注用户';
  }
});
</script>

<style scoped>
.user-follow-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--button-surface-border);
  border-radius: 999px;
  background: var(--button-surface-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.4);
  color: var(--text-main);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.3px;
  transition:
    transform 180ms ease,
    border-color 220ms ease,
    background 220ms ease,
    box-shadow 220ms ease;
  box-shadow: var(--button-surface-shadow);
}

.user-follow-button:hover {
  transform: translateY(-1px) scale(1.02);
  border-color: var(--button-surface-hover-border);
  box-shadow: var(--button-surface-hover-shadow);
}

.user-follow-button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 60%, white);
  outline-offset: 2px;
}

.user-follow-button.loading {
  opacity: 0.72;
  cursor: progress;
}

.user-follow-button:disabled {
  pointer-events: none;
}

/* 已关注 / 互相关注 — 绿色强调 */
.user-follow-button--following,
.user-follow-button--mutual {
  border-color: color-mix(in srgb, var(--accent) 38%, var(--button-surface-hover-border));
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
  color: var(--accent);
}

.follow-core {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  position: relative;
  z-index: 3;
}

.follow-icon {
  flex-shrink: 0;
}

.follow-text {
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .user-follow-button {
    transition: none;
  }
}
</style>