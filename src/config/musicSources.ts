// 音源注册表：定义所有可用音源的元数据
// 按组分类：unblock(解锁), extended(扩展), plugin(插件)

export type SourceKey = string;
export type SourceGroup = 'unblock' | 'extended' | 'plugin';

export interface SourceMeta {
  key: SourceKey;
  label: string;
  color: string;
  group: SourceGroup;
  // 是否默认启用
  defaultEnabled: boolean;
}

export const SOURCE_REGISTRY: SourceMeta[] = [
  // 内置解锁音源
  { key: 'bodian', label: '波点音乐',  color: '#22c55e', group: 'unblock', defaultEnabled: true },
  { key: 'kugou',  label: '酷狗音乐',  color: '#2979ff', group: 'unblock', defaultEnabled: true },
  { key: 'kuwo',   label: '酷我音乐',  color: '#ff8c00', group: 'unblock', defaultEnabled: false },
  { key: 'migu',   label: '咪咕音乐',  color: '#ff6600', group: 'unblock', defaultEnabled: true },
  { key: 'qq',     label: 'QQ音乐',    color: '#1ad152', group: 'unblock', defaultEnabled: true },
  { key: 'bilibili', label: 'B站',     color: '#fb7299', group: 'unblock', defaultEnabled: false },
  // 扩展音源 (预留)
  { key: 'joox',   label: 'JOOX',      color: '#febe00', group: 'extended', defaultEnabled: false },
  { key: 'youtube',label: 'YouTube',   color: '#ff0000', group: 'extended', defaultEnabled: false },
];

/** 获取默认启用的音源列表 */
export function getDefaultSources(): string[] {
  return SOURCE_REGISTRY.filter(s => s.defaultEnabled).map(s => s.key);
}

/** 按组分组的音源 */
export function getSourcesByGroup(): Record<SourceGroup, SourceMeta[]> {
  const groups: Record<SourceGroup, SourceMeta[]> = {
    unblock: [],
    extended: [],
    plugin: [],
  };
  for (const s of SOURCE_REGISTRY) {
    groups[s.group].push(s);
  }
  return groups;
}

/** 获取音源元数据 */
export function getSourceMeta(key: string): SourceMeta | undefined {
  return SOURCE_REGISTRY.find(s => s.key === key);
}
