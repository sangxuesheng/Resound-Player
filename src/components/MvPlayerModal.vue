<template>
  <transition name="welcome-fade">
    <AnimatedAppear v-if="welcomeOpen" tag="div" variant="modal" rhythm="overlay" class-name="welcome-backdrop" @click.self="closeWelcome">
      <AnimatedAppear tag="section" variant="modal" rhythm="overlay" class-name="welcome-shell" role="dialog" aria-modal="true" aria-label="MV 播放器">
        <AnimatedAppear tag="header" variant="content" rhythm="head" class-name="welcome-header">
          <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="welcome-close" type="button" aria-label="关闭" @click="closeWelcome">×</AnimatedAppear>
        </AnimatedAppear>

        <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="welcome-content">
          <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="main-column">
            <AnimatedAppear tag="div" variant="media" rhythm="body" class-name="video-wrap">
              <video
                v-if="mvUrl"
                :src="mvUrl"
                controls
                autoplay
                playsinline
                preload="metadata"
                class="video"
              />
              <AnimatedAppear v-else tag="div" variant="text" rhythm="body" class-name="video-empty">{{ playerLoading ? '正在加载视频…' : '暂无可播放地址' }}</AnimatedAppear>
            </AnimatedAppear>
          </AnimatedAppear>

          <AnimatedAppear tag="aside" variant="sidebar" rhythm="shell" class-name="welcome-side">
            <AnimatedAppear tag="div" variant="content" rhythm="head" class-name="welcome-title-wrap side-title-wrap">
              <AnimatedAppear tag="p" variant="text" rhythm="title" class-name="welcome-eyebrow">NOW PLAYING</AnimatedAppear>
              <AnimatedAppear tag="h3" variant="title" rhythm="title" class-name="welcome-title" :title="activeMv?.name">{{ activeMv?.name || 'MV 播放器' }}</AnimatedAppear>
              <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="welcome-sub">{{ activeMv?.artistName || '未知歌手' }}</AnimatedAppear>
            </AnimatedAppear>
            <AnimatedAppear v-if="activeMv?.cover" tag="img" variant="media" rhythm="body" class-name="poster" :src="activeMv.cover" :alt="activeMv?.name || 'MV封面'" />
            <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="meta">播放量：{{ formatCount(mvMeta?.playCount || activeMv?.playCount || 0) }}</AnimatedAppear>

            <AnimatedAppear tag="section" variant="content" rhythm="body" class-name="mv-data-panel in-side">
              <AnimatedAppear tag="p" variant="text" rhythm="title" class-name="meta-title">MV 数据</AnimatedAppear>
              <AnimatedAppear tag="div" variant="content" rhythm="list" class-name="mv-data-grid">
                <AnimatedAppear tag="p" variant="text" rhythm="list" class-name="meta-line">名称：{{ mvMeta?.name || activeMv?.name || '-' }}</AnimatedAppear>
                <AnimatedAppear tag="p" variant="text" rhythm="list" class-name="meta-line">歌手：{{ mvMeta?.artistName || activeMv?.artistName || '-' }}</AnimatedAppear>
                <AnimatedAppear tag="p" variant="text" rhythm="list" class-name="meta-line">发布时间：{{ mvMeta?.publishTime || '-' }}</AnimatedAppear>
                <AnimatedAppear tag="p" variant="text" rhythm="list" class-name="meta-line">点赞：{{ formatCount(mvMeta?.likedCount || 0) }}</AnimatedAppear>
                <AnimatedAppear tag="p" variant="text" rhythm="list" class-name="meta-line">评论：{{ formatCount(mvMeta?.commentCount || 0) }}</AnimatedAppear>
                <AnimatedAppear tag="p" variant="text" rhythm="list" class-name="meta-line">转发：{{ formatCount(mvMeta?.shareCount || 0) }}</AnimatedAppear>
                <AnimatedAppear tag="p" variant="text" rhythm="list" class-name="meta-line">收藏：{{ formatCount(mvMeta?.subscribeCount || 0) }}</AnimatedAppear>
              </AnimatedAppear>
              <AnimatedAppear v-if="mvMeta?.desc" tag="p" variant="text" rhythm="body" class-name="meta-desc">简介：{{ mvMeta.desc }}</AnimatedAppear>
              <AnimatedAppear v-if="detailLoading" tag="p" variant="text" rhythm="body" class-name="meta-loading">MV 数据加载中…</AnimatedAppear>
              <AnimatedAppear v-if="playerError" tag="p" variant="text" rhythm="body" class-name="player-error">{{ playerError }}</AnimatedAppear>
            </AnimatedAppear>
          </AnimatedAppear>

          <AnimatedAppear tag="section" variant="content" rhythm="body" class-name="comment-panel">
            <div class="comment-head">
              <h4 class="comment-title">评论区</h4>
              <span class="comment-count">{{ commentsTotal || comments.length }} 条</span>
            </div>

            <AnimatedAppear tag="div" variant="content" rhythm="actions" class-name="comment-stats">
              <AnimatedAppear tag="span" variant="control" rhythm="actions" class-name="stat-chip">点赞 {{ formatCount(mvMeta?.likedCount || 0) }}</AnimatedAppear>
              <AnimatedAppear tag="span" variant="control" rhythm="actions" class-name="stat-chip">转发 {{ formatCount(mvMeta?.shareCount || 0) }}</AnimatedAppear>
              <AnimatedAppear tag="span" variant="control" rhythm="actions" class-name="stat-chip">评论 {{ formatCount(mvMeta?.commentCount || commentsTotal || comments.length) }}</AnimatedAppear>
            </AnimatedAppear>

            <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="comment-editor">
              <textarea
                v-model="newCommentText"
                class="comment-input"
                maxlength="300"
                placeholder="写下你的评论..."
              />
              <div class="comment-editor-actions">
                <span class="comment-limit">{{ newCommentText.length }}/300</span>
                <button type="button" class="comment-submit" :disabled="!newCommentText.trim()" @click="submitComment">
                  发表评论
                </button>
              </div>
            </AnimatedAppear>

            <AnimatedAppear v-if="commentsError" tag="p" variant="text" rhythm="body" class-name="comment-error">{{ commentsError }}</AnimatedAppear>
            <AnimatedAppear v-else-if="commentsLoading && !comments.length" tag="p" variant="text" rhythm="body" class-name="comment-loading">评论加载中…</AnimatedAppear>
            <AnimatedAppear v-else-if="!comments.length" tag="p" variant="text" rhythm="body" class-name="comment-empty">暂无评论</AnimatedAppear>

            <AnimatedAppear v-if="comments.length" tag="ul" variant="content" rhythm="list" class-name="comment-list">
              <AnimatedAppear v-for="(comment, idx) in comments" :key="comment.id" tag="li" variant="text" rhythm="list" :index="idx" class-name="comment-item">
                <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="comment-main">
                  <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="comment-user-row">
                    <AnimatedAppear v-if="comment.avatarUrl" tag="img" variant="media" rhythm="list" :index="idx" :src="comment.avatarUrl" class-name="comment-avatar" alt="头像" />
                    <AnimatedAppear v-else tag="div" variant="text" rhythm="list" :index="idx" class-name="comment-avatar fallback">{{ comment.user.charAt(0) }}</AnimatedAppear>
                    <AnimatedAppear tag="div" variant="text" rhythm="list" :index="idx" class-name="comment-user">{{ comment.user }}</AnimatedAppear>
                  </AnimatedAppear>
                  <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="comment-content">{{ comment.content }}</AnimatedAppear>
                  <AnimatedAppear tag="div" variant="content" rhythm="actions" :index="idx" class-name="comment-actions">
                    <AnimatedAppear tag="span" variant="text" rhythm="body" :index="idx" class-name="comment-time">{{ comment.time }}</AnimatedAppear>
                    <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="idx" type="button" class-name="text-btn" @click="toggleCommentLike(comment.id)">
                      {{ comment.liked ? '取消赞' : '点赞' }}({{ comment.likes }})
                    </AnimatedAppear>
                    <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="idx" type="button" class-name="text-btn" @click="toggleReplyEditor(comment.id)">
                      {{ comment.showReplyEditor ? '取消回复' : '回复' }}
                    </AnimatedAppear>
                    <AnimatedAppear
                      v-if="canDeleteComment(comment)"
                      tag="button"
                      variant="control"
                      rhythm="actions"
                      :index="idx"
                      type="button"
                      class-name="text-btn danger"
                      @click="removeComment(comment.id)"
                    >
                      删除
                    </AnimatedAppear>
                  </AnimatedAppear>
                </AnimatedAppear>

                <AnimatedAppear v-if="comment.showReplyEditor" tag="div" variant="content" rhythm="body" class-name="reply-editor">
                  <input
                    v-model="comment.replyDraft"
                    class="reply-input"
                    type="text"
                    maxlength="200"
                    placeholder="回复这条评论..."
                  />
                  <button
                    type="button"
                    class="reply-submit"
                    :disabled="!(comment.replyDraft || '').trim()"
                    @click="submitReply(comment.id)"
                  >
                    发送
                  </button>
                </AnimatedAppear>

                <AnimatedAppear v-if="comment.replies.length" tag="ul" variant="content" rhythm="list" class-name="reply-list">
                  <AnimatedAppear v-for="(reply, replyIdx) in comment.replies" :key="reply.id" tag="li" variant="text" rhythm="list" :index="replyIdx" class-name="reply-item">
                    <AnimatedAppear tag="div" variant="text" rhythm="list" :index="replyIdx" class-name="reply-user">{{ reply.user }}</AnimatedAppear>
                    <AnimatedAppear tag="p" variant="text" rhythm="list" :index="replyIdx" class-name="reply-content">{{ reply.content }}</AnimatedAppear>
                    <AnimatedAppear tag="div" variant="content" rhythm="actions" :index="replyIdx" class-name="comment-actions">
                      <AnimatedAppear tag="span" variant="text" rhythm="body" :index="replyIdx" class-name="comment-time">{{ reply.time }}</AnimatedAppear>
                      <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="replyIdx" type="button" class-name="text-btn" @click="toggleReplyLike(comment.id, reply.id)">
                        {{ reply.liked ? '取消赞' : '点赞' }}({{ reply.likes }})
                      </AnimatedAppear>
                    </AnimatedAppear>
                  </AnimatedAppear>
                </AnimatedAppear>
              </AnimatedAppear>
            </AnimatedAppear>

            <AnimatedAppear tag="div" variant="content" rhythm="actions" class-name="comment-footer">
              <button
                type="button"
                class="comment-more"
                :disabled="commentsLoading || !commentsHasMore || !activeMv"
                @click="loadMoreComments"
              >
                {{ commentsLoading && comments.length ? '加载中…' : commentsHasMore ? '加载更多评论' : '没有更多评论了' }}
              </button>
            </AnimatedAppear>
          </AnimatedAppear>
        </AnimatedAppear>
      </AnimatedAppear>
    </AnimatedAppear>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import {
  deleteMvComment,
  getMvComments,
  getMvDetail,
  getMvDetailInfo,
  getMvUgcInfo,
  getMvUrl,
  sendMvComment,
} from '../api/music';
import AnimatedAppear from './AnimatedAppear.vue';
import { userStore } from '../stores/user';

