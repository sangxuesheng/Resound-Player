import { reactive } from 'vue';

export type LyricsSelectionState = {
  isOpen: boolean;
  selectedIndices: Set<number>;
  showTranslation: boolean;
  currentTrackId: number | string | null;
};

const state = reactive<LyricsSelectionState>({
  isOpen: false,
  selectedIndices: new Set(),
  showTranslation: false,
  currentTrackId: null,
});

export function openSelection(trackId: number | string | null) {
  if (state.currentTrackId !== trackId) {
    // 切歌时重置
    state.selectedIndices = new Set();
    state.showTranslation = false;
    state.currentTrackId = trackId;
  }
  state.isOpen = true;
}

export function closeSelection() {
  state.isOpen = false;
  // 不重置 selectedIndices，同首歌再次打开保留勾选
}

export function toggleLine(idx: number) {
  const set = new Set(state.selectedIndices);
  if (set.has(idx)) set.delete(idx);
  else set.add(idx);
  state.selectedIndices = set;
}

export function toggleSelectionTranslation() {
  state.showTranslation = !state.showTranslation;
}

export function getSelectedLines(lines: any[]) {
  return lines.filter((_, i) => state.selectedIndices.has(i));
}

export const lyricsSelection = state;
