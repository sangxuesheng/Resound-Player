# 全屏播放页 UI 自动显隐方案

## 需求概述

全屏播放页（`PlayerExpanded.vue`）中，以下 UI 元素默认隐藏，仅在鼠标移动到对应区域时显示，移开后自动隐藏：

| 元素 | CSS 类名 | 位置区域 |
|---|---|---|
| 顶部栏（返回按钮 + 全屏按钮） | `.panel-head` | 屏幕顶部 |
| 右侧操作列（设置、偏移、歌词等） | `.right-actions` | 屏幕右侧垂直居中 |
| 底部控制台（播放控制、进度条等） | `.bottom-console` | 屏幕底部 |

## 当前状态

- `.panel-head`：始终显示，无显隐逻辑
- `.right-actions`：通过内联 `:style` 控制 `opacity` 和 `pointer-events`（仅在 `showComments` 时隐藏），**无 CSS transition**
- `.bottom-console`：通过 `v-if="lyricsSettings.showMiniBar"` 控制，**无 hover 显隐逻辑**
- 全页面无鼠标空闲检测

## 方案设计

### 1. 核心思路

用一个响应式状态 `uiRevealed` 控制三组元素的显隐，结合鼠标空闲超时和区域 hover 检测：

```
鼠标无动作超过 N 秒  ──→  uiRevealed = false（全部隐藏）
鼠标移动到某个区域  ──→  uiRevealed = true（全部显示）
鼠标离开所有区域    ──→  启动空闲计时器
                        计时器到期 → uiRevealed = false
                        计时器内鼠标再动 → 重置计时器
```

### 2. 状态定义

```ts
// 是否显示 UI（鼠标激活状态）
const uiRevealed = ref(false)

// 鼠标是否在 UI 区域内（用于防止计时器过早触发）
const isHoveringUI = ref(false)

// 空闲计时器引用
let idleTimer: ReturnType<typeof setTimeout> | null = null
```

### 3. 三部曲实现

#### 第一步：CSS 基础（显隐 + 过渡）

三个元素统一添加以下 CSS 类：

```css
/* 400ms ease-in-out 淡入淡出 */
.panel-head,
.right-actions,
.bottom-console {
  transition: opacity 0.4s ease-in-out;
}

/* 隐藏态：仅透明 + 不可点击，保留布局 */
.ui-hidden {
  opacity: 0 !important;
  pointer-events: none !important;
}
```

#### 第二步：Composable 封装

创建 `src/composables/useAutoHideUI.ts`，集中管理显隐逻辑：

```ts
import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useAutoHideUI(options?: {
  idleTimeout?: number     // 空闲超时（ms），默认 3000
  hoverBuffer?: number     // 区域边缘缓冲（px），默认 40
}) {
  const {
    idleTimeout = 3000,
    hoverBuffer = 40,
  } = options || {}

  const uiRevealed = ref(false)
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let isUIRevealed = false   // 内部同步变量，避免闭包陷阱

  function clearIdleTimer() {
    if (idleTimer !== null) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  function startIdleTimer() {
    clearIdleTimer()
    idleTimer = setTimeout(() => {
      uiRevealed.value = false
      isUIRevealed = false
    }, idleTimeout)
  }

  function onMouseMove(e: MouseEvent) {
    const w = window.innerWidth
    const h = window.innerHeight

    // 检查鼠标是否在三个触发区域内
    const inTopZone    = e.clientY <= 60 + hoverBuffer
    const inRightZone  = e.clientX >= w - 60 - hoverBuffer
    const inBottomZone = e.clientY >= h - 100 - hoverBuffer

    const inAnyZone = inTopZone || inRightZone || inBottomZone

    if (inAnyZone && !isUIRevealed) {
      // 进入区域 → 显示
      uiRevealed.value = true
      isUIRevealed = true
      clearIdleTimer()
    } else if (!inAnyZone && isUIRevealed) {
      // 离开所有区域 → 启动空闲计时
      startIdleTimer()
    } else if (inAnyZone && isUIRevealed) {
      // 保持显示，重置计时
      clearIdleTimer()
    }
  }

  onMounted(() => {
    window.addEventListener('mousemove', onMouseMove, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('mousemove', onMouseMove)
    clearIdleTimer()
  })

  return { uiRevealed }
}
```

#### 第三步：引入 PlayerExpanded.vue

```ts
// script 中引入
import { useAutoHideUI } from '../composables/useAutoHideUI'
const { uiRevealed } = useAutoHideUI({ idleTimeout: 3000 })
```

```html
<!-- 模板中给三个元素绑定 uiRevealed -->
<AnimatedAppear
  tag="header"
  variant="content"
  rhythm="head"
  class-name="panel-head"
  :class="{ 'ui-hidden': !uiRevealed }"
>
  ...
</AnimatedAppear>

<div
  class="right-actions"
  :class="{ 'ui-hidden': !uiRevealed }"
>
  ...
</div>

<AnimatedAppear
  tag="div"
  variant="content"
  rhythm="overlay"
  class-name="bottom-console"
  :class="{ 'ui-hidden': !uiRevealed }"
>
  ...
</AnimatedAppear>
```

注意：
- `bottom-console` 已有 `v-if="lyricsSettings.showMiniBar"`，保留该条件，`ui-hidden` 在其显示的基础上控制隐现
- 删除 `right-actions` 原有的内联 `:style` 显隐逻辑（`showComments` 相关），改为统一由 `uiRevealed` 控制

### 4. 关键细节

| 问题 | 决策 |
|---|---|
| 延迟多久隐藏 | 默认 **3 秒**，可通过 `useAutoHideUI({ idleTimeout: 5000 })` 调整 |
| 首次进入页面 | 默认隐藏，鼠标移动后显示（前提是鼠标在触发区域内） |
| 与 `showComments` 的交互 | `right-actions` 的旧逻辑在评论区打开时隐藏。建议保留：`v-show="!showComments"` 控制存在，`ui-hidden` 控制自动显隐，两个互不冲突 |
| 区域重叠 | 顶部 zone（~100px）、右侧 zone（~100px）、底部 zone（~140px），覆盖 UI 元素实际位置 |
| `bottom-console` 的 `v-if` | 保留 `v-if="lyricsSettings.showMiniBar"`，`ui-hidden` 只控制显隐过渡，不影响生命周期 |
| 页面有其他浮层（设置面板、EQ面板等）打开时 | 覆盖现有逻辑：浮层打开时保持 `uiRevealed = true`，可通过 `watch` 或 `onMounted` hook 暴露 |
| `@click.self="playerStore.closeExpanded()"` | 保留在 `.expanded-wrap` 上。当 UI 隐藏时用户点击空白区域应能关闭全屏页，不受影响 |

### 5. 为什么要用 composable 而不是在组件内直接写

- **复用性**：以后其他全屏页面（如视频播放）可直接复用
- **可测性**：逻辑与模板解耦
- **可配置性**：超时时间、触发区域大小可调节
- **清理安全**：`onBeforeUnmount` 自动清理事件监听和计时器

### 6. 实施步骤

1. 创建 `src/composables/useAutoHideUI.ts`
2. 在 `PlayerExpanded.vue` 的 `<style>` 中新增 `.ui-hidden` 规则和 transition
3. 在 `PlayerExpanded.vue` 的 `<script>` 中引入 composable
4. 在模板中给 `.panel-head`、`.right-actions`、`.bottom-console` 绑定 `ui-hidden` class
5. 删除 `right-actions` 现有的内联 `:style` 显隐逻辑
6. 验证：鼠标移入顶部/右侧/底部区域 → 显示；移开 3s → 隐藏