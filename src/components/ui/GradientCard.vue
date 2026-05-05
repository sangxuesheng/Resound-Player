<template>
  <component
    :is="tag"
    class="gradient-card"
    :class="[`gradient-card--${hoverPlaySize || 'sm'}`, { 'hover-play-button-trigger': !!hoverPlaySize }]"
    :style="coverStyle"
    v-bind="$attrs"
  >
    <div class="gradient-card__media">
      <img
        v-if="cover"
        class="gradient-card__cover-img"
        :src="cover"
        :alt="name || ''"
        loading="lazy"
      />
      <HoverPlayButton
        v-if="hoverPlaySize"
        :size="hoverPlaySize"
        :count="playCount"
      />
    </div>
    <div class="gradient-card__info">
      <div class="gradient-card__name" :title="name">{{ name }}</div>
      <div v-if="$slots.subtitle || subtitle" class="gradient-card__subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import HoverPlayButton from '../HoverPlayButton.vue';

const props = withDefaults(
  defineProps<{
    tag?: 'button' | 'article';
    cover?: string;
    name?: string;
    subtitle?: string;
    hoverPlaySize?: 'sm' | 'md' | null;
    playCount?: number;
  }>(),
  {
    tag: 'button',
    cover: '',
    name: '',
    subtitle: '',
    hoverPlaySize: 'sm',
    playCount: undefined,
  },
);

defineSlots<{
  subtitle?: (props: Record<string, never>) => any;
}>();

const coverStyle = computed(() => {
  const url = props.cover?.trim();
  return url ? { '--card-cover': `url(${url})` } : {};
});
</script>

<style scoped>
.gradient-card {
  --card-radius: 12px;

  position: relative;
  isolation: isolate;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  border-radius: var(--card-radius);
  background: color-mix(in srgb, var(--bg-surface) 86%, rgba(15, 23, 42, 0.16));
}

.gradient-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--card-cover);
  background-size: cover;
  background-position: center;
  opacity: 0.92;
  filter: saturate(0.9) contrast(0.96);
}

.gradient-card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.2) 28%,
    rgba(255, 255, 255, 0.52) 62%,
    rgba(255, 255, 255, 0.92) 82%,
    rgb(255, 255, 255) 92%
  );
}

.gradient-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.12);
}

.gradient-card__media,
.gradient-card__info {
  position: relative;
  z-index: 2;
}

/* ---- Cover media ---- */
.gradient-card__media {
  --hover-play-button-size: 30px;
  --hover-play-button-offset: 8px;

  position: relative;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--card-radius) var(--card-radius) 0 0;
  background: var(--bg-soft) center/cover no-repeat;
  transform: translateZ(0);
}

.gradient-card--md .gradient-card__media {
  --hover-play-button-size: 34px;
  --hover-play-button-offset: 9px;
}

.gradient-card__cover-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition:
    transform var(--image-hover-duration, var(--an-duration-base)) var(--image-hover-ease, var(--an-ease)),
    filter var(--image-hover-duration, var(--an-duration-base)) var(--image-hover-ease, var(--an-ease));
  transform: scale(1);
  transform-origin: center center;
  will-change: transform;
}

@media (hover: hover) and (pointer: fine) {
  .gradient-card__media:hover .gradient-card__cover-img,
  .gradient-card:focus-within .gradient-card__cover-img {
    transform: scale(var(--image-hover-scale, 1.04));
    filter: saturate(var(--image-hover-saturate, 1.04));
  }
}

/* ---- Info area ---- */
.gradient-card__info {
  padding: var(--space-2);
}

.gradient-card__name {
  margin: 0;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.42;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gradient-card__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.35;
}

.gradient-card__subtitle :deep(.artist-inline-btn) {
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.gradient-card__subtitle :deep(.artist-inline-btn:hover) {
  color: var(--accent);
  text-decoration: underline;
}

.gradient-card__subtitle :deep(.artist-inline-btn + .artist-inline-btn::before) {
  content: '/';
  margin: 0 2px;
  color: var(--text-soft);
}
</style>