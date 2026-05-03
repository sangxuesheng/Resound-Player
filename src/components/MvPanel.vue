<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="panel">
    <AnimatedAppear tag="div" variant="content" rhythm="head" class-name="head">
      <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="title">全部 MV</AnimatedAppear>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="refresh-btn" :disabled="loading" @click="reload">
        {{ loading ? '刷新中…' : '刷新' }}
      </AnimatedAppear>
    </AnimatedAppear>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="filters" role="group" aria-label="MV筛选">
      <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="filter-item">
        <AnimatedAppear tag="div" variant="content" rhythm="list" class-name="chip-row" role="group" aria-label="地区筛选">
          <AnimatedAppear
            v-for="(item, idx) in AREA_OPTIONS"
            :key="`area-${item}`"
            tag="button"
            variant="control" rhythm="actions"
            :index="idx"
            type="button"
            class-name="chip"
            :class="{ active: area === item }"
            :disabled="loading"
            @click="onAreaChange(item)"
          >
            {{ item }}
          </AnimatedAppear>
        </AnimatedAppear>
      </AnimatedAppear>

      <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="filter-item">
        <AnimatedAppear tag="div" variant="content" rhythm="list" class-name="chip-row" role="group" aria-label="类型筛选">
          <AnimatedAppear
            v-for="(item, idx) in TYPE_OPTIONS"
            :key="`type-${item}`"
            tag="button"
            variant="control" rhythm="actions"
            :index="idx"
            type="button"
            class-name="chip"
            :class="{ active: mvType === item }"
            :disabled="loading"
            @click="onTypeChange(item)"
          >
            {{ item }}
          </AnimatedAppear>
        </AnimatedAppear>
      </AnimatedAppear>

      <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="filter-item">
        <AnimatedAppear tag="div" variant="content" rhythm="list" class-name="chip-row" role="group" aria-label="排序筛选">
          <AnimatedAppear
            v-for="(item, idx) in ORDER_OPTIONS"
            :key="`order-${item}`"
            tag="button"
            variant="control" rhythm="actions"
            :index="idx"
            type="button"
            class-name="chip"
            :class="{ active: order === item }"
            :disabled="loading"
            @click="onOrderChange(item)"
          >
            {{ item }}
          </AnimatedAppear>
        </AnimatedAppear>
      </AnimatedAppear>
    </AnimatedAppear>

    <AnimatedAppear v-if="error" tag="p" variant="text" rhythm="body" class-name="error">{{ error }}</AnimatedAppear>

    <AnimatedAppear v-if="list.length" tag="div" variant="content" rhythm="list" class-name="list-wrap">
      <AnimatedAppear v-for="(item, idx) in list" :key="item.id" tag="article" variant="media" rhythm="list" :index="idx" class-name="card">
        <MvHoverPoster :src="item.cover" :alt="item.name" :count="item.playCount" @click="openMv(item)" />
        <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="info">
          <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="name" :title="item.name">{{ item.name }}</AnimatedAppear>
          <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="sub">{{ item.artistName || '未知歌手' }}</AnimatedAppear>
        </AnimatedAppear>
      </AnimatedAppear>
    </AnimatedAppear>

    <AnimatedAppear v-else-if="!loading" tag="p" variant="text" rhythm="body" class-name="muted">暂无 MV 数据</AnimatedAppear>

    <AnimatedAppear tag="div" variant="content" rhythm="actions" class-name="load-more-wrap">
      <AnimatedAppear v-if="hasMore" tag="button" variant="control" rhythm="actions" class-name="load-more" :disabled="loading" @click="loadMore">
        {{ loading ? '加载中…' : '加载更多' }}
      </AnimatedAppear>
      <AnimatedAppear v-else-if="list.length" tag="span" variant="text" rhythm="body" class-name="load-end">已加载全部 MV</AnimatedAppear>
    </AnimatedAppear>

    <div ref="loadMoreTrigger" class="load-trigger" />
  </AnimatedAppear>

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

          <div class="comment-stats">
            <span class="stat-chip">点赞 {{ formatCount(mvMeta?.likedCount || 0) }}</span>
            <span class="stat-chip">转发 {{ formatCount(mvMeta?.shareCount || 0) }}</span>
            <span class="stat-chip">评论 {{ formatCount(mvMeta?.commentCount || 0) }}</span>
          </div>
          <CommentPanel
            :resource-id="(activeMv?.id as number) || 0"
            :resource-type="1"
            title="评论区"
            :fetcher="api.getMvComments"
            :sender="api.sendComment"
            :liker="api.likeComment"
            :deleter="api.deleteMvComment"
            @open-user="(uid) => $emit('open-user', uid)"
          />
        </AnimatedAppear>
      </AnimatedAppear>
    </AnimatedAppear>
  </transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  deleteMvComment,
  getAllMvs,
  getMvComments,
  getMvDetail,
  getMvDetailInfo,
  getMvUgcInfo,
  getMvUrl,
  sendMvComment,
} from '../api/music';
import AnimatedAppear from './AnimatedAppear.vue';
import MvHoverPoster from './MvHoverPoster.vue';
import * as api from '../api/music';
import CommentPanel from './CommentPanel.vue';
import { userStore } from '../stores/user';

defineEmits<{ (e: 'open-user', userId: number): void }>();

const props = withDefaults(
  defineProps<{
    initialMv?: any | null;
  }>(),
  {
    initialMv: null,
  },
);

const AREA_OPTIONS = ['全部', '内地', '港台', '欧美', '日本', '韩国'] as const;
const TYPE_OPTIONS = ['全部', '官方版', '原生', '现场版', '网易出品'] as const;
const ORDER_OPTIONS = ['上升最快', '最热', '最新'] as const;

