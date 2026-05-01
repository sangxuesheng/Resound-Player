/**
 * AMLL 歌词数据适配器
 * 将项目现有的 LyricLine[] 格式转换为 AMLL LyricLine[] 格式
 */

import type { LyricWord as ProjectLyricWord, LyricLine as ProjectLyricLine } from './useLyrics';
import { getAnchorRatio } from './useLyrics';

export interface AmllLyricWord {
  startTime: number;
  endTime: number;
  word: string;
  romanWord?: string;
  obscene?: boolean;
}

export interface AmllLyricLine {
  words: AmllLyricWord[];
  translatedLyric: string;
  romanLyric: string;
  startTime: number;
  endTime: number;
  isBG: boolean;
  isDuet: boolean;
}

/**
 * 将项目的歌词行格式转换为 AMLL 格式
 * AMLL 要求 lyricLines props 传入后不可变，每次调用返回全新数组
 */
export function convertToAmmlLyrics(lines: ProjectLyricLine[]): AmllLyricLine[] {
  if (!lines.length) return [];

  return lines.map((line, idx) => {
    const startTimeMs = Math.round(line.time * 1000);
    const endTimeMs = idx < lines.length - 1
      ? Math.round(lines[idx + 1].time * 1000)
      : startTimeMs + 5000;

    const words: AmllLyricWord[] = [];

    if (line.words?.length) {
      for (const w of line.words) {
        const wordEnd = w.startTime + Math.max(w.duration, 1);
        words.push({
          startTime: Math.round(w.startTime),
          endTime: Math.round(wordEnd),
          word: w.text + (w.space ? ' ' : ''),
        });
      }
    }

    // 无逐字数据时，整行作为一个单词
    if (!words.length) {
      words.push({
        startTime: startTimeMs,
        endTime: endTimeMs,
        word: line.text || '...',
      });
    }

    return {
      words,
      translatedLyric: line.translation || '',
      romanLyric: '',
      startTime: startTimeMs,
      endTime: endTimeMs,
      isBG: false,
      isDuet: false,
    };
  });
}

/**
 * 将 lyricsSettings.anchorPos (0-10) 映射为 AMLL 的 alignAnchor
 */
export function mapAnchorPos(pos: number): { anchor: 'center'; position: number } {
  const ratio = getAnchorRatio(pos);
  return { anchor: 'center', position: Math.min(1, Math.max(0, ratio)) };
}
