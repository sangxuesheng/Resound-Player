<template>
  <div
    class="right-zone"
    :class="{
      'l-center': lyricsSettings.showCover ? lyricsSettings.centerAlign : true,
      'l-no-cover': !lyricsSettings.showCover,
      'l-hidden': !lyricsSettings.showLyrics,
      'l-record': vinylMode,
    }"
    :style="lyricVars"
  >
    <!-- 隐藏歌词时：空占位 -->
    <template v-if="!lyricsSettings.showLyrics">
      <div v-if="lyricsSettings.useAmllRenderer" class="amll-status" />
    </template>
    <!-- 显示歌词时 -->
    <template v-else>
      <!-- 加载中 / 暂无歌词：统一状态 -->
      <div v-if="isLoading" class="amll-status">歌词加载中...</div>
      <div v-else-if="!lyricLines.length" class="amll-status">暂无歌词</div>
      <!-- 有歌词数据：双渲染器层叠，v-show 保持两个组件始终挂载 -->
      <div v-else class="renderer-stack">
        <div v-show="lyricsSettings.useAmllRenderer" class="renderer-layer">
          <LyricPlayer
            ref="amllPlayerCompRef"
            :lyricLines="amllLines"
            :currentTime="amllCurrentTime"
            :alignAnchor="amllAnchor.anchor"
            :alignPosition="amllAnchor.position"
            :hidePassedLines="lyricsSettings.hidePlayed"
            :enableBlur="true"
            :enableScale="true"
            :enableSpring="true"
            :wordFadeWidth="0.5"
            class="amll-player"
            @lineClick="onAmllLineClick"
          />
        </div>
        <div v-show="!lyricsSettings.useAmllRenderer" class="renderer-layer">
          <div ref="lyricBoxRef" class="lyric-box" :style="lyricBoxStyle">
            <div v-for="(line, idx) in lyricLines" :key="`${idx}-${line.time}`" :ref="(el) => setLyricLineRef(el, idx)" class="line-wrap" :class="{ active: idx === currentLyricIndex, 'hide-played': lyricsSettings.hidePlayed && idx < currentLyricIndex }" :style="lineWrapStyle(idx, currentLyricIndex)" @click="seekToLine(idx)">
              <p class="line" :class="{ active: idx === currentLyricIndex, passed: idx < currentLyricIndex }" :style="lineStyle(idx, line)">
                <template v-if="line.words && line.words.length">
                  <span v-for="(word, wIdx) in line.words" :key="`${idx}-${wIdx}`" class="word" :style="getWordStyle(idx, word, currentLyricIndex, effectiveTime)">{{ word.text }}<span v-if="word.space">&nbsp;</span></span>
                </template>
                <template v-else>{{ line.text || '...' }}</template>
              </p>
              <p v-if="line.translation && lyricsSettings.showTranslation" class="line-sub" :class="{ active: idx === currentLyricIndex, passed: idx < currentLyricIndex }" :style="translationStyle(idx, line)">{{ line.translation }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, ref, onMounted, onBeforeUnmount } from 'vue';
import { playerStore } from '../stores/player';
import { lyricsSettings } from '../stores/lyricsSettings';
import { useLyrics, getLineWrapStyle, getLineStyle, getWordStyle, getTranslationStyle, getAnchorRatio } from '../composables/useLyrics';
import { convertToAmmlLyrics, mapAnchorPos } from '../composables/useAmllAdapter';
import { LyricPlayer } from '@applemusic-like-lyrics/vue';
import '@applemusic-like-lyrics/core/style.css';

const props = defineProps<{
  vinylMode?: boolean;
}>();

const { lyricLines, currentLyricIndex, displayTime, effectiveTime, isLoading, lyricBoxRef, setLyricLineRef, startTick, loadLyrics, scrollToCurrentLine, seekToLine } = useLyrics();

const fontSizeMap = ['20px','22px','24px','26px','28px','30px','32px','34px','36px','38px','40px'];
const letterSpacingMap = ['-0.03em','-0.02em','-0.01em','0','0.01em','0.02em','0.03em','0.04em','0.05em','0.06em','0.08em'];
const fontWeightMap = ['300','400','500','600','700','800','900','950','950','950','950'];
const lineHeightMap = ['1.1','1.15','1.2','1.25','1.28','1.32','1.36','1.4','1.45','1.5','1.6'];

const lyricVars = computed(() => {
  const fs = fontSizeMap[lyricsSettings.fontSize] || fontSizeMap[1];
  const ls = letterSpacingMap[lyricsSettings.letterSpacing] || letterSpacingMap[1];
  const fw = fontWeightMap[lyricsSettings.fontWeight] || fontWeightMap[4];
  const lh = lineHeightMap[lyricsSettings.lineHeight] || lineHeightMap[4];
  return {
    // CSS 变量：自定义渲染器通过 var() 读取
    '--l-font-size': fs,
    '--l-letter-spacing': ls,
    '--l-font-weight': fw,
    '--l-line-height': lh,
    // AMLL 专属 CSS 变量
    '--amll-lp-font-size': fs,
    // 实际 CSS 属性：两个渲染器均通过继承 + getComputedStyle() 读取
    'font-size': fs,
    'letter-spacing': ls,
    'font-weight': fw,
    'line-height': lh,
  };
});

