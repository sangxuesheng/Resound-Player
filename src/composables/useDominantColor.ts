/**
 * useDominantColor
 * 
 * 从封面图片 URL 中提取主色，并设置为 CSS 变量 --hero-bg-rgb，
 * 供 main.content::before 渐变使用。
 * 
 * 用法：
 *   import { useDominantColor } from '../composables/useDominantColor'
 *   useDominantColor(coverImageUrlRef)
 */

import { ref, watch, type Ref } from 'vue';

/**
 * 从图片 URL 提取平均主色（RGB 三元组）
 * 使用 Canvas 将图片缩放到 1x1 像素取色
 */
function extractDominantColor(imgUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!imgUrl) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgUrl;

    // 如果图片已缓存，直接尝试
    let resolved = false;

    function tryExtract() {
      if (!img.width || !img.height) return false;

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        
        // 如果颜色太暗（接近黑色），稍微提亮来保持渐变可见
        const brightness = r * 0.299 + g * 0.587 + b * 0.114;
        if (brightness < 30) {
          // 使用提亮版本
          const scale = 30 / Math.max(brightness, 1);
          resolve(`${Math.min(255, Math.round(r * scale))}, ${Math.min(255, Math.round(g * scale))}, ${Math.min(255, Math.round(b * scale))}`);
        } else {
          resolve(`${r}, ${g}, ${b}`);
        }

        return true;
      } catch {
        return false;
      }
    }

    if (tryExtract()) {
      resolved = true;
      return;
    }

    // 等待图片加载完成
    img.onload = () => {
      if (!resolved) {
        resolved = true;
        tryExtract() || resolve(null);
      }
    };

    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    };

    // 超时保护
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        img.onload = null;
        img.onerror = null;
        resolve(null);
      }
    }, 5000);
  });
}

export function useDominantColor(
  coverUrlRef: Ref<string>,
  options?: {
    /** 提取到颜色后是否高亮它（增加饱和度/亮度） */
    brighten?: boolean;
    /** 自定义 CSS 变量名（默认 --hero-bg-rgb） */
    cssVar?: string;
  },
) {
  const isExtracting = ref(false);
  const cssVar = options?.cssVar || '--hero-bg-rgb';

  // 内置默认主色（深蓝灰），在颜色提取失败或图片不可用时使用
  const DEFAULT_COLOR = '17, 24, 39';

  async function updateColor(url: string) {
    // 始终设置封面背景 URL（用于模糊渐变效果）
    if (url) {
      document.documentElement.style.setProperty('--cover-bg-url', `url("${url}")`);
    } else {
      document.documentElement.style.removeProperty('--cover-bg-url');
    }

    if (!url) {
      document.documentElement.style.setProperty(cssVar, DEFAULT_COLOR);
      return;
    }

    isExtracting.value = true;
    try {
      const color = await extractDominantColor(url);
      if (color) {
        document.documentElement.style.setProperty(cssVar, color);
      } else {
        document.documentElement.style.setProperty(cssVar, DEFAULT_COLOR);
      }
    } catch {
      document.documentElement.style.setProperty(cssVar, DEFAULT_COLOR);
    } finally {
      isExtracting.value = false;
    }
  }

  // 监听封面 URL 变化
  watch(
    () => coverUrlRef.value,
    (newUrl) => {
      updateColor(newUrl);
    },
    { immediate: true },
  );

  return {
    isExtracting,
    /** 手动触发更新 */
    refresh: () => updateColor(coverUrlRef.value),
  };
}

export default useDominantColor;
