/**
 * 请求去重工具
 *
 * 基于 Promise Map，相同 key 同时 pending 时复用 Promise。
 * 请求完成后立即释放 Map entry，不持久化。
 *
 * 使用场景：
 * - 同一组件内多个 watcher 同时触发相同 API 调用
 * - 短时间内重复挂载同一组件导致重复请求
 * - 用户快速点击刷新触发重复请求
 */
const pendingMap = new Map<string, Promise<any>>();

/**
 * 去重执行
 * @param key 唯一标识，通常为 `${apiName}:${JSON.stringify(params)}`
 * @param fetcher 实际请求函数
 * @returns 请求结果 Promise
 */
export function dedup<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (pendingMap.has(key)) {
    return pendingMap.get(key) as Promise<T>;
  }
  const promise = fetcher().finally(() => {
    pendingMap.delete(key);
  });
  pendingMap.set(key, promise);
  return promise;
}

/** 查询指定 key 是否有请求正在处理 */
export function isPending(key: string): boolean {
  return pendingMap.has(key);
}

/** 获取当前 pending 的请求数 */
export function pendingCount(): number {
  return pendingMap.size;
}

/** 强制清除某个 key 的 pending 状态 */
export function clearPending(key: string): void {
  pendingMap.delete(key);
}

/** 清除所有 pending 状态 */
export function clearAllPending(): void {
  pendingMap.clear();
}