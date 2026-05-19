import { onMounted, onBeforeUnmount, nextTick } from 'vue';

interface UseDetailStickyStateOptions {
  scrollHostSelector?: string | (() => string | undefined);
  headerWrapSelector?: string;
  /** 可选：指定一个 CSS 选择器，progress >= 0.998 时自动添加 is-sticky-header class */
  stickyClassTarget?: string;
}

export function useDetailStickyState(options: UseDetailStickyStateOptions = {}): {
  refresh: () => void;
} {
  const {
    scrollHostSelector = '.content',
    headerWrapSelector = '.playlist-detail-header-wrap',
  } = options;

  let rafId = 0;
  let scrollHost: HTMLElement | null = null;
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

  /** 获取 --sticky-progress 的目标宿主：scrollHost（公共祖先，返回按钮和 header 都能读到） */
  function getProgressHost(): HTMLElement | null {
    return getScrollHost();
  }

  function update(force = false): void {
    if (!scrollHost) return;
    const st = scrollHost.scrollTop;

    // 纯滚动位置 → progress（0→1），不再区分吸顶态/普通态，不再有布尔切换
    const effectiveSt = Math.max(0, st - initialOffset);
    const progress = Math.max(0, Math.min(1, effectiveSt / PROGRESS_DISTANCE));
    writeStickyProgress(progress, force);
    syncBlurOpacity(progress);
    syncStickyClass(progress);
  }

  /** 写入 --sticky-progress 到 scrollHost（公共祖先），跳过变化量过小的帧 */
  let lastProgress = -1;
  function writeStickyProgress(progress: number, force = false): void {
    const host = getProgressHost();
    if (!host) return;
    const delta = Math.abs(progress - lastProgress);
    if (!force && delta < 0.005) return;
    lastProgress = progress;
    host.style.setProperty('--sticky-progress', String(progress));
  }

  /** 同步 content::before blur 的透明度，仅在 scrollHost 不是 .content 时生效 */
  function syncBlurOpacity(progress: number): void {
    if (!shouldSyncBlur) return;
    const contentEl = document.querySelector('.content');
    if (contentEl) {
      const blurOpacity = Math.max(0, 1 - progress * 1.5);
      contentEl.style.setProperty('--blur-opacity', String(blurOpacity));
    }
  }

  /** 同步 is-sticky-header class，仅在设置了 stickyClassTarget 时生效 */
  function syncStickyClass(progress: number): void {
    if (!options.stickyClassTarget) return;
    const target = document.querySelector(options.stickyClassTarget) as HTMLElement | null;
    if (!target) return;
    target.classList.toggle('is-sticky-header', progress >= 0.998);
  }

  function onScroll(): void {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(update);
  }

  function refresh(): void {
    nextTick(() => {
      scrollHost = getScrollHost();
      if (scrollHost) {
        const hostRect = scrollHost.getBoundingClientRect();
        // 用 scrollHost 自身位置计算 initialOffset
        // position:sticky 的 header 初始时在滚动容器顶部，offset = 0
        initialOffset = 0;
      }
      update(true);
    });
  }

  onMounted(() => {
    requestAnimationFrame(() => {
      scrollHost = getScrollHost();
      if (scrollHost) {
        initialOffset = 0;
        scrollHost.addEventListener('scroll', onScroll, { passive: true });
        // 初始设一次 progress=0
        getProgressHost()?.style.setProperty('--sticky-progress', '0');
        // 检测是否需要同步 blur：scrollHost 不是 .content（即 PlaylistDetailPage）
        shouldSyncBlur = resolveScrollHostSelector() !== '.content';
      }
    });
  });

  onBeforeUnmount(() => {
    scrollHost?.removeEventListener('scroll', onScroll);
    cancelAnimationFrame(rafId);
    // 清理 --sticky-progress
    const host = getProgressHost();
    if (host) {
      host.style.removeProperty('--sticky-progress');
    }
    // 清理 blur opacity，仅 PlaylistDetailPage 设置了它
    if (shouldSyncBlur) {
      const contentEl = document.querySelector('.content');
      contentEl?.style.removeProperty('--blur-opacity');
    }
    // 清理 is-sticky-header class
    if (options.stickyClassTarget) {
      document.querySelector(options.stickyClassTarget)?.classList.remove('is-sticky-header');
    }
  });

  return { refresh };
}