const props = withDefaults(
  defineProps<{
    mv?: any | null;
  }>(),
  {
    mv: null,
  },
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

type MvItem = {
  id: number;
  name: string;
  cover: string;
  playCount: number;
  artistName?: string;
};

type ReplyItem = {
  id: string;
  user: string;
  content: string;
  time: string;
  likes: number;
  liked: boolean;
};

type CommentItem = {
  id: string;
  rawId: number | null;
  user: string;
  avatarUrl: string;
  content: string;
  time: string;
  likes: number;
  liked: boolean;
  deletable: boolean;
  ownerUserId?: number | null;
  showReplyEditor: boolean;
  replyDraft: string;
  replies: ReplyItem[];
};

type MvApiComment = {
  commentId?: number;
  content?: string;
  likedCount?: number;
  liked?: boolean;
  time?: number;
  timeStr?: string;
  user?: {
    userId?: number;
    nickname?: string;
    avatarUrl?: string;
    avatarImg?: string;
  };
};

type MvCommentResponse = {
  comments?: MvApiComment[];
  total?: number;
  more?: boolean;
};

function normalizeInputMv(item: any): MvItem | null {
  const id = Number(item?.id || item?.mvid || item?.mvId || item?.vid || 0);
  if (!id) return null;
  return {
    id,
    name: item?.name || item?.title || '未命名 MV',
    cover:
      item?.cover ||
      item?.imgurl16v9 ||
      item?.coverImgUrl ||
      item?.picUrl ||
      item?.picUrl16v9 ||
      item?.imgurl ||
      '',
    playCount: Number(item?.playCount || item?.playTime || 0),
    artistName:
      item?.artistName ||
      item?.artist?.name ||
      item?.artists?.map((a: any) => a?.name).filter(Boolean).join('/') ||
      item?.creator?.nickname ||
      '',
  };
}

function formatCount(count = 0) {
  if (count >= 100000000) return `${(count / 100000000).toFixed(1)}亿`;
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  return String(count);
}

function nowTimeLabel() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCommentTime(time?: number, timeStr?: string) {
  if (timeStr) return timeStr;
  if (!time) return nowTimeLabel();
  const d = new Date(time);
  const now = Date.now();
  const diffSec = Math.max(1, Math.floor((now - d.getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}秒前`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}小时前`;
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function mapApiCommentToView(item: MvApiComment): CommentItem {
  const id = item.commentId != null ? String(item.commentId) : `c-${Date.now()}-${Math.random()}`;
  return {
    id,
    rawId: item.commentId ?? null,
    user: item.user?.nickname || '匿名用户',
    avatarUrl: item.user?.avatarUrl || item.user?.avatarImg || '',
    content: item.content || '',
    time: formatCommentTime(item.time, item.timeStr),
    likes: item.likedCount ?? 0,
    liked: Boolean(item.liked),
    deletable: item.commentId != null,
    ownerUserId: item.user?.userId ?? null,
    showReplyEditor: false,
    replyDraft: '',
    replies: [],
  };
}

const welcomeOpen = ref(false);
const activeMv = ref<MvItem | null>(null);
const mvUrl = ref('');
const playerLoading = ref(false);
const playerError = ref('');

const detailLoading = ref(false);
const mvMeta = ref<{
  name?: string;
  artistName?: string;
  publishTime?: string;
  desc?: string;
  playCount?: number;
  commentCount?: number;
  shareCount?: number;
  likedCount?: number;
  subscribeCount?: number;
} | null>(null);

const comments = ref<CommentItem[]>([]);
const commentsLoading = ref(false);
const commentsError = ref('');
const commentsTotal = ref(0);
const commentsHasMore = ref(false);
const commentLimit = 20;
const commentOffset = ref(0);
const newCommentText = ref('');

async function fetchMvComments(mvId: number, reset = false) {
  if (commentsLoading.value) return;
  commentsLoading.value = true;
  commentsError.value = '';

  try {
    const offset = reset ? 0 : commentOffset.value;
    const { data } = await getMvComments({
      id: mvId,
      limit: commentLimit,
      offset,
    });

    const payload = (data || {}) as MvCommentResponse;
    const incoming = (payload.comments || []).map(mapApiCommentToView);

    comments.value = reset ? incoming : [...comments.value, ...incoming];
    commentsTotal.value = payload.total ?? comments.value.length;
    commentsHasMore.value = Boolean(payload.more);
    commentOffset.value = offset + incoming.length;
  } catch (e: any) {
    commentsError.value = e?.message || '评论加载失败';
    if (reset) comments.value = [];
  } finally {
    commentsLoading.value = false;
  }
}

function initComments() {
  comments.value = [];
  commentsError.value = '';
  commentsTotal.value = 0;
  commentsHasMore.value = false;
  commentOffset.value = 0;
  newCommentText.value = '';
}

let openMvToken = 0;

async function openMv(item: MvItem) {
  const currentToken = ++openMvToken;
  activeMv.value = item;
  welcomeOpen.value = true;
  mvUrl.value = '';
  playerError.value = '';
  playerLoading.value = true;
  detailLoading.value = true;
  mvMeta.value = null;
  initComments();

  void fetchMvComments(item.id, true);

  void getMvUrl(item.id, 1080)
    .then((res) => {
      if (currentToken !== openMvToken) return;
      const url = res?.data?.data?.url;
      if (url) {
        mvUrl.value = url;
      } else {
        playerError.value = '未获取到可播放视频地址';
      }
    })
    .catch(() => {
      if (currentToken !== openMvToken) return;
      playerError.value = 'MV 播放地址加载失败';
    })
    .finally(() => {
      if (currentToken !== openMvToken) return;
      playerLoading.value = false;
    });

  try {
    const [detailRes, infoRes, ugcRes] = await Promise.allSettled([
      getMvDetail(item.id),
      getMvDetailInfo(item.id),
      getMvUgcInfo(item.id),
    ]);

    if (currentToken !== openMvToken) return;

    const detailData = detailRes.status === 'fulfilled' ? detailRes.value?.data : null;
    const infoData = infoRes.status === 'fulfilled' ? infoRes.value?.data : null;
    const ugcData = ugcRes.status === 'fulfilled' ? ugcRes.value?.data : null;

    const detailMv = detailData?.data || detailData?.mv || detailData;
    const info = infoData || {};
    const ugc = ugcData?.data || ugcData || {};

    const rawPublishTime = detailMv?.publishTime || detailMv?.publishDate || detailMv?.publishdate;
    const publishTime = typeof rawPublishTime === 'string'
      ? rawPublishTime
      : rawPublishTime
        ? new Date(rawPublishTime).toLocaleDateString('zh-CN')
        : '';

    mvMeta.value = {
      name: detailMv?.name || item.name,
      artistName:
        detailMv?.artistName ||
        detailMv?.artist?.name ||
        (Array.isArray(detailMv?.artists) ? detailMv.artists.map((a: any) => a?.name).filter(Boolean).join(' / ') : '') ||
        item.artistName ||
        '',
      publishTime,
      desc: ugc?.desc || ugc?.briefDesc || detailMv?.desc || '',
      playCount: detailMv?.playCount ?? item.playCount,
      commentCount: info?.commentCount ?? 0,
      shareCount: info?.shareCount ?? 0,
      likedCount: info?.likedCount ?? info?.liked ?? 0,
      subscribeCount: info?.likedCount ?? info?.subCount ?? 0,
    };
  } catch (e: any) {
    if (currentToken !== openMvToken) return;
    playerError.value = e?.message || 'MV 数据加载失败';
  } finally {
    if (currentToken === openMvToken) {
      detailLoading.value = false;
    }
  }
}

async function submitComment() {
  const content = newCommentText.value.trim();
  if (!content || !activeMv.value) return;

  try {
    await sendMvComment({
      id: activeMv.value.id,
      content,
    });

    comments.value.unshift({
      id: `c-local-${Date.now()}`,
      rawId: null,
      user: '我',
      avatarUrl: '',
      content,
      time: nowTimeLabel(),
      likes: 0,
      liked: false,
      deletable: false,
      showReplyEditor: false,
      replyDraft: '',
      replies: [],
    });

    commentsTotal.value += 1;
    newCommentText.value = '';
  } catch (e: any) {
    commentsError.value = e?.message || '发表评论失败';
  }
}

async function loadMoreComments() {
  if (!activeMv.value || commentsLoading.value || !commentsHasMore.value) return;
  await fetchMvComments(activeMv.value.id, false);
}

function canDeleteComment(comment: CommentItem) {
  if (!comment.rawId) return false;
  const loginUserId = userStore.profile?.userId;
  if (!loginUserId) return false;
  return comment.ownerUserId != null ? comment.ownerUserId === loginUserId : comment.user === userStore.profile?.nickname;
}

async function removeComment(commentId: string) {
  if (!activeMv.value) return;
  const target = comments.value.find((item) => item.id === commentId);
  if (!target?.rawId) {
    commentsError.value = '该评论缺少 commentId，无法删除';
    return;
  }

  try {
    await deleteMvComment({
      id: activeMv.value.id,
      commentId: target.rawId,
    });

    comments.value = comments.value.filter((item) => item.id !== commentId);
    commentsTotal.value = Math.max(0, commentsTotal.value - 1);
  } catch (e: any) {
    commentsError.value = e?.message || '删除评论失败';
  }
}

function toggleCommentLike(commentId: string) {
  comments.value = comments.value.map((item) => {
    if (item.id !== commentId) return item;
    const liked = !item.liked;
    return {
      ...item,
      liked,
      likes: liked ? item.likes + 1 : Math.max(0, item.likes - 1),
    };
  });
}

function toggleReplyLike(commentId: string, replyId: string) {
  comments.value = comments.value.map((item) => {
    if (item.id !== commentId) return item;
    return {
      ...item,
      replies: item.replies.map((reply) => {
        if (reply.id !== replyId) return reply;
        const liked = !reply.liked;
        return {
          ...reply,
          liked,
          likes: liked ? reply.likes + 1 : Math.max(0, reply.likes - 1),
        };
      }),
    };
  });
}

function toggleReplyEditor(commentId: string) {
  comments.value = comments.value.map((item) => {
    if (item.id !== commentId) {
      return { ...item, showReplyEditor: false };
    }
    if (!item.rawId) {
      commentsError.value = '该评论缺少 commentId，暂不支持回复';
      return { ...item, showReplyEditor: false };
    }
    return { ...item, showReplyEditor: !item.showReplyEditor };
  });
}

async function submitReply(commentId: string) {
  if (!activeMv.value) return;

  const target = comments.value.find((item) => item.id === commentId);
  if (!target) return;

  const content = (target.replyDraft || '').trim();
  if (!content) return;

  if (!target.rawId) {
    commentsError.value = '该评论缺少 commentId，暂不支持回复';
    return;
  }

  try {
    await sendMvComment({
      id: activeMv.value.id,
      content,
      commentId: target.rawId,
    });

    comments.value = comments.value.map((item) => {
      if (item.id !== commentId) return item;
      return {
        ...item,
        replies: [
          ...item.replies,
          {
            id: `r-local-${Date.now()}`,
            user: '我',
            content,
            time: nowTimeLabel(),
            likes: 0,
            liked: false,
          },
        ],
        replyDraft: '',
        showReplyEditor: false,
      };
    });
  } catch (e: any) {
    commentsError.value = e?.message || '回复失败';
  }
}

function closeWelcome() {
  welcomeOpen.value = false;
  mvUrl.value = '';
  playerError.value = '';
  detailLoading.value = false;
  mvMeta.value = null;
  comments.value = [];
  commentsError.value = '';
  commentsLoading.value = false;
  commentsTotal.value = 0;
  commentsHasMore.value = false;
  commentOffset.value = 0;
  newCommentText.value = '';
  emit('close');
}

function onEscClose(event: KeyboardEvent) {
  if (event.key === 'Escape' && welcomeOpen.value) {
    closeWelcome();
  }
}

watch(
  () => props.mv,
  (mv) => {
    const normalized = normalizeInputMv(mv);
    if (!normalized) return;
    void openMv(normalized);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onEscClose);
});
</script>

<style scoped>
.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition: opacity 0.2s ease;
}

.welcome-fade-enter-from,
.welcome-fade-leave-to {
  opacity: 0;
}

.welcome-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: color-mix(in srgb, var(--bg-solid) 32%, transparent);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 16px;
}

.welcome-shell {
  width: min(1160px, 96vw);
  max-height: 92vh;
  overflow: auto;
  border-radius: 24px;
  color: var(--text-main);
  border: 1px solid var(--border);
  box-shadow: 0 28px 60px color-mix(in srgb, var(--text-main) 20%, transparent);
  padding: 18px;
  background: var(--bg-solid);
}

.welcome-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.welcome-close {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-main);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.welcome-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
  grid-template-areas:
    'video side'
    'comment comment';
  gap: 14px;
  align-items: stretch;
}

