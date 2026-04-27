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
        <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="play-all" type="button" @click="emit('play-all', displayedRawItems)">播放全部</AnimatedAppear>
      </template>
    </DetailStickyHeroHeader>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="playlist-detail-body">
      <AnimatedAppear v-if="loading" tag="div" variant="text" rhythm="body" class-name="state">播客详情加载中…</AnimatedAppear>
      <AnimatedAppear v-else-if="items.length" tag="ul" variant="content" rhythm="list" class-name="song-list">
        <AnimatedAppear
          v-for="(item, idx) in normalizedItems"
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
    </AnimatedAppear>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AnimatedAppear from './AnimatedAppear.vue';
import DetailStickyHeroHeader from './DetailStickyHeroHeader.vue';
import HeroCoverMedia from './HeroCoverMedia.vue';
import { playerStore } from '../stores/player';
import { getVoiceDetail } from '../api/music';
import PlayPauseButton from './ui/PlayPauseButton.vue';

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
}>();

const isDescriptionExpanded = ref(false);

const isSticky = ref(false);
let stickyRAF = 0;
let scrollHost: HTMLElement | null = null;
let headerWrapEl: HTMLElement | null = null;
const STICKY_ENTER_THRESHOLD = 12;
const STICKY_EXIT_THRESHOLD = 4;
const STICKY_SCROLL_SAFETY_GAP = 32;

function getScrollHost() {
  return document.querySelector(props.scrollHostSelector || '.content') as HTMLElement | null;
}

function getHeaderWrapEl() {
  return document.querySelector('.playlist-detail-header-wrap') as HTMLElement | null;
}

function getStickyRequiredScrollRange() {
  if (!headerWrapEl) return Number.POSITIVE_INFINITY;

  const headerHeight = headerWrapEl.getBoundingClientRect().height;
  const stickyCollapsedHeight = 72;
  return Math.max(0, headerHeight - stickyCollapsedHeight) + STICKY_SCROLL_SAFETY_GAP;
}

function updateStickyState() {
  if (!scrollHost) return;
  const scrollRange = scrollHost.scrollHeight - scrollHost.clientHeight;
  const requiredScrollRange = getStickyRequiredScrollRange();
  if (scrollRange <= requiredScrollRange) {
    isSticky.value = false;
    return;
  }
  const nextScrollTop = scrollHost.scrollTop;
  if (isSticky.value) {
    isSticky.value = nextScrollTop > STICKY_EXIT_THRESHOLD;
    return;
  }
  isSticky.value = nextScrollTop > STICKY_ENTER_THRESHOLD;
}

function onScroll() {
  cancelAnimationFrame(stickyRAF);
  stickyRAF = requestAnimationFrame(updateStickyState);
}
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
const shellStyle = computed<Record<string, string>>(() => {
  const coverUrl = hero.value.coverUrl?.trim();
  return coverUrl ? { '--cover-bg': `url("${coverUrl}")` } : {};
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
  scrollHost = getScrollHost();
  headerWrapEl = getHeaderWrapEl();
  updateStickyState();
  scrollHost?.addEventListener('scroll', onScroll, { passive: true });
});

onBeforeUnmount(() => {
  scrollHost?.removeEventListener('scroll', onScroll);
  cancelAnimationFrame(stickyRAF);
});

