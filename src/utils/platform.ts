/**
 * 平台检测与功能可用性模块
 *
 * 统一管理 web 端 / Electron 桌面端的环境判断和功能开关，
 * 避免在业务代码中散写 `window.appEnv?.xxx` 检测。
 */

export const platform = {
  /**
   * 是否运行在 Electron 桌面端
   */
  get isDesktop(): boolean {
    if (typeof window === 'undefined') return false
    // 优先通过 preload contextBridge 检测
    if (!!(window as any).appEnv?.isDesktop) return true
    // 兜底：User-Agent 检测（不受 contextBridge 影响）
    return typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')
  },

  /**
   * 是否运行在 Web 浏览器
   */
  get isWeb(): boolean {
    return !this.isDesktop
  },

  /**
   * 桌面端操作系统类型
   */
  get desktopPlatform(): 'darwin' | 'win32' | 'linux' | '' {
    if (!this.isDesktop) return ''
    return ((window as any).appEnv?.platform as 'darwin' | 'win32' | 'linux') || ''
  },

  /** 是否在 macOS 桌面端 */
  get isMacOS(): boolean {
    return this.desktopPlatform === 'darwin'
  },

  /** 是否在 Windows 桌面端 */
  get isWindows(): boolean {
    return this.desktopPlatform === 'win32'
  },

  /** 是否在 Linux 桌面端 */
  get isLinux(): boolean {
    return this.desktopPlatform === 'linux'
  },

  /** API 基础 URL */
  get apiBaseUrl(): string {
    if (this.isDesktop) {
      return (window as any).appEnv?.apiBaseUrl || '/api'
    }
    return '/api'
  },

  /** Unblock proxy URL */
  get unblockProxyUrl(): string {
    if (this.isDesktop) {
      return (window as any).appEnv?.unblockProxyUrl || 'http://127.0.0.1:38762'
    }
    return import.meta.env.VITE_NCM_PROXY || 'http://127.0.0.1:38762'
  },

  /** Unblock match URL */
  get unblockMatchUrl(): string {
    if (this.isDesktop) {
      return (window as any).appEnv?.unblockMatchUrl || 'http://127.0.0.1:38763'
    }
    return import.meta.env.VITE_UNBLOCK_MATCH_TARGET || 'http://127.0.0.1:38763'
  },

  /** Electron 版本号（桌面端） */
  get electronVersion(): string {
    if (!this.isDesktop) return ''
    return (window as any).appEnv?.electronVersion || ''
  },

  /** Node.js 版本号（桌面端） */
  get nodeVersion(): string {
    if (!this.isDesktop) return ''
    return (window as any).appEnv?.nodeVersion || ''
  },
}