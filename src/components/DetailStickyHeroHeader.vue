<template>
  <AnimatedAppear
    tag="header"
    variant="content"
    rhythm="head"
    class-name="playlist-detail-header-wrap"
    :class="[sticky && 'is-sticky-header', embedded && 'detail-sticky-header--embedded', { 'has-header-tabs': $slots.tabs }]"
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
            <div class="hero-actions-shell hero-actions-shell--under-cover">
              <AnimatedAppear tag="div" variant="content" rhythm="actions" class-name="ops">
                <slot name="actions" />
              </AnimatedAppear>
            </div>
          </div>
        </template>
      </PageHeroHeader>
      <div v-if="$slots.tabs" class="header-tabs-area">
        <slot name="tabs" />
      </div>
    </template>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { onMounted, watch, nextTick } from 'vue';
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

function remeasureHeight(): void {
  const el = document.querySelector('.playlist-detail-header-wrap') as HTMLElement | null;
  if (el) {
    const h = Math.round(el.getBoundingClientRect().height);
    if (h > 50) el.style.setProperty('--header-full-height', h + 'px');
  }
}

/* ready 变为 true 时重新测量，此时 tabs slot 已渲染 */
watch(() => props.ready, (val) => {
  if (val) nextTick(remeasureHeight);
});

onMounted(remeasureHeight);
</script>

<style scoped>
/* =========================================
 * PageHeroHeader 公共间距 — 供所有详情页统一使用
 * ========================================= */
:deep(.playlist-detail-header) {
  gap: var(--space-4);
  padding: var(--space-2) var(--space-3);
  align-items: center;
}

/* =========================================
 * 基础容器 — position: sticky + 统一 transition 曲线
 * ========================================= */
.playlist-detail-header-wrap {
  position: sticky;
  top: 0;
  z-index: 2;
  height: var(--header-full-height, 380px);
  margin-left: calc(var(--space-4) * -1);
  margin-right: calc(var(--space-4) * -1);
  padding-left: var(--space-4);
  padding-right: var(--space-4);
  padding-bottom: var(--space-2);
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: height, opacity;
  background: color-mix(in srgb, var(--bg-solid) calc(var(--sticky-progress, 0) * 100%), transparent);
  backdrop-filter: blur(calc(var(--sticky-progress, 0) * 10px)) saturate(calc(1 + var(--sticky-progress, 0) * 0.32));
  -webkit-backdrop-filter: blur(calc(var(--sticky-progress, 0) * 10px)) saturate(calc(1 + var(--sticky-progress, 0) * 0.32));
  transition:
    border-radius 0.3s cubic-bezier(0.33, 0, 0.1, 1),
    box-shadow 0.3s cubic-bezier(0.33, 0, 0.1, 1);
  /* height transition 曾在此，因小幅度滑动时触发布局重排导致头部弹跳，已移除 */
}

/* 分隔线 */
.playlist-detail-header-wrap::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: var(--space-3);
  right: var(--space-3);
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--border) 54%, transparent) 20%, color-mix(in srgb, var(--border) 54%, transparent) 80%, transparent);
  opacity: 0;
  transition: opacity 0.3s cubic-bezier(0.33, 0, 0.1, 1);
}
.playlist-detail-header-wrap:not(.is-sticky-header)::after { opacity: 1; }
.playlist-detail-header-wrap.has-header-tabs::after { opacity: 0; }

/* =========================================
 * 媒体列
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
  opacity: calc(1 - var(--sticky-progress, 0) * 0.08);
  /* transition 历史: margin 曾在此 transition，因触发布局重排已移除 */
}
.hero-actions-shell--under-cover {
  display: flex;
  justify-content: flex-start;
  margin-top: var(--space-3);
  transition:
    opacity 0.3s cubic-bezier(0.33, 0, 0.1, 1),
    transform 0.3s cubic-bezier(0.33, 0, 0.1, 1);
}
.hero-actions-shell--under-cover :deep(.ops) {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 0;
}

/* =========================================
 * 标签栏容器 — flex 末尾自然吸附
 * ========================================= */
.header-tabs-area {
  flex-shrink: 0;
  padding: 0 var(--space-3) var(--space-2);
  position: relative;
  z-index: 1;
}

/* 封面 — 滚动驱动缩小 */
:deep(.cover-motion-shell) {
  display: block;
  line-height: 0;
  transform-origin: center center;
  /* 滚动时动态缩小：progress=0 时 scale=1, progress=1 时 scale=0.8 + 上移16px */
  transform:
    scale(calc(1 - var(--sticky-progress, 0) * 0.2))
    translateY(calc(var(--sticky-progress, 0) * -16px));
  transition:
    opacity 0.3s cubic-bezier(0.33, 0, 0.1, 1);
}
:deep(img.cover) {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: center center;
  will-change: transform;
  transition:
    transform 0.3s cubic-bezier(0.33, 0, 0.1, 1),
    opacity 0.3s cubic-bezier(0.33, 0, 0.1, 1),
    filter 0.3s cubic-bezier(0.33, 0, 0.1, 1);
}
@media (hover: hover) and (pointer: fine) {
  .playlist-detail-header-wrap:not(.is-sticky-header) .hero-media-shell:hover :deep(img.cover),
  .playlist-detail-header-wrap:not(.is-sticky-header) .hero-media-shell:focus-within :deep(img.cover) {
    transform: scale(var(--image-hover-scale, 1.04));
    filter: saturate(var(--image-hover-saturate, 1.04));
  }
}