.main-column {
  grid-area: video;
  display: grid;
  gap: 12px;
  align-self: start;
}

.video-wrap {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border-soft);
  background: transparent;
  min-height: 0;
}

.video {
  width: 100%;
  display: block;
  aspect-ratio: 16 / 9;
  background: transparent;
  object-fit: cover;
}

.video-empty {
  width: 100%;
  min-height: 320px;
  aspect-ratio: 16 / 9;
  display: grid;
  place-items: center;
  color: var(--text-sub);
  background: var(--bg-muted);
}

.mv-data-panel,
.comment-panel,
.welcome-side {
  border-radius: 16px;
  border: 1px solid var(--border-soft);
  background: var(--bg-solid);
  padding: 12px;
  box-sizing: border-box;
  width: 100%;
}

.mv-data-panel {
  grid-area: data;
}

.mv-data-panel.in-side {
  grid-area: auto;
  border-radius: 10px;
  margin-top: 2px;
  padding: 8px;
  background: var(--bg-muted);
}

.comment-panel {
  grid-area: comment;
}

.mv-data-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
}

.welcome-side {
  grid-area: side;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 8px;
  height: 100%;
  min-height: 100%;
  overflow: auto;
  padding: 10px;
}

.welcome-eyebrow {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--accent);
}

.welcome-title {
  margin: 2px 0 0;
  font-size: 18px;
  line-height: 1.25;
  font-weight: 700;
}

