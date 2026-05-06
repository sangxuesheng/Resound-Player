<template>
  <AnimatedAppear
    ref="rootEl"
    tag="header"
    variant="content"
    rhythm="head"
    class-name="playlist-detail-header-wrap"
    :class="[sticky && 'is-sticky-header', embedded && 'detail-sticky-header--embedded']"
  >
    <template v-if="loading && !ready">
      <div class="state">{{ loadingText }}</div>
    </template>
    <template v-else-if="error">
      <div class="state error">{{ error }}</div>
    </template>
    <template v-else-if="ready">
      <PageHeroHeader
        tag="div"
        layout-class="playlist-detail-header"
        media-class="playlist-detail-header__media"
        content-class="playlist-detail-header__content"
      >
        <template #media>
          <div class="hero-media-col">
            <div class="hero-media-shell">
              <slot name="media" />
            </div>
          </div>
        </template>
        <template #content>
          <div class="hero-main-shell meta">
            <div class="hero-title-shell">
              <slot name="title" />
            </div>
            <div class="hero-meta-shell">
              <slot name="meta" />
            </div>
          </div>
        </template>
      </PageHeroHeader>
      <!-- actions 移出 PageHeroHeader，避免被 AnimatedAppear 的 animation transform 创建的包含块影响 absolute 定位 -->
      <div class="hero-actions-shell hero-actions-shell--under-cover">
        <AnimatedAppear tag="div" variant="content" rhythm="actions" class-name="ops">
          <slot name="actions" />
        </AnimatedAppear>
      </div>
    </template>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import AnimatedAppear from './AnimatedAppear.vue';
import PageHeroHeader from './PageHeroHeader.vue';

const props = defineProps<{
  sticky?: boolean;
  embedded?: boolean;
  loading?: boolean;
  ready?: boolean;
  error?: string;
  loadingText?: string;
}>();

/*
 * 连续吸顶进度：--sticky-progress 从 0（完全展开）到 1（完全折叠）
 *
 * 原理：
 *  - 头部始终 position: sticky; top: 0; 保持吸附
 *  - min-height = 原始高度 → 文档流高度恒定 → 列表永不移动
 *  - 内部元素用 inline style 作连续 transform/opacity 变化
 *  - .is-sticky-header 控制毛玻璃背景 + clip-path 渐进裁剪：
 *      progress=0 → 全部可见
 *      progress=1 → 只留顶部 ~80px 可见，多余区域完全透明（列表正常可见）
 *  - 视觉变化与滚动位置连续映射，无跳变
 */

let scrollHost: HTMLElement | null = null;
const rootEl = ref<HTMLElement | null>(null);
let progressRAF = 0;
const PROGRESS_SCROLL_DISTANCE = 324;

// 缓存元素引用
let headerWrapEl: HTMLElement | null = null;
let mediaEl: HTMLElement | null = null;
let mediaShellEl: HTMLElement | null = null;
let coverImgEl: HTMLElement | null = null;
let metaShellEl: HTMLElement | null = null;
let descEl: HTMLElement | null = null;
let actionsShellEl: HTMLElement | null = null;

function resolveEl(): HTMLElement | null {
  // rootEl is bound to AnimatedAppear component, so .value may be a component instance
  const el = rootEl.value as any;
  if (!el) return null;
  // If it's a component instance, try $el first
  if (el.$el instanceof HTMLElement) return el.$el;
  // If it's already an HTMLElement
  if (el instanceof HTMLElement) return el;
  // Fallback: query by class
  return document.querySelector('.playlist-detail-header-wrap') as HTMLElement | null;
}

function getScrollHost(): HTMLElement | null {
  const el = resolveEl();
  if (el) {
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      const style = getComputedStyle(parent);
      const ov = style.overflowY + style.overflow;
      if (ov.includes('auto') || ov.includes('scroll')) return parent;
      parent = parent.parentElement;
    }
  }
  return document.querySelector('.content') as HTMLElement | null;
}

