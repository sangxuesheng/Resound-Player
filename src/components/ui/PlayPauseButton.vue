<template>
  <button
    type="button"
    class="idx play-pause-button"
    :class="{ 'play-pause-button--interactive': shouldShowControl }"
    :aria-label="ariaLabel"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @focus="isHovered = true"
    @blur="isHovered = false"
    @click="onClick"
  >
    <template v-if="showIndex">
      {{ indexLabel }}
    </template>

    <svg v-else-if="showPlayIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="play-pause-button__icon">
      <path d="M9 7.2v9.6c0 .7.8 1.1 1.4.7l8-4.8c.6-.4.6-1.3 0-1.7l-8-4.8c-.6-.4-1.4 0-1.4.7z" fill="currentColor" />
    </svg>

    <svg v-else-if="showPauseIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="play-pause-button__icon">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    </svg>

    <span v-else class="play-pause-button__wave" aria-hidden="true">
      <i></i>
      <i></i>
      <i></i>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { playerStore } from '../../stores/player';

const props = defineProps<{
  songId: number;
  indexLabel: string | number;
}>();

const emit = defineEmits<{
  (e: 'play'): void;
}>();

const isHovered = ref(false);

const isCurrentSong = computed(() => Number(props.songId || 0) > 0 && Number(props.songId || 0) === Number(playerStore.currentSongId || 0));
const isCurrentSongPlaying = computed(() => isCurrentSong.value && playerStore.isPlaying);

const showIndex = computed(() => !isCurrentSongPlaying.value && !isHovered.value);
const showPlayIcon = computed(() => !isCurrentSongPlaying.value && isHovered.value);
const showPauseIcon = computed(() => isCurrentSongPlaying.value && isHovered.value);
const shouldShowControl = computed(() => showPlayIcon.value || showPauseIcon.value);
const ariaLabel = computed(() => {
  if (showPauseIcon.value) return '暂停';
  if (showPlayIcon.value) return '播放';
  return `第 ${props.indexLabel} 首`;
});

function onClick() {
  if (isCurrentSong.value) {
    void playerStore.togglePlay();
    return;
  }

  emit('play');
}
</script>

<style scoped>
.play-pause-button {
  width: 40px;
  min-width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  appearance: none;
  cursor: pointer;
  box-sizing: border-box;
}

.play-pause-button--interactive {
  color: var(--theme-primary);
}

.play-pause-button__icon {
  width: 18px;
  height: 18px;
  display: block;
}

.play-pause-button__wave {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  color: var(--theme-primary);
}

.play-pause-button__wave i {
  width: 3px;
  border-radius: 999px;
  background: currentColor;
  transform-origin: center bottom;
  animation: play-pause-button-wave 0.9s ease-in-out infinite;
}

.play-pause-button__wave i:nth-child(1) {
  height: 14px;
  animation-delay: 0s;
}

.play-pause-button__wave i:nth-child(2) {
  height: 18px;
  animation-delay: 0.15s;
}

.play-pause-button__wave i:nth-child(3) {
  height: 11px;
  animation-delay: 0.3s;
}

@keyframes play-pause-button-wave {
  0%,
  100% {
    transform: scaleY(0.4);
    opacity: 0.55;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}
</style>
