# Resound-Player 开发规范

## 全局封面交互

所有封面统一使用 `--image-hover-scale`（`src/styles/animations.css:8`）：
- 默认值 `1.05`，通过 `var(--image-hover-scale)` 读取
- 过渡 `transition: transform var(--image-hover-duration) var(--image-hover-ease)`
- **禁止在组件内单独定义封面 hover 缩放值**
- **禁止使用 `[class*='cover']` 通配符选择器**

### 封面元素需要满足的核心规则

1. **所有封面元素（`.cover / .song-cover / .rank-cover` 等）** 必须在 `animations.css` 中声明 `animation-fill-mode: backwards`，防止 AnimatedAppear 的入场动画锁定 transform
2. **不添加 `overflow: hidden` 的元素 hover 缩放会溢出父容器**
3. **大封面（详情页 hero）** 使用 `--scroll-transform` CSS 变量驱动滚动动画，hover 时叠加 `scale(var(--image-hover-scale))`
4. **歌单列表封面** 需要行级 hover：`.song-item:hover img.song-cover`；首页：`.song:hover .cover`

### 新增封面 CSS 检查清单

- [ ] 在 `animations.css` 的 `animation-fill-mode: backwards` 列表中加入新类名
- [ ] 在 `animations.css` 的桌面 hover 和触屏 active 列表中加入新选择器
- [ ] 确保父元素有 `overflow: hidden`
- [ ] 不在组件 scoped CSS 中覆盖 `transform` 或 `transform-origin`

## 音源替换

- 匹配服务 `server/unblock-match-server.mjs` 使用 Promise.any 竞速所有源
- 前端 `src/stores/player.ts` `playTrack` 中 fee 判定 + 匹配并行执行
- 缓存 `src/stores/unblock-cache.ts`：Map + localStorage，最多 200 条，10 分钟 TTL
- 音源注册 `src/config/musicSources.ts`：定义元数据，组件通过 `getSourceMeta()` 获取

## 代码风格

- Vue 3 `<script setup lang="ts">` 单文件组件
- CSS 全局样式在 `src/styles/` 下
- 组件 scoped 样式仅在组件内部使用
- 避免 JS inline style 写 `transform`，改用 CSS 变量

## 文件修改联动

修改 `src/styles/` 全局 CSS 时，注意会影响所有组件。
修改 `src/stores/` 时，注意可能影响所有消费者。