watch(
  () => props.detail,
  () => {
    requestAnimationFrame(() => {
      headerWrapEl = getHeaderWrapEl();
      updateStickyState();
    });
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

:deep(.playlist-detail-header-wrap .page-hero-header) {
  transition: grid-template-columns 0.56s cubic-bezier(0.2, 0.9, 0.22, 1), gap 0.56s cubic-bezier(0.2, 0.9, 0.22, 1);
}

:deep(.playlist-detail-header-wrap .playlist-detail-header__media),
:deep(.playlist-detail-header-wrap .playlist-detail-header__content),
:deep(.playlist-detail-header-wrap .hero-media-shell),
:deep(.playlist-detail-header-wrap .hero-main-shell),
:deep(.playlist-detail-header-wrap .hero-title-shell),
:deep(.playlist-detail-header-wrap .hero-meta-shell),
:deep(.playlist-detail-header-wrap .hero-actions-shell),
:deep(.playlist-detail-header-wrap .ops),
:deep(.playlist-detail-header-wrap .cover),
:deep(.playlist-detail-header-wrap .title),
:deep(.playlist-detail-header-wrap .sub-row),
:deep(.playlist-detail-header-wrap .sub),
:deep(.playlist-detail-header-wrap .desc),
:deep(.playlist-detail-header-wrap .play-all) {
  transition:
    opacity 0.42s ease,
    transform 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    width 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    height 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    max-width 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    max-height 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    margin 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    padding 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    gap 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    font-size 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    letter-spacing 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    line-height 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    box-shadow 0.42s ease,
    background-color 0.42s ease,
    color 0.42s ease,
    border-color 0.42s ease,
    filter 0.42s ease,
    border-radius 0.56s cubic-bezier(0.2, 0.9, 0.22, 1);
}

:deep(.playlist-detail-header-wrap .playlist-detail-header__media) {
  width: 308px;
  max-width: 308px;
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  transform-origin: left center;
  overflow: hidden;
}

:deep(.playlist-detail-header-wrap .hero-media-shell) {
  transform: translate3d(0, 0, 0) scale(1);
  transform-origin: left center;
}

:deep(.playlist-detail-header-wrap .cover) {
  transform: translate3d(0, 0, 0) scale(1);
  transform-origin: left center;
  filter: saturate(1) blur(0);
}

:deep(.playlist-detail-header-wrap .playlist-detail-header__content) {
  min-width: 0;
  width: 100%;
  transform: translate3d(0, 0, 0);
}

:deep(.playlist-detail-header-wrap .hero-main-shell) {
  min-width: 0;
}

:deep(.playlist-detail-header-wrap .hero-title-shell) {
  min-width: 0;
}

:deep(.playlist-detail-header-wrap .hero-meta-shell) {
  display: grid;
  min-width: 0;
  max-height: 240px;
  opacity: 1;
  transform: translate3d(0, 0, 0);
  overflow: hidden;
}

:deep(.playlist-detail-header-wrap .title) {
  max-width: 100%;
  letter-spacing: 0.2px;
}

:deep(.playlist-detail-header-wrap .desc) {
  max-height: 120px;
  opacity: 1;
  transform: translate3d(0, 0, 0);
  overflow: hidden;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .page-hero-header) {
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
  align-items: center;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .playlist-detail-header__media) {
  width: 0;
  max-width: 0;
  height: 0;
  opacity: 0;
  transform: translate3d(-18px, 0, 0) scale(0.84);
  margin: 0;
  pointer-events: none;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-media-shell) {
  transform: translate3d(-10px, -4px, 0) scale(0.76);
}

:deep(.playlist-detail-header-wrap.is-sticky-header .cover) {
  opacity: 0;
  transform: translate3d(-14px, -6px, 0) scale(0.7);
  filter: saturate(0.88) blur(6px);
  border-radius: 14px;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .playlist-detail-header__content) {
  width: 100%;
  min-width: 0;
  transform: translate3d(0, 0, 0);
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-main-shell) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto;
  align-items: center;
  column-gap: var(--space-3);
  row-gap: 0;
  width: 100%;
  min-height: 54px;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-title-shell) {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  max-width: 100%;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-title-shell .title) {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-meta-shell) {
  max-height: 0;
  opacity: 0;
  transform: translate3d(0, -8px, 0);
  overflow: hidden;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-actions-shell) {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-self: end;
  align-self: center;
  min-width: max-content;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .hero-actions-shell .ops) {
  margin-top: 0;
}

:deep(.playlist-detail-header-wrap.is-sticky-header .desc) {
  max-height: 0;
  opacity: 0;
  transform: translate3d(0, -8px, 0);
}
</style>
