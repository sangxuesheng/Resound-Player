<template>
  <transition name="player-sheet">
    <div v-if="playerStore.expanded" class="expanded-wrap" :style="bgStyle" @click.self="playerStore.closeExpanded()">
      <div class="cover-aura" :style="coverAuraStyle"></div>
      <section class="expanded-panel">
        <AnimatedAppear tag="header" variant="content" rhythm="head" class-name="panel-head">
          <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="ghost" @click="playerStore.closeExpanded()">返回</AnimatedAppear>
          <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="1" class-name="ghost" @click="playerStore.closeExpanded()">关闭</AnimatedAppear>
        </AnimatedAppear>

        <div class="panel-body">
          <div class="left-zone">
            <div class="album-shell">
              <div class="album-cover" :style="coverStyle"></div>
            </div>

            <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="song-name">{{ playerStore.currentTrack?.name || '未在播放' }}</AnimatedAppear>
            <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="song-artist">
              <template v-if="playerStore.currentTrack?.ar?.length">
                <button
                  v-for="artist in playerStore.currentTrack.ar"
                  :key="artist.id || artist.name"
                  type="button"
                  class="artist-inline-btn"
                  :disabled="!(artist.id || artist.artistId)"
                  @click.stop="openArtist(artist)"
                >
                  {{ artist.name }}
                </button>
              </template>
              <template v-else>{{ artistText }}</template>
              <span v-if="playerStore.playbackRate !== 1" class="rate-badge">{{ playerStore.playbackRate.toFixed(2).replace(/\.00$/, '.0') }}x</span>
            </AnimatedAppear>

            <div class="progress-wrap">
              <input
                class="progress"
                type="range"
                min="0"
                :max="Math.max(1, Math.floor(playerStore.duration || 0))"
                :value="Math.floor(playerStore.currentTime || 0)"
                @mousedown="onSeekStart"
                @touchstart="onSeekStart"
                @input="onSeek"
                @change="onSeekEnd"
                @mouseup="onSeekEnd"
                @touchend="onSeekEnd"
              />
              <div v-if="isSeeking" class="seek-preview">{{ formatTime(seekPreviewTime) }}</div>
              <div class="times">
                <span class="time">{{ formatTime(playerStore.currentTime) }}</span>
                <span class="time">{{ formatTime(playerStore.duration) }}</span>
              </div>
            </div>

            <div class="controls">
              <button class="ctrl" @click="playerStore.cyclePlayMode()" aria-label="切换播放模式">
                <Repeat v-if="playerStore.playMode === 'loop'" :size="16" />
                <Repeat1 v-else-if="playerStore.playMode === 'single'" :size="16" />
                <Shuffle v-else :size="16" />
              </button>
              <button class="ctrl" @click="playerStore.prev()" aria-label="上一首">◀◀</button>
              <button class="ctrl main" @click="playerStore.togglePlay()" aria-label="播放或暂停">
                {{ playerStore.isPlaying ? '❚❚' : '▶' }}
              </button>
              <button class="ctrl" @click="playerStore.next()" aria-label="下一首">▶▶</button>
              <button
                v-if="isPersonalFmCurrentTrack"
                class="ctrl ctrl-fm-indicator"
                type="button"
                aria-label="当前为私人 FM"
                disabled
              >
                FM
              </button>
              <button v-else class="ctrl" @click="scrollPlaylistIntoView" aria-label="查看播放列表">
                <AlignJustify :size="16" />
              </button>
            </div>

            <div class="volume-wrap">
              <div class="volume-control">
                <button class="volume-icon-btn" type="button" :aria-label="playerStore.muted ? '取消静音' : '静音'" @click="playerStore.toggleMute()">
                  <VolumeX v-if="playerStore.muted || playerStore.volume === 0" :size="18" />
                  <Volume v-else-if="playerStore.volume < 0.33" :size="18" />
                  <Volume1 v-else-if="playerStore.volume < 0.66" :size="18" />
                  <Volume2 v-else :size="18" />
                </button>
                <input type="range" min="0" max="100" :value="Math.round((playerStore.muted ? 0 : playerStore.volume) * 100)" @input="onVolume" />
              </div>
              <button
                class="ctrl favorite-ctrl"
                type="button"
                :class="{ saved: isCurrentLiked, loading: likeLoading }"
                :aria-pressed="isCurrentLiked"
                :aria-label="isCurrentLiked ? '取消收藏' : '收藏'"
                :disabled="likeLoading || !canToggleCurrentLike"
                @click="toggleCurrentLike"
              >
                <Heart :size="16" />
              </button>
            </div>
          </div>

          <div class="right-zone">
            <div ref="lyricBoxRef" class="lyric-box">
              <div class="lyric-headline">
                <strong>歌词</strong>
                <span>{{ lyricSourceText }}</span>
              </div>
              <p v-if="!lyricLines.length" class="line">暂无歌词</p>
              <div
                v-for="(line, idx) in lyricLines"
                v-else
                :key="`${idx}-${line.time}`"
                :ref="(el) => setLyricLineRef(el, idx)"
                class="line-wrap"
                :class="{ active: idx === currentLyricIndex, passed: idx < currentLyricIndex }"
                :style="getLineWrapStyle(idx)"
                @click="seekToLyricLine(idx)"
              >
                <p
                  class="line"
                  :class="{ active: idx === currentLyricIndex, passed: idx < currentLyricIndex }"
                  :style="getLineStyle(idx, line)"
                >
                  <template v-if="line.words && line.words.length">
                    <span
                      v-for="(word, wIdx) in line.words"
                      :key="`${idx}-${wIdx}`"
                      class="word"
                      :style="getWordStyle(idx, word)"
                    >
                      {{ word.text }}<span v-if="word.space">&nbsp;</span>
                    </span>
                  </template>
                  <template v-else>
                    {{ line.text || '...' }}
                  </template>
                </p>
                <p
                  v-if="line.translation"
                  class="line-sub"
                  :class="{ active: idx === currentLyricIndex, passed: idx < currentLyricIndex }"
                  :style="getTranslationStyle(idx)"
                >
                  {{ line.translation }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showPlaylistPopup" class="playlist-popup-mask" @click.self="showPlaylistPopup = false">
          <aside class="playlist-popup">
            <div class="playlist-popup-head">
              <h3>播放列表</h3>
              <button class="ghost" @click="showPlaylistPopup = false">关闭</button>
            </div>
            <ul>
              <li
                v-for="(track, idx) in playerStore.playlist"
                :key="track.id"
                :class="{ active: idx === playerStore.currentIndex }"
                @click="playFromPopup(idx)"
              >
                <span class="t">{{ track.name }}</span>
                <span class="a">{{ (track.ar || []).map((x) => x.name).join('/') }}</span>
              </li>
            </ul>
          </aside>
        </div>
      </section>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { AlignJustify, Heart, Repeat, Repeat1, Shuffle, Volume, Volume1, Volume2, VolumeX } from 'lucide-vue-next';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { getCloudLyric, getSongLyric, toggleDjSubscribe, toggleSongLike } from '../api/music';
import { playerStore } from '../stores/player';
import { userStore } from '../stores/user';
import AnimatedAppear from './AnimatedAppear.vue';

const emit = defineEmits<{
  'open-artist': [artist: Record<string, any>];
}>();

const artistText = computed(() => {
  const ar = playerStore.currentTrack?.ar || [];
  return ar.length ? ar.map((a) => a.name).join('/') : 'Unknown Artist';
});

function openArtist(artist: Record<string, any>) {
  const id = Number(artist?.id || artist?.artistId || 0);
  if (!id) return;
  emit('open-artist', artist);
}

const coverStyle = computed(() => {
  const url = playerStore.currentTrack?.al?.picUrl;
  if (!url) return {};
  return { backgroundImage: `url(${url})` };
});

const palette = ref({
  c1: 'rgb(28, 33, 53)',
  c2: 'rgb(84, 110, 126)',
  c3: 'rgb(195, 156, 118)',
  c4: 'rgb(20, 24, 36)',
});

const showPlaylistPopup = ref(false);
const isPersonalFmCurrentTrack = computed(() => playerStore.isPersonalFmTrack(playerStore.currentTrack));
const currentTrackId = computed(() => Number(playerStore.currentTrack?.id || 0));
const currentPodcastRid = computed(() => Number(playerStore.currentTrack?.podcast?.rid || 0));
const isCurrentPodcast = computed(() => playerStore.currentTrack?.source === 'podcast' && currentPodcastRid.value > 0);
const canToggleCurrentLike = computed(() => (isCurrentPodcast.value ? currentPodcastRid.value > 0 : currentTrackId.value > 0));
const likedSongSignature = computed(() => userStore.likedSongIds.join(','));
const subscribedDjSignature = computed(() => userStore.subscribedDjIds.join(','));
const isCurrentLiked = computed(() => {
  void likedSongSignature.value;
  void subscribedDjSignature.value;
  if (isCurrentPodcast.value) return userStore.subscribedDjIds.includes(currentPodcastRid.value);
  return currentTrackId.value > 0 ? userStore.likedSongIds.includes(currentTrackId.value) : false;
});
const likeLoading = ref(false);

watch(
  () => `${currentTrackId.value}-${currentPodcastRid.value}-${playerStore.currentTrack?.source || 'song'}`,
  () => {
    likeLoading.value = false;
  },
  { immediate: true },
);

type LyricWord = {
  text: string;
  startTime: number;
  duration: number;
  space?: boolean;
};

type LyricLine = {
  time: number;
  text: string;
  translation?: string;
  words?: LyricWord[];
};

const lyricLines = ref<LyricLine[]>([]);
const lyricSourceText = ref('');
const lyricBoxRef = ref<HTMLElement | null>(null);
const lyricLineRefs = ref<HTMLElement[]>([]);
const tickNow = ref(0);
const isSeeking = ref(false);
const seekPreviewTime = ref(0);
let tickTimer: ReturnType<typeof setInterval> | null = null;
const LYRIC_ANCHOR_RATIO = 0.30;

const bgStyle = computed(() => ({
  background: `
    linear-gradient(160deg, ${palette.value.c1} 0%, ${palette.value.c2} 42%, ${palette.value.c4} 100%)
  `,
  '--panel-bg': `${palette.value.c1}`,
  '--panel-bg-soft': `${palette.value.c2}`,
  '--card-bg': 'rgba(18, 20, 28, 0.96)',
  '--card-bg-2': 'rgba(24, 26, 36, 0.98)',
  '--line-muted': 'rgba(255,255,255,0.16)',
  '--accent': `${palette.value.c3}`,
}));

const coverAuraStyle = computed(() => {
  const url = playerStore.currentTrack?.al?.picUrl;
  if (!url) return {};
  return {
    backgroundImage: `url(${url})`,
  };
});

const displayTime = computed(() => {
  // 通过 tickNow 建立响应，保证歌词在播放时持续刷新
  void tickNow.value;
  return playerStore.currentTime || 0;
});

const currentLyricIndex = computed(() => {
  if (!lyricLines.value.length) return -1;
  const t = displayTime.value;
  let idx = -1;
  for (let i = 0; i < lyricLines.value.length; i += 1) {
    if (t >= lyricLines.value[i].time) idx = i;
    else break;
  }
  return idx;
});

function setLyricLineRef(el: Element | null, idx: number) {
  if (!el) return;
  lyricLineRefs.value[idx] = el as HTMLElement;
}

function getLineWrapStyle(lineIndex: number) {
  const current = currentLyricIndex.value;
  if (current < 0) {
    return {
      opacity: 1,
      filter: 'none',
    };
  }

  const diff = current - lineIndex;

  // 当前行之前：越往前越淡
  if (diff > 0) {
    const opacity = Math.max(0.16, 1 - diff * 0.11);
    const blur = Math.min(2.4, diff * 0.2);
    return {
      opacity,
      filter: `blur(${blur}px)`,
    };
  }

  // 当前行与未播放行：100% 透明度
  return {
    opacity: 1,
    filter: 'none',
  };
}

function getLineStyle(lineIndex: number, line: LyricLine) {
  const baseColor = 'rgba(255,255,255,0.86)';
  const activeColor = '#ffffff';

  if (line.words?.length) {
    return {
      color: lineIndex === currentLyricIndex.value ? activeColor : baseColor,
    };
  }

  const nextLine = lyricLines.value[lineIndex + 1];
  const startMs = line.time * 1000;
  const endMs = (nextLine?.time ?? line.time + 3) * 1000;
  const currentMs = displayTime.value * 1000;

  if (lineIndex < currentLyricIndex.value || currentMs >= endMs) {
    return {
      color: activeColor,
      backgroundImage: 'none',
      WebkitTextFillColor: 'initial',
    };
  }

  if (lineIndex > currentLyricIndex.value || currentMs <= startMs) {
    return {
      color: baseColor,
      backgroundImage: 'none',
      WebkitTextFillColor: 'initial',
    };
  }

  const progress = Math.min(1, Math.max(0, (currentMs - startMs) / Math.max(1, endMs - startMs)));
  const percent = Math.round(progress * 100);

  return {
    backgroundImage: `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${percent}%, ${baseColor} ${percent}%, ${baseColor} 100%)`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  };
}

function getWordStyle(lineIndex: number, word: LyricWord) {
  const baseColor = 'rgba(255,255,255,0.55)';
  const activeColor = '#ffffff';
  const currentMs = displayTime.value * 1000;
  const start = word.startTime;
  const end = word.startTime + Math.max(1, word.duration);

  if (lineIndex < currentLyricIndex.value || currentMs >= end) {
    return {
      color: activeColor,
      backgroundImage: 'none',
      WebkitTextFillColor: 'initial',
    };
  }

  if (lineIndex > currentLyricIndex.value || currentMs <= start) {
    return {
      color: baseColor,
      backgroundImage: 'none',
      WebkitTextFillColor: 'initial',
    };
  }

  const progress = Math.min(1, Math.max(0, (currentMs - start) / (end - start)));
  const percent = Math.round(progress * 100);

  return {
    backgroundImage: `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${percent}%, ${baseColor} ${percent}%, ${baseColor} 100%)`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  };
}

function getTranslationStyle(lineIndex: number) {
  const baseColor = 'rgba(255,255,255,0.62)';
  const activeColor = 'rgba(255,255,255,0.94)';
  const currentMs = displayTime.value * 1000;
  const line = lyricLines.value[lineIndex];

  if (!line) return {};

  if (lineIndex < currentLyricIndex.value) {
    return {
      color: activeColor,
      opacity: 0.92,
      textShadow: '0 0 12px rgba(255,255,255,0.14)',
    };
  }

  if (lineIndex > currentLyricIndex.value) {
    return {
      color: baseColor,
      opacity: 0.72,
    };
  }

  if (!line.translation) {
    return {
      color: baseColor,
      opacity: 0.72,
    };
  }

  const startMs = line.time * 1000;
  const nextStartMs = (lyricLines.value[lineIndex + 1]?.time ?? line.time + 3) * 1000;
  const total = Math.max(1, nextStartMs - startMs);
  const progress = Math.min(1, Math.max(0, (currentMs - startMs) / total));
  const percent = Math.round(progress * 100);

  return {
    backgroundImage: `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${percent}%, ${baseColor} ${percent}%, ${baseColor} 100%)`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    opacity: 1,
  };
}

function scrollCurrentLyricToCenter(index: number, behavior: ScrollBehavior = 'smooth') {
  if (index < 0) return;

  const box = lyricBoxRef.value;
  const lineEl = lyricLineRefs.value[index];
  if (!box || !lineEl) return;

  const anchorY = box.clientHeight * LYRIC_ANCHOR_RATIO;
  const targetTop = lineEl.offsetTop + lineEl.clientHeight / 2 - anchorY;

  box.scrollTo({
    top: Math.max(0, targetTop),
    behavior,
  });
}

watch(currentLyricIndex, async (idx, prev) => {
  if (idx < 0 || isSeeking.value) return;
  await nextTick();
  scrollCurrentLyricToCenter(idx, prev === -1 ? 'auto' : 'smooth');
});

async function extractPaletteFromCover(url?: string) {
  if (!url) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.referrerPolicy = 'no-referrer';
  img.src = url;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject();
  });

  const canvas = document.createElement('canvas');
  const size = 56;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 40) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += 1;
  }

  if (!n) return;

  const ar = Math.round(r / n);
  const ag = Math.round(g / n);
  const ab = Math.round(b / n);

  const clamp = (x: number) => Math.max(0, Math.min(255, x));
  const tone = (dr: number, dg: number, db: number) => `rgb(${clamp(ar + dr)}, ${clamp(ag + dg)}, ${clamp(ab + db)})`;

  palette.value = {
    c1: tone(-52, -46, -40),
    c2: tone(-8, -4, 6),
    c3: tone(42, 34, 26),
    c4: tone(-86, -80, -72),
  };
}