function updateProgress() {
  if (!scrollHost) return;
  const pt = scrollHost.scrollTop;
  const progress = Math.max(0, Math.min(1, pt / PROGRESS_SCROLL_DISTANCE));

  if (headerWrapEl) {
    headerWrapEl.style.setProperty('--sticky-progress', String(progress));
  }

  // === 封面三层嵌套动画（层次化视差效果） ===
  // 第一层不再设 opacity，避免覆盖内含的 actions 按钮区；
  // 媒体列的视觉坍缩由 CSS .is-sticky-header 驱动 width:0。
  if (mediaEl) {
    mediaEl.style.transform = `translate3d(${-18 * progress}px, 0, 0) scale(${1 - 0.16 * progress})`;
  }
  if (mediaShellEl) {
    mediaShellEl.style.opacity = String(1 - progress);
    mediaShellEl.style.transform = `translate3d(${-10 * progress}px, ${-4 * progress}px, 0) scale(${1 - 0.24 * progress})`;
  }
  if (coverImgEl) {
    coverImgEl.style.opacity = String(1 - progress);
    coverImgEl.style.setProperty('--scroll-transform', `translate3d(${-14 * progress}px, ${-6 * progress}px, 0) scale(${1 - 0.3 * progress})`);
    coverImgEl.style.filter = `saturate(${1 - 0.12 * progress}) blur(${6 * progress}px)`;
    coverImgEl.style.borderRadius = `${16 + 6 * progress}px`;
  }

  // === 描述区 + 描述文字：渐进上移淡出 ===
  if (metaShellEl) {
    metaShellEl.style.display = 'block';
    metaShellEl.style.opacity = String(1 - progress);
    metaShellEl.style.transform = `translate3d(0, ${-8 * progress}px, 0)`;
  }
  if (descEl) {
    descEl.style.display = 'block';
    descEl.style.opacity = String(1 - progress);
    descEl.style.transform = `translate3d(0, ${-8 * progress}px, 0)`;
    descEl.style.maxHeight = `${120 * (1 - progress)}px`;
  }

  // === 操作按钮区：渐进上移淡出 ===
  if (actionsShellEl) {
    actionsShellEl.style.opacity = String(1 - progress);
    actionsShellEl.style.transform = `translate3d(0, ${-6 * progress}px, 0)`;
  }
}

function onScroll() {
  cancelAnimationFrame(progressRAF);
  progressRAF = requestAnimationFrame(updateProgress);
}

let ro: ResizeObserver | null = null;

onMounted(() => {
  requestAnimationFrame(() => {
    scrollHost = getScrollHost();
    scrollHost?.addEventListener('scroll', onScroll, { passive: true });

    headerWrapEl = resolveEl();
    if (!headerWrapEl) { updateProgress(); return; }

    const pageHeader = headerWrapEl.querySelector('.page-hero-header');
    mediaEl = pageHeader?.querySelector('.page-hero-header__media') ?? null;
    mediaShellEl = headerWrapEl.querySelector('.hero-media-shell');
    coverImgEl = headerWrapEl.querySelector('.cover');
    metaShellEl = headerWrapEl.querySelector('.hero-meta-shell');
    descEl = headerWrapEl.querySelector('.desc');
    actionsShellEl = headerWrapEl.querySelector('.hero-actions-shell--under-cover');

    const capture = () => {
      if (!props.sticky) {
        const pageHeader = headerWrapEl!.querySelector('.page-hero-header') as HTMLElement | null;
        const h = pageHeader ? Math.round(pageHeader.getBoundingClientRect().height) : Math.round(headerWrapEl!.getBoundingClientRect().height);
        if (h > 50) headerWrapEl!.style.setProperty('--sticky-header-height', h + 'px');
      }
    };
    capture();
    ro = new ResizeObserver(capture);
    if (headerWrapEl) ro.observe(headerWrapEl);

    updateProgress();
  });
});

onBeforeUnmount(() => {
  scrollHost?.removeEventListener('scroll', onScroll);
  cancelAnimationFrame(progressRAF);
  ro?.disconnect();
});
</script>

<style scoped>
/* =========================================
 * 基础 — 始终 position: sticky; min-height 保持文档流
 * ========================================= */
.playlist-detail-header-wrap {
  position: sticky;
  top: 0;
  z-index: 2;
  min-height: var(--sticky-header-height, 324px);
  padding-bottom: var(--space-2);
  transition:
    border-radius 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    box-shadow 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    background-color 0.46s ease,
    backdrop-filter 0.46s ease;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* 头部与下方内容区之间的分隔线 */
.playlist-detail-header-wrap::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: var(--space-3);
  right: var(--space-3);
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--border) 54%, transparent) 20%,
    color-mix(in srgb, var(--border) 54%, transparent) 80%,
    transparent 100%
  );
  opacity: 0;
  transition: opacity 0.36s ease;
}

.playlist-detail-header-wrap:not(.is-sticky-header)::after {
  opacity: 1;
}

/* =========================================
 * 媒体列：封面 + 操作按钮竖向排列
 * ========================================= */
.hero-media-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: stretch;
}

.hero-media-shell {
  overflow: hidden;
  border-radius: 18px;
  transform: translateZ(0);
}

/* 封面下方操作按钮区（已移出 PageHeroHeader 网格，直接作为 header-wrap 子级）
   正常态下宽度对齐封面列，吸顶态 absolute 定位到顶栏右侧 */
.hero-actions-shell--under-cover {
  display: flex;
  justify-content: flex-start;
  width: var(--hero-media-width, 308px);
  margin-top: var(--space-3);
}

.hero-actions-shell--under-cover :deep(.ops) {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 0;
}

:deep(.cover-motion-shell) {
  display: block;
  line-height: 0;
  transform-origin: center center;
}

