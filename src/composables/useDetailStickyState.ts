import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue';

interface UseDetailStickyStateOptions {
  scrollHostSelector?: string | (() => string | undefined);
  headerWrapSelector?: string;
  enterThreshold?: number;
  exitThreshold?: number;
  safetyGap?: number;
}

export function useDetailStickyState(options: UseDetailStickyStateOptions = {}): {
  isSticky: Ref<boolean>;
  refresh: () => void;
} {
  const {
    scrollHostSelector = '.content',
    headerWrapSelector = '.playlist-detail-header-wrap',
    enterThreshold = 12,
    exitThreshold = 4,
    safetyGap = 32,
  } = options;

  const isSticky = ref(false);
  let stickyRAF = 0;
  let scrollHost: HTMLElement | null = null;
  let headerWrapEl: HTMLElement | null = null;

  function resolveScrollHostSelector(): string {
    if (typeof scrollHostSelector === 'function') {
      return scrollHostSelector() || '.content';
    }
    return scrollHostSelector || '.content';
  }

  function getScrollHost(): HTMLElement | null {
    return document.querySelector(resolveScrollHostSelector()) as HTMLElement | null;
  }

  function getHeaderWrapEl(): HTMLElement | null {
    return document.querySelector(headerWrapSelector) as HTMLElement | null;
  }

  function getStickyRequiredScrollRange(): number {
    if (!headerWrapEl) return Number.POSITIVE_INFINITY;

    const headerHeight = headerWrapEl.getBoundingClientRect().height;
    const stickyCollapsedHeight = 72;
    return Math.max(0, headerHeight - stickyCollapsedHeight) + safetyGap;
  }

  function updateStickyState(): void {
    if (!scrollHost) return;

    const scrollRange = scrollHost.scrollHeight - scrollHost.clientHeight;
    const requiredScrollRange = getStickyRequiredScrollRange();
    if (scrollRange <= requiredScrollRange) {
      isSticky.value = false;
      return;
    }

    const nextScrollTop = scrollHost.scrollTop;
    if (isSticky.value) {
      isSticky.value = nextScrollTop > exitThreshold;
      return;
    }

    isSticky.value = nextScrollTop > enterThreshold;
  }

  function onScroll(): void {
    cancelAnimationFrame(stickyRAF);
    stickyRAF = requestAnimationFrame(updateStickyState);
  }

  function refresh(): void {
    headerWrapEl = getHeaderWrapEl();
    updateStickyState();
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

  return { isSticky, refresh };
}