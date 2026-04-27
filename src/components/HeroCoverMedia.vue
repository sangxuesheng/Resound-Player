<template>
  <div :class="['hero-media-shell', shellClass]">
    <AnimatedAppear
      tag="div"
      variant="media"
      :rhythm="rhythm"
      :index="index"
      :class-name="heroMotionClassName"
    >
      <img
        :src="src"
        :alt="alt"
        :loading="loading"
        :class="['cover', imageClass]"
      />
    </AnimatedAppear>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AnimatedAppear from './AnimatedAppear.vue';

// 只用于详情页头图 media 槽位；它复用 detail-page.css 里的 hero 结构，不参与普通结果卡布局。
const props = withDefaults(
  defineProps<{
    src: string;
    alt?: string;
    loading?: 'lazy' | 'eager';
    rhythm?: 'shell' | 'head' | 'title' | 'body' | 'actions' | 'list' | 'overlay' | 'media';
    index?: number;
    shellClass?: string;
    motionClass?: string;
    imageClass?: string;
  }>(),
  {
    alt: '封面',
    loading: 'eager',
    rhythm: 'body',
    index: 0,
    shellClass: '',
    motionClass: 'cover-motion-shell',
    imageClass: '',
  },
);

const heroMotionClassName = computed(() =>
  [props.motionClass].filter(Boolean).join(' '),
);
</script>