type MvItem = {
  id: number;
  name: string;
  cover: string;
  playCount: number;
  artistName?: string;
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

const loading = ref(false);
const error = ref('');
const list = ref<MvItem[]>([]);
const hasMore = ref(false);

const area = ref<(typeof AREA_OPTIONS)[number]>('全部');
const mvType = ref<(typeof TYPE_OPTIONS)[number]>('全部');
const order = ref<(typeof ORDER_OPTIONS)[number]>('上升最快');

const limit = 30;
const loadMoreTrigger = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

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
}

function onEscClose(event: KeyboardEvent) {
  if (event.key === 'Escape' && welcomeOpen.value) {
    closeWelcome();
  }
}

async function fetchMvs(reset = false) {
  if (loading.value) return;
  loading.value = true;
  error.value = '';

  try {
    const offset = reset ? 0 : list.value.length;
    const { data } = await getAllMvs({
      area: area.value,
      type: mvType.value,
      order: order.value,
      limit,
      offset,
    });

    const next = (data?.data || []) as MvItem[];
    list.value = reset ? next : [...list.value, ...next];
    hasMore.value = Boolean(data?.hasMore);
  } catch (e: any) {
    error.value = e?.message || 'MV 加载失败';
    if (reset) list.value = [];
  } finally {
    loading.value = false;
  }
}

function onFilterChange() {
  fetchMvs(true);
}

function onAreaChange(next: (typeof AREA_OPTIONS)[number]) {
  if (area.value === next) return;
  area.value = next;
  onFilterChange();
}

function onTypeChange(next: (typeof TYPE_OPTIONS)[number]) {
  if (mvType.value === next) return;
  mvType.value = next;
  onFilterChange();
}

function onOrderChange(next: (typeof ORDER_OPTIONS)[number]) {
  if (order.value === next) return;
  order.value = next;
  onFilterChange();
}

function loadMore() {
  if (!hasMore.value || loading.value) return;
  fetchMvs(false);
}

function reload() {
  fetchMvs(true);
}

function setupInfiniteLoad() {
  if (!loadMoreTrigger.value) return;

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting && hasMore.value && !loading.value) {
        fetchMvs(false);
      }
    },
    { root: null, rootMargin: '220px 0px 220px 0px', threshold: 0.01 },
  );

  observer.observe(loadMoreTrigger.value);
}

onMounted(async () => {
  await fetchMvs(true);
  setupInfiniteLoad();
  window.addEventListener('keydown', onEscClose);
});

onBeforeUnmount(() => {
  if (observer) observer.disconnect();
  window.removeEventListener('keydown', onEscClose);
});

watch(
  () => props.initialMv,
  (mv) => {
    const normalized = normalizeInputMv(mv);
    if (!normalized) return;
    void openMv(normalized);
  },
  { immediate: true },
);
</script>

<style scoped>
.panel {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px;
  background: #fff;
  color: #111827;
  box-sizing: border-box;
  display: grid;
  gap: 14px;
}

.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.title { margin: 0; font-size: 20px; font-weight: 700; }
.refresh-btn { height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease; }
.refresh-btn:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--accent) 34%, #d1d5db); box-shadow: 0 10px 18px color-mix(in srgb, var(--accent) 10%, transparent); }
.refresh-btn:active { transform: translateY(0) scale(0.99); }
.refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.filters {
  display: grid;
  gap: 12px;
}

.filter-item {
  display: grid;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--bg-muted) 72%, transparent);
  color: var(--text-main);
  font-size: 15px;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.chip:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 38%, var(--border-soft));
  background: color-mix(in srgb, var(--accent-soft) 35%, var(--bg-muted));
  box-shadow: 0 10px 18px color-mix(in srgb, var(--accent) 10%, transparent);
}

.chip.active {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 58%, var(--border-soft));
  background: color-mix(in srgb, var(--accent-soft) 55%, transparent);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--accent) 20%, transparent);
}

.chip:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.error { color: #b91c1c; margin: 0; }

.list-wrap { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.card { border: 1px solid #edf2f7; border-radius: 12px; overflow: hidden; background: #fff; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.card:hover { transform: translateY(-2px); box-shadow: 0 10px 18px rgba(15, 23, 42, 0.12); }
.info { padding: 8px; }
.info .name { margin: 0; font-size: 13px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.info .sub { margin: 4px 0 0; font-size: 12px; color: #6b7280; }

.muted { margin: 0; color: #6b7280; }
.load-more-wrap { display: flex; align-items: center; justify-content: center; min-height: 36px; }
.load-more { height: 34px; padding: 0 14px; border-radius: 10px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; }
.load-more:disabled { cursor: not-allowed; opacity: 0.6; }
.load-end { color: #9ca3af; font-size: 13px; }
.load-trigger { width: 100%; height: 1px; }

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

@media (max-width: 1280px) {
  .list-wrap { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (max-width: 980px) {
  .filters { grid-template-columns: 1fr 1fr; }
  .list-wrap { grid-template-columns: repeat(3, minmax(0, 1fr)); }
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
  .head { align-items: flex-start; flex-direction: column; }
  .filters { grid-template-columns: 1fr; }
  .list-wrap { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .welcome-shell { padding: 12px; border-radius: 18px; }
  .welcome-title { font-size: 19px; }
  .mv-data-grid { grid-template-columns: 1fr; }
  .reply-editor { flex-direction: column; }
  .reply-submit { width: 100%; }
}
</style>
