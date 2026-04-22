<template>
  <div class="mv-hover-poster" :class="{ 'is-interactive': interactive }">
    <AnimatedAppear
      v-if="imageSrc"
      tag="img"
      variant="media"
      :rhythm="rhythm"
      :index="index"
      class-name="mv-hover-poster__image"
      :attrs="imageAttrs"
    />
    <AnimatedAppear
      v-else
      tag="div"
      variant="media"
      :rhythm="rhythm"
      :index="index"
      class-name="mv-hover-poster__fallback"
      :attrs="fallbackAttrs"
    >
      {{ fallbackText }}
    </AnimatedAppear>

    <div class="mv-hover-poster__overlay" aria-hidden="true">
      <AnimatedAppear
        tag="span"
        variant="text"
        :rhythm="rhythm"
        :index="index"
        class-name="mv-hover-poster__count"
      >
        {{ countLabel }}
      </AnimatedAppear>
      <span class="mv-hover-poster__play-button">
        <span class="mv-hover-poster__play-icon" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AnimatedAppear from './AnimatedAppear.vue';

const props = withDefaults(
  defineProps<{
    src?: string;
    alt?: string;
    count?: number | string;
    fallbackText?: string;
    fallbackClass?: string;
    imageClass?: string;
    rhythm?: 'shell' | 'head' | 'title' | 'body' | 'actions' | 'list' | 'overlay';
    index?: number;
    interactive?: boolean;
  }>(),
  {
    src: '',
    alt: 'MV封面',
    count: 0,
    fallbackText: 'MV',
    fallbackClass: '',
    imageClass: '',
    rhythm: 'list',
    index: 0,
    interactive: true,
  },
);

const imageSrc = computed(() => String(props.src || '').trim());

const countLabel = computed(() => formatPlayCount(props.count));

const imageAttrs = computed(() => ({
  src: imageSrc.value,
  alt: props.alt,
  loading: 'lazy',
}));

const fallbackAttrs = computed(() => ({
  class: props.fallbackClass,
}));

function formatPlayCount(count?: number | string) {
  const value = typeof count === 'number' ? count : Number(count || 0);
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 100000000) return `${(value / 100000000).toFixed(value >= 1000000000 ? 0 : 1)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  return String(Math.round(value));
}
</script>

<style scoped>
.mv-hover-poster {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 14px;
  overflow: hidden;
  background: var(--bg-muted);
}

.mv-hover-poster__image,
.mv-hover-poster__fallback {
  width: 100%;
  height: 100%;
  display: block;
}

.mv-hover-poster__image {
  object-fit: cover;
}

.mv-hover-poster__fallback {
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.mv-hover-poster__overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.mv-hover-poster__count,
.mv-hover-poster__play-button {
  position: absolute;
  transition:
    opacity 0.24s ease,
    transform 0.24s ease,
    filter 0.24s ease;
  will-change: opacity, transform;
}

.mv-hover-poster__count {
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.44));
  color: rgba(255, 255, 255, 0.96);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
  transform: translateY(0);
  opacity: 1;
}

.mv-hover-poster__play-button {
  right: 10px;
  bottom: 10px;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.08) 42%, rgba(15, 23, 42, 0.18) 100%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.08));
  border: 1px solid rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.2);
  opacity: 0;
  transform: translateY(8px) scale(0.92);
}

.mv-hover-poster__play-icon {
  width: 0;
  height: 0;
  margin-left: 3px;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
  border-left: 11px solid #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.16));
}

.is-interactive:hover .mv-hover-poster__count,
.is-interactive:focus-within .mv-hover-poster__count,
.is-interactive:focus-visible .mv-hover-poster__count {
  opacity: 0;
  transform: translateY(-8px);
}

.is-interactive:hover .mv-hover-poster__play-button,
.is-interactive:focus-within .mv-hover-poster__play-button,
.is-interactive:focus-visible .mv-hover-poster__play-button {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
