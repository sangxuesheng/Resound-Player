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
                <button class="text-btn" @click="toggleLike(item)">{{ item._liked ? '取消赞' : '点赞' }}({{ item._likes }})</button>
                <button class="text-btn" @click="toggleReply(item)">{{ item._showReply ? '取消回复' : '回复' }}</button>
              </AnimatedAppear>
            </AnimatedAppear>
            <AnimatedAppear v-if="item._showReply" tag="div" variant="content" rhythm="body" class-name="reply-editor">
              <input v-model="item._replyDraft" class="reply-input" type="text" maxlength="200" placeholder="回复这条评论..." />
              <button type="button" class="reply-submit" :disabled="!item._replyDraft?.trim()" @click="submitReply(item)">发送</button>
            </AnimatedAppear>
            <AnimatedAppear v-if="item.replies?.length" tag="ul" variant="content" rhythm="list" class-name="reply-list">
              <AnimatedAppear v-for="(reply, rIdx) in item.replies" :key="reply.id" tag="li" variant="text" rhythm="list" :index="rIdx" class-name="reply-item">
                <div class="reply-user">{{ reply.user }}</div>
                <p class="reply-content">{{ reply.content }}</p>
                <div class="comment-actions">
                  <span class="comment-time">{{ reply.time }}</span>
                  <button class="text-btn" @click="toggleReplyLike(item, rIdx)">{{ reply.liked ? '取消赞' : '点赞' }}({{ reply.likes }})</button>
                </div>
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
import { getSongComments, getSongDetail, likeComment, sendComment } from '../api/music';
import { userStore } from '../stores/user';
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

async function submitComment() {
  const text = newComment.value.trim();
  if (!text) return;
  if (!userStore.isLogin) return;
  const res = await sendComment({ id: props.songId, t: 1, content: text, type: 0, cookie: userStore.loginCookie || undefined }).catch(() => null);
  if (res?.data?.code === 200) {
    newComment.value = '';
    comments.value.unshift({
      commentId: `local-${Date.now()}`,
      content: text,
      time: Date.now(),
      likedCount: 0,
      user: { nickname: userStore.profile?.nickname || '我', avatarUrl: userStore.profile?.avatarUrl || '' },
      _liked: false,
      _likes: 0,
      _showReply: false,
      _replyDraft: '',
    });
    total.value += 1;
  }
}

async function toggleLike(item: any) {
  if (!userStore.isLogin) return;
  const liked = !item._liked;
  const cid = item.commentId;
  const res = await likeComment({ id: props.songId, cid, t: liked ? 1 : 0, type: 0, cookie: userStore.loginCookie || undefined }).catch(() => null);
  if (res?.data?.code === 200) {
    item._liked = liked;
    item._likes += liked ? 1 : -1;
  }
}

function toggleReplyLike(item: any, rIdx: number) {
  const r = item.replies[rIdx];
  if (!r) return;
  r.liked = !r.liked;
  r.likes += r.liked ? 1 : -1;
}

function toggleReply(item: any) {
  item._showReply = !item._showReply;
  if (!item._showReply) item._replyDraft = '';
}

async function submitReply(item: any) {
  if (!item._replyDraft?.trim()) return;
  if (!userStore.isLogin) return;
  const cid = item.commentId;
  if (!cid) return;
  const res = await sendComment({ id: props.songId, t: 2, content: item._replyDraft, commentId: cid, type: 0, cookie: userStore.loginCookie || undefined }).catch(() => null);
  if (res?.data?.code === 200) {
    item.replies = item.replies || [];
    item.replies.push({
      id: `reply-${Date.now()}`,
      user: userStore.profile?.nickname || '我',
      content: item._replyDraft,
      time: '刚刚',
      liked: false,
      likes: 0,
    });
    item._replyDraft = '';
    item._showReply = false;
  }
}

async function fetchComments(append = false) {
  if (!append) { loading.value = true; offset.value = 0; } else loadingMore.value = true;
  try {
    const res = await getSongComments({ id: props.songId, limit: LIMIT, offset: offset.value });
    const body = res.data;
    const data = body?.data || body || {};
    total.value = data?.total || data?.totalCount || 0;
    const raw = data?.comments || [];
    const normalized = raw.map((c: any) => ({
      ...c,
      _liked: false,
      _likes: c.likedCount || 0,
      _showReply: false,
      _replyDraft: '',
    }));
    comments.value = append ? [...comments.value, ...normalized] : normalized;
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
.comment-page { padding: var(--space-4); width: 100%; max-width: 100%; box-sizing: border-box; }
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
.comment-list { display: grid; gap: 10px; list-style: none; padding: 0; margin: 0; }
.comment-item { border: 1px solid var(--border-soft); border-radius: 12px; padding: 10px; background: var(--bg-muted); list-style: none; }
.comment-user-row { display: flex; align-items: center; gap: 8px; }
.comment-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.comment-user { font-size: 13px; font-weight: 600; color: var(--text-main); }
.comment-content { margin: 6px 0; font-size: 13px; line-height: 1.5; color: var(--text-sub); word-break: break-word; }
.comment-reply { margin: 6px 0; font-size: 13px; line-height: 1.5; color: var(--text-sub); }
.reply-user { font-weight: 600; color: var(--text-main); }
.reply-text { color: var(--text-sub); }
.comment-actions { display: flex; align-items: center; gap: 10px; }
.comment-time { font-size: 12px; color: var(--text-sub); }
.text-btn { border: 0; background: transparent; color: var(--accent); cursor: pointer; padding: 0; font-size: 12px; }
.text-btn:hover { opacity: 0.75; }
.reply-editor { margin-top: 8px; display: flex; gap: 8px; }
.reply-input { flex: 1; min-width: 0; height: 32px; border-radius: 8px; border: 1px solid var(--border); padding: 0 10px; background: var(--bg-surface); color: var(--text-main); font-size: 13px; }
.reply-input:focus { outline: none; border-color: var(--accent); }
.reply-submit { height: 32px; padding: 0 14px; border-radius: 8px; border: none; background: var(--accent); color: #fff; font-size: 12px; cursor: pointer; }
.reply-submit:disabled { opacity: 0.4; cursor: default; }
.reply-list { margin-top: 8px; display: grid; gap: 6px; list-style: none; padding: 0; }
.reply-item { padding: 8px 10px; border-radius: 8px; background: var(--bg-surface); }
.reply-item .comment-actions { margin-top: 4px; }
.reply-user { font-size: 13px; font-weight: 600; color: var(--text-main); }
.reply-content { margin: 2px 0; font-size: 13px; line-height: 1.5; color: var(--text-sub); }
.comment-more-wrap { text-align: center; padding-top: 12px; }
.comment-more-btn { padding: 6px 20px; border-radius: 999px; border: 1px solid var(--border-soft); background: var(--bg-muted); color: var(--accent); font-size: 13px; cursor: pointer; transition: all 0.12s ease; }
.comment-more-btn:hover { background: color-mix(in srgb, var(--accent) 14%, var(--bg-muted)); }
.comment-more-btn:disabled { opacity: 0.5; cursor: default; }
</style>
