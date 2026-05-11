import { ref, computed } from 'vue';

export interface HistoryEntry {
  page: string;
  params?: Record<string, any>;
  timestamp: number;
}

const backStack = ref<HistoryEntry[]>([]);
const forwardStack = ref<HistoryEntry[]>([]);
const current = ref<HistoryEntry | null>(null);

export function useNavigationHistory() {
  const canGoBack = computed(() => backStack.value.length > 0);
  const canGoForward = computed(() => forwardStack.value.length > 0);

  function push(entry: Omit<HistoryEntry, 'timestamp'>): void {
    if (current.value) {
      backStack.value.push(current.value);
    }
    current.value = { ...entry, timestamp: Date.now() };
    forwardStack.value = [];
  }

  function back(): HistoryEntry | null {
    if (!backStack.value.length) return null;
    if (current.value) {
      forwardStack.value.push(current.value);
    }
    current.value = backStack.value.pop()!;
    return current.value;
  }

  function forward(): HistoryEntry | null {
    if (!forwardStack.value.length) return null;
    if (current.value) {
      backStack.value.push(current.value);
    }
    current.value = forwardStack.value.pop()!;
    return current.value;
  }

  function replace(entry: Omit<HistoryEntry, 'timestamp'>): void {
    current.value = { ...entry, timestamp: Date.now() };
  }

  function reset(entry: Omit<HistoryEntry, 'timestamp'>): void {
    backStack.value = [];
    forwardStack.value = [];
    current.value = { ...entry, timestamp: Date.now() };
  }

  return {
    canGoBack,
    canGoForward,
    push,
    back,
    forward,
    replace,
    reset,
  };
}