watch(
  () => playerStore.currentTrack?.al?.picUrl,
  async (url) => {
    try {
      await extractPaletteFromCover(url);
    } catch {
      // ignore extract failures and keep previous palette
    }
  },
  { immediate: true },
);

watch(
  () => [playerStore.currentTrack?.id, playerStore.currentTrack?.source, playerStore.currentTrack?.cloudSid],
  async ([id, source, cloudSid]) => {
    lyricLines.value = [];
    lyricLineRefs.value = [];
    lyricSourceText.value = source === 'cloud' ? '云盘歌词' : '歌曲歌词';
    if (!id) return;
    try {
      const data = source === 'cloud' && cloudSid
        ? (await getCloudLyric(Number(playerStore.currentTrack?.cloudOwnerId || playerStore.currentTrack?.uid || 0), cloudSid)).data
        : (await getSongLyric(Number(id))).data;
      lyricLines.value = parseLyrics(data);
      await nextTick();
      if (lyricBoxRef.value) lyricBoxRef.value.scrollTop = 0;
    } catch {
      lyricLines.value = [];
    }
  },
  { immediate: true },
);

onMounted(() => {
  tickTimer = setInterval(() => {
    if (playerStore.isPlaying) {
      tickNow.value = performance.now();
    }
  }, 50);

  nextTick(() => {
    if (currentLyricIndex.value >= 0) {
      scrollCurrentLyricToCenter(currentLyricIndex.value, 'auto');
    }
  });
});