const lyricBoxStyle = computed(() => {
  const ratio = getAnchorRatio(lyricsSettings.anchorPos);
  const topPad = lyricsSettings.showCover ? '42%' : '8%';
  return { paddingTop: topPad, paddingBottom: `calc(${ratio * 100}vh - 80px)` };
});

/* 用户滚动浏览时取消远端歌词模糊 */
function lineWrapStyle(idx: number, currentIdx: number) {
  if (isUserScrolling.value && Math.abs(idx - currentIdx) > 3) {
    return { opacity: 1, filter: 'none' };
  }
  return getLineWrapStyle(idx, currentIdx);
}

function lineStyle(idx: number, line: any) {
  const next = lyricLines.value[idx + 1];
  return getLineStyle(idx, line, currentLyricIndex.value, effectiveTime.value, next);
}
function translationStyle(idx: number, line: any) {
  const next = lyricLines.value[idx + 1];
  return getTranslationStyle(idx, line, currentLyricIndex.value, effectiveTime.value, next);
}

/* ---- AMLL 相关 ---- */
const amllLines = computed(() => convertToAmmlLyrics(lyricLines.value));
const amllCurrentTime = computed(() => Math.round(effectiveTime.value * 1000));
const amllAnchor = computed(() => mapAnchorPos(lyricsSettings.anchorPos));

function onAmllLineClick(ev: any) {
  // ev.detail.lineIndex 包含被点击的行索引
  const idx = ev?.detail?.lineIndex ?? ev?.lineIndex;
  if (typeof idx === 'number' && idx >= 0) seekToLine(idx);
}

const amllPlayerCompRef = ref<any>(null);
watch(() => lyricsSettings.useAmllRenderer, (useAmll) => {
  if (!useAmll || !lyricLines.value.length) return;
  nextTick(() => {
    amllPlayerCompRef.value?.lyricPlayer?.setCurrentTime(amllCurrentTime.value, true);
  });
});

/* 用户手动滑动歌词时暂停高亮跟随，3s 无操作恢复 */
const isUserScrolling = ref(false);
let scrollTimer: ReturnType<typeof setTimeout> | null = null;

function onLyricScroll() {
  isUserScrolling.value = true;
  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    isUserScrolling.value = false;
    scrollTimer = null;
    nextTick(() => scrollToCurrentLine('smooth'));
  }, 3000);
}

onMounted(() => {
  lyricBoxRef.value?.addEventListener('scroll', onLyricScroll, { passive: true });
});
onBeforeUnmount(() => {
  lyricBoxRef.value?.removeEventListener('scroll', onLyricScroll);
  if (scrollTimer) clearTimeout(scrollTimer);
});

watch(currentLyricIndex, async (idx, prev) => {
  if (idx < 0) return;
  if (isUserScrolling.value) return;
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
.right-zone { min-height: 0; display: flex; flex-direction: column; max-height: calc(100vh - 170px); height: 100%; isolation: isolate; }
.right-zone.l-center .line-wrap { text-align: center; }
.right-zone:not(.l-center) .line-wrap { text-align: left; padding-left: var(--space-4); padding-right: var(--space-4); }
.right-zone.l-no-cover { max-width: min(700px, 85%); margin: 0 auto; width: 100%; }
.right-zone.l-hidden { display: grid; place-items: center; }
.lyric-box { flex: 1; overflow-y: auto; overflow-x: hidden; border-radius: 0; padding: 42% 60px 0; background: transparent; border: 0; box-shadow: none; scroll-behavior: smooth; }
.lyric-box::-webkit-scrollbar { width: 0; }
.line-wrap { margin: var(--space-3) 0; text-align: center; cursor: pointer; border-radius: 12px; padding: var(--space-2) var(--space-3); transition: background-color 140ms ease, box-shadow 140ms ease; }
.line-wrap:hover { background: rgba(255,255,255,0.1); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2); }
.line-wrap.hide-played { visibility: hidden; opacity: 0; pointer-events: none; }
.line { margin: 0; color: rgba(255,255,255,0.55); font-size: var(--l-font-size, 30px); font-weight: var(--l-font-weight, 700); line-height: var(--l-line-height, 1.28); letter-spacing: var(--l-letter-spacing, 0); overflow-wrap: break-word; word-break: break-word; }
.line-sub { margin: var(--space-1) 0 0; color: rgba(255,255,255,0.62); font-size: calc(var(--l-font-size, 30px) * 0.66); font-weight: 500; line-height: var(--l-line-height, 1.28); }
.line-sub.active { color: rgba(255,255,255,0.9); }
.word { display: inline; }
.amll-status { flex: 1; display: grid; place-items: center; color: rgba(255,255,255,0.4); font-size: 15px; }
.renderer-stack { flex: 1; min-height: 0; position: relative; }
.renderer-layer { position: absolute; inset: 0; display: flex; flex-direction: column; }
.amll-player { flex: 1; min-height: 0; }
.amll-player :deep(.amll-lyric-player.dom) { line-height: var(--l-line-height, 1.28) !important; }
.right-zone.l-center .amll-player :deep(.amll-lyric-player) { text-align: center; }
</style>
