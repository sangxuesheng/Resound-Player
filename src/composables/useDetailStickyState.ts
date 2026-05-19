import { ref, onMounted, onBeforeUnmount, nextTick, type Ref } from 'vue';

interface UseDetailStickyStateOptions {
  scrollHostSelector?: string | (() => string | undefined);
  headerWrapSelector?: string;
}

export function useDetailStickyState(options: UseDetailStickyStateOptions = {}): {
  isSticky: Ref<boolean>;
  refresh: () => void;
} {
  const {
    scrollHostSelector = '.content',
    headerWrapSelector = '.playlist-detail-header-wrap',
  } = options;

  const isSticky = ref(false);
  let rafId = 0;
  let scrollHost: HTMLElement | null = null;
  let headerEl: HTMLElement | null = null;
  let initialOffset = 0;
  const PROGRESS_DISTANCE = 324;
  // 标记是否需要同步 blur 到 .content（仅当 scrollHost 不是 .content 自身时，
  // 即 PlaylistDetailPage 场景，::before 无法随滚动自然消失）
  let shouldSyncBlur = false;
  // 吸顶激活时间戳：激活后指定时间内不允许退出，防止 header 高度变化导致 scrollTop 钳位触发误退出
  let activatedAt = 0;
  // 滚动停止检测：200ms 无 scroll 事件后启用平滑 transition
  const TRANSITION_READY_DELAY = 200;
  let scrollStopTimer: ReturnType<typeof setTimeout> | null = null;

  function resolveScrollHostSelector(): string {
    if (typeof scrollHostSelector === 'function') {
      return scrollHostSelector() || '.content';
    }
    return scrollHostSelector || '.content';
  }

  function getScrollHost(): HTMLElement | null {
    return document.querySelector(resolveScrollHostSelector()) as HTMLElement | null;
  }

  function getHeaderEl(): HTMLElement | null {
    return document.querySelector(headerWrapSelector) as HTMLElement | null;
  }

  function update(force = false): void {
    if (!scrollHost || !headerEl) return;
    const st = scrollHost.scrollTop;

    // 已吸顶时：用 hysteresis 阈值算 progress，使背景随回滚平滑淡出而非瞬间归零
    if (isSticky.value) {
      const hysteresisThreshold = Math.max(1, initialOffset - 150);
      // 激活冷启动保护：激活后 300ms 内不允许退出，防止 header 高度变化导致的 scrollTop 钳位误触发
      if (Date.now() - activatedAt > 300) {
        isSticky.value = st >= hysteresisThreshold;
      }
      const effectiveSt = Math.max(0, st - hysteresisThreshold);
      const progress = Math.max(0, Math.min(1, effectiveSt / PROGRESS_DISTANCE));
      writeStickyProgress(progress, force);
      syncBlurOpacity(progress);
      return;
    }

    // 普通态：从 initialOffset 开始算
    const effectiveSt = Math.max(0, st - initialOffset);
    const progress = Math.max(0, Math.min(1, effectiveSt / PROGRESS_DISTANCE));
    writeStickyProgress(progress, force);
    syncBlurOpacity(progress);

    // 首次激活：内容高度必须足够
    const scrollRange = scrollHost.scrollHeight - scrollHost.clientHeight;
    const requiredRange = Math.max(initialOffset, PROGRESS_DISTANCE) + 40;
    const shouldSticky = st >= initialOffset && scrollRange >= requiredRange;
    if (shouldSticky) {
      activatedAt = Date.now();
      isSticky.value = true;
    } else {
      isSticky.value = false;
    }
  }

  /** 写入 --sticky-progress，跳过变化量过小的帧以减少 inline style 写入 */
  let lastProgress = -1;
  function writeStickyProgress(progress: number, force = false): void {
    if (!headerEl) return;
    const delta = Math.abs(progress - lastProgress);
    // progress 范围 0~1，324px滚动范围 → 0.005 ≈ 1.6px滚动，足够精细
    if (!force && delta < 0.005) return;
    lastProgress = progress;
    headerEl.style.setProperty('--sticky-progress', String(progress));
  }

  /** 同步 content::before blur 的透明度，仅在 scrollHost 不是 .content 时生效 */
  function syncBlurOpacity(progress: number): void {
    if (!shouldSyncBlur) return;
    const contentEl = document.querySelector('.content');
    if (contentEl) {
      // progress 0→1 时 blur 从 1→0 消失，比 sticky 背景渐入稍快
      const blurOpacity = Math.max(0, 1 - progress * 1.5);
      contentEl.style.setProperty('--blur-opacity', String(blurOpacity));
    }
  }

  function onScroll(): void {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(update);

    // 滚动中关闭平滑 transition（降级为默认 60ms），防止布局重排影响滚动性能
    headerEl?.classList.remove('sticky-transition-ready');

    // 滚动停止后重新启用平滑 transition
    if (scrollStopTimer !== null) clearTimeout(scrollStopTimer);
    scrollStopTimer = setTimeout(() => {
      headerEl?.classList.add('sticky-transition-ready');
      scrollStopTimer = null;
    }, TRANSITION_READY_DELAY);
  }

  function refresh(): void {
    isSticky.value = false;
    // 等 Vue 刷完 isSticky=false 的 DOM 更新（移除 is-sticky-header class）后再重算偏移，
    // 否则 header 仍处于 position:sticky 粘顶状态，getBoundingClientRect 返回粘顶位置，
    // 导致 initialOffset=0，update() 又把 isSticky 设回 true，卡死在粘顶态
    nextTick(() => {
      headerEl = getHeaderEl();
      scrollHost = getScrollHost();
      if (headerEl && scrollHost) {
        const hostRect = scrollHost.getBoundingClientRect();
        const headerRect = headerEl.getBoundingClientRect();
        initialOffset = Math.max(1, headerRect.top - hostRect.top);
      }
      update();
    });
  }

  onMounted(() => {
    requestAnimationFrame(() => {
      scrollHost = getScrollHost();
      headerEl = getHeaderEl();
      if (headerEl && scrollHost) {
        const hostRect = scrollHost.getBoundingClientRect();
        const headerRect = headerEl.getBoundingClientRect();
        initialOffset = Math.max(0, headerRect.top - hostRect.top);
        scrollHost.addEventListener('scroll', onScroll, { passive: true });
        // 初始设一次 progress=0
        headerEl.style.setProperty('--sticky-progress', '0');
        // 检测是否需要同步 blur：scrollHost 不是 .content（即 PlaylistDetailPage）
        shouldSyncBlur = resolveScrollHostSelector() !== '.content';
      }
    });
  });

  onBeforeUnmount(() => {
    scrollHost?.removeEventListener('scroll', onScroll);
    cancelAnimationFrame(rafId);
    // 清理 scroll-stop 计时器和 transition-ready 类
    if (scrollStopTimer !== null) {
      clearTimeout(scrollStopTimer);
      scrollStopTimer = null;
    }
    if (headerEl) {
      headerEl.classList.remove('sticky-transition-ready');
      headerEl.style.removeProperty('--sticky-progress');
    }
    // 清理 blur opacity，仅 PlaylistDetailPage 设置了它
    if (shouldSyncBlur) {
      const contentEl = document.querySelector('.content');
      contentEl?.style.removeProperty('--blur-opacity');
    }
  });

  return { isSticky, refresh };
}