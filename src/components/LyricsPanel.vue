<template>
  <div
    class="right-zone"
    :class="{
      'l-center': lyricsSettings.showCover ? lyricsSettings.centerAlign : true,
      'l-no-cover': !lyricsSettings.showCover,
      'l-hidden': !lyricsSettings.showLyrics,
    }"
    :style="lyricVars"
  >
    <template v-if="lyricsSettings.showLyrics">
      <div ref="lyricBoxRef" class="lyric-box" :style="lyricBoxStyle">
        <div v-if="isLoading" class="line-wrap"><p class="line">歌词加载中...</p></div>
        <div v-else-if="!lyricLines.length" class="line-wrap"><p class="line">暂无歌词</p></div>
        <template v-else>
          <div v-for="(line, idx) in lyricLines" :key="`${idx}-${line.time}`" :ref="(el) => setLyricLineRef(el, idx)" class="line-wrap" :class="{ active: idx === currentLyricIndex, 'hide-played': lyricsSettings.hidePlayed && idx < currentLyricIndex }" :style="getLineWrapStyle(idx, currentLyricIndex)" @click="seekToLine(idx)">
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

const fontSizeMap = ['20px','22px','24px','26px','28px','30px','32px','34px','36px','38px','40px'];
const letterSpacingMap = ['-0.03em','-0.02em','-0.01em','0','0.01em','0.02em','0.03em','0.04em','0.05em','0.06em','0.08em'];
const fontWeightMap = ['300','400','500','600','700','800','900','950','950','950','950'];
const lineHeightMap = ['1.1','1.15','1.2','1.25','1.28','1.32','1.36','1.4','1.45','1.5','1.6'];

const lyricVars = computed(() => ({
  '--l-font-size': fontSizeMap[lyricsSettings.fontSize] || fontSizeMap[1],
  '--l-letter-spacing': letterSpacingMap[lyricsSettings.letterSpacing] || letterSpacingMap[1],
  '--l-font-weight': fontWeightMap[lyricsSettings.fontWeight] || fontWeightMap[1],
  '--l-line-height': lineHeightMap[lyricsSettings.lineHeight] || lineHeightMap[1],
}));

const lyricBoxStyle = computed(() => {
  const ratio = 0.15 + ((lyricsSettings.anchorPos ?? 3) / 10) * 0.7;
  const topPad = lyricsSettings.showCover ? '42%' : '8%';
  return { paddingTop: topPad, paddingBottom: `calc(${ratio * 100}vh - 80px)` };
});

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
.right-zone { min-height: 0; display: flex; flex-direction: column; max-height: calc(100vh - 170px); position: relative; }
.right-zone.l-center .line-wrap { text-align: center; }
.right-zone:not(.l-center) .line-wrap { text-align: left; padding-left: var(--space-4); padding-right: var(--space-4); }
.right-zone.l-no-cover { max-width: min(700px, 85%); margin: 0 auto; width: 100%; }
.right-zone.l-hidden { display: grid; place-items: center; }
.lyric-box { flex: 1; overflow-y: auto; overflow-x: hidden; border-radius: 0; padding: 42% 60px 0; background: transparent; border: 0; box-shadow: none; scroll-behavior: smooth; mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%); }
.lyric-box::-webkit-scrollbar { width: 0; }
.line-wrap { margin: var(--space-3) 0; text-align: center; cursor: pointer; border-radius: 12px; padding: var(--space-2) var(--space-3); transition: background-color 140ms ease, box-shadow 140ms ease; }
.line-wrap:hover { background: rgba(255,255,255,0.1); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2); }
.line-wrap.hide-played { visibility: hidden; opacity: 0; pointer-events: none; }
.line { margin: 0; color: rgba(255,255,255,0.55); font-size: var(--l-font-size, 30px); font-weight: var(--l-font-weight, 700); line-height: var(--l-line-height, 1.28); letter-spacing: var(--l-letter-spacing, 0); overflow-wrap: break-word; word-break: break-word; }
.line-sub { margin: var(--space-1) 0 0; color: rgba(255,255,255,0.62); font-size: calc(var(--l-font-size, 30px) * 0.66); font-weight: 500; line-height: var(--l-line-height, 1.28); }
.line-sub.active { color: rgba(255,255,255,0.9); }
.word { display: inline; }
.right-zone::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 140px;
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  mask-image: linear-gradient(to bottom, transparent, #000 60%);
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 60%);
  pointer-events: none; z-index: 1;
}
</style>
