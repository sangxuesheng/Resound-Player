import { ref, watch, type WatchSource } from 'vue'

/**
 * 预加载背景图片，防止 JPEG 逐行渲染导致的半图卡顿。
 *
 * 配合全局 CSS 类 `.fade-in-bg` + `.bg-loaded` 使用：
 *
 * ```html
 * <span class="fade-in-bg" :class="{ 'bg-loaded': loaded }"
 *       :style="{ backgroundImage: `url(${url})` }"></span>
 * ```
 *
 * @param src - 函数返回图片 URL（响应式）；URL 变化时会重新预加载
 * @returns ref<boolean> — true 表示图片已完整加载，可显示
 */
export function useBgLoaded(src: WatchSource<string>) {
  const loaded = ref(false)

  watch(
    src,
    (url) => {
      if (!url) {
        loaded.value = false
        return
      }
      loaded.value = false
      const img = new Image()
      img.onload = () => { loaded.value = true }
      img.onerror = () => { loaded.value = true }
      img.src = url
    },
    { immediate: true },
  )

  return loaded
}