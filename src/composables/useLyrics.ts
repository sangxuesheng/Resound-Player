import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { getCloudLyric, getSongLyric } from '../api/music';
import { playerStore } from '../stores/player';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type LyricWord = {
  text: string;
  startTime: number;
  duration: number;
  space?: boolean;
};

export type LyricLine = {
  time: number;
  text: string;
  translation?: string;
  words?: LyricWord[];
};

/* ------------------------------------------------------------------ */
/*  Parsers – pure functions                                           */
/* ------------------------------------------------------------------ */

export function parseLrc(lrc: string): LyricLine[] {
  if (!lrc?.trim()) return [];
  const rows = lrc.split('\n');
  const out: LyricLine[] = [];
  for (const row of rows) {
    const matches = [...row.matchAll(/\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    if (!matches.length) continue;
    const text = row.replace(/\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g, '').trim();
    for (const m of matches) {
      const min = Number(m[1] || 0);
      const sec = Number(m[2] || 0);
      const msRaw = m[3] || '0';
      const ms = Number(msRaw.padEnd(3, '0'));
      out.push({ time: min * 60 + sec + ms / 1000, text });
    }
  }
  return out.sort((a, b) => a.time - b.time);
}

export function parseYrc(yrc: string): LyricLine[] {
  if (!yrc?.trim()) return [];
  const lines = yrc.split('\n');
  const out: LyricLine[] = [];
  const lineRegex = /^\[(\d+),(\d+)\](.*)$/;
  const wordRegex = /\((\d+),(\d+),\d+\)([^()]+)/g;
  for (const raw of lines) {
    const row = raw.trim();
    if (!row) continue;
    const lineMatch = row.match(lineRegex);
    if (!lineMatch) continue;
    const lineStartMs = Number(lineMatch[1] || 0);
    const body = lineMatch[3] || '';
    const words: LyricWord[] = [];
    let fullText = '';
    for (const m of body.matchAll(wordRegex)) {
      const offset = Number(m[1] || 0);
      const duration = Number(m[2] || 0);
      const rawWord = m[3] || '';
      const hasTrailingSpace = /\s$/.test(rawWord);
      const text = rawWord.trimEnd();
      if (!text && !hasTrailingSpace) continue;
      words.push({ text, startTime: lineStartMs + offset, duration, space: hasTrailingSpace });
      fullText += text + (hasTrailingSpace ? ' ' : '');
    }
    out.push({
      time: lineStartMs / 1000,
      text: fullText.trim() || body.replace(wordRegex, '$3').trim(),
      words,
    });
  }
  return out.sort((a, b) => a.time - b.time);
}

export function parseLyrics(payload: any): LyricLine[] {
  const yrcText = payload?.yrc?.lyric || '';
  const lrcText = typeof payload?.lrc === 'string' ? payload.lrc : (payload?.lrc?.lyric || '');
  const tlyricText = payload?.tlyric?.lyric || '';
  const lrcLines = parseLrc(lrcText);
  const yrcLines = parseYrc(yrcText);
  let baseLines: LyricLine[] = [];
  if (lrcLines.length) {
    baseLines = lrcLines.map((line) => ({ ...line }));
    if (yrcLines.length) {
      baseLines = baseLines.map((line) => {
        let best: LyricLine | undefined;
        let minDiff = 1.2;
        for (const yLine of yrcLines) {
          const diff = Math.abs(yLine.time - line.time);
          if (diff <= minDiff) { minDiff = diff; best = yLine; }
        }
        if (!best) return line;
        return { ...line, text: best.text || line.text, words: best.words };
      });
    }
  } else {
    baseLines = yrcLines;
  }
  if (!baseLines.length) return [];
  const tLines = parseLrc(tlyricText);
  if (!tLines.length) return baseLines;
  if (tLines.length === baseLines.length) {
    return baseLines.map((line, index) => ({ ...line, translation: tLines[index]?.text || '' }));
  }
  return baseLines.map((line) => {
    let bestText = '';
    let bestDiff = Infinity;
    for (const tLine of tLines) {
      const diff = Math.abs(tLine.time - line.time);
      if (diff < bestDiff && diff <= 2) { bestDiff = diff; bestText = tLine.text; }
    }
    return { ...line, translation: bestText };
  });
}

/* ------------------------------------------------------------------ */
/*  Style helpers                                                      */
/* ------------------------------------------------------------------ */

const LYRIC_ANCHOR_RATIO = 0.30;

export type LyricStyleOptions = {
  baseColor?: string;
  activeColor?: string;
};

export function getLineWrapStyle(lineIndex: number, currentIndex: number) {
  if (currentIndex < 0) return { opacity: 1, filter: 'none' };
  const diff = currentIndex - lineIndex;
  if (diff > 0) {
    return { opacity: Math.max(0.16, 1 - diff * 0.11), filter: `blur(${Math.min(2.4, diff * 0.2)}px)` };
  }
  return { opacity: 1, filter: 'none' };
}

export function getLineStyle(
  lineIndex: number, line: LyricLine, currentIndex: number, displayTime: number,
  nextLine?: LyricLine, opts: LyricStyleOptions = {},
) {
  const baseColor = opts.baseColor || 'rgba(255,255,255,0.86)';
  const activeColor = opts.activeColor || '#ffffff';
  if (line.words?.length) return { color: lineIndex === currentIndex ? activeColor : baseColor };
  const startMs = line.time * 1000;
  const endMs = (nextLine?.time ?? line.time + 3) * 1000;
  const currentMs = displayTime * 1000;
  if (lineIndex < currentIndex || currentMs >= endMs) return { color: activeColor, backgroundImage: 'none', WebkitTextFillColor: 'initial' };
  if (lineIndex > currentIndex || currentMs <= startMs) return { color: baseColor, backgroundImage: 'none', WebkitTextFillColor: 'initial' };
  const percent = Math.round((Math.min(1, Math.max(0, (currentMs - startMs) / Math.max(1, endMs - startMs)))) * 100);
  return {
    backgroundImage: `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${percent}%, ${baseColor} ${percent}%, ${baseColor} 100%)`,
    backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent',
  };
}

export function getWordStyle(lineIndex: number, word: LyricWord, currentIndex: number, displayTime: number, opts: LyricStyleOptions = {}) {
  const baseColor = opts.baseColor || 'rgba(255,255,255,0.55)';
  const activeColor = opts.activeColor || '#ffffff';
  const currentMs = displayTime * 1000;
  const start = word.startTime;
  const end = word.startTime + Math.max(1, word.duration);
  if (lineIndex < currentIndex || currentMs >= end) return { color: activeColor, backgroundImage: 'none', WebkitTextFillColor: 'initial' };
  if (lineIndex > currentIndex || currentMs <= start) return { color: baseColor, backgroundImage: 'none', WebkitTextFillColor: 'initial' };
  const percent = Math.round((Math.min(1, Math.max(0, (currentMs - start) / (end - start)))) * 100);
  return {
    backgroundImage: `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${percent}%, ${baseColor} ${percent}%, ${baseColor} 100%)`,
    backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent',
  };
}

export function getTranslationStyle(lineIndex: number, line: LyricLine, currentIndex: number, displayTime: number, nextLine?: LyricLine, opts: LyricStyleOptions = {}) {
  const baseColor = opts.baseColor || 'rgba(255,255,255,0.62)';
  const activeColor = opts.activeColor || 'rgba(255,255,255,0.94)';
  const currentMs = displayTime * 1000;
  if (lineIndex < currentIndex) return { color: activeColor, opacity: 0.92, textShadow: '0 0 12px rgba(255,255,255,0.14)' };
  if (lineIndex > currentIndex) return { color: baseColor, opacity: 0.72 };
  if (!line.translation) return { color: baseColor, opacity: 0.72 };
  const startMs = line.time * 1000;
  const nextStartMs = (nextLine?.time ?? line.time + 3) * 1000;
  const percent = Math.round((Math.min(1, Math.max(0, (currentMs - startMs) / Math.max(1, nextStartMs - startMs)))) * 100);
  return {
    backgroundImage: `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${percent}%, ${baseColor} ${percent}%, ${baseColor} 100%)`,
    backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent', opacity: 1,
  };
}

export function scrollToLyricLine(container: HTMLElement | null, lineEls: HTMLElement[], index: number, behavior: ScrollBehavior = 'smooth') {
  if (index < 0 || !container) return;
  const lineEl = lineEls[index];
  if (!lineEl) return;
  const anchorY = container.clientHeight * LYRIC_ANCHOR_RATIO;
  const targetTop = lineEl.offsetTop + lineEl.clientHeight / 2 - anchorY;
  container.scrollTo({ top: Math.max(0, targetTop), behavior });
}

/* ------------------------------------------------------------------ */
/*  Composable                                                         */
/* ------------------------------------------------------------------ */

export function useLyrics() {
  const lyricLines = ref<LyricLine[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const displayTime = ref(0);
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  const lyricBoxRef = ref<HTMLElement | null>(null);
  const lyricLineRefs = ref<HTMLElement[]>([]);

  const currentLyricIndex = computed(() => {
    const lines = lyricLines.value;
    if (!lines.length) return -1;
    const t = displayTime.value;
    let idx = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (t >= lines[i].time) idx = i;
      else break;
    }
    return idx;
  });

  function startTick() {
    if (tickTimer) return;
    tickTimer = setInterval(() => {
      if (playerStore.isPlaying) displayTime.value = playerStore.currentTime || 0;
    }, 50);
  }

  function stopTick() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }

  function setLyricLineRef(el: Element | null, idx: number) {
    if (!el) return;
    lyricLineRefs.value[idx] = el as HTMLElement;
  }

  async function loadLyrics(track: typeof playerStore.currentTrack) {
    const id = track?.id;
    if (!id) { lyricLines.value = []; return; }
    isLoading.value = true;
    error.value = null;
    try {
      const source = track?.source;
      const cloudSid = track?.cloudSid;
      const data = source === 'cloud' && cloudSid
        ? (await getCloudLyric(Number(track?.cloudOwnerId || track?.uid || 0), cloudSid)).data
        : (await getSongLyric(Number(id))).data;
      lyricLines.value = parseLyrics(data);
      if (lyricBoxRef.value) lyricBoxRef.value.scrollTop = 0;
    } catch { lyricLines.value = []; error.value = '歌词加载失败'; }
    finally { isLoading.value = false; }
  }

  function scrollToCurrentLine(behavior: ScrollBehavior = 'smooth') {
    scrollToLyricLine(lyricBoxRef.value, lyricLineRefs.value, currentLyricIndex.value, behavior);
  }

  function seekToLine(index: number) {
    const line = lyricLines.value[index];
    if (!line) return;
    playerStore.seek(line.time);
    nextTick(() => scrollToCurrentLine('auto'));
  }

  onUnmounted(() => { stopTick(); });

  return {
    lyricLines, currentLyricIndex, displayTime, isLoading, error,
    lyricBoxRef, lyricLineRefs, setLyricLineRef,
    startTick, stopTick, loadLyrics,
    scrollToCurrentLine, seekToLine,
  };
}
