<template>
  <AnimatedAppear tag="header" variant="content" rhythm="head" :class="['page-hero-header', layoutClass]">
    <AnimatedAppear tag="div" variant="media" rhythm="list" class-name="page-hero-header__media" :class="mediaClass">
      <slot name="media" />
    </AnimatedAppear>
    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="page-hero-header__content" :class="contentClass">
      <slot name="content" />
    </AnimatedAppear>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import AnimatedAppear from './AnimatedAppear.vue';

defineProps<{
  layoutClass?: string;
  mediaClass?: string;
  contentClass?: string;
}>();
</script>

<style scoped>
.page-hero-header {
  display: grid;
  grid-template-columns: var(--hero-media-width, 308px) minmax(0, 1fr);
  gap: 22px;
  align-items: center;
}

.page-hero-header__media,
.page-hero-header__content {
  min-width: 0;
}

.page-hero-header__media {
  width: var(--hero-media-width, 308px);
}

@media (max-width: 767px) {
  .page-hero-header {
    grid-template-columns: 1fr;
  }

  .page-hero-header__media {
    width: 140px;
  }
}
</style>
