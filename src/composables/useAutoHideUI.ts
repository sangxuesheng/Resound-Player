import { ref, onBeforeUnmount, watch } from 'vue'

export function useAutoHideUI(
  enabledSource: () => boolean,
  options?: {
    idleTimeout?: number
    throttleDelay?: number
  },
) {
  const {
    idleTimeout = 3000,
    throttleDelay = 300,
  } = options || {}

  // 开关关闭时直接初始化为 true，避免初始渲染帧为隐藏态
  const uiRevealed = ref(!enabledSource())
  const inControlArea = ref(false)

  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let lastMoveTime = 0

  function clearTimer() {
    if (idleTimer !== null) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  function startIdleTimer() {
    clearTimer()
    idleTimer = setTimeout(hide, idleTimeout)
  }

  function show() {
    uiRevealed.value = true
    if (!inControlArea.value) {
      startIdleTimer()
    }
  }

  function hide() {
    uiRevealed.value = false
    clearTimer()
  }

  /** 绑定到根元素的 @mousemove + @click */
  function onActivity() {
    if (!enabledSource()) return
    const now = Date.now()
    if (now - lastMoveTime < throttleDelay && uiRevealed.value) return
    lastMoveTime = now
    show()
  }

  /** 绑定到根元素的 @mouseleave */
  function onLeave() {
    if (!enabledSource()) return
    hide()
  }

  /** 绑定到控制区元素的 @mouseenter */
  function freeze() {
    if (!enabledSource()) return
    inControlArea.value = true
    clearTimer()
    uiRevealed.value = true
  }

  /** 绑定到控制区元素的 @mouseleave */
  function unfreeze() {
    if (!enabledSource()) return
    inControlArea.value = false
    if (uiRevealed.value) {
      startIdleTimer()
    }
  }

  // 开关关闭时始终显示 UI；开关变化时实时生效
  watch(
    () => enabledSource(),
    (enabled) => {
      if (!enabled) {
        uiRevealed.value = true
        clearTimer()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    clearTimer()
  })

  return {
    uiRevealed,
    onActivity,
    onLeave,
    freeze,
    unfreeze,
  }
}