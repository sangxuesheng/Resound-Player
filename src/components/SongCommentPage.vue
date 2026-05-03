<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="comment-page">
    <CommentPanel
      :resource-id="props.songId"
      :resource-type="0"
      :title="song?.name || '歌曲评论'"
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
</style>
