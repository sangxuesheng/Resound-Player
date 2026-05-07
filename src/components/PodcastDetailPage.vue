<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="playlist-detail-page podcast-detail-page" :style="shellStyle">
    <div v-if="!embedded" class="playlist-detail-back">
      <button class="back-btn" type="button" @click="emit('back')">← 返回播客列表</button>
    </div>

    <DetailStickyHeroHeader
      :sticky="isSticky"
      :embedded="embedded"
      :loading="loading"
      :ready="!!heroTitle"
      :error="''"
      loading-text="播客详情加载中…"
    >
      <template #media>
        <HeroCoverMedia :src="hero.coverUrl" :alt="heroTitle" />
      </template>
      <template #title>
        <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="title">{{ heroTitle }}</AnimatedAppear>
      </template>
      <template #meta>
        <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="sub-row">
          <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="sub">
            {{ hero.category || '播客有声书' }}
            <span class="sub-dot">·</span>
            已收录 {{ items.length }} 条声音内容
          </AnimatedAppear>
        </AnimatedAppear>
        <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="desc-wrap">
          <AnimatedAppear
            tag="p"
            variant="text"
            rhythm="body"
            class-name="desc"
            :class="{ 'desc--collapsed': !isDescriptionExpanded && shouldShowDescriptionToggle }"
          >{{ heroDescription }}</AnimatedAppear>
          <button
            v-if="shouldShowDescriptionToggle"
            type="button"
            class="desc-toggle"
            @click="isDescriptionExpanded = !isDescriptionExpanded"
          >
            {{ isDescriptionExpanded ? '收起' : '展开' }}
          </button>
        </AnimatedAppear>
      </template>
      <template #actions>
        <EntitySubscribeButton
          v-if="podcastRid"
          type="podcast"
          text
          :subscribed="subscribeState.isSubscribed.value"
          :loading="subscribeState.isLoading.value"
          @toggle="subscribeState.toggle"
        />
        <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="play-all" type="button" @click="emit('play-all', displayedRawItems)">播放全部</AnimatedAppear>
      </template>
      <template #tabs>
        <DetailTabBar
          v-model="activeTab"
          :tabs="tabs"
          aria-label="播客详情标签"
          v-model:search-query="searchQuery"
          :show-search="activeTab === 'episodes'"
        />
      </template>
    </DetailStickyHeroHeader>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="playlist-detail-body">
      <template v-if="loading">
        <AnimatedAppear tag="div" variant="text" rhythm="body" class-name="state">播客详情加载中…</AnimatedAppear>
      </template>
      <template v-else-if="activeTab === 'episodes'">
        <AnimatedAppear v-if="filteredItems.length" tag="ul" variant="content" rhythm="list" class-name="song-list" :key="`${tabContentKey}:episodes`">
          <AnimatedAppear
            v-for="(item, idx) in filteredItems"
            :key="item.key"
            tag="li"
            variant="text"
            rhythm="list"
            :index="idx"
            class-name="song-item podcast-song-item"
            :class="{ 'song-item--playing': isCurrentTrack(item.raw) }"
            @dblclick="emit('play-item', { item: item.raw, index: item.originalIndex })"
          >
            <PlayPauseButton
              :song-id="item.trackId"
              :index-label="item.index"
              @play="emit('play-item', { item: item.raw, index: item.originalIndex })"
            />
            <img class="song-cover" :src="item.coverUrl" :alt="item.name" loading="lazy" />
            <div class="song-meta">
              <div class="episode-title-row">
                <p class="song-name">{{ item.name }}</p>
                <div v-if="item.badges.length" class="status-badge-group">
                  <span v-for="badge in item.badges" :key="`${item.key}-${badge.label}`" class="status-badge" :class="`status-badge--${badge.tone}`">{{ badge.label }}</span>
                </div>
              </div>
              <p v-if="item.description" class="episode-description">{{ item.description }}</p>
            </div>
          </AnimatedAppear>
        </AnimatedAppear>
        <AnimatedAppear v-else tag="div" variant="text" rhythm="body" class-name="state">暂无声音列表数据</AnimatedAppear>
      </template>
      <template v-else-if="activeTab === 'comments'">
        <div :key="`${tabContentKey}:comments`" class="playlist-comment-section">
          <CommentPanel
            :resource-id="Number(podcastRid || 0)"
            :resource-type="7"
            :fetcher="commentApi.getRadioComments"
            :sender="(params) => commentApi.sendComment({ ...params, type: 7 })"
            :liker="(params) => commentApi.likeComment({ ...params, type: 7 })"
            :deleter="commentApi.deleteDjComment"
            @open-user="(uid) => emit('open-user', uid)"
          />
        </div>
      </template>
    </AnimatedAppear>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useDetailStickyState } from '../composables/useDetailStickyState';
