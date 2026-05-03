<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="comment-page">
    <header class="comment-head">
      <button class="ghost" @click="$emit('back')">返回</button>
      <h2 class="comment-title">{{ song?.name || '歌曲评论' }}</h2>
      <span class="comment-count">{{ total }} 条评论</span>
    </header>

    <div v-if="loading" class="comment-status">评论加载中…</div>
    <div v-else-if="!comments.length" class="comment-status">暂无评论</div>
    <ul v-else class="comment-list">
      <li v-for="item in comments" :key="item.commentId" class="comment-item">
        <img class="comment-avatar" :src="item.user?.avatarUrl + '?param=40y40'" :alt="item.user?.nickname" />
        <div class="comment-body">
          <div class="comment-user">{{ item.user?.nickname }}</div>
          <div class="comment-content">{{ item.content }}</div>
          <div v-if="item.beReplied?.length" class="comment-reply">
            <span class="reply-user">{{ item.beReplied[0].user?.nickname }}：</span>
            <span class="reply-text">{{ item.beReplied[0].content }}</span>
          </div>
          <div class="comment-meta">
            <span class="comment-time">{{ formatTime(item.time) }}</span>
            <span class="comment-liked">❤ {{ item.likedCount || 0 }}</span>
          </div>
        </div>
      </li>
    </ul>
    <div v-if="hasMore" class="comment-more">
      <button class="ghost" @click="loadMore" :disabled="loadingMore">加载更多</button>
    </div>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getSongComments, getSongDetail } from '../api/music';
import AnimatedAppear from './AnimatedAppear.vue';

const props = defineProps<{ songId: number }>();
defineEmits<{ (e: 'back'): void }>();

const song = ref<any>(null);
const comments = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const loadingMore = ref(false);
const offset = ref(0);
const LIMIT = 20;

const hasMore = computed(() => comments.value.length < total.value);

async function fetchComments(append = false) {
  if (!append) { loading.value = true; offset.value = 0; } else loadingMore.value = true;
  try {
    const res = await getSongComments({ id: props.songId, limit: LIMIT, offset: offset.value });
    const body = res.data;
    const data = body?.data || body || {};
    total.value = data?.total || data?.totalCount || 0;
    const newComments = data?.comments || [];
    comments.value = append ? [...comments.value, ...newComments] : newComments;
  } catch {}
  finally { loading.value = false; loadingMore.value = false; }
}

async function loadMore() {
  offset.value += LIMIT;
  await fetchComments(true);
}

function formatTime(ms: number) {
  if (!ms) return '';
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

onMounted(async () => {
  try {
    const detail = await getSongDetail(props.songId);
    song.value = detail.data?.songs?.[0] || null;
  } catch {}
  await fetchComments();
});
</script>

<style scoped>
.comment-page { padding: var(--space-4); max-width: 800px; margin: 0 auto; }
.comment-head { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
.comment-title { margin: 0; color: #fff; font-size: 20px; font-weight: 700; }
.comment-count { color: rgba(255,255,255,0.4); font-size: 13px; }
.comment-status { text-align: center; padding: var(--space-6); color: rgba(255,255,255,0.4); font-size: 14px; }
.comment-list { display: grid; gap: var(--space-3); list-style: none; margin: 0; padding: 0; }
.comment-item { display: flex; gap: var(--space-3); padding: var(--space-3); border-radius: 12px; background: rgba(255,255,255,0.03); }
.comment-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
.comment-body { min-width: 0; display: grid; gap: 4px; }
.comment-user { color: var(--accent); font-size: 13px; font-weight: 600; }
.comment-content { color: rgba(255,255,255,0.82); font-size: 14px; line-height: 1.5; word-break: break-word; }
.comment-reply { padding: var(--space-2); border-radius: 8px; background: rgba(255,255,255,0.04); font-size: 13px; }
.reply-user { color: var(--accent); }
.reply-text { color: rgba(255,255,255,0.55); }
.comment-meta { display: flex; align-items: center; gap: var(--space-3); color: rgba(255,255,255,0.3); font-size: 12px; }
.comment-time { }
.comment-liked { }
.comment-more { text-align: center; padding: var(--space-4); }
.ghost { height: 32px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: #fff; padding: 0 var(--space-3); cursor: pointer; }
</style>