.welcome-sub {
  margin: 4px 0 0;
  color: var(--text-sub);
  font-size: 12px;
}

.side-title-wrap {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-soft);
  margin-bottom: 2px;
}

.poster {
  width: 100%;
  border-radius: 10px;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  margin-top: 4px;
}

.meta-title {
  margin: 0;
  font-size: 12px;
  color: var(--accent);
  letter-spacing: 0.03em;
}

.meta-line {
  margin: 0;
  color: var(--text-main);
  font-size: 12px;
  line-height: 1.35;
}

.meta-desc {
  margin: 8px 0 0;
  color: var(--text-sub);
  font-size: 11px;
  line-height: 1.45;
}

.meta,
.meta-loading {
  margin: 0;
  color: var(--text-sub);
  font-size: 12px;
}

.welcome-side .meta {
  margin-top: 2px;
  padding-top: 6px;
  border-top: 1px dashed var(--border-soft);
}

.player-error {
  margin: 6px 0 0;
  color: #fca5a5;
  font-size: 13px;
}

.comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.comment-title {
  margin: 0;
  font-size: 16px;
  color: var(--text-main);
}

.comment-count {
  font-size: 12px;
  color: var(--text-sub);
}

.comment-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  background: var(--bg-muted);
  color: var(--text-sub);
  font-size: 12px;
}

