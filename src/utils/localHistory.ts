export type LocalHistoryType = 'song' | 'playlist' | 'album' | 'podcast';

export type LocalHistoryEntry = {
  key: string;
  title: string;
  subtitle: string;
  source: string;
  sourceTip: string;
  summary: string;
  typeLabel: string;
  countLabel: string;
  updatedAt: string;
  playableLabel: string;
  playActionTip: string;
  coverUrl?: string;
  coverStyle?: Record<string, string>;
  playTracks?: Array<{ id: number; name: string; ar?: Array<{ name: string }>; al?: { name?: string; picUrl?: string } }>;
  playableItem?: any;
  manageType: LocalHistoryType;
  canUnlike?: boolean;
  canOpenDetail?: boolean;
  sortKey?: number;
};

type LocalHistoryPayload = Partial<Record<LocalHistoryType, LocalHistoryEntry[]>>;

export const LOCAL_HISTORY_KEY = 'gm_local_play_history_v1';

function readPayload(): LocalHistoryPayload {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    return raw ? JSON.parse(raw) as LocalHistoryPayload : {};
  } catch {
    return {};
  }
}

function writePayload(payload: LocalHistoryPayload) {
  localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify({
    song: Array.isArray(payload.song) ? payload.song.slice(0, 120) : [],
    playlist: Array.isArray(payload.playlist) ? payload.playlist.slice(0, 80) : [],
    album: Array.isArray(payload.album) ? payload.album.slice(0, 80) : [],
    podcast: Array.isArray(payload.podcast) ? payload.podcast.slice(0, 80) : [],
  }));
}

function getEntryId(entry: LocalHistoryEntry) {
  return Number(entry.playableItem?.id || entry.playTracks?.[0]?.id || 0);
}

export function readLocalHistory() {
  const payload = readPayload();
  return {
    song: Array.isArray(payload.song) ? payload.song : [],
    playlist: Array.isArray(payload.playlist) ? payload.playlist : [],
    album: Array.isArray(payload.album) ? payload.album : [],
    podcast: Array.isArray(payload.podcast) ? payload.podcast : [],
  };
}

export function recordLocalHistoryEntry(entry: LocalHistoryEntry) {
  const payload = readPayload();
  const bucket = Array.isArray(payload[entry.manageType]) ? [...payload[entry.manageType]!] : [];
  const id = getEntryId(entry);
  const identity = id ? String(id) : entry.key;
  const existing = bucket.find((item) => String(getEntryId(item) || item.key) === identity);
  const nextCount = Number(existing?.countLabel || 0) + 1;
  const now = Date.now();
  const nextEntry: LocalHistoryEntry = {
    ...entry,
    key: `local-${entry.manageType}-${identity}`,
    countLabel: String(nextCount),
    source: 'local_play_history',
    sourceTip: '当前设备本地播放记录',
    updatedAt: String(now),
    sortKey: now,
  };
  payload[entry.manageType] = [nextEntry, ...bucket.filter((item) => String(getEntryId(item) || item.key) !== identity)];
  writePayload(payload);
  return nextEntry;
}
