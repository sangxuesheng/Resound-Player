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
}

.playlist-detail-header-wrap.is-sticky-header {
  position: sticky;
  top: 0;
  z-index: 30;
  margin: 0 calc(var(--space-4) * -1) 0;
  padding: 18px var(--space-4) var(--space-2);
  border-radius: 0 0 18px 18px;
  background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(14px) saturate(150%);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
}

.playlist-detail-header-wrap.is-sticky-header.detail-sticky-header--embedded {
  top: -18px;
  margin: 0 -18px 0;
  padding: 18px 18px var(--space-2);
}
</style>
