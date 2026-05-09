# Electron 窗口控制按钮实现说明

## 背景

在 Electron 桌面端（Vue 3 + Vite 栈）中添加自定义窗口控制按钮（最小化、最大化/还原、关闭）。

## 最终方案：document.title + page-title-updated 事件

绕过 `contextBridge` / `ipcRenderer`，利用 `document.title` 变化触发 `page-title-updated` 事件，在主进程中拦截并执行窗口操作。

### 核心原理

```
渲染进程按钮点击 → document.title = 'cmd:xxx'  →  Electron 主进程 page-title-updated 事件 → win.minimize/maximize/close
```

这种方案不依赖任何 IPC 机制，在 `contextIsolation: true` 模式下依然可靠。

### 涉及的代码文件

### 1. `electron/main.js` — 主进程事件监听

在 `createMainWindow` 函数中添加 `page-title-updated` 监听：

```javascript
// 窗口控制：通过 page-title-updated 事件监听（绕过 IPC / contextBridge 限制）
let _originalTitle = '';
win.webContents.on('page-title-updated', (event, title) => {
  if (title === 'cmd:minimize' || title === 'cmd:maximize') {
    event.preventDefault();
    if (title === 'cmd:minimize') win.minimize();
    else if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    setTimeout(() => { if (!win.isDestroyed()) win.setTitle(_originalTitle || 'GeminiMusic'); }, 50);
  } else {
    _originalTitle = title;
  }
});
```

关键点：
- `event.preventDefault()` 阻止标题实际变更
- `_originalTitle` 保存真实标题，操作后恢复
- `setTimeout` 延迟恢复标题，确保窗口操作完成

### 2. `src/components/TopBar.vue` — 渲染进程按钮

```html
<button class="win-btn" type="button" title="最小化" @click="minimizeWindow">···</button>
<button class="win-btn" type="button" title="最大化" @click="maximizeWindow">···</button>
<button class="win-btn win-btn--close" type="button" title="关闭" @click="closeWindow">···</button>
```

```javascript
function minimizeWindow() { document.title = 'cmd:minimize'; }
function maximizeWindow() { document.title = 'cmd:maximize'; }
function closeWindow() { window.close(); }  // 关闭使用原生 API
```

### 3. `electron/preload.js` — 无需任何窗口控制暴露

preload 只需要正常的 `appEnv` 暴露即可，不需要额外 IPC 函数。

---

## 尝试过但失败的方案

### ❌ 方案一：contextBridge 单独暴露 electronWindow 对象

```javascript
// preload.js
contextBridge.exposeInMainWorld('electronWindow', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
});
```

问题：`window.electronWindow` 在渲染进程中始终为 `undefined`，第二个 `exposeInMainWorld` 调用可能被静默吞掉。

### ❌ 方案二：合并到 appEnv 对象

```javascript
// preload.js
contextBridge.exposeInMainWorld('appEnv', {
  // ... 原有属性
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
});
```

问题：`appEnv` 的属性可读（如 `isDesktop`），但函数不可调用。`contextBridge` 代理函数在当前 Electron 版本中存在兼容性问题。

### ❌ 方案三：window.postMessage

```javascript
// preload.js
window.addEventListener('message', (event) => {
  if (event.data?.type === 'window-control') { ... }
});
// TopBar.vue
window.postMessage({ type: 'window-control', action: 'minimize' }, '*');
```

问题：`contextIsolation: true` 模式下，渲染进程主世界的 `postMessage` 不会送达 preload 隔离世界的 `message` 事件监听器。

### ❌ 方案四：原生 window.minimize()（不存在）

`window.close()` 是原生 Web API 可以直接使用，但没有 `window.minimize()` 或 `window.maximize()` 对应 API。

---

## 关键发现

1. **`contextBridge` 的函数代理不可靠** — Electron 34 中，通过 `contextBridge` 暴露的函数在某些环境下无法正常调用，但属性可读。
2. **`postMessage` 不通** — `contextIsolation: true` 时，两个世界的 `window` 是隔离的，`postMessage` 无法跨世界通信。
3. **`page-title-updated` 事件可靠** — `document.title` 是标准 Web API，`page-title-updated` 是 Electron 稳定的 WebContents 事件。
4. **`window.close()` 原生可用** — 关闭窗口不需要任何 IPC。

---

## 跨平台注意事项

| 平台 | 最小化 | 最大化 | 关闭 |
|------|--------|--------|------|
| Windows | `win.minimize()` | `win.maximize()` / `win.unmaximize()` | `win.close()` |
| macOS | `win.minimize()` | `win.maximize()` / `win.unmaximize()` | `win.hide()`（隐藏而非关闭） |
| Linux | `win.minimize()` | `win.maximize()` / `win.unmaximize()` | `win.close()` |

当前实现为跨平台统一行为，如需 macOS 特殊处理（隐藏而非关闭），需在 `page-title-updated` 处理器中增加 `process.platform === 'darwin'` 判断。