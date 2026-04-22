# Resound Player

一个基于 `Vue 3 + Vite + Electron` 构建的桌面音乐播放器项目，聚焦于统一歌单详情体验、桌面端沉浸式播放交互，以及面向后续迭代的稳定工程结构。

## 项目状态

- 当前状态：稳定可用
- 仓库状态：已完成首个稳定版本归档，可作为后续功能迭代与发布主仓库持续维护
- 运行形态：支持桌面端开发运行，内嵌 API 启动链路已接通
- 适用场景：本地开发、界面迭代、播放链路联调、桌面端工程扩展

## 项目简介

Resound Player 当前以桌面端音乐播放器为核心形态，整合了首页推荐、搜索、歌单、专辑、歌手、排行榜、MV、播客、用户中心、历史记录与设置等页面能力，并通过统一详情页与统一播放工具收敛多来源数据体验。

项目当前重点不只是“能播放音乐”，而是建立一套可持续维护的桌面音乐应用基础架构，包括：

- 统一歌单详情页模型
- 统一播放 URL 解析与播放触发逻辑
- 统一页面入场动画规范
- Electron 内嵌 API 启动方式
- 面向后续发布的稳定项目结构

## 功能特性

### 已具备的主要功能

- 首页推荐与内容入口聚合
- 搜索页与多类型结果跳转
- 歌单列表与歌单详情浏览
- 每日推荐与统一歌单化展示
- 专辑详情、歌手详情、用户详情
- 排行榜与榜单详情浏览
- MV 列表与播放弹层
- 播客列表与播客详情
- 用户中心、历史记录、设置页
- 底部播放器与展开态播放器
- 统一播放链路与按需解析歌曲 URL
- 统一入场动画接入规范

### 当前工程特性

- 基于 `Electron` 提供桌面应用壳
- 基于 `Vite` 提供前端开发与构建能力
- 启动桌面端时可自动拉起内嵌 API
- 页面结构已按模块拆分，便于后续维护
- 关键设计与规范文档已统一沉淀到 `docs/` 目录

## 技术栈

### 前端

- `Vue 3`
- `TypeScript`
- `Vite`
- `lucide-vue-next`
- `Axios`

### 桌面端

- `Electron`

### 音乐 API

- `@neteasecloudmusicapienhanced/api`

### 工程辅助

- `concurrently`
- `wait-on`

## 启动方式

### 1. 安装依赖

```bash
npm install
```

### 2. 桌面端开发模式

启动渲染进程并拉起 Electron：

```bash
npm run dev
```

等价于：

```bash
npm run dev:desktop
```

### 3. 仅启动前端页面

```bash
npm run dev:web
```

### 4. 启动前端并连接独立 API 调试

```bash
npm run dev:web:full
```

该模式会并行启动：

- 本地 API 服务
- Vite 前端开发服务

### 5. 启动内嵌 Electron 应用

如果前端资源已准备好，也可直接运行：

```bash
npm start
```

### 6. 构建前端资源

```bash
npm run build:web
```

或：

```bash
npm run build:renderer
```

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动桌面端开发环境 |
| `npm run dev:desktop` | 启动 Vite + Electron |
| `npm run dev:web` | 仅启动前端页面 |
| `npm run dev:web:full` | 启动前端与独立 API 调试环境 |
| `npm run dev:api` | 单独启动 API 服务 |
| `npm run build:web` | 构建前端资源 |
| `npm run check:animated-rhythm` | 检查动画节奏规范 |
| `npm run fix:animated-rhythm` | 自动补齐缺失的动画节奏配置 |
| `npm start` | 直接启动 Electron 应用 |

## 目录结构

```text
.
├── docs/               # 项目文档与规范
├── electron/           # Electron 主进程、预加载与内嵌 API 启动逻辑
├── scripts/            # 工程辅助脚本
├── src/
│   ├── api/            # 接口访问层
│   ├── components/     # 页面组件与通用组件
│   ├── stores/         # 全局状态
│   ├── styles/         # 主题与动画样式
│   └── utils/          # 播放、图片与数据适配工具
├── index.html          # 前端入口 HTML
├── package.json        # 项目脚本与依赖配置
└── vite.config.ts      # Vite 配置
```

## 核心架构要点

### 统一详情页模型

项目已将不同来源的内容统一收敛为一致的歌单详情体验，核心思路是：

- 统一数据模型
- 统一详情页组件
- 统一播放行为
- 保留数据源差异，收敛展示层体验

当前统一能力主要覆盖：

- 普通歌单
- 每日推荐
- 云盘/伪歌单化内容

### 统一播放链路

播放逻辑已抽离为通用工具，重点优化方向是：

- 首屏避免批量请求所有歌曲播放地址
- 用户真正触发播放时再按需解析 URL
- 首页、详情页、云盘等入口复用同一播放逻辑

### Electron 内嵌 API 模式

桌面端启动时会自动：

1. 选择可用端口
2. 启动内嵌 API 进程
3. 等待 API 可用
4. 创建 Electron 主窗口

这使项目在桌面端开发和运行时具备更稳定的一体化体验。

## 文档说明

详细设计、规范与架构文档统一维护在 `docs/` 目录。

推荐阅读：

- [文档入口](./docs/README.md)
- [统一架构说明](./docs/统一架构说明.md)
- [统一入场动画规范](./docs/统一入场动画规范.md)
- [组件说明](./docs/组件说明.md)
- [接口说明](./docs/接口说明.md)
- [播放链路说明](./docs/播放链路说明.md)

## 首次提交说明

建议作为首次提交说明使用：

- 中文：`初始化 Resound Player 主工程，导入稳定可运行版本并补齐基础项目结构`
- 英文：`Initialize Resound Player with the stable runnable app, core Electron/Vite setup, and baseline project structure`

## 首次发布说明

建议本仓库首个稳定版本使用如下发布标题：

- `Resound Player - Stable Initial Release`

更完整的发布文案已整理到：

- [初始发布说明](./docs/初始发布说明.md)