/* 元数据 + 描述 + 标题 — 统一 transition */
:deep(.hero-meta-shell) {
  will-change: opacity, transform;
  transition:
    opacity 0.3s cubic-bezier(0.33, 0, 0.1, 1),
    transform 0.3s cubic-bezier(0.33, 0, 0.1, 1);
  /* transition 历史: max-width 曾在此 transition，因触发布局重排已移除 */
}
:deep(.desc) {
  will-change: opacity, transform;
  transition:
    opacity 0.3s cubic-bezier(0.33, 0, 0.1, 1),
    transform 0.3s cubic-bezier(0.33, 0, 0.1, 1);
}
:deep(.hero-title-shell .title) {
  transition:
    transform 0.3s cubic-bezier(0.33, 0, 0.1, 1);
  /* transition 历史: font-size / line-height / margin 曾在此 transition，因触发布局重排已移除 */
}

/* Grid 列宽过渡 */
/* transition 历史: grid-template-columns / gap / width / min-width 曾在此 transition，因触发布局重排已移除 */

/* =========================================
 * 吸顶状态 — 网易云音乐风格
 * cover: scale(1→0.6) + translateY + opacity 淡出
 * 标题: 缩小 + 上移
 * 元数据/描述: 淡出 + 上移
 * actions: 在标题 flex 行右侧
 * ========================================= */
.playlist-detail-header-wrap.is-sticky-header {
  z-index: 30;
  display: flex;
  flex-direction: column;
  height: 80px;
  overflow: hidden;
  margin: 0 calc(var(--space-4) * -1) 0;
  padding: 22px var(--space-4) 8px;
  border-radius: 0 0 16px 16px;
  clip-path: inset(0 round 0 0 16px 16px);
  box-shadow: 0 8px 20px var(--shadow-sticky);
}
.playlist-detail-header-wrap.is-sticky-header.has-header-tabs {
  height: 134px;
  padding: 22px var(--space-4) 0;
}
.playlist-detail-header-wrap.is-sticky-header::after { opacity: 0; }

/* 标签栏在吸顶态底部吸附 — 背景跟随头部，不单独设色 */
.playlist-detail-header-wrap.is-sticky-header .header-tabs-area {
  padding: 8px var(--space-4) var(--space-1);
  border-radius: 0 0 16px 16px;
}

/* 吸顶态标签 button 压缩 */
.playlist-detail-header-wrap.is-sticky-header :deep(.artist-tab) {
  height: 28px;
  padding: 0 10px;
  font-size: var(--text-label-sm);
}
.playlist-detail-header-wrap.is-sticky-header :deep(.artist-tabs) {
  gap: 8px;
}
.playlist-detail-header-wrap.is-sticky-header :deep(.playlist-tab) {
  height: 28px;
  padding: 0 10px;
  font-size: var(--text-label-sm);
}
.playlist-detail-header-wrap.is-sticky-header :deep(.playlist-tabs) {
  gap: 8px;
}

/* 封面：保持原始比例 + 圆角 */
.playlist-detail-header-wrap.is-sticky-header .hero-media-shell {
  border-radius: 6px;
  overflow: hidden;
}
.playlist-detail-header-wrap.is-sticky-header :deep(.cover-motion-shell) {
  opacity: 0.95;
}
.playlist-detail-header-wrap.is-sticky-header :deep(img.cover) {
  border-radius: 6px;
  opacity: 0.95;
}

/* 媒体列宽度 72px 圆角封面 */
.playlist-detail-header-wrap.is-sticky-header :deep(.page-hero-header) {
  flex: 1;
  min-height: 0;
  grid-template-columns: 72px minmax(0, 1fr) !important;
  justify-items: stretch !important;
  align-items: center;
  gap: 14px !important;
}
.playlist-detail-header-wrap.is-sticky-header :deep(.page-hero-header__content) {
  display: block !important;
}
.playlist-detail-header-wrap.is-sticky-header :deep(.page-hero-header__media) {
  width: 72px !important;
  min-width: 72px !important;
  overflow: visible !important;
}

/* 标题缩小 */
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

/* actions 在标题 flex 行右侧 */
.playlist-detail-header-wrap.is-sticky-header .hero-actions-shell--under-cover {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: auto;
  margin-top: 0;
  opacity: 1 !important;
}
.playlist-detail-header-wrap.is-sticky-header .hero-actions-shell--under-cover :deep(.ops) {
  margin-top: 0;
}

/* 元数据 + 描述 + 子文本淡出上移 */
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

/* =========================================
 * 嵌入模式变体
 * ========================================= */
.playlist-detail-header-wrap.is-sticky-header.detail-sticky-header--embedded {
  top: -18px;
  margin: 0 -18px 0;
  padding: var(--space-3) 18px;
}

/* =========================================
 * 减少动效降级
 * ========================================= */
@media (prefers-reduced-motion: reduce) {
  .playlist-detail-header-wrap {
    transition: none;
  }
  .playlist-detail-header-wrap::after,
  .hero-actions-shell--under-cover,
  :deep(.hero-meta-shell),
  :deep(.desc),
  :deep(.hero-title-shell .title),
  :deep(.cover-motion-shell),
  :deep(img.cover) {
    transition: none;
  }
}

</style>