.comment-editor {
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 10px;
  background: #eff3f6;
  margin-bottom: 12px;
}

.comment-input {
  width: 100%;
  min-height: 76px;
  resize: vertical;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  box-sizing: border-box;
  background: var(--bg-surface);
  color: var(--text-main);
}

:global(html[data-theme='light']) .comment-input,
:global(:root[data-theme='light']) .comment-input,
:global([data-theme='light']) .comment-input {
  background: #eff3f6 !important;
}

.comment-editor-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comment-limit {
  font-size: 12px;
  color: var(--text-sub);
}

.comment-submit,
.reply-submit {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent) 50%, var(--border-soft));
  background: color-mix(in srgb, var(--accent-soft) 60%, transparent);
  color: var(--accent);
  cursor: pointer;
}

.comment-submit:disabled,
.reply-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.comment-error,
.comment-loading,
.comment-empty {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--text-sub);
}

.comment-error {
  color: #ef4444;
}

.comment-list,
.reply-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.comment-item {
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 10px;
  background: var(--bg-muted);
}

.comment-user-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.comment-avatar.fallback {
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}

.comment-user,
.reply-user {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.comment-content,
.reply-content {
  margin: 6px 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-sub);
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.comment-time {
  font-size: 12px;
  color: var(--text-sub);
}

.text-btn {
  border: 0;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  padding: 0;
  font-size: 12px;
}

.text-btn.danger {
  color: #ef4444;
}

.reply-editor {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.reply-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 0 10px;
  background: var(--bg-surface);
  color: var(--text-main);
}

.reply-list {
  margin-top: 8px;
}

.reply-item {
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 8px;
  background: var(--bg-muted);
}

.comment-footer {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.comment-more {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border-soft);
  background: var(--bg-muted);
  color: var(--text-main);
  cursor: pointer;
}

.comment-more:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 980px) {
  .welcome-content {
    grid-template-columns: 1fr;
    grid-template-areas:
      'video'
      'side'
      'comment';
  }
  .welcome-shell { width: min(98vw, 98vw); }
}

@media (max-width: 767px) {
  .welcome-shell { padding: 12px; border-radius: 18px; }
  .welcome-title { font-size: 19px; }
  .mv-data-grid { grid-template-columns: 1fr; }
  .reply-editor { flex-direction: column; }
  .reply-submit { width: 100%; }
}
</style>