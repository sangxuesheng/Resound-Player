<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="comment-page">
    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="comment-panel">
      <div class="comment-head">
        <h4 class="comment-title">{{ song?.name || '歌曲评论' }}</h4>
        <span class="comment-count">{{ total }} 条</span>
      </div>

      <div class="comment-editor">
        <textarea v-model="newComment" class="comment-input" maxlength="300" placeholder="写下你的评论..." />
        <div class="comment-editor-actions">
          <span class="comment-limit">{{ newComment.length }}/300</span>
          <button type="button" class="comment-submit" :disabled="!newComment.trim()" @click="submitComment">发表评论</button>
        </div>
      </div>

      <div v-if="loading" class="comment-loading">评论加载中…</div>
      <div v-else-if="!comments.length" class="comment-empty">暂无评论</div>

      <template v-else>
        <AnimatedAppear tag="ul" variant="content" rhythm="list" class-name="comment-list">
          <AnimatedAppear v-for="(item, idx) in comments" :key="item.commentId" tag="li" variant="text" rhythm="list" :index="idx" class-name="comment-item">
            <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="comment-main">
              <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="comment-user-row">
                <img class="comment-avatar" :src="item.user?.avatarUrl + '?imageView&thumbnail=40x40'" :alt="item.user?.nickname" />
                <AnimatedAppear tag="div" variant="text" rhythm="list" :index="idx" class-name="comment-user">{{ item.user?.nickname }}</AnimatedAppear>
              </AnimatedAppear>
              <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="comment-content">{{ item.content }}</AnimatedAppear>
              <div v-if="item.beReplied?.length" class="comment-reply">
                <span class="reply-user">@{{ item.beReplied[0].user?.nickname }}：</span>
                <span class="reply-text">{{ item.beReplied[0].content }}</span>
              </div>
              <AnimatedAppear tag="div" variant="content" rhythm="actions" :index="idx" class-name="comment-actions">
                <span class="comment-time">{{ formatTime(item.time) }}</span>
                <span class="comment-likes">❤ {{ item.likedCount || 0 }}</span>
              </AnimatedAppear>
            </AnimatedAppear>
          </AnimatedAppear>
        </AnimatedAppear>
        <div v-if="hasMore" class="comment-more-wrap">
          <button class="comment-more-btn" @click="loadMore" :disabled="loadingMore">{{ loadingMore ? '加载中…' : '加载更多' }}</button>
        </div>
      </template>
    </AnimatedAppear>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getSongComments, getSongDetail } from '../api/music';
import AnimatedAppear from './AnimatedAppear.vue';

const props = defineProps<{ songId: number }>();
defineEmits<{ (e: 'back'): void }>();

const song = ref<any>(null);
const newComment = ref('');
const comments = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const loadingMore = ref(false);
const offset = ref(0);
const LIMIT = 20;

const hasMore = computed(() => comments.value.length < total.value);

function submitComment() {
  if (!newComment.value.trim()) return;
  // 评论功能由评论区独立组件提供，此处仅展示 UI
  newComment.value = '';
}

async function fetchComments(append = false) {
  if (!append) { loading.value = true; offset.value = 0; } else loadingMore.value = true;
  try {
    const res = await getSongComments({ id: props.songId, limit: LIMIT, offset: offset.value });
    const body = res.data;
    const data = body?.data || body || {};
    total.value = data?.total || data?.totalCount || 0;
    const newComments = data?.comments || [];
    comments.value = append ? [...comments.value, ...newComments] : newComments;
  } catch { console.error('[comment] fetch failed'); }
  finally { loading.value = false; loadingMore.value = false; }
}

async function loadMore() {
  offset.value += LIMIT;
  await fetchComments(true);
}

function formatTime(ms: number) {
  if (!ms) return '';
  const date = new Date(ms);
  const now = Date.now();
  const diff = now - ms;
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
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
.comment-page { padding: var(--space-4); max-width: 700px; margin: 0 auto; }
.comment-panel { border-radius: 16px; border: 1px solid var(--border-soft); background: var(--bg-solid); padding: 16px; box-sizing: border-box; width: 100%; }
.comment-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.comment-title { margin: 0; font-size: 16px; color: var(--text-main); }
.comment-count { font-size: 12px; color: var(--text-sub); }
.comment-loading, .comment-empty { padding: 32px 0; text-align: center; color: var(--text-sub); font-size: 14px; }
.comment-editor { border: 1px solid var(--border-soft); border-radius: 12px; padding: 10px; background: var(--bg-muted); margin-bottom: 12px; }
.comment-input { width: 100%; min-height: 76px; resize: vertical; border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; box-sizing: border-box; background: var(--bg-surface); color: var(--text-main); font-family: inherit; font-size: 13px; }
.comment-input:focus { outline: none; border-color: var(--accent); }
.comment-editor-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.comment-limit { font-size: 12px; color: var(--text-sub); }
.comment-submit { padding: 6px 16px; border-radius: 999px; border: none; background: var(--accent); color: #fff; font-size: 13px; cursor: pointer; transition: opacity 0.12s ease; }
.comment-submit:disabled { opacity: 0.4; cursor: default; }
.comment-submit:not(:disabled):hover { opacity: 0.85; }
.comment-list { display: grid; gap: 2px; list-style: none; margin: 0; padding: 0; }
.comment-item { list-style: none; }
.comment-main { padding: 10px; border-radius: 10px; transition: background 0.12s ease; }
.comment-main:hover { background: var(--bg-muted); }
.comment-user-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.comment-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; }
.comment-user { font-size: 13px; font-weight: 600; color: var(--accent); }
.comment-content { margin: 4px 0; color: var(--text-main); font-size: 14px; line-height: 1.5; word-break: break-word; }
.comment-reply { padding: 6px 10px; border-radius: 8px; background: var(--bg-muted); font-size: 13px; margin: 4px 0; }
.reply-user { color: var(--accent); }
.reply-text { color: var(--text-sub); }
.comment-actions { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
.comment-time { color: var(--text-sub); font-size: 12px; }
.comment-likes { color: var(--text-sub); font-size: 12px; }
.comment-more-wrap { text-align: center; padding-top: 12px; }
.comment-more-btn { padding: 6px 20px; border-radius: 999px; border: 1px solid var(--border-soft); background: var(--bg-muted); color: var(--accent); font-size: 13px; cursor: pointer; transition: all 0.12s ease; }
.comment-more-btn:hover { background: color-mix(in srgb, var(--accent) 14%, var(--bg-muted)); }
.comment-more-btn:disabled { opacity: 0.5; cursor: default; }
</style>
