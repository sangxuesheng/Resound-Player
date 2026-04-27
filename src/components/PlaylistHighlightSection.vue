<template>
  <AnimatedAppear v-if="items.length" tag="section" variant="content" rhythm="body" class-name="hq-section">
    <AnimatedAppear tag="h3" variant="title" rhythm="head">{{ title }}</AnimatedAppear>
    <div class="hq-grid">
      <AnimatedAppear
        v-for="(item, idx) in items"
        :key="item.id"
        tag="article"
        variant="text"
        rhythm="list"
        :index="idx"
        class-name="hq-item interactive-media-trigger"
        @click="emit('open-detail', item.id)"
      >
        <InteractiveCoverMedia
          :src="resolveCover(item)"
          :alt="item.name"
          rhythm="media"
          :index="idx"
          shell-class="hq-media-shell"
          motion-class="hq-cover-motion-shell"
          image-class="hq-cover"
        />
        <div class="meta">
          <p class="name">{{ item.name }}</p>
          <p class="sub">{{ item.copywriter || item.creator?.nickname || fallbackSub }}</p>
        </div>
      </AnimatedAppear>
    </div>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import AnimatedAppear from './AnimatedAppear.vue';
import InteractiveCoverMedia from './InteractiveCoverMedia.vue';
import { resolvePlaylistCoverUrl } from '../utils/image';

defineProps<{
  title: string;
  fallbackSub: string;
  items: Array<{
    id: number;
    name: string;
    coverImgUrl?: string;
    picUrl?: string;
    copywriter?: string;
    creator?: { nickname?: string };
  }>;
}>();

const emit = defineEmits<{
  (e: 'open-detail', playlistId: number): void;
}>();

function resolveCover(item: { coverImgUrl?: string; picUrl?: string }) {
  return resolvePlaylistCoverUrl(item.coverImgUrl || item.picUrl || '', 800);
}
</script>

<style scoped>
.hq-section h3 { margin: 0 0 8px; font-size: 16px; }
.hq-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.hq-item { border: 1px solid #edf2f7; border-radius: 12px; overflow: hidden; background: #f8fafc; cursor: pointer; }
.hq-media-shell { }
.hq-cover-motion-shell { }
.hq-cover {
  aspect-ratio: 1 / 1;
  object-fit: contain;
  background: color-mix(in srgb, var(--bg-surface, #fff) 70%, #000);
}
.hq-item .meta { padding: 8px; }
.hq-item .name { margin: 0; font-size: 13px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hq-item .sub { margin: 4px 0 0; font-size: 12px; color: #6b7280; }

@media (max-width: 980px) {
  .hq-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
