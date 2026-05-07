# Web Audio 管线与均衡器说明

本文档说明项目内 Web Audio 音频管线架构和 10 段均衡器的实现位置、数据结构与使用方式。

---

## 1. Web Audio 管线

### 1.1 架构总览

```
[EQ 关闭时]
audio 元素 → audio 原生输出（完全不走 Web Audio，音量由 audio.volume 控制）

[EQ 启用时]
audio 元素 → MediaElementAudioSourceNode → BiquadFilterNode × 10 → GainNode → AudioContext.destination
                                                                          ↑
                                                                    音量由 GainNode 控制
                                                                    audio.volume 锁定为 1
```

### 1.2 惰性初始化

Web Audio 管线仅在实际**启用 EQ** 时才创建，默认完全休眠，不占用任何资源。

创建时机：`enableEq(true)` → `_ensureWebAudio()`
- AudioContext 在用户手势中创建（FancySwitch 点击），初始状态为 `running`
- `createMediaElementSource(audio)` 将 audio 元素的输出接入 Web Audio 图
- 此时原生 `audio.volume` 路由失效，音量由 GainNode 接管

### 1.3 关键文件

| 文件 | 职责 |
|------|------|
| `src/stores/player.ts` | 核心播放器 store，包含 Web Audio 管线的全部实现 |
| `src/stores/eqSettings.ts` | EQ 设置持久化 store |
| `vite.config.ts` | 开发期 `/dl-proxy` 下载代理，负责非官方音源的 CORS 与 Range 转发 |

### 1.4 player.ts 中 Web Audio 相关字段

```ts
_audioCtx: AudioContext | null              // AudioContext 单例
_sourceNode: MediaElementAudioSourceNode | null  // 音频源节点
_gainNode: GainNode | null                  // 音量控制节点
_eqFilters: BiquadFilterNode[]              // 10 段 EQ 滤波器
_eqEnabled: boolean                         // EQ 启用状态
```

### 1.5 关键方法

| 方法 | 说明 |
|------|------|
| `_ensureWebAudio()` | 惰性创建 AudioContext + MediaElementSourceNode + GainNode。首次调用在用户手势中，`running` 态。失败后标记 `_sourceNode = undefined` 避免重试 |
| `_syncVolumeToGain()` | 将 `this.volume` + `this.muted` 同步到 GainNode |
| `setVolume(v)` | 有 GainNode 时写入 `gainNode.gain.value`，否则写入 `audio.volume` |
| `toggleMute()` | 同上，通过 GainNode 或 audio.volume 控制静音 |

---

## 2. CORS 处理

网易云音乐音频 URL 来自跨域 CDN（`m*.music.126.net`），`createMediaElementSource()` 需要访问 PCM 裸音频数据，必须设置 `crossOrigin` 属性。

### 2.1 init() 中全局设置

```ts
init() {
    this.audio.crossOrigin = 'anonymous';
    // ...
}
```

### 2.2 enableEq() 中重载

启用 EQ 时，对于已加载的音频重新设置跨域并重载：

```ts
// 在 enableEq(true) 中
this.audio.crossOrigin = 'anonymous';
this.audio.src = savedSrc;   // 重新加载音频，带上 CORS 请求头
this.audio.load();
```

### 2.3 音源替换 URL 的 `/dl-proxy` Range 支持

音源替换命中的非官方 URL 可能缺少可直接用于 Web Audio / `<audio>` 的 CORS 响应头。播放器在 `src/stores/player.ts` 中会把非官方音源包成开发期本地代理地址：

```ts
if (this.currentSource !== 'official' && !playUrl.startsWith(location.origin + '/')) {
  playUrl = '/dl-proxy?url=' + encodeURIComponent(playUrl);
}
```

`/dl-proxy` 的实现位于 `vite.config.ts`。该代理必须保留音频 seek 所需的 HTTP Range 语义：

- 请求侧透传浏览器发出的 `Range` 头
- 响应侧透传上游的 `Content-Range`、`Accept-Ranges`、`Content-Length`
- 支持 `GET` / `HEAD` / `OPTIONS`
- 暴露 `Content-Length, Content-Range, Accept-Ranges` 给浏览器读取

如果代理只普通 `GET` 全量转发，而不支持 Range/206，浏览器拖动进度条后无法向上游请求目标时间点对应的音频片段，表现会变成“拖动进度条后从头播放”。因此后续修改 `/dl-proxy` 时，不能删除 Range 请求头转发和分段响应头透传。

---

## 3. 10 段均衡器（EQ）

### 3.1 频段定义

10 段标准 ISO 频率，类型为 `peaking`，Q = 1.41：

| 索引 | 频率 | 标签 | 用途 |
|:----:|:----:|:----:|------|
| 0 | 31 Hz | 31 | 超低音 |
| 1 | 62 Hz | 62 | 低音 |
| 2 | 125 Hz | 125 | 中低音 |
| 3 | 250 Hz | 250 | 中音 |
| 4 | 500 Hz | 500 | 中高音 |
| 5 | 1 kHz | 1k | 临场 |
| 6 | 2 kHz | 2k | 亮度 |
| 7 | 4 kHz | 4k | 空气感 |
| 8 | 8 kHz | 8k | 高频 |
| 9 | 16 kHz | 16k | 超高 |