import AnimatedAppear from './AnimatedAppear.vue';
import DetailStickyHeroHeader from './DetailStickyHeroHeader.vue';
import HeroCoverMedia from './HeroCoverMedia.vue';
import { playerStore } from '../stores/player';
import { getVoiceDetail } from '../api/music';
import PlayPauseButton from './ui/PlayPauseButton.vue';
import EntitySubscribeButton from './ui/EntitySubscribeButton.vue';
import DetailTabBar from './ui/DetailTabBar.vue';
import CommentPanel from './CommentPanel.vue';
import { useEntitySubscribe } from '../composables/useEntitySubscribe';
import * as commentApi from '../api/music';

const DESC_COLLAPSE_THRESHOLD = 60;

const props = withDefaults(
  defineProps<{
    title?: string;
    detail?: any;
    items: any[];
    loading?: boolean;
    scrollHostSelector?: string;
    embedded?: boolean;
  }>(),
  {
    embedded: false,
    scrollHostSelector: '.content',
  },
);
const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'play-item', payload: { item: any; index: number }): void;
  (e: 'play-all', items: any[]): void;
  (e: 'open-user', userId: number): void;
}>();

const activeTab = ref<'episodes' | 'comments'>('episodes');
const tabs = [
  { key: 'episodes', label: '声音' },
  { key: 'comments', label: '评论' },
] as const;
const searchQuery = ref('');
const tabContentKey = computed(() => `${podcastRid.value || 'pending'}:${activeTab.value}`);

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return normalizedItems.value;
  return normalizedItems.value.filter(item => {
    const name = (item.name || '').toLowerCase();
    return name.includes(q);
  });
});

const isDescriptionExpanded = ref(false);

const { isSticky, refresh } = useDetailStickyState({
  scrollHostSelector: () => props.scrollHostSelector || '.content',
});
const voiceDetailById = ref<Record<number, any>>({});
const loadingVoiceDetailIds = new Set<number>();
const detail = computed(() => props.detail?.voiceList || props.detail?.data?.voiceList || props.detail?.data || props.detail || props.items?.[0]?.voiceList || props.items?.[0]?.detail || props.items?.[0]?.program?.radio || props.items?.[0]?.program || props.items?.[0] || null);
const hero = computed(() => {
  const source = detail.value || {};
  return {
    coverUrl: source.picUrl || source.coverUrl || source.imgUrl || source.imageUrl || source.blurCoverUrl || source.intervenePicUrl || source.cover || props.items?.[0]?.program?.coverUrl || props.items?.[0]?.program?.blurCoverUrl || props.items?.[0]?.program?.radio?.picUrl || props.items?.[0]?.program?.mainSong?.al?.picUrl || fallbackCover,
    name: source.name || source.title || props.title || '当前播客',
    category: source.category || source.radioType || source.type || '',
    description: source.description || source.desc || source.briefDesc || source.rcmdText || '',
  };
});
const heroTitle = computed(() => hero.value.name || props.title || '当前播客');
const heroDescription = computed(() => hero.value.description || '暂无简介，后续可继续补充节目说明和更完整的播客元数据。');
const shouldShowDescriptionToggle = computed(() => heroDescription.value.length > DESC_COLLAPSE_THRESHOLD);

// podcast radio ID — extracted from detail source or first item's radio
const podcastRid = computed(() => {
  const source = detail.value || {};
  return Number(
    source.id
    || source.radio?.id
    || source.mainTrackId
    || props.items?.[0]?.program?.radio?.id
    || props.items?.[0]?.program?.radioId
    || props.items?.[0]?.rid
    || 0,
  ) || undefined;
});
const subscribeState = useEntitySubscribe({
  type: 'podcast',
  id: podcastRid as any,
});

