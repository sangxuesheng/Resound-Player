<template>
  <AnimatedAppear
    tag="header"
    variant="content"
    rhythm="head"
    class-name="playlist-detail-header-wrap"
    :class="[sticky && 'is-sticky-header', embedded && 'detail-sticky-header--embedded']"
  >
    <template v-if="loading && !ready">
      <div class="state">{{ loadingText }}</div>
    </template>
    <template v-else-if="error">
      <div class="state error">{{ error }}</div>
    </template>
    <template v-else-if="ready">
      <PageHeroHeader
        layout-class="playlist-detail-header"
        media-class="playlist-detail-header__media"
        content-class="playlist-detail-header__content"
      >
        <template #media>
          <div class="hero-media-shell">
            <slot name="media" />
          </div>
        </template>
        <template #content>
          <div class="hero-main-shell meta">
            <div class="hero-title-shell">
              <slot name="title" />
            </div>
            <div class="hero-meta-shell">
              <slot name="meta" />
            </div>
            <div class="hero-actions-shell">
              <AnimatedAppear tag="div" variant="content" rhythm="actions" class-name="ops">
                <slot name="actions" />
              </AnimatedAppear>
            </div>
          </div>
        </template>
      </PageHeroHeader>
    </template>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import AnimatedAppear from './AnimatedAppear.vue';
import PageHeroHeader from './PageHeroHeader.vue';

defineProps<{
  sticky?: boolean;
  embedded?: boolean;
  loading?: boolean;
  ready?: boolean;
  error?: string;
  loadingText?: string;
}>();
</script>

<style scoped>
.playlist-detail-header-wrap {
  transition:
    margin 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    padding 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    border-radius 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    transform 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    box-shadow 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    background-color 0.46s ease,
    backdrop-filter 0.46s ease,
    -webkit-backdrop-filter 0.46s ease;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.hero-media-shell {
  overflow: hidden;
  border-radius: 18px;
  transform: translateZ(0);
}

:deep(.cover-motion-shell) {
  display: block;
  line-height: 0;
  transform-origin: center center;
}

:deep(img.cover) {
  display: block;
  width: 100%;
  height: 100%;
  transition:
    transform var(--image-hover-duration, var(--an-duration-base)) var(--image-hover-ease, var(--an-ease)),
    filter var(--image-hover-duration, var(--an-duration-base)) var(--image-hover-ease, var(--an-ease));
  transform: scale(1);
  transform-origin: center center;
  will-change: transform;
}

@media (hover: hover) and (pointer: fine) {
  .playlist-detail-header-wrap:not(.is-sticky-header) .hero-media-shell:hover :deep(img.cover),
  .playlist-detail-header-wrap:not(.is-sticky-header) .hero-media-shell:focus-within :deep(img.cover) {
    transform: scale(var(--image-hover-scale, 1.04));
    filter: saturate(var(--image-hover-saturate, 1.04));
  }
}

.playlist-detail-header-wrap.is-sticky-header {
  position: sticky;
  top: 0;
  z-index: 30;
  margin: 0 calc(var(--space-4) * -1) 0;
  padding: 14px var(--space-4) var(--space-2);
  border-radius: 0 0 16px 16px;
  background: color-mix(in srgb, var(--bg-surface) 82%, transparent);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(10px) saturate(132%);
  -webkit-backdrop-filter: blur(10px) saturate(132%);
}

.playlist-detail-header-wrap.is-sticky-header :deep(.hero-media-shell) {
  overflow: hidden;
}

.playlist-detail-header-wrap.is-sticky-header :deep(img.cover) {
  transform: scale(1);
  filter: none;
}

.playlist-detail-header-wrap.is-sticky-header.detail-sticky-header--embedded {
  top: -18px;
  margin: 0 -18px 0;
  padding: 14px 18px var(--space-2);
}
</style>
