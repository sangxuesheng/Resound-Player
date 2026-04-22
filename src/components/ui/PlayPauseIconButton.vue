<template>
  <AnimatedAppear
    tag="button"
    variant="control"
    rhythm="actions"
    type="button"
    class-name="play-btn play-icon-btn"
    :aria-label="computedAriaLabel"
    :disabled="disabled"
    @click="onClick"
  >
    <svg v-if="shouldShowPause" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
    <svg v-else viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 7.2v9.6c0 .7.8 1.1 1.4.7l8-4.8c.6-.4.6-1.3 0-1.7l-8-4.8c-.6-.4-1.4 0-1.4.7z" />
    </svg>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AnimatedAppear from '../AnimatedAppear.vue';
import { playerStore } from '../../stores/player';

const props = defineProps<{
  songId?: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'play'): void;
}>();

const isCurrent = computed(() => Number(props.songId || 0) > 0 && Number(props.songId || 0) === Number(playerStore.currentSongId || 0));
const shouldShowPause = computed(() => isCurrent.value && playerStore.isPlaying);
const computedAriaLabel = computed(() => (shouldShowPause.value ? '暂停' : '播放'));

function onClick() {
  if (props.disabled) return;
  if (isCurrent.value) {
    void playerStore.togglePlay();
    return;
  }
  emit('play');
}
</script>
