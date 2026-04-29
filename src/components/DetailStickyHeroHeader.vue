<template>
  <AnimatedAppear
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
        layout-class="playlist-detail-header"
        media-class="playlist-detail-header__media"
        content-class="playlist-detail-header__content"
      >
        <template #media>
          <div class="hero-media-shell">
            <slot name="media" />
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
            <div class="hero-actions-shell">
              <AnimatedAppear tag="div" variant="content" rhythm="actions" class-name="ops">
                <slot name="actions" />
              </AnimatedAppear>
            </div>
          </div>
        </template>
      </PageHeroHeader>
    </template>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
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
let progressRAF = 0;
const PROGRESS_SCROLL_DISTANCE = 324;

// 缓存元素引用
let headerWrapEl: HTMLElement | null = null;
let mediaEl: HTMLElement | null = null;
let mediaShellEl: HTMLElement | null = null;
let coverImgEl: HTMLElement | null = null;
let metaShellEl: HTMLElement | null = null;
let descEl: HTMLElement | null = null;

function getScrollHost(): HTMLElement | null {
  const el = document.querySelector('.playlist-detail-header-wrap');
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
  if (mediaEl) {
    mediaEl.style.opacity = String(1 - progress);
    mediaEl.style.transform = `translate3d(${-18 * progress}px, 0, 0) scale(${1 - 0.16 * progress})`;
  }
  if (mediaShellEl) {
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

    headerWrapEl = document.querySelector('.playlist-detail-header-wrap');
    if (!headerWrapEl) { updateProgress(); return; }

    const pageHeader = headerWrapEl.querySelector('.page-hero-header');
    mediaEl = pageHeader?.querySelector('.page-hero-header__media') ?? null;
    mediaShellEl = headerWrapEl.querySelector('.hero-media-shell');
    coverImgEl = headerWrapEl.querySelector('.cover');
    metaShellEl = headerWrapEl.querySelector('.hero-meta-shell');
    descEl = headerWrapEl.querySelector('.desc');

    const capture = () => {
      if (!props.sticky) {
        const h = Math.round(headerWrapEl!.getBoundingClientRect().height);
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
  transition:
    margin 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    padding 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    border-radius 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    box-shadow 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    background-color 0.46s ease,
    backdrop-filter 0.46s ease;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.hero-media-shell {
  overflow: hidden;
  border-radius: 18px;
  transform: translateZ(0);
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
  padding: 14px var(--space-4) var(--space-2);
  border-radius: 0 0 16px 16px;
  background: color-mix(in srgb, var(--bg-surface) 82%, transparent);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(10px) saturate(132%);
  -webkit-backdrop-filter: blur(10px) saturate(132%);
  /* 渐进裁剪：progress=0 全可见，progress=1 只留顶部 ~80px 可见 */
  clip-path: inset(0 0 calc(var(--sticky-progress, 0) * (100% - 80px)) 0);
}

.playlist-detail-header-wrap.is-sticky-header :deep(.hero-media-shell) {
  overflow: hidden;
}

.playlist-detail-header-wrap.is-sticky-header :deep(img.cover) {
  transform: scale(1);
  filter: none;
}

.playlist-detail-header-wrap.is-sticky-header.detail-sticky-header--embedded {
  top: -18px;
  margin: 0 -18px 0;
  padding: 14px 18px var(--space-2);
}
</style>
