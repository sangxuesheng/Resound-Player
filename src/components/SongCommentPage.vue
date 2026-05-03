<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="comment-page">
    <header class="comment-page-head">
      <button class="ghost" @click="$emit('back')">← 返回</button>
      <h2 class="comment-page-title">{{ song?.name || '歌曲评论' }}</h2>
    </header>
    <CommentPanel
      :resource-id="props.songId"
      :resource-type="0"
      :fetcher="api.getSongComments"
      :sender="api.sendComment"
      :liker="api.likeComment"
      :deleter="api.deleteSongComment"
    />
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getSongDetail } from '../api/music';
import * as api from '../api/music';
import AnimatedAppear from './AnimatedAppear.vue';
import CommentPanel from './CommentPanel.vue';

const props = defineProps<{ songId: number }>();
defineEmits<{ (e: 'back'): void }>();

const song = ref<any>(null);

onMounted(async () => {
  try {
    const detail = await getSongDetail(props.songId);
    song.value = detail.data?.songs?.[0] || null;
  } catch {}
});
</script>

<style scoped>
.comment-page { padding: var(--space-4); width: 100%; max-width: 100%; box-sizing: border-box; }
.comment-page-head { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
.comment-page-title { margin: 0; color: var(--text-main); font-size: 18px; font-weight: 700; }
.ghost { height: 32px; border-radius: 10px; border: 1px solid var(--border-soft); background: transparent; color: var(--text-sub); padding: 0 var(--space-3); cursor: pointer; font-size: 13px; transition: all 0.12s ease; }
.ghost:hover { color: var(--text-main); border-color: var(--border); }
</style>