onUnmounted(() => {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
});

function onVolume(e: Event) {
  const value = Number((e.target as HTMLInputElement).value) / 100;
  playerStore.setVolume(value);
}

async function toggleCurrentLike() {
  if (likeLoading.value || !canToggleCurrentLike.value) return;

  const next = !isCurrentLiked.value;
  likeLoading.value = true;

  try {
    const response = isCurrentPodcast.value
      ? await toggleDjSubscribe({ rid: currentPodcastRid.value, subscribe: next, cookie: userStore.loginCookie || undefined })
      : await toggleSongLike({
        id: currentTrackId.value,
        like: next,
        uid: userStore.profile?.userId,
        cookie: userStore.loginCookie || undefined,
      });
    const code = response?.data?.code ?? response?.data?.data?.code;
    if (typeof code === 'number' && code !== 200) {
      throw new Error(`收藏失败，接口返回 ${code}`);
    }

    if (isCurrentPodcast.value) {
      const rid = currentPodcastRid.value;
      const exists = userStore.subscribedDjIds.includes(rid);
      if (next && !exists) userStore.subscribedDjIds = [...userStore.subscribedDjIds, rid];
      if (!next && exists) userStore.subscribedDjIds = userStore.subscribedDjIds.filter((id) => id !== rid);
      return;
    }

    const id = currentTrackId.value;
    if (next) {
      if (!userStore.likedSongIds.includes(id)) {
        userStore.likedSongIds = [...userStore.likedSongIds, id];
      }
    } else {
      userStore.likedSongIds = userStore.likedSongIds.filter((songId) => songId !== id);
    }
  } catch (error) {
    console.error('[player-expanded] toggle like failed', error);
  } finally {
    likeLoading.value = false;
  }
}

