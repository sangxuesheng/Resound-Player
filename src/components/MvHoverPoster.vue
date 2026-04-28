<template>
  <div class="mv-hover-poster interactive-media-trigger" :class="{ 'is-interactive': interactive, 'hover-play-button-trigger': interactive }">
    <div v-if="imageSrc" class="mv-hover-poster__media-shell interactive-media-shell">
      <AnimatedAppear
        tag="div"
        variant="media"
        :rhythm="rhythm"
        :index="index"
        class-name="mv-hover-poster__motion-shell interactive-media-motion"
      >
        <img
          :src="imageSrc"
          :alt="alt"
          loading="lazy"
          :class="['mv-hover-poster__image', 'interactive-media-image', imageClass]"
        />
      </AnimatedAppear>
    </div>
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

    <HoverPlayButton :count="count" size="md" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import HoverPlayButton from './HoverPlayButton.vue';
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

const fallbackAttrs = computed(() => ({
  class: props.fallbackClass,
}));
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

.mv-hover-poster__media-shell {
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

.mv-hover-poster__motion-shell {
  width: 100%;
  height: 100%;
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
</style>