const shellStyle = computed<Record<string, string>>(() => {
  const coverUrl = hero.value.coverUrl?.trim();
  return coverUrl ? { '--cover-bg-url': `url("${coverUrl}")` } : {};
});
const displayedRawItems = computed(() => [...props.items].reverse());
const normalizedItems = computed(() => displayedRawItems.value.map((item, idx) => {
  const originalIndex = props.items.length - idx - 1;
  const voiceId = resolveVoiceId(item);
  const detailItem = voiceId ? voiceDetailById.value[voiceId] : null;
  const mergedItem = detailItem ? { ...item, ...detailItem, rawListItem: item } : item;
  const displayStatus = String(mergedItem.displayStatus || '').trim();
  const statusMeta = resolveStatusMeta(displayStatus);
  const feeMeta = resolveFeeMeta(mergedItem);

  return {
    key: item.id || item.voiceId || item.programId || `${item.name || item.programName || 'voice'}-${originalIndex}`,
    index: idx + 1,
    originalIndex,
    trackId: Number(mergedItem?.mainTrackId || mergedItem?.mainSong?.id || mergedItem?.song?.id || mergedItem?.program?.mainTrackId || mergedItem?.program?.mainSong?.id || 0),
    name: mergedItem.name || mergedItem.programName || mergedItem.title || '声音内容',
    coverUrl: mergedItem.coverUrl || mergedItem.picUrl || mergedItem.imgUrl || mergedItem.program?.coverUrl || mergedItem.program?.blurCoverUrl || mergedItem.radio?.picUrl || mergedItem.mainSong?.al?.picUrl || fallbackCover,
    description: resolveEpisodeDescription(mergedItem),
    badges: [feeMeta, statusMeta].filter((meta) => meta.label),
    raw: item,
  };
}));
const fallbackCover = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="32" fill="#e2e8f0"/><circle cx="100" cy="84" r="40" fill="#cbd5e1"/><rect x="46" y="136" width="108" height="20" rx="10" fill="#cbd5e1"/></svg>`);

function isCurrentTrack(item: any) {
  const currentId = Number(playerStore.currentTrack?.id || 0);
  const itemTrackId = Number(item?.mainTrackId || item?.mainSong?.id || item?.song?.id || item?.program?.mainTrackId || item?.program?.mainSong?.id || 0);
  return currentId > 0 && itemTrackId > 0 && currentId === itemTrackId;
}

function resolveVoiceId(item: any) {
  return Number(item?.id || item?.voiceId || item?.programId || item?.program?.id || 0);
}

function resolveEpisodeDescription(item: any) {
  return String(
    item?.description
    || item?.desc
    || item?.briefDesc
    || item?.program?.description
    || item?.program?.desc
    || item?.mainSong?.description
    || '',
  ).trim();
}

function extractVoiceDetailPayload(payload: any) {
  return payload?.data?.data || payload?.data?.voice || payload?.data?.detail || payload?.data || payload?.voice || payload?.detail || payload || null;
}

async function loadMissingVoiceDetails(items: any[]) {
  const targets = items
    .map(resolveVoiceId)
    .filter((id) => id > 0 && !voiceDetailById.value[id] && !loadingVoiceDetailIds.has(id));

  await Promise.all(targets.map(async (id) => {
    loadingVoiceDetailIds.add(id);
    try {
      const res = await getVoiceDetail(id);
      const payload = extractVoiceDetailPayload(res.data || res);
      if (payload && typeof payload === 'object') {
        voiceDetailById.value = { ...voiceDetailById.value, [id]: payload };
      }
    } catch {
      // Voice detail is a best-effort metadata supplement for badges.
    } finally {
      loadingVoiceDetailIds.delete(id);
    }
  }));
}

watch(
  () => props.items,
  (items) => {
    if (items?.length) {
      void loadMissingVoiceDetails(items);
    }
  },
  { immediate: true },
);

function resolveStatusMeta(status: string) {
  if (status === 'ONLINE') return { label: '已发布', tone: 'online' };
  if (status === 'AUDITING') return { label: '审核中', tone: 'auditing' };
  if (status === 'ONLY_SELF_SEE') return { label: '仅自己可见', tone: 'private' };
  if (status === 'SCHEDULE_PUBLISH') return { label: '定时发布', tone: 'scheduled' };
  if (status === 'PUBLISHING') return { label: '发布中', tone: 'auditing' };
  if (status === 'FAILED' || status === 'TRANSCODE_FAILED') return { label: '发布失败', tone: 'failed' };
  return { label: '', tone: 'default' };
}

function resolveFeeMeta(item: any) {
  const feeType = deepFindNumber(item, ['voiceFeeType', 'feeType', 'programFeeType', 'fee', 'payType', 'saleType']);
  const payed = deepFindNumber(item, ['payed', 'paid']);
  const price = deepFindNumber(item, ['price', 'originalPrice', 'actualPrice']);
  const buyed = deepFindBoolean(item, ['buyed', 'purchased', 'hasPurchased']) || payed > 0;
  const needPay = deepFindBoolean(item, ['needPay', 'needPurchase', 'needBuy', 'payInfo']) || price > 0;

  if (buyed) return { label: '已购买', tone: 'purchased' };
  if (feeType === 8 || feeType === 16) return { label: '会员', tone: 'vip' };
  if (feeType > 0 || needPay) return { label: '付费', tone: 'paid' };
  logMissingFeeBadge(item);
  return { label: '', tone: 'default' };
}

function logMissingFeeBadge(item: any) {
  if (!import.meta.env.DEV) return;
  const name = String(item?.name || item?.programName || item?.title || '');
  if (!name.includes('陈冲口述') && !name.includes('猫鱼')) return;
  const voiceId = resolveVoiceId(item);
  const keys = collectFeeRelatedKeys(item);
  console.debug('[podcast-fee-badge] missing fee badge', { voiceId, name, keys, item });
}

function collectFeeRelatedKeys(source: any, path = '', seen = new Set<any>()): Record<string, unknown> {
  if (!source || typeof source !== 'object' || seen.has(source)) return {};
  seen.add(source);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (/fee|pay|paid|payed|price|purchase|buy|vip|trial/i.test(key)) {
      result[nextPath] = value;
    }
    if (value && typeof value === 'object') {
      Object.assign(result, collectFeeRelatedKeys(value, nextPath, seen));
    }
  }
  return result;
}

function deepFindNumber(source: any, keys: string[]) {
  const value = deepFindValue(source, keys);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function deepFindBoolean(source: any, keys: string[]) {
  const value = deepFindValue(source, keys);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return Boolean(value);
}

function deepFindValue(source: any, keys: string[], seen = new Set<any>()): any {
  if (!source || typeof source !== 'object' || seen.has(source)) return undefined;
  seen.add(source);

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') return source[key];
  }

  for (const value of Object.values(source)) {
    const nested = deepFindValue(value, keys, seen);
    if (nested !== undefined && nested !== null && nested !== '') return nested;
  }

  return undefined;
}

onMounted(() => {
});

watch(
  () => props.detail,
  () => {
    requestAnimationFrame(() => refresh());
  },
);
</script>

<style scoped>
@import '../styles/detail-page.css';

.podcast-detail-page {
  display: grid;
  gap: var(--space-4);
}

.podcast-song-item {
  display: grid;
  grid-template-columns: 40px 72px minmax(0, 1fr);
  align-items: flex-start;
  column-gap: var(--space-3);
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.podcast-song-item.song-item--playing {
  background: color-mix(in srgb, var(--theme-primary) 10%, var(--bg-surface));
  border-color: color-mix(in srgb, var(--theme-primary) 30%, var(--border));
  box-shadow: 0 10px 24px color-mix(in srgb, var(--theme-primary-strong) 12%, transparent);
}

.podcast-song-item.song-item--playing :deep(.play-pause-button) {
  color: var(--theme-primary);
}

.podcast-song-item :deep(.play-pause-button) {
  align-self: center;
}

.podcast-song-item.song-item--playing :deep(.play-pause-button--interactive),
.podcast-song-item.song-item--playing :deep(.play-pause-button__wave) {
  color: var(--theme-primary);
}

.song-cover {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  object-fit: cover;
  background: var(--bg-surface);
}

.song-meta {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
  flex: 1 1 auto;
  align-self: center;
}

.song-name,
.song-artist {
  margin: 0;
}

.episode-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.song-name {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.episode-description {
  display: -webkit-box;
  max-height: 0;
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-4px);
  transition: max-height 0.24s ease, opacity 0.2s ease, transform 0.24s ease, margin-top 0.24s ease;
}

.podcast-song-item:hover .episode-description,
.podcast-song-item:focus-within .episode-description {
  max-height: 3.2em;
  margin-top: var(--space-1);
  opacity: 1;
  transform: translateY(0);
}

.song-artist {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.status-badge-group {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-1);
  flex: 0 0 auto;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 var(--space-2);
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
  flex: 0 0 auto;
}

.status-badge--online { background: rgba(34,197,94,.14); color: #15803d; }
.status-badge--auditing,
.status-badge--scheduled { background: rgba(59,130,246,.14); color: #1d4ed8; }
.status-badge--private { background: rgba(148,163,184,.18); color: #475569; }
.status-badge--failed { background: rgba(239,68,68,.14); color: #b91c1c; }
.status-badge--paid { background: rgba(245,158,11,.16); color: #b45309; }
.status-badge--vip { background: color-mix(in srgb, var(--theme-primary) 16%, transparent); color: var(--theme-primary-strong); }
.status-badge--purchased { background: rgba(20,184,166,.16); color: #0f766e; }

@media (max-width: 767px) {
  .podcast-song-item {
    grid-template-columns: 40px 56px minmax(0, 1fr);
  }

  .song-cover {
    width: 56px;
    height: 56px;
    border-radius: 14px;
  }
}
</style>
