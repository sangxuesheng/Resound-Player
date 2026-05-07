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

    // 连续进度：scrollTop → 0~1，用于驱动背景/模糊渐变
    const progress = Math.max(0, Math.min(1, st / PROGRESS_DISTANCE));
    headerEl.style.setProperty('--sticky-progress', String(progress));

    // 已吸顶时只判断 scrollTop，不因内容高度波动反复切换
    if (isSticky.value) {
      isSticky.value = st >= initialOffset;
      return;
    }

    // 首次激活：内容高度必须足够
    const scrollRange = scrollHost.scrollHeight - scrollHost.clientHeight;
    const requiredRange = Math.max(initialOffset, PROGRESS_DISTANCE) + 40;
    isSticky.value = st >= initialOffset && scrollRange >= requiredRange;
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
      }
    });
  });

  onBeforeUnmount(() => {
    scrollHost?.removeEventListener('scroll', onScroll);
    cancelAnimationFrame(rafId);
  });

  return { isSticky, refresh };
}