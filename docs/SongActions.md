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

组件本身不处理定位和悬停显隐，由父容器自行控制：

- **定位**：父容器通过 `position: absolute; right: 8px; top: 50%; transform: translateY(-50%)` 固定在列表行右侧
- **显隐**：父容器通过 `opacity` + `visibility` + `transition` 控制悬停渐入渐出

示例（PlaylistDetailPage.vue）：

```css
.song-item { position: relative; }
.song-actions {
  opacity: 0;
  visibility: hidden;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  align-items: center;
  gap: 4px;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}
.song-item:hover .song-actions {
  opacity: 1;
  visibility: visible;
}
```

## 视觉规范

- 所有按钮统一 `34px × 34px`，`border-radius: 10px`
- 默认态：`var(--bg-surface)` 背景，`var(--text-soft)` 图标色
- Hover：背景变 `var(--bg-muted)`，图标变 `var(--text-main)`，上浮 `1px`
- 收藏态：图标色 `#ff6b8a`
- `BookmarkIconButton` 原有的 glow / pulse / sparkles 装饰在此上下文中被禁用