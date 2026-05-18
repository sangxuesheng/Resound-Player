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

  function update(): void {
    if (!scrollHost || !headerEl) return;
    const st = scrollHost.scrollTop;

    // 已吸顶时：用 hysteresis 阈值算 progress，使背景随回滚平滑淡出而非瞬间归零
    if (isSticky.value) {
      const hysteresisThreshold = Math.max(1, initialOffset - 150);
      isSticky.value = st >= hysteresisThreshold;
      const effectiveSt = Math.max(0, st - hysteresisThreshold);
      const progress = Math.max(0, Math.min(1, effectiveSt / PROGRESS_DISTANCE));
      headerEl.style.setProperty('--sticky-progress', String(progress));
      syncBlurOpacity(progress);
      return;
    }

    // 普通态：从 initialOffset 开始算
    const effectiveSt = Math.max(0, st - initialOffset);
    const progress = Math.max(0, Math.min(1, effectiveSt / PROGRESS_DISTANCE));
    headerEl.style.setProperty('--sticky-progress', String(progress));
    syncBlurOpacity(progress);

    // 首次激活：内容高度必须足够
    const scrollRange = scrollHost.scrollHeight - scrollHost.clientHeight;
    const requiredRange = Math.max(initialOffset, PROGRESS_DISTANCE) + 40;
    isSticky.value = st >= initialOffset && scrollRange >= requiredRange;
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
    // 清理 --sticky-progress，避免下一个页面复用 header 时有视觉残留
    if (headerEl) {
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