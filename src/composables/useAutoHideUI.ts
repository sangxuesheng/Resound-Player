import { ref, onBeforeUnmount } from 'vue'

export function useAutoHideUI(options?: {
  idleTimeout?: number
  throttleDelay?: number
}) {
  const {
    idleTimeout = 3000,
    throttleDelay = 300,
  } = options || {}

  const uiRevealed = ref(false)
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
    const now = Date.now()
    if (now - lastMoveTime < throttleDelay && uiRevealed.value) return
    lastMoveTime = now
    show()
  }

  /** 绑定到根元素的 @mouseleave */
  function onLeave() {
    hide()
  }

  /** 绑定到控制区元素的 @mouseenter */
  function freeze() {
    inControlArea.value = true
    clearTimer()
    uiRevealed.value = true
  }

  /** 绑定到控制区元素的 @mouseleave */
  function unfreeze() {
    inControlArea.value = false
    if (uiRevealed.value) {
      startIdleTimer()
    }
  }

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