:deep(img.cover) {
  display: block;
  width: 100%;
  height: 100%;
  transition:
    transform var(--image-hover-duration, var(--an-duration-base)) var(--image-hover-ease, var(--an-ease)),
    filter var(--image-hover-duration, var(--an-duration-base)) var(--image-hover-ease, var(--an-ease));
  transform: scale(1);
  transform-origin: center center;
  will-change: transform;
}

@media (hover: hover) and (pointer: fine) {
  .playlist-detail-header-wrap:not(.is-sticky-header) .hero-media-shell:hover :deep(img.cover),
  .playlist-detail-header-wrap:not(.is-sticky-header) .hero-media-shell:focus-within :deep(img.cover) {
    transform: scale(var(--image-hover-scale, 1.04));
    filter: saturate(var(--image-hover-saturate, 1.04));
  }
}

/* =========================================
 * 吸顶状态 — 毛玻璃背景 + clip-path 渐进裁剪
 * 内部元素的 opacity/transform 由 JS inline style 连续驱动
 * ========================================= */
.playlist-detail-header-wrap.is-sticky-header {
  z-index: 30;
  margin: 0 calc(var(--space-4) * -1) 0;
  padding: var(--space-3) var(--space-4);
  border-radius: 0 0 16px 16px;
  background: color-mix(in srgb, var(--bg-surface) 82%, transparent);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(10px) saturate(132%);
  -webkit-backdrop-filter: blur(10px) saturate(132%);
  /* 渐进裁剪：progress=0 全可见，progress=1 只留顶部 ~80px 可见 */
  clip-path: inset(0 0 calc(var(--sticky-progress, 0) * (100% - 80px)) 0);
}

.playlist-detail-header-wrap.is-sticky-header::after {
  opacity: 0;
}

.playlist-detail-header-wrap.is-sticky-header :deep(.hero-media-shell) {
  overflow: hidden;
}

.playlist-detail-header-wrap.is-sticky-header :deep(img.cover) {
  transform: scale(1);
  filter: none;
}

/* 吸顶态：媒体列宽度坍缩 + 内容垂直居中于可见区域（clip-path 只显示顶部 ~80px） */
.playlist-detail-header-wrap.is-sticky-header :deep(.page-hero-header) {
  grid-template-columns: 0 minmax(0, 1fr) !important;
  justify-items: stretch !important;
  align-items: start;
  gap: 0 !important;
}

.playlist-detail-header-wrap.is-sticky-header :deep(.page-hero-header__content) {
  display: block !important;
}

/* 将内容垂直居中于 ~80px 可见区域：标题约 36px → padding-top = (80-36)/2 ≈ 22px */
.playlist-detail-header-wrap.is-sticky-header {
  padding-top: 22px;
}

.playlist-detail-header-wrap.is-sticky-header :deep(.page-hero-header__media) {
  width: 0 !important;
  min-width: 0 !important;
  overflow: visible !important;
}

/* 只隐藏封面壳，不隐藏同列的 actions 按钮区 */
.playlist-detail-header-wrap.is-sticky-header .hero-media-shell {
  opacity: 0 !important;
  pointer-events: none;
  max-height: 0;
  overflow: hidden;
  margin: 0;
}

/* 吸顶态：操作按钮从封面下方脱离，固定到顶部 bar 右侧 */
.playlist-detail-header-wrap.is-sticky-header .hero-actions-shell--under-cover {
  position: absolute;
  right: var(--space-4);
  top: 22px;
  height: 36px;
  width: auto;
  margin-top: 0;
  display: flex;
  align-items: center;
  opacity: 1 !important;
}

.playlist-detail-header-wrap.is-sticky-header .hero-actions-shell--under-cover :deep(.ops) {
  margin-top: 0;
}

/* 吸顶态：统一 flex 布局 — 标题 stretch / 操作右侧绝对定位 */
.playlist-detail-header-wrap.is-sticky-header :deep(.hero-main-shell) {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  min-height: 36px;
}

.playlist-detail-header-wrap.is-sticky-header :deep(.hero-title-shell) {
  min-width: 0;
  flex: 1 1 auto;
}

.playlist-detail-header-wrap.is-sticky-header :deep(.hero-title-shell .title) {
  display: block;
  width: 100%;
  margin: 0;
  font-size: 24px !important;
  line-height: 1.2;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-detail-header-wrap.is-sticky-header :deep(.hero-meta-shell) {
  max-height: 0;
  max-width: 0;
  min-width: 0;
  opacity: 0;
  overflow: hidden;
  transform: translate3d(0, -10px, 0);
  pointer-events: none;
}

.playlist-detail-header-wrap.is-sticky-header :deep(.desc) {
  max-height: 0;
  opacity: 0;
  transform: translate3d(0, -8px, 0);
}

.playlist-detail-header-wrap.is-sticky-header.detail-sticky-header--embedded {
  top: -18px;
  margin: 0 -18px 0;
  padding: var(--space-3) 18px;
}

.playlist-detail-header-wrap.is-sticky-header.detail-sticky-header--embedded .hero-actions-shell--under-cover {
  right: 18px;
}
</style>