function onSeekStart() {
  isSeeking.value = true;
  seekPreviewTime.value = playerStore.currentTime || 0;
}

function onSeek(e: Event) {
  const t = Number((e.target as HTMLInputElement).value);
  seekPreviewTime.value = t;
  playerStore.seek(t);
  tickNow.value = performance.now();
}

function onSeekEnd() {
  seekPreviewTime.value = playerStore.currentTime || 0;
  tickNow.value = performance.now();
  const idx = currentLyricIndex.value;
  if (idx >= 0) {
    nextTick(() => {
      scrollCurrentLyricToCenter(idx, 'auto');
    });
  }
  window.setTimeout(() => {
    isSeeking.value = false;
  }, 80);
}

function seekToLyricLine(index: number) {
  const line = lyricLines.value[index];
  if (!line) return;
  playerStore.seek(line.time);
  tickNow.value = performance.now();
  nextTick(() => {
    scrollCurrentLyricToCenter(index, 'auto');
  });
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function scrollPlaylistIntoView() {
  if (isPersonalFmCurrentTrack.value) return;
  showPlaylistPopup.value = true;
}

async function playFromPopup(index: number) {
  await playerStore.playByIndex(index);
  showPlaylistPopup.value = false;
}

function parseLyrics(payload: any): LyricLine[] {
  const yrcText = payload?.yrc?.lyric || '';
  const lrcText = payload?.lrc?.lyric || '';
  const tlyricText = payload?.tlyric?.lyric || '';

  const lrcLines = parseLrc(lrcText);
  const yrcLines = parseYrc(yrcText);

  // 同步优先使用 LRC 时间轴（更稳定），YRC 只补充逐字数据
  let baseLines: LyricLine[] = [];
  if (lrcLines.length) {
    baseLines = lrcLines.map((line) => ({ ...line }));

    if (yrcLines.length) {
      baseLines = baseLines.map((line) => {
        let best: LyricLine | undefined;
        let minDiff = 1.2;
        for (const yLine of yrcLines) {
          const diff = Math.abs(yLine.time - line.time);
          if (diff <= minDiff) {
            minDiff = diff;
            best = yLine;
          }
        }

        if (!best) return line;
        return {
          ...line,
          text: best.text || line.text,
          words: best.words,
        };
      });
    }
  } else {
    baseLines = yrcLines;
  }

  if (!baseLines.length) return [];

  const tLines = parseLrc(tlyricText);
  if (!tLines.length) return baseLines;

  if (tLines.length === baseLines.length) {
    return baseLines.map((line, index) => ({
      ...line,
      translation: tLines[index]?.text || '',
    }));
  }

  return baseLines.map((line) => {
    let bestText = '';
    let bestDiff = Infinity;
    for (const tLine of tLines) {
      const diff = Math.abs(tLine.time - line.time);
      if (diff < bestDiff && diff <= 2) {
        bestDiff = diff;
        bestText = tLine.text;
      }
    }

    return {
      ...line,
      translation: bestText,
    };
  });
}

function parseLrc(lrc: string): LyricLine[] {
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

function parseYrc(yrc: string): LyricLine[] {
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

      words.push({
        text,
        startTime: lineStartMs + offset,
        duration,
        space: hasTrailingSpace,
      });

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
</script>

<style scoped>
.expanded-wrap {
  position: fixed;
  inset: 0;
  z-index: 60;
  overflow: hidden;
}

.cover-aura {
  position: absolute;
  inset: -8%;
  background: center/cover no-repeat;
  filter: blur(48px) saturate(130%);
  transform: scale(1.08);
  opacity: 0.18;
  pointer-events: none;
}

.expanded-panel {
  width: 100vw;
  height: 100vh;
  padding: var(--space-4) var(--space-6) var(--space-5);
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--space-3);
}

.panel-head { display: flex; justify-content: space-between; align-items: center; }
.now { color: rgba(255,255,255,0.9); font-weight: 600; }
.ghost { height: 32px; border-radius: 10px; border: 1px solid var(--line-muted); background: var(--card-bg-2); color: #fff; padding: 0 var(--space-3); }

.panel-body {
  min-height: 0;
  display: grid;
  grid-template-columns: 40% 60%;
  gap: 0;
  align-items: stretch;
}

.left-zone {
  width: 100%;
  box-sizing: border-box;
  justify-self: stretch;
  align-self: center;
  display: grid;
  justify-items: end;
  gap: var(--space-2);
  padding: var(--space-2) 5% var(--space-2) 0;
}
.album-shell { width: 300px; height: 300px; border-radius: 24px; padding: 0; background: transparent; border: none; box-shadow: none; }
.album-cover { width: 100%; height: 100%; border-radius: 18px; background: #d9dee8 center/cover no-repeat; }
.song-name {
  width: 300px;
  margin: var(--space-2) 0 0;
  color: #ffffff !important;
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  justify-self: end;
}
.song-artist {
  width: 300px;
  margin: 0;
  color: rgba(255,255,255,0.82);
  text-align: center;
  justify-self: end;
}

.progress-wrap { width: 300px; display: grid; gap: var(--space-1); justify-self: end; position: relative; }
.progress { width: 100%; }
.seek-preview {
  justify-self: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.38);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(6px);
  animation: seek-fade-in 120ms ease;
}
.times { display: flex; justify-content: space-between; }
.time { color: rgba(255,255,255,0.78); font-size: 12px; }

.controls {
  width: 300px;
  height: 52px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-1);
  justify-self: end;
}
.ctrl {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: #fff;
  display: inline-grid;
  place-items: center;
  line-height: 1;
  transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}
.ctrl:not(.main) {
  border: none;
  background: transparent;
  box-shadow: none;
  color: #ffffff;
}
.ctrl-fm-indicator {
  width: auto;
  height: 42px;
  padding: 0 4px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
  border: none !important;
  border-radius: 0;
  background: transparent !important;
  box-shadow: none !important;
  color: #fff7d6 !important;
  text-shadow: 0 0 10px rgba(255, 244, 194, 0.35);
  cursor: default;
  pointer-events: none;
}
.ctrl:not(.main) :deep(svg) {
  color: #ffffff;
  stroke: currentColor;
}
.ctrl:not(.main):hover {
  transform: translateY(-1px);
  box-shadow: none;
}
.ctrl:not(.main):active {
  transform: translateY(0);
  box-shadow: none;
}
.ctrl[aria-label='上一首'],
.ctrl[aria-label='下一首'] {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff;
  opacity: 1;
}
.ctrl.main {
  width: 52px;
  height: 52px;
  border: 1px solid color-mix(in srgb, var(--panel-bg-soft) 36%, #ffffff33);
  background: color-mix(in srgb, var(--panel-bg-soft) 52%, #f1d1b4 48%);
  box-shadow: 0 12px 22px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.34);
}

.volume-wrap {
  width: 300px;
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: center;
  color: rgba(255,255,255,0.8);
  justify-self: end;
}
.volume-control {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  align-items: center;
}
.volume-control input {
  min-width: 0;
  flex: 1 1 auto;
}
.volume-icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  display: inline-grid;
  place-items: center;
  border-radius: 6px;
  transition: color 0.16s ease, background 0.16s ease;
  flex-shrink: 0;
}
.volume-icon-btn:hover {
  color: #fff;
  background: rgba(255,255,255,0.08);
}
.volume-icon-btn:active {
  color: rgba(255,255,255,0.65);
}
.favorite-ctrl {
  flex: 0 0 42px;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  outline: none;
}
.favorite-ctrl.saved {
  color: #ff6b8a !important;
}
.favorite-ctrl.saved :deep(svg) {
  fill: currentColor;
}
.favorite-ctrl.loading {
  opacity: 0.7;
  cursor: progress;
}

.right-zone {
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-rows: 1fr;
  gap: 0;
}
.lyric-box {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 0;
  padding: 42% var(--space-2) var(--space-2);
  background: transparent;
  border: 0;
  box-shadow: none;
  scroll-behavior: smooth;
}
.lyric-headline {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  margin: 0 0 var(--space-3);
  color: rgba(255,255,255,0.86);
  font-size: 13px;
}
.line-wrap {
  margin: var(--space-3) 0;
  text-align: center;
  cursor: pointer;
  border-radius: 12px;
  padding: var(--space-2) var(--space-3);
  transition: background-color 140ms ease, box-shadow 140ms ease;
}

.line-wrap:hover {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

.line {
  margin: 0;
  color: rgba(255,255,255,0.55);
  font-size: 30px;
  font-weight: 700;
  line-height: 1.28;
  transition: color 140ms linear;
}

.line.passed {
  color: rgba(255,255,255,0.8);
}

.line.active {
  color: #fff;
  text-shadow: 0 0 18px rgba(255, 255, 255, 0.28);
}

.line-sub {
  margin: var(--space-1) 0 0;
  color: rgba(255,255,255,0.62);
  font-size: 20px;
  font-weight: 500;
  line-height: 1.3;
  transition: color 140ms linear;
}

.line-sub.active {
  color: rgba(255,255,255,0.9);
}

.word {
  display: inline-block;
  color: rgba(255,255,255,0.55);
  transition: color 120ms linear;
}

.word.active,
.word.passed {
  color: #fff;
}

.playlist-popup-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(0, 0, 0, 0.38);
  display: grid;
  place-items: center;
}

.playlist-popup {
  width: min(620px, calc(100vw - 32px));
  max-height: min(70vh, 680px);
  border-radius: 16px;
  border: 1px solid var(--line-muted);
  background:
    linear-gradient(165deg,
      color-mix(in srgb, var(--panel-bg) 78%, #111 22%) 0%,
      color-mix(in srgb, var(--panel-bg-soft) 66%, #151822 34%) 55%,
      color-mix(in srgb, var(--panel-bg) 72%, #0c1018 28%) 100%);
  padding: var(--space-3);
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--space-2);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.38);
}

.playlist-popup-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.playlist-popup h3 { margin: 0; color: #fff; }
.playlist-popup ul { margin: 0; padding: 0; list-style: none; overflow: auto; display: grid; gap: var(--space-1); }
.playlist-popup li { padding: var(--space-2); border-radius: 10px; cursor: pointer; display: grid; border: 1px solid transparent; }
.playlist-popup li.active { background: color-mix(in srgb, var(--panel-bg-soft) 42%, #ffffff12); border-color: var(--line-muted); }
.t { color: #fff; font-size: 13px; }
.a { color: rgba(255,255,255,0.75); font-size: 12px; }

@keyframes seek-fade-in {
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: translateY(0); }
}

.player-sheet-enter-active,
.player-sheet-leave-active { transition: opacity 0.24s ease; }
.player-sheet-enter-active .expanded-panel,
.player-sheet-leave-active .expanded-panel { transition: transform 0.28s ease; }
.player-sheet-enter-from,
.player-sheet-leave-to { opacity: 0; }
.player-sheet-enter-from .expanded-panel,
.player-sheet-leave-to .expanded-panel { transform: translateY(100%); }
</style>
