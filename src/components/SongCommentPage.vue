<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="comment-page">
    <div class="comment-page-bar">
      <button class="ghost" @click="$emit('back')">← 返回</button>
    </div>
    <header class="comment-page-head">
      <img v-if="song?.al?.picUrl" class="head-cover" :src="song.al.picUrl + '?param=56y56'" :alt="song.name" />
      <div class="head-info">
        <h2 class="head-title">{{ song?.name || '歌曲评论' }}</h2>
        <p class="head-artist">{{ artistText }}</p>
      </div>
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
import { computed, onMounted, ref } from 'vue';
import { getSongDetail } from '../api/music';
import * as api from '../api/music';
import AnimatedAppear from './AnimatedAppear.vue';
import CommentPanel from './CommentPanel.vue';

const props = defineProps<{ songId: number }>();
defineEmits<{ (e: 'back'): void }>();

const song = ref<any>(null);
const artistText = computed(() => {
  const ar = song.value?.ar || [];
  return ar.length ? ar.map((a: any) => a.name).join(' / ') : '';
});

onMounted(async () => {
  try {
    const detail = await getSongDetail(props.songId);
    song.value = detail.data?.songs?.[0] || null;
  } catch {}
});
</script>

<style scoped>
.comment-page { padding: var(--space-4); width: 100%; max-width: 100%; box-sizing: border-box; }
.comment-page-bar { margin-bottom: var(--space-3); }
.comment-page-head { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
.head-cover { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; flex-shrink: 0; }
.head-info { min-width: 0; display: grid; gap: 2px; }
.head-title { margin: 0; color: var(--text-main); font-size: 18px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.head-artist { margin: 0; color: var(--text-sub); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ghost { height: 32px; border-radius: 10px; border: 1px solid var(--border-soft); background: transparent; color: var(--text-sub); padding: 0 var(--space-3); cursor: pointer; font-size: 13px; transition: all 0.12s ease; }
.ghost:hover { color: var(--text-main); border-color: var(--border); }
</style>
