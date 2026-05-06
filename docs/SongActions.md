# SongActions 组件

## 概述

歌单/专辑/歌手等歌曲列表行内的操作按钮组。收藏 + 下一首播放 + 收藏至歌单 + 查看评论，四个按钮统一 34×34 方型玻璃风格。收藏按钮复用 `BookmarkIconButton`，样式通过 `:deep()` 覆盖为与其余按钮一致。

## 文件位置

`src/components/ui/SongActions.vue`

## Props

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| `song` | `any` | 是 | 歌曲对象，至少包含 `id` |

## Emits

| 事件 | 参数 | 说明 |
|------|------|------|
| `play-next` | `song: any` | 下一首播放 |
| `add-to-playlist` | `song: any` | 弹出收藏至歌单选择器 |
| `open-comment` | `songId: number` | 打开歌曲评论页 |

## 使用示例

```vue
<template>
  <!-- 列表行内 -->
  <li v-for="song in tracks" :key="song.id" class="song-item">
    <div class="song-meta">
      <span>{{ song.name }}</span>
    </div>
    <SongActions
      :song="song"
      @play-next="handlePlayNext"
      @add-to-playlist="handleAddToPlaylist"
      @open-comment="handleOpenComment"
    />
  </li>
</template>

<script setup lang="ts">
import SongActions from './ui/SongActions.vue';

function handlePlayNext(song: any) {
  playerStore.playlist.splice(playerStore.currentIndex + 1, 0, { ...song });
}

function handleAddToPlaylist(song: any) {
  // 打开歌单选择弹窗
}

function handleOpenComment(songId: number) {
  // 跳转评论页
}
</script>
```

## 依赖

- `BookmarkIconButton` — 收藏按钮（标准收藏入口组件）

## 定位与显隐

组件内置全局样式块，自行处理定位和悬停显隐，父容器只需确保 `.song-item` 设置了 `position: relative`（已在 `detail-page.css` 中统一提供）：

- **默认隐藏**：`opacity: 0; visibility: hidden`
- **悬停显示**：`.song-item:hover .song-actions` → `opacity: 1; visibility: visible`
- **定位**：`position: absolute; right: 8px; top: 50%; transform: translateY(-50%)`
- **过渡**：`opacity 0.2s ease, visibility 0.2s ease`

父容器不再需要各自重复编写 hover 显隐 CSS。组件内部通过非 scoped `<style>` 块以全局选择器 `.song-item:hover .song-actions` 实现，确保在任何引入该组件的详情页中自动生效。

## 视觉规范

- 所有按钮统一 `34px × 34px`，`border-radius: 10px`
- 默认态：`var(--bg-surface)` 背景，`var(--text-soft)` 图标色
- Hover：背景变 `var(--bg-muted)`，图标变 `var(--text-main)`，上浮 `1px`
- 收藏态：图标色 `#ff6b8a`
- `BookmarkIconButton` 原有的 glow / pulse / sparkles 装饰在此上下文中被禁用