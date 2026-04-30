<template>
  <div
    class="right-zone"
    :class="{
      'l-center': lyricsSettings.centerAlign,
      'l-hidden': !lyricsSettings.showLyrics,
      'l-pure': lyricsSettings.pureMode,
    }"
    :style="lyricVars"
  >
    <div v-if="!lyricsSettings.showLyrics" class="lyric-hidden-hint"><p>歌词已隐藏</p></div>
    <template v-else>
      <div ref="lyricBoxRef" class="lyric-box">
        <div v-if="isLoading" class="line-wrap"><p class="line">歌词加载中...</p></div>
        <div v-else-if="!lyricLines.length" class="line-wrap"><p class="line">暂无歌词</p></div>
        <template v-else>
          <div v-for="(line, idx) in lyricLines" :key="`${idx}-${line.time}`" :ref="(el) => setLyricLineRef(el, idx)" class="line-wrap" :class="{ active: idx === currentLyricIndex, passed: idx < currentLyricIndex }" :style="getLineWrapStyle(idx, currentLyricIndex)" @click="seekToLine(idx)">
            <p class="line" :class="{ active: idx === currentLyricIndex, passed: idx < currentLyricIndex }" :style="lineStyle(idx, line)">
              <template v-if="line.words && line.words.length">
                <span v-for="(word, wIdx) in line.words" :key="`${idx}-${wIdx}`" class="word" :style="getWordStyle(idx, word, currentLyricIndex, effectiveTime)">{{ word.text }}<span v-if="word.space">&nbsp;</span></span>
              </template>
              <template v-else>{{ line.text || '...' }}</template>
            </p>
            <p v-if="line.translation && lyricsSettings.showTranslation" class="line-sub" :class="{ active: idx === currentLyricIndex, passed: idx < currentLyricIndex }" :style="translationStyle(idx, line)">{{ line.translation }}</p>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick } from 'vue';
import { playerStore } from '../stores/player';
import { lyricsSettings } from '../stores/lyricsSettings';
import { useLyrics, getLineWrapStyle, getLineStyle, getWordStyle, getTranslationStyle } from '../composables/useLyrics';

const { lyricLines, currentLyricIndex, displayTime, effectiveTime, isLoading, lyricBoxRef, setLyricLineRef, startTick, loadLyrics, scrollToCurrentLine, seekToLine } = useLyrics();

const fontSizeMap = ['22px', '30px', '38px'];
const letterSpacingMap = ['-0.02em', '0', '0.06em'];
const fontWeightMap = ['400', '700', '900'];
const lineHeightMap = ['1.2', '1.28', '1.5'];

const lyricVars = computed(() => ({
  '--l-font-size': fontSizeMap[lyricsSettings.fontSize] || fontSizeMap[1],
  '--l-letter-spacing': letterSpacingMap[lyricsSettings.letterSpacing] || letterSpacingMap[1],
  '--l-font-weight': fontWeightMap[lyricsSettings.fontWeight] || fontWeightMap[1],
  '--l-line-height': lineHeightMap[lyricsSettings.lineHeight] || lineHeightMap[1],
}));

function lineStyle(idx: number, line: any) {
  const next = lyricLines.value[idx + 1];
  return getLineStyle(idx, line, currentLyricIndex.value, effectiveTime.value, next);
}
function translationStyle(idx: number, line: any) {
  const next = lyricLines.value[idx + 1];
  return getTranslationStyle(idx, line, currentLyricIndex.value, effectiveTime.value, next);
}

watch(currentLyricIndex, async (idx, prev) => {
  if (idx < 0) return;
  await nextTick();
  scrollToCurrentLine(prev === -1 ? 'auto' : 'smooth');
});

watch(() => playerStore.currentTrack?.id, async (id) => {
  if (!id) return;
  await loadLyrics(playerStore.currentTrack);
  await nextTick();
  if (currentLyricIndex.value >= 0) scrollToCurrentLine('auto');
}, { immediate: true });

startTick();
</script>

<style scoped>
.right-zone { min-height: 0; display: flex; flex-direction: column; max-height: calc(100vh - 170px); }
.right-zone.l-center .line-wrap { text-align: center; }
.right-zone:not(.l-center) .line-wrap { text-align: left; padding-left: var(--space-4); padding-right: var(--space-4); }
.right-zone.l-hidden { display: grid; place-items: center; }
.lyric-hidden-hint p { color: rgba(255,255,255,0.35); font-size: 18px; }
.right-zone.l-pure .line-wrap { margin: var(--space-2) 0; }
.right-zone.l-pure .line-wrap:hover { background: transparent; box-shadow: none; }
.right-zone.l-pure .line-wrap.passed { opacity: 0.5; }
.lyric-box { flex: 1; overflow-y: auto; overflow-x: hidden; border-radius: 0; padding: 42% var(--space-2) var(--space-2); background: transparent; border: 0; box-shadow: none; scroll-behavior: smooth; }
.lyric-box::-webkit-scrollbar { width: 0; }
.line-wrap { margin: var(--space-3) 0; text-align: center; cursor: pointer; border-radius: 12px; padding: var(--space-2) var(--space-3); transition: background-color 140ms ease, box-shadow 140ms ease; }
.line-wrap:hover { background: rgba(255,255,255,0.1); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2); }
.line { margin: 0; color: rgba(255,255,255,0.55); font-size: var(--l-font-size, 30px); font-weight: var(--l-font-weight, 700); line-height: var(--l-line-height, 1.28); letter-spacing: var(--l-letter-spacing, 0); }
.line-sub { margin: var(--space-1) 0 0; color: rgba(255,255,255,0.62); font-size: calc(var(--l-font-size, 30px) * 0.66); font-weight: 500; line-height: var(--l-line-height, 1.28); }
.line-sub.active { color: rgba(255,255,255,0.9); }
.word { display: inline; }
</style>