- 增益范围：-12 dB ~ +12 dB，步进 0.5 dB

### 3.2 设置 Store：`src/stores/eqSettings.ts`

遵循与 `lyricsSettings.ts` 相同的 reactive singleton 模式。

**类型定义：**

```ts
type EqSettings = {
  enabled: boolean;       // 全局 EQ 开关
  gains: number[];        // 10 段增益值
  currentPreset: string;  // 当前预设名称，滑块调节后自动变为 '自定义'
};
```

**持久化：** localStorage key `gm_eq_settings_v1`

**内置预设（8 个）：**

| 预设 | 特点 |
|------|------|
| 原声 | 全平直（0 dB），适合还原录音 |
| 流行 | 中高频+，轻微低音增强 |
| 摇滚 | 低音+高频大幅增强 |
| 古典 | 保留中频，两端微升 |
| 爵士 | 暖音色，中低频突出 |
| 舞曲 | 强低音，节奏清晰 |
| 人声 | 突出中频人声，削减低频 |
| 自定义 | 用户手动调节时自动选中 |

### 3.3 滤波器链实现：player.ts `_rebuildEqChain()`

```ts
// EQ 关闭：直连
sourceNode → gainNode → destination

// EQ 启用：串联 10 段 peaking 滤波器
sourceNode → filter[0] → filter[1] → ... → filter[9] → gainNode → destination
```

创建滤波器时**直接使用当前增益值**（从 eqSettings.gains 读快照），不依赖后续异步调用。

### 3.4 UI 组件：`src/components/EqPanel.vue`

**结构：**

```
eq-panel (Teleport to body, 固定定位)
├── eq-head: 标题 + FancySwitch 开关
├── preset-rail (ui-safe-rail): 预设横向滚动选择
│   └── preset-chip × 8
├── eq-bands: 10 段竖排滑块
│   └── eq-band-col × 10
│       ├── eq-slider (input[type=range], writing-mode: vertical-lr)
│       ├── eq-db-value (如 +3.0 dB)
│       └── eq-freq-label (如 1k Hz)
└── eq-footer: 重置按钮
```

**样式规范：**
- 面板背景：`var(--bg-solid)`（不透明）
- 预设 chip：`button-surface` 体系
- 滑块轨道/把手：主题色 `var(--accent)`，与全局 `input[type=range]` 风格一致
- 禁用态：滑块 `opacity: 0.3`，重置按钮 `opacity: 0.4`

### 3.5 入口集成

| 位置 | 组件 | 触发方式 |
|------|------|---------|
| 展开播放器右侧工具栏 | `PlayerExpanded.vue` 的 `.right-actions` | 点击均衡器图标按钮 |
| 底部播放栏右侧区 | `PlayerBar.vue` 的 `.right` | 点击均衡器图标按钮 |

两个入口各自持有一个独立的 `showEqPanel` ref 和独立的 `EqPanel` 实例。

---

## 4. 音量控制逻辑

```ts
setVolume(v) {
    if (this._gainNode) {
        this._gainNode.gain.value = val;  // 有 Web Audio 管线时走 GainNode
        this.audio.volume = 1;
    } else {
        this.audio.volume = val;          // 无 Web Audio 时走原生
    }
}
```

- **EQ 关闭时**：GainNode 不存在，音量走原生 `audio.volume`
- **EQ 启用时**：GainNode 存在，音量走 `gainNode.gain.value`，`audio.volume` 锁定为 1

---

## 5. 预设数据参考

```ts
const BUILTIN_PRESETS = [
  { name: '原声',   gains: [0,  0,  0,  0,  0,  0,  0,  0,  0,  0] },
  { name: '流行',   gains: [3,  4,  2,  1,  0,  1,  2,  3,  4,  3] },
  { name: '摇滚',   gains: [5,  4,  3,  2,  1,  0,  1,  3,  4,  5] },
  { name: '古典',   gains: [4,  3,  1,  0,  0,  0,  0,  1,  3,  4] },
  { name: '爵士',   gains: [3,  4,  3,  2,  1,  2,  3,  2,  1,  0] },
  { name: '舞曲',   gains: [6,  5,  3,  1,  0,  1,  2,  3,  4,  5] },
  { name: '人声',   gains: [0,  1,  2,  4,  5,  5,  4,  2,  1,  0] },
  { name: '自定义', gains: [0,  0,  0,  0,  0,  0,  0,  0,  0,  0] },
];
```

---

## 6. 开发注意事项

### 6.1 `createMediaElementSource` 单次限制

一个 `HTMLAudioElement` 只能创建一次 `MediaElementAudioSourceNode`，重复创建会抛 `InvalidStateError`。`_ensureWebAudio()` 通过 `if (this._audioCtx) return` 保证只创建一次。

### 6.2 暂停→重建→恢复

启用 EQ 时如果音频正在播放，需要先暂停、设置 CORS、重载 src、创建 Web Audio 管线，再恢复播放。详见 `enableEq()` 实现。

### 6.3 优雅降级

如果 `AudioContext` 创建失败或 `createMediaElementSource` 抛出异常：
- `_gainNode` 保持 `null`
- `setVolume()` / `toggleMute()` 自动回退到原生 `audio.volume`
- 音频播放不受影响，仅 EQ 不可用