<template>
  <transition name="player-sheet">
    <div
      v-if="playerStore.expanded"
      class="expanded-wrap"
      :class="{ 'mode-fullscreen': lyricsSettings.displayMode === 'fullscreen' }"
      :style="bgStyle"
      @click.self="playerStore.closeExpanded()"
    >
      <!-- 全屏封面（独立层） -->
      <div v-if="lyricsSettings.showCover && lyricsSettings.displayMode === 'fullscreen'" class="fullscreen-cover" :style="coverStyle" />
      <div class="cover-aura" :style="coverAuraStyle"></div>
      <div v-show="showIridescence" ref="iriContainerRef" class="iri-container"></div>
      <div v-show="showIridescence" class="iri-blur" :style="iriBlurStyle"></div>
      <div v-show="showSoftGradient" class="soft-gradient-bg" :style="{ animationDuration: softGradientDuration + 's' }"></div>
      <div v-show="showThreeScene" ref="threeSceneRef" class="three-scene-container"></div>
      <div v-show="showPaper" ref="paperRef" class="paper-container"></div>
      <div v-show="showMist" ref="mistRef" class="mist-container"></div>
      <div v-show="showLoom" ref="loomRef" class="loom-container"></div>
      <div v-show="showSilk" ref="silkRef" class="silk-container"></div>
      <div v-show="showAurora" ref="auroraRef" class="aurora-container"></div>
      <div v-show="showAmllFluid" class="amll-fluid-container">
        <BackgroundRender
          :album="playerStore.currentTrack?.al?.picUrl || ''"
          :playing="!playerStore.isPlaying"
          :flowSpeed="amllFluidSpeed"
          :fps="30"
          :has-lyric="true"
        />
      </div>
      <section class="expanded-panel">
        <AnimatedAppear tag="header" variant="content" rhythm="head" class-name="panel-head">
          <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="ghost" @click="playerStore.closeExpanded()">返回</AnimatedAppear>
          <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="1" class-name="ghost" @click="playerStore.closeExpanded()">关闭</AnimatedAppear>
        </AnimatedAppear>

        <div class="panel-body" :style="panelBodyStyle">
          <div v-if="!lyricsSettings.showCover || lyricsSettings.displayMode === 'fullscreen'" class="cover-hidden-head">
            <h2 class="song-name-center">{{ playerStore.currentTrack?.name || '未在播放' }}</h2>
            <p class="song-artist-center">
              <template v-if="playerStore.currentTrack?.ar?.length">
                <button v-for="artist in playerStore.currentTrack.ar" :key="artist.id || artist.name" type="button" class="artist-inline-btn" :disabled="!(artist.id || artist.artistId)" @click.stop="openArtist(artist)">{{ artist.name }}</button>
              </template>
              <template v-else>{{ artistText }}</template>
              <span v-if="playerStore.playbackRate !== 1" class="rate-badge">{{ playerStore.playbackRate.toFixed(2).replace(/\.00$/, '.0') }}x</span>
            </p>
          </div>
          <div v-show="showLeftZone" class="left-zone" :class="{ 'mode-cover': lyricsSettings.displayMode === 'cover', 'mode-record': lyricsSettings.displayMode === 'record' }">
            <!-- 封面模式 -->
            <template v-if="lyricsSettings.showCover && lyricsSettings.displayMode === 'cover'">
              <div class="album-shell" :class="{ playing: playerStore.isPlaying }">
                <div class="album-cover" :style="coverStyle"></div>
              </div>
            </template>
            <!-- 唱片模式 -->
            <template v-if="lyricsSettings.showCover && lyricsSettings.displayMode === 'record'">
              <div class="vinyl-record">
                <div class="vinyl-pointer" :class="{ active: playerStore.isPlaying }">
                  <div class="needle" />
                </div>
                <div class="vinyl-disc" :class="{ playing: playerStore.isPlaying }">
                  <div class="record-cover" :style="coverStyle" />
                </div>
              </div>
            </template>
            <template v-if="lyricsSettings.showCover && lyricsSettings.displayMode !== 'fullscreen'">
              <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="song-name">{{ playerStore.currentTrack?.name || '未在播放' }}</AnimatedAppear>
              <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="song-artist">
                <template v-if="playerStore.currentTrack?.ar?.length">
                  <button v-for="artist in playerStore.currentTrack.ar" :key="artist.id || artist.name" type="button" class="artist-inline-btn" :disabled="!(artist.id || artist.artistId)" @click.stop="openArtist(artist)">{{ artist.name }}</button>
                </template>
                <template v-else>{{ artistText }}</template>
                <span v-if="playerStore.playbackRate !== 1" class="rate-badge">{{ playerStore.playbackRate.toFixed(2).replace(/\.00$/, '.0') }}x</span>
              </AnimatedAppear>
            </template>
            <div v-show="showLeftControls" class="progress-wrap">
              <input class="progress" type="range" min="0" :max="Math.max(1, Math.floor(playerStore.duration || 0))" :value="Math.floor(playerStore.currentTime || 0)" @mousedown="onSeekStart" @touchstart="onSeekStart" @input="onSeek" @change="onSeekEnd" @mouseup="onSeekEnd" @touchend="onSeekEnd" />
              <div v-if="isSeeking" class="seek-preview">{{ formatTime(seekPreviewTime) }}</div>
              <div class="times"><span class="time">{{ formatTime(playerStore.currentTime) }}</span><span class="time">{{ formatTime(playerStore.duration) }}</span></div>
            </div>
            <div v-show="showLeftControls" class="controls">
              <button class="ctrl" @click="playerStore.cyclePlayMode()" aria-label="切换播放模式"><Repeat v-if="playerStore.playMode === 'loop'" :size="16" /><Repeat1 v-else-if="playerStore.playMode === 'single'" :size="16" /><Shuffle v-else :size="16" /></button>
              <template v-if="isPersonalFmCurrentTrack">
                <button class="ctrl ctrl-dislike" @click="dislikeFmTrack" aria-label="不喜欢并切换下一首"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10.8 5.5H6.9c-.93 0-1.74.64-1.95 1.54l-1.14 4.9a2 2 0 0 0 1.95 2.46h3.38l-.53 3.92a1.85 1.85 0 0 0 3.4 1.18l4.3-6.14c.2-.28.3-.62.3-.97V7.4a1.9 1.9 0 0 0-1.9-1.9h-3.9Zm7.15 0h1.65A1.4 1.4 0 0 1 21 6.9v6.95a1.4 1.4 0 0 1-1.4 1.4h-1.65V5.5Z"/></svg></button>
                <button class="ctrl main" @click="playerStore.togglePlay()" aria-label="播放或暂停">{{ playerStore.isPlaying ? '❚❚' : '▶' }}</button>
                <button class="ctrl" @click="playerStore.next()" aria-label="下一首"><SkipForward :size="16" /></button>
                <button class="ctrl ctrl-fm-indicator" type="button" aria-label="当前为私人 FM" disabled>FM</button>
              </template>
              <template v-else>
                <button class="ctrl" @click="playerStore.prev()" aria-label="上一首"><SkipBack :size="16" /></button>
                <button class="ctrl main" @click="playerStore.togglePlay()" aria-label="播放或暂停">{{ playerStore.isPlaying ? '❚❚' : '▶' }}</button>
                <button class="ctrl" @click="playerStore.next()" aria-label="下一首"><SkipForward :size="16" /></button>
                <button class="ctrl" @click="scrollPlaylistIntoView" aria-label="查看播放列表"><AlignJustify :size="16" /></button>
              </template>
            </div>
            <div v-show="showLeftControls" class="volume-wrap">
              <div class="volume-control">
                <button class="volume-icon-btn" type="button" :aria-label="playerStore.muted ? '取消静音' : '静音'" @click="playerStore.toggleMute()"><VolumeX v-if="playerStore.muted || playerStore.volume === 0" :size="18" /><Volume v-else-if="playerStore.volume < 0.33" :size="18" /><Volume1 v-else-if="playerStore.volume < 0.66" :size="18" /><Volume2 v-else :size="18" /></button>
                <input type="range" min="0" max="100" :value="Math.round((playerStore.muted ? 0 : playerStore.volume) * 100)" @input="onVolume" />
              </div>
              <button class="ctrl favorite-ctrl" type="button" :class="{ saved: isCurrentLiked, loading: likeLoading }" :aria-pressed="isCurrentLiked" :aria-label="isCurrentLiked ? '取消收藏' : '收藏'" :disabled="likeLoading || !canToggleCurrentLike" @click="toggleCurrentLike"><Heart :size="16" /></button>
            </div>
          </div>
          <LyricsPanel :vinyl-mode="lyricsSettings.displayMode === 'record'" />
        </div>

        <div class="right-actions">
          <button ref="gearBtnRef" class="ra-btn" title="歌词设置" @click="onOpenSettings"><Settings :size="22" /></button>
          <button class="ra-btn" title="歌词延迟0.5秒" @click="playerStore.adjustLyricsOffset(-0.5)"><Minus :size="22" /></button>
          <button class="ra-btn ra-btn--rect" title="点击打开精细调整" @click="showOffsetPanel = !showOffsetPanel">{{ formatOffset(playerStore.lyricsOffset) }}</button>
          <button class="ra-btn" title="歌词提前0.5秒" @click="playerStore.adjustLyricsOffset(0.5)"><Plus :size="22" /></button>
          <button class="ra-btn" title="复制歌曲信息" @click="copyTrackInfo"><Copy :size="16" /></button>
          <button class="ra-btn ra-btn-rect ra-btn-trans" :class="{ 'line-through': !lyricsSettings.showTranslation }" title="切换翻译显示" @click="lyricsSettings.showTranslation = !lyricsSettings.showTranslation; lyricsSettings.save()">译</button>
        </div>

        <Teleport to="body">
          <transition name="offset-fade">
            <div v-if="showOffsetPanel" class="offset-mask" @click="showOffsetPanel = false" @touchstart="showOffsetPanel = false">
              <div class="offset-popover" @click.stop @touchstart.stop>
                <div class="offset-head">歌词偏移</div>
                <div class="offset-body">
                  <button class="of-step" @click="playerStore.adjustLyricsOffset(-0.1)"><Minus :size="18" /></button>
                  <input v-if="editingOffset" ref="offsetInputRef" class="of-input" type="number" step="0.1" :value="playerStore.lyricsOffset" @blur="commitOffset" @keydown.enter="commitOffset" @keydown.escape="editingOffset = false" />
                  <span v-else class="of-value" @click="startEditOffset">{{ playerStore.lyricsOffset > 0 ? '+' : '' }}{{ playerStore.lyricsOffset.toFixed(1) }}s</span>
                  <button class="of-step" @click="playerStore.adjustLyricsOffset(0.1)"><Plus :size="18" /></button>
                </div>
                <div class="of-hint">点击数值可手动输入，步进 ±100ms</div>
                <div class="of-reset-wrap"><button class="of-reset" @click="playerStore.resetLyricsOffset()">重置为 0s</button></div>
              </div>
            </div>
          </transition>
        </Teleport>

        <div v-if="lyricsSettings.showMiniBar" class="bottom-console">
          <div class="cc-left">
            <button class="con-btn" @click="playerStore.closeExpanded()" aria-label="关闭播放页"><ChevronDown :size="18" /></button>
            <button class="con-btn con-fav" :class="{ saved: isCurrentLiked }" type="button" :aria-label="isCurrentLiked ? '取消收藏' : '收藏'" :disabled="likeLoading || !canToggleCurrentLike" @click="toggleCurrentLike"><Heart :size="14" /></button>
            <button class="con-btn" @click="playerStore.cyclePlayMode()" aria-label="切换播放模式"><Repeat v-if="playerStore.playMode === 'loop'" :size="14" /><Repeat1 v-else-if="playerStore.playMode === 'single'" :size="14" /><Shuffle v-else :size="14" /></button>
          </div>
          <div class="cc-center">
            <template v-if="isPersonalFmCurrentTrack">
              <button class="con-btn con-dislike" @click="dislikeFmTrack" aria-label="不喜欢并切换下一首"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10.8 5.5H6.9c-.93 0-1.74.64-1.95 1.54l-1.14 4.9a2 2 0 0 0 1.95 2.46h3.38l-.53 3.92a1.85 1.85 0 0 0 3.4 1.18l4.3-6.14c.2-.28.3-.62.3-.97V7.4a1.9 1.9 0 0 0-1.9-1.9h-3.9Zm7.15 0h1.65A1.4 1.4 0 0 1 21 6.9v6.95a1.4 1.4 0 0 1-1.4 1.4h-1.65V5.5Z"/></svg></button>
            </template>
            <template v-else>
              <button class="con-btn" @click="playerStore.prev()" aria-label="上一首"><SkipBack :size="14" /></button>
            </template>
            <button class="con-btn con-play" @click="playerStore.togglePlay()" aria-label="播放或暂停">{{ playerStore.isPlaying ? '❚❚' : '▶' }}</button>
            <button class="con-btn" @click="playerStore.next()" aria-label="下一首"><SkipForward :size="14" /></button>
          </div>
          <div class="console-progress">
            <span class="console-time">{{ formatTime(playerStore.currentTime) }}</span>
            <input class="console-bar" type="range" min="0" :max="Math.max(1, Math.floor(playerStore.duration || 0))" :value="Math.floor(playerStore.currentTime || 0)" @mousedown="onSeekStart" @touchstart="onSeekStart" @input="onSeek" @change="onSeekEnd" @mouseup="onSeekEnd" @touchend="onSeekEnd" />
            <span class="console-time">{{ formatTime(playerStore.duration) }}</span>
          </div>
          <div class="cc-right">
            <button v-if="isPersonalFmCurrentTrack" class="con-btn con-fm-label" type="button" aria-label="当前为私人 FM" disabled>FM</button>
            <button v-else class="con-btn" @click="scrollPlaylistIntoView" aria-label="查看播放列表"><AlignJustify :size="14" /></button>
            <div class="con-volume">
              <button class="con-btn con-vol-icon" type="button" :aria-label="playerStore.muted ? '取消静音' : '静音'" @click="playerStore.toggleMute()"><VolumeX v-if="playerStore.muted || playerStore.volume === 0" :size="14" /><Volume v-else-if="playerStore.volume < 0.33" :size="14" /><Volume1 v-else-if="playerStore.volume < 0.66" :size="14" /><Volume2 v-else :size="14" /></button>
              <input class="con-vol-slider" type="range" min="0" max="100" :value="Math.round((playerStore.muted ? 0 : playerStore.volume) * 100)" @input="onVolume" />
            </div>
          </div>
        </div>

        <div v-if="showPlaylistPopup" class="playlist-popup-mask" @click.self="showPlaylistPopup = false">
          <aside class="playlist-popup" @click.stop>
            <div class="playlist-popup-head"><h3>播放列表</h3><div class="playlist-popup-actions"><button v-if="playerStore.playlist.length" class="ghost" title="清空列表" @click="onClearPlaylist">清空</button><button class="ghost" @click="showPlaylistPopup = false">关闭</button></div></div>
            <ul v-if="playerStore.playlist.length">
              <li v-for="(track, idx) in playerStore.playlist" :key="track.id" :class="{ active: idx === playerStore.currentIndex }" @click="playFromPopup(idx)">
                <span class="track-num">{{ idx + 1 }}</span>
                <span class="track-info"><span class="t">{{ track.name }}</span><span class="a">{{ (track.ar || []).map((x) => x.name).join('/') }}</span></span>
                <button class="track-remove-btn" title="移出列表" @click.stop="onRemoveTrack(idx)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </li>
            </ul>
            <p v-else class="playlist-empty">列表为空</p>
          </aside>
        </div>
      </section>

      <LyricsSettingsPanel :visible="showSettings" :anchor="settingsAnchor" :accent-color="palette.c3" @close="showSettings = false" />
    </div>
  </transition>
</template>

<script setup lang="ts">
import { AlignJustify, ChevronDown, Copy, Heart, Minus, Plus, Repeat, Repeat1, Settings, Shuffle, SkipBack, SkipForward, Volume, Volume1, Volume2, VolumeX } from 'lucide-vue-next';
import { computed, nextTick, ref, watch } from 'vue';
import { toggleDjSubscribe, toggleSongLike, trashPersonalFm } from '../api/music';
import { playerStore } from '../stores/player';
import { userStore } from '../stores/user';
import { lyricsSettings } from '../stores/lyricsSettings';
import { useIridescence, type IridescenceConfig } from '../composables/useIridescence';
import { useThreeScene } from '../composables/useThreeScene';
import { usePaperShaders } from '../composables/usePaperShaders';
import { useMistBackground } from '../composables/useMistBackground';
import { useDigitalLoom } from '../composables/useDigitalLoom';
import { useSilkBackground } from '../composables/useSilkBackground';
import { useAuroraShader } from '../composables/useAuroraShader';
import { BackgroundRender } from '@applemusic-like-lyrics/vue';
import AnimatedAppear from './AnimatedAppear.vue';
import LyricsPanel from './LyricsPanel.vue';
import LyricsSettingsPanel from './LyricsSettingsPanel.vue';

const emit = defineEmits<{ 'open-artist': [artist: Record<string, any>] }>();

const artistText = computed(() => { const ar = playerStore.currentTrack?.ar || []; return ar.length ? ar.map((a) => a.name).join('/') : 'Unknown Artist'; });
function openArtist(artist: Record<string, any>) { const id = Number(artist?.id || artist?.artistId || 0); if (id) emit('open-artist', artist); }
const coverStyle = computed(() => { const url = playerStore.currentTrack?.al?.picUrl; return url ? { backgroundImage: `url(${url})` } : {}; });

const palette = ref({ c1: 'rgb(28, 33, 53)', c2: 'rgb(84, 110, 126)', c3: 'rgb(195, 156, 118)', c4: 'rgb(20, 24, 36)' });
const showPlaylistPopup = ref(false);
const showSettings = ref(false);
const showOffsetPanel = ref(false);
const settingsAnchor = ref({ top: 0, right: 0 });
const gearBtnRef = ref<HTMLElement | null>(null);

function onOpenSettings() {
  const btn = gearBtnRef.value;
  if (btn) { const r = btn.getBoundingClientRect(); settingsAnchor.value = { top: r.top - 8, right: window.innerWidth - r.left + 12 }; }
  showSettings.value = true;
}

const isPersonalFmCurrentTrack = computed(() => playerStore.isPersonalFmTrack(playerStore.currentTrack));
const currentTrackId = computed(() => Number(playerStore.currentTrack?.id || 0));
const currentPodcastRid = computed(() => Number(playerStore.currentTrack?.podcast?.rid || 0));
const isCurrentPodcast = computed(() => playerStore.currentTrack?.source === 'podcast' && currentPodcastRid.value > 0);
const canToggleCurrentLike = computed(() => isCurrentPodcast.value ? currentPodcastRid.value > 0 : currentTrackId.value > 0);
const likedSongSignature = computed(() => userStore.likedSongIds.join(','));
const subscribedDjSignature = computed(() => userStore.subscribedDjIds.join(','));
const isCurrentLiked = computed(() => {
  void likedSongSignature.value; void subscribedDjSignature.value;
  if (isCurrentPodcast.value) return userStore.subscribedDjIds.includes(currentPodcastRid.value);
  return currentTrackId.value > 0 ? userStore.likedSongIds.includes(currentTrackId.value) : false;
});
const likeLoading = ref(false);
watch(() => `${currentTrackId.value}-${currentPodcastRid.value}-${playerStore.currentTrack?.source || 'song'}`, () => { likeLoading.value = false; }, { immediate: true });

const isSeeking = ref(false);
const seekPreviewTime = ref(0);

/* ---- custom background modes ---- */
const iriContainerRef = ref<HTMLElement | null>(null);
const showIridescence = computed(() => lyricsSettings.bgMode === 'custom' && lyricsSettings.bgCustomMode === 'iridescence');
const showSoftGradient = computed(() => lyricsSettings.bgMode === 'custom' && lyricsSettings.bgCustomMode === 'soft-gradient');
const softGradientDuration = computed(() => {
  const speed = lyricsSettings.iriSpeed || 5;
  return 12 - speed;
});
const threeSceneRef = ref<HTMLElement | null>(null);
const showThreeScene = computed(() => lyricsSettings.bgMode === 'custom' && lyricsSettings.bgCustomMode === 'three-scene');
const threeSceneActive = computed(() => showThreeScene.value && playerStore.expanded);
useThreeScene(threeSceneRef, threeSceneActive);
const paperRef = ref<HTMLElement | null>(null);
const showPaper = computed(() => lyricsSettings.bgMode === 'custom' && lyricsSettings.bgCustomMode === 'paper-shaders');
const paperActive = computed(() => showPaper.value && playerStore.expanded);
const paperConfig = computed(() => ({
  color1: lyricsSettings.iriColors?.[0] || '#3A29FF',
  color2: lyricsSettings.iriColors?.[1] || '#FF94B4',
  color3: lyricsSettings.iriColors?.[2] || '#FF3232',
  color4: lyricsSettings.iriColors?.[3] || '#1a1a2e',
  speed: (lyricsSettings.iriSpeed || 5) / 10,
}));
usePaperShaders(paperRef, paperConfig, paperActive);
const mistRef = ref<HTMLElement | null>(null);
const showMist = computed(() => lyricsSettings.bgMode === 'custom' && lyricsSettings.bgCustomMode === 'mist');
const mistActive = computed(() => showMist.value && playerStore.expanded);
useMistBackground(mistRef, mistActive);
const loomRef = ref<HTMLElement | null>(null);
const showLoom = computed(() => lyricsSettings.bgMode === 'custom' && lyricsSettings.bgCustomMode === 'digital-loom');
const loomActive = computed(() => showLoom.value && playerStore.expanded);
useDigitalLoom(loomRef, loomActive);
const silkRef = ref<HTMLElement | null>(null);
const showSilk = computed(() => lyricsSettings.bgMode === 'custom' && lyricsSettings.bgCustomMode === 'silk');
const silkActive = computed(() => showSilk.value && playerStore.expanded);
useSilkBackground(silkRef, silkActive);
const auroraRef = ref<HTMLElement | null>(null);
const showAurora = computed(() => lyricsSettings.bgMode === 'custom' && lyricsSettings.bgCustomMode === 'aurora');
const auroraActive = computed(() => showAurora.value && playerStore.expanded);
useAuroraShader(auroraRef, auroraActive);

/* ---- AMLL fluid background ---- */
const showAmllFluid = computed(() => lyricsSettings.bgMode === 'custom' && lyricsSettings.bgCustomMode === 'amll-fluid');
const amllFluidSpeed = computed(() => {
  const speed = lyricsSettings.iriSpeed || 5;
  return speed / 5; // 0-10 → 0-2
});
const iriConfig = computed((): IridescenceConfig => {
  const toRgb = (hex: string) => { const h = (hex || '#3A29FF').replace('#',''); return [parseInt(h.substring(0,2),16)/255, parseInt(h.substring(2,4),16)/255, parseInt(h.substring(4,6),16)/255] as [number,number,number]; };
  return {
    color1: toRgb(lyricsSettings.iriColors?.[0]),
    color2: toRgb(lyricsSettings.iriColors?.[1]),
    color3: toRgb(lyricsSettings.iriColors?.[2]),
    speed: (lyricsSettings.iriSpeed || 5) / 10,
    amplitude: (lyricsSettings.iriScale || 5) / 10,
  };
});
const iriActive = computed(() => showIridescence.value && playerStore.expanded);
useIridescence(iriContainerRef, iriConfig, iriActive);

const iriBlurStyle = computed(() => {
  const px = ((lyricsSettings.iriBlur || 0) / 10) * 24;
  return { backdropFilter: `blur(${px}px)`, WebkitBackdropFilter: `blur(${px}px)` };
});

const coverAuraStyle = computed(() => { const url = playerStore.currentTrack?.al?.picUrl; return url ? { backgroundImage: `url(${url})` } : {}; });

/* settings-driven */
const showLeftZone = computed(() => lyricsSettings.showCover && lyricsSettings.displayMode !== 'fullscreen');
const showLeftControls = computed(() => !lyricsSettings.showMiniBar);

const displayMode = computed(() => lyricsSettings.displayMode);

const panelBodyStyle = computed(() => {
  if (!lyricsSettings.showCover || lyricsSettings.displayMode === 'fullscreen') return { gridTemplateColumns: '1fr', gridTemplateRows: 'auto 1fr', rowGap: 'var(--space-3)' };
  if (!lyricsSettings.showLyrics) return { gridTemplateColumns: '1fr' };
  return { gridTemplateColumns: `${lyricsSettings.contentWidth}% ${100 - lyricsSettings.contentWidth}%` };
});

const bgStyle = computed(() => {
  const { bgMode } = lyricsSettings;
  // 自定义模式 → 虹彩效果由 canvas 渲染
  if (bgMode === 'custom') {
    if (lyricsSettings.bgCustomMode === 'soft-gradient') {
      return {
        background: '#0a0c14',
        '--panel-bg': 'rgba(0,0,0,0.3)',
        '--panel-bg-soft': 'rgba(0,0,0,0.2)',
        '--card-bg': 'rgba(18,20,28,0.92)',
        '--card-bg-2': 'rgba(24,26,36,0.94)',
        '--line-muted': 'rgba(255,255,255,0.12)',
        '--accent': palette.value.c3,
      };
    }
    return {
      background: '#0a0c14',
      '--panel-bg': 'rgba(0,0,0,0.3)',
      '--panel-bg-soft': 'rgba(0,0,0,0.2)',
      '--card-bg': 'rgba(18,20,28,0.92)',
      '--card-bg-2': 'rgba(24,26,36,0.94)',
      '--line-muted': 'rgba(255,255,255,0.12)',
      '--accent': palette.value.c3,
    };
  }
  // 基础模式（仅默认主题）
  return {
    background: `linear-gradient(160deg, ${palette.value.c1} 0%, ${palette.value.c2} 42%, ${palette.value.c4} 100%)`,
    '--panel-bg': palette.value.c1, '--panel-bg-soft': palette.value.c2,
    '--card-bg': 'rgba(18,20,28,0.96)', '--card-bg-2': 'rgba(24,26,36,0.98)',
    '--line-muted': 'rgba(255,255,255,0.16)', '--accent': palette.value.c3,
  };
});

async function dislikeFmTrack() {
  const track = playerStore.currentTrack;
  const id = Number(track?.id || 0);
  if (!id) return;
  try { await trashPersonalFm(id, userStore.loginCookie || undefined); } catch { /* ignore */ }
  playerStore.next();
}
async function extractPaletteFromCover(url?: string) {
  if (!url) return;
  const img = new Image(); img.crossOrigin = 'anonymous'; img.referrerPolicy = 'no-referrer'; img.src = url;
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); });
  const canvas = document.createElement('canvas'); const size = 56; canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.drawImage(img, 0, 0, size, size); const { data } = ctx.getImageData(0, 0, size, size);
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) { if (data[i + 3] < 40) continue; r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1; }
  if (!n) return;
  const ar = Math.round(r / n), ag = Math.round(g / n), ab = Math.round(b / n);
  const clamp = (x: number) => Math.max(0, Math.min(255, x));
  const tone = (dr: number, dg: number, db: number) => `rgb(${clamp(ar + dr)},${clamp(ag + dg)},${clamp(ab + db)})`;
  palette.value = { c1: tone(-52, -46, -40), c2: tone(-8, -4, 6), c3: tone(42, 34, 26), c4: tone(-86, -80, -72) };
}

watch(() => playerStore.currentTrack?.al?.picUrl, async (url) => { try { await extractPaletteFromCover(url); } catch { /* keep previous */ } }, { immediate: true });

function onVolume(e: Event) { playerStore.setVolume(Number((e.target as HTMLInputElement).value) / 100); }
async function toggleCurrentLike() {
  if (likeLoading.value || !canToggleCurrentLike.value) return;
  const next = !isCurrentLiked.value; likeLoading.value = true;
  try {
    const response = isCurrentPodcast.value
      ? await toggleDjSubscribe({ rid: currentPodcastRid.value, subscribe: next, cookie: userStore.loginCookie || undefined })
      : await toggleSongLike({ id: currentTrackId.value, like: next, uid: userStore.profile?.userId, cookie: userStore.loginCookie || undefined });
    if (typeof (response?.data?.code ?? response?.data?.data?.code) === 'number' && (response?.data?.code ?? response?.data?.data?.code) !== 200) throw new Error('收藏失败');
    if (isCurrentPodcast.value) {
      const rid = currentPodcastRid.value;
      if (next && !userStore.subscribedDjIds.includes(rid)) userStore.subscribedDjIds = [...userStore.subscribedDjIds, rid];
      if (!next) userStore.subscribedDjIds = userStore.subscribedDjIds.filter((id) => id !== rid);
    } else {
      if (next && !userStore.likedSongIds.includes(currentTrackId.value)) userStore.likedSongIds = [...userStore.likedSongIds, currentTrackId.value];
      if (!next) userStore.likedSongIds = userStore.likedSongIds.filter((id) => id !== currentTrackId.value);
    }
  } catch { console.error('[player-expanded] toggle like failed'); }
  finally { likeLoading.value = false; }
}
function onSeekStart() { isSeeking.value = true; seekPreviewTime.value = playerStore.currentTime || 0; }
function onSeek(e: Event) { const t = Number((e.target as HTMLInputElement).value); seekPreviewTime.value = t; playerStore.seek(t); }
function onSeekEnd() { seekPreviewTime.value = playerStore.currentTime || 0; setTimeout(() => { isSeeking.value = false; }, 80); }
function formatTime(sec: number) { const s = Math.max(0, Math.floor(sec || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function scrollPlaylistIntoView() { if (!isPersonalFmCurrentTrack.value) showPlaylistPopup.value = true; }
async function playFromPopup(index: number) { await playerStore.playByIndex(index); showPlaylistPopup.value = false; }
function onRemoveTrack(index: number) { playerStore.removeFromPlaylist(index); }
function onClearPlaylist() { playerStore.clearPlaylist(); showPlaylistPopup.value = false; }
const editingOffset = ref(false);
const offsetInputRef = ref<HTMLInputElement | null>(null);

function startEditOffset() { editingOffset.value = true; nextTick(() => offsetInputRef.value?.focus()); }
function commitOffset(e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  if (!isNaN(v)) { playerStore.resetLyricsOffset(); playerStore.adjustLyricsOffset(Math.max(-10, Math.min(10, v))); }
  editingOffset.value = false;
}

function copyTrackInfo() { const t = playerStore.currentTrack; if (!t?.name) return; navigator.clipboard.writeText(`${t.name} - ${(t.ar||[]).map(a=>a.name).join('/')}`); }
function formatOffset(v: number) { if (v === 0) return '0s'; const sign = v > 0 ? '+' : ''; return `${sign}${v.toFixed(1)}s`; }
</script>

<style scoped>
.expanded-wrap { position: fixed; inset: 0; z-index: 60; overflow: hidden; }
.cover-aura { position: absolute; inset: -8%; background: center/cover no-repeat; filter: blur(48px) saturate(130%); transform: scale(1.08); opacity: 0.18; pointer-events: none; }
.expanded-panel { position: relative; z-index: 2; width: 100vw; height: 100vh; padding: var(--space-4) var(--space-6) var(--space-5); box-sizing: border-box; display: grid; grid-template-rows: auto 1fr; gap: var(--space-3); }
.panel-head { display: flex; justify-content: space-between; align-items: center; }
.cover-hidden-head { text-align: center; padding: var(--space-4) var(--space-4) 0; }
.song-name-center { margin: 0; color: #fff !important; font-size: 36px; font-weight: 700; line-height: 1.2; }
.song-artist-center { margin: var(--space-1) 0 0; color: rgba(255,255,255,0.82) !important; font-size: 18px; }
.song-artist-center .rate-badge { margin-left: 8px; }
.ghost { height: 32px; border-radius: 10px; border: 1px solid var(--line-muted); background: var(--card-bg-2); color: #fff; padding: 0 var(--space-3); }
.artist-inline-btn { background: none; border: none; color: inherit; padding: 0; font: inherit; cursor: pointer; outline: none; }
.artist-inline-btn:focus-visible { outline: none; }
.panel-body { min-height: 0; display: grid; grid-template-columns: 40% 60%; gap: 0; align-items: start; transition: grid-template-columns 0.3s ease; }
.left-zone { width: 100%; box-sizing: border-box; justify-self: stretch; align-self: center; display: grid; justify-items: center; gap: var(--space-2); padding: var(--space-2) 5% var(--space-2) 0; }
.album-shell { width: 480px; height: 480px; border-radius: 24px; padding: 0; background: transparent; border: none; box-shadow: none; transform: scale(0.92); transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.album-shell.playing { transform: scale(1); }
.album-cover { width: 100%; height: 100%; border-radius: 18px; background: #d9dee8 center/cover no-repeat; }
.song-name { width: 480px; margin: var(--space-2) 0 0; color: #ffffff !important; font-size: 36px; font-weight: 700; text-align: center;  }
.song-artist { width: 480px; margin: 0; color: rgba(255,255,255,0.82); text-align: center;  }
.progress-wrap { width: 300px; display: grid; gap: var(--space-1); position: relative; }
.progress { width: 100%; }
.seek-preview { justify-self: center; padding: 2px 8px; border-radius: 999px; font-size: 12px; color: #fff; background: rgba(0,0,0,0.38); border: 1px solid rgba(255,255,255,0.18); backdrop-filter: blur(6px); animation: seek-fade-in 120ms ease; }
.times { display: flex; justify-content: space-between; }
.time { color: rgba(255,255,255,0.78); font-size: 12px; }
.controls { width: 300px; height: 52px; display: flex; justify-content: center; align-items: center; gap: var(--space-3); margin-top: var(--space-1);  }
.ctrl { width: 42px; height: 42px; border-radius: 50%; color: #fff; display: inline-grid; place-items: center; line-height: 1; transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease; }
.ctrl:not(.main) { border: none; background: transparent; box-shadow: none; color: #ffffff; }
.ctrl-fm-indicator { width: auto; height: 42px; padding: 0 4px; font-size: 14px; font-weight: 800; letter-spacing: 0.08em; border: none !important; border-radius: 0; background: transparent !important; box-shadow: none !important; color: #fff7d6 !important; text-shadow: 0 0 10px rgba(255,244,194,0.35); cursor: default; pointer-events: none; }
.ctrl-dislike { color: #fff !important; }
.ctrl-dislike:hover { color: rgba(255,255,255,0.7) !important; }
.con-dislike { color: #fff !important; }
.ctrl:not(.main) :deep(svg) { color: #ffffff; stroke: currentColor; }
.ctrl:not(.main):hover { transform: translateY(-1px); }
.ctrl:not(.main):active { transform: translateY(0); }
.ctrl.main { width: 52px; height: 52px; border: 1px solid color-mix(in srgb, var(--panel-bg-soft) 36%, #ffffff33); background: color-mix(in srgb, var(--panel-bg-soft) 52%, #f1d1b4 48%); box-shadow: 0 12px 22px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.34); }
.volume-wrap { width: 300px; display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; color: rgba(255,255,255,0.8);  }
.volume-control { min-width: 0; flex: 1 1 auto; display: flex; justify-content: center; gap: var(--space-2); align-items: center; }
.volume-control input { min-width: 0; flex: 1 1 auto; }
.volume-icon-btn { width: 28px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.8); cursor: pointer; display: inline-grid; place-items: center; border-radius: 6px; transition: color 0.16s ease, background 0.16s ease; flex-shrink: 0; }
.volume-icon-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }
.favorite-ctrl { flex: 0 0 42px; border: none !important; background: transparent !important; box-shadow: none !important; outline: none; }
.favorite-ctrl.saved { color: #ff6b8a !important; }
.favorite-ctrl.saved :deep(svg) { fill: currentColor; }
/* iridescence canvas */
.iri-container { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.iri-container :deep(canvas) { width: 100% !important; height: 100% !important; display: block; }
.iri-blur { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; background: transparent; }
.three-scene-container { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.three-scene-container :deep(canvas) { width: 100% !important; height: 100% !important; display: block; }
.paper-container { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.paper-container { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.paper-container :deep(canvas) { width: 100% !important; height: 100% !important; display: block; }
.mist-container { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.mist-container { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.mist-container :deep(canvas) { width: 100% !important; height: 100% !important; display: block; }
.loom-container { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.silk-container { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.aurora-container { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.amll-fluid-container { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.amll-fluid-container :deep(canvas) { width: 100% !important; height: 100% !important; display: block; object-fit: cover; }
.aurora-container :deep(canvas) { width: 100% !important; height: 100% !important; display: block; }
/* right actions */
.right-actions { position: fixed; right: 16px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; gap: var(--space-3); z-index: 65; }
.ra-btn {
  width: 44px; height: 44px; border-radius: 50%; border: none;
  background: transparent; color: rgba(255,255,255,0.5);
  cursor: pointer; display: grid; place-items: center;
  font-size: 12px; font-weight: 700;
  transition: color 120ms ease, background 120ms ease;
  flex-shrink: 0;
}
.ra-btn svg { width: 22px; height: 22px; stroke-width: 2.5; }
.ra-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
.ra-btn--rect { border-radius: 10px; font-size: 14px; width: 44px; }
.ra-btn-trans { font-size: 16px; font-weight: 800; letter-spacing: 0.02em; }
.ra-btn-trans.line-through { text-decoration: line-through; opacity: 0.5; }
.ra-icon { position: relative; display: grid; place-items: center; }
.ra-badge {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  font-size: 9px; font-weight: 800;
  color: rgba(255,255,255,0.85);
  pointer-events: none;
}
/* offset popover */
.offset-mask { position: fixed; inset: 0; z-index: 110; background: transparent; }
.offset-popover {
  position: fixed; right: 60px; top: 50%; transform: translateY(-50%);
  width: 200px; padding: var(--space-3) var(--space-4);
  background: var(--bg-surface, #1a1c28);
  border: 1px solid var(--border, rgba(255,255,255,0.12));
  border-radius: var(--radius-lg, 14px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  display: grid; gap: var(--space-2);
  transform-origin: right center;
  animation: offset-in 0.2s cubic-bezier(0.22,1,0.36,1);
}
@keyframes offset-in { from { opacity: 0; transform: translateY(-50%) scale(0.92) translateX(8px); } to { opacity: 1; } }
.offset-head { color: var(--text-main,#fff); font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-align: center; }
.offset-body { display: flex; align-items: center; justify-content: center; gap: var(--space-2); }
.of-step {
  width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-soft, rgba(255,255,255,0.12));
  background: transparent; color: rgba(255,255,255,0.7);
  cursor: pointer; display: grid; place-items: center;
  transition: all 120ms ease; flex-shrink: 0;
}
.of-step:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.3); }
.of-step svg { stroke-width: 2.5; }
.of-value {
  color: var(--accent,#c39c76); font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums;
  min-width: 72px; text-align: center; cursor: pointer; padding: 2px 6px; border-radius: 6px;
  transition: background 120ms ease;
}
.of-value:hover { background: rgba(255,255,255,0.06); }
.of-input {
  width: 72px; text-align: center; font-size: 20px; font-weight: 800;
  background: rgba(255,255,255,0.08); border: 1px solid var(--accent,#c39c76);
  color: var(--accent,#c39c76); border-radius: 8px; padding: 4px 6px;
  outline: none; font-variant-numeric: tabular-nums; -moz-appearance: textfield;
}
.of-input::-webkit-inner-spin-button,
.of-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.of-hint { color: var(--text-soft, rgba(255,255,255,0.4)); font-size: 11px; text-align: center; }
.of-reset-wrap { text-align: center; }
.of-reset {
  padding: 5px 14px; border-radius: 999px; border: 1px solid var(--border-soft, rgba(255,255,255,0.1));
  background: transparent; color: var(--text-soft, rgba(255,255,255,0.6)); font-size: 12px; cursor: pointer;
  transition: all 120ms ease;
}
.of-reset:hover { color: var(--accent,#c39c76); border-color: var(--accent, rgba(195,156,118,0.4)); }
.offset-fade-enter-active, .offset-fade-leave-active { transition: opacity 0.15s ease; }
.offset-fade-enter-from, .offset-fade-leave-to { opacity: 0; }
/* bottom console */
.bottom-console {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  gap: 2px;
  grid-template-columns: 1fr auto 1fr;
  grid-template-rows: auto 1fr;
  padding: 0 var(--space-5) var(--space-3);
  z-index: 70;
}
.console-progress { grid-column: 2; grid-row: 2; display: flex; align-items: center; gap: var(--space-2); justify-self: center; width: 175%; }
.console-time { color: rgba(255,255,255,0.5); font-size: 11px; min-width: 32px; font-variant-numeric: tabular-nums; }
.console-time:last-child { text-align: right; }
.console-bar { flex: 1; height: 10px; accent-color: var(--accent, #c39c76); cursor: pointer; border-radius: 5px; }
.cc-left { grid-column: 1; grid-row: 1 / 3; display: flex; align-items: flex-end; gap: var(--space-2); padding-bottom: 6px; }
.cc-center { grid-column: 2; grid-row: 1; display: flex; align-items: center; justify-content: center; gap: var(--space-2); padding-top: var(--space-2); }
.cc-right { grid-column: 3; grid-row: 1 / 3; display: flex; align-items: flex-end; justify-content: flex-end; gap: var(--space-2); padding-bottom: 6px; }
.cc-left .con-btn, .cc-right .con-btn { width: 44px; height: 44px; }
.cc-left .con-btn svg, .cc-right .con-btn svg { width: 22px; height: 22px; }
.cc-right .con-vol-icon { width: 40px; height: 40px; }
.cc-right .con-vol-icon svg { width: 20px; height: 20px; }
.cc-right .con-vol-slider { width: 88px; }
.cc-center { display: flex; align-items: center; gap: var(--space-2); }
.cc-center .con-btn { width: 44px; height: 44px; }
.cc-center .con-btn svg { width: 22px; height: 22px; }
.cc-center .con-play { width: 50px; height: 50px; font-size: 18px; }
.con-btn {
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: transparent; color: rgba(255,255,255,0.8);
  cursor: pointer; display: grid; place-items: center;
  font-size: 12px; transition: transform 0.12s ease, background 0.12s ease;
  flex-shrink: 0;
}
.con-btn:hover { transform: scale(1.12); background: rgba(255,255,255,0.1); }
.con-btn svg { stroke-width: 2.5; }
.con-btn:active { transform: scale(0.95); }
.con-play { width: 42px; height: 42px; background: rgba(255,255,255,0.15); font-size: 16px; }
.con-play:hover { background: rgba(255,255,255,0.22); }
.con-fm-label { font-size: 14px; font-weight: 700; letter-spacing: 0.04em; background: transparent !important; border-radius: 0 !important; opacity: 1 !important; cursor: default !important; }
.con-fm-label:hover { transform: none !important; background: transparent !important; }
.con-volume { display: flex; align-items: center; gap: 4px; }
.con-vol-icon { width: 28px; height: 28px; }
.con-vol-slider { width: 64px; height: 4px; accent-color: var(--accent, #c39c76); }
.con-fav.saved { color: var(--accent) !important; }
.con-fav.saved :deep(svg) { fill: currentColor; }
/* playlist popup */
.playlist-popup-mask { position: fixed; inset: 0; z-index: 90; background: rgba(0,0,0,0.38); display: grid; place-items: center; }
.playlist-popup { width: min(620px, calc(100vw - 32px)); max-height: min(70vh, 680px); border-radius: 16px; border: 1px solid var(--line-muted); background: linear-gradient(165deg, color-mix(in srgb, var(--panel-bg) 78%, #111 22%) 0%, color-mix(in srgb, var(--panel-bg-soft) 66%, #151822 34%) 55%, color-mix(in srgb, var(--panel-bg) 72%, #0c1018 28%) 100%); padding: var(--space-3); display: grid; grid-template-rows: auto 1fr; gap: var(--space-2); box-shadow: 0 18px 45px rgba(0,0,0,0.38); }
.playlist-popup-head { display: flex; align-items: center; justify-content: space-between; }
.playlist-popup-actions { display: flex; gap: var(--space-2); }
.playlist-popup h3 { margin: 0; color: #fff; }
.playlist-popup ul { margin: 0; padding: 0; list-style: none; overflow: auto; display: grid; gap: var(--space-1); }
.playlist-popup li { padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3); border-radius: 10px; cursor: pointer; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--space-2); border: 1px solid transparent; transition: background 120ms ease; }
.playlist-popup li.active { background: color-mix(in srgb, var(--panel-bg-soft) 42%, #ffffff12); border-color: var(--line-muted); }
.playlist-popup li:hover { background: color-mix(in srgb, var(--panel-bg-soft) 28%, #ffffff08); }
.track-num { color: rgba(255,255,255,0.35); font-size: 12px; width: 20px; text-align: center; flex-shrink: 0; }
.track-info { min-width: 0; display: grid; gap: 2px; }
.t { color: #fff; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.a { color: rgba(255,255,255,0.75); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.track-remove-btn { width: 28px; height: 28px; border: none; background: transparent; color: rgba(255,255,255,0.35); cursor: pointer; display: grid; place-items: center; border-radius: 6px; opacity: 0; transition: opacity 120ms ease, color 120ms ease, background 120ms ease; flex-shrink: 0; }
.playlist-popup li:hover .track-remove-btn { opacity: 1; }
.track-remove-btn:hover { color: rgba(255,100,100,0.9); background: rgba(255,100,100,0.12); }
.playlist-empty { color: rgba(255,255,255,0.35); text-align: center; padding: var(--space-6) 0; margin: 0; }
@keyframes seek-fade-in { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }
.player-sheet-enter-active, .player-sheet-leave-active { transition: opacity 0.24s ease; }
.player-sheet-enter-active .expanded-panel, .player-sheet-leave-active .expanded-panel { transition: transform 0.28s ease; }
.player-sheet-enter-from, .player-sheet-leave-to { opacity: 0; }
.player-sheet-enter-from .expanded-panel, .player-sheet-leave-to .expanded-panel { transform: translateY(100%); }
.soft-gradient-bg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }

/* ── 全屏封面 ── */
.fullscreen-cover {
  position: fixed;
  left: 0;
  top: 0;
  width: 60vw;
  height: 100vh;
  z-index: 0;
  background: center/cover no-repeat;
  mask-image: linear-gradient(to right, #000 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, #000 80%, transparent 100%);
  pointer-events: none;
}
.expanded-wrap.mode-fullscreen .panel-body {
  grid-template-columns: 1fr !important;
}

/* ── 唱片模式（SPlayer 风格）── */
.vinyl-record {
  position: relative;
  width: min(52vh, 480px);
  aspect-ratio: 1 / 1;
}
/* 唱针 */
.vinyl-pointer {
  position: absolute;
  width: 30%;
  aspect-ratio: 1 / 1.8;
  left: 46%;
  top: -22%;
  z-index: 5;
  pointer-events: none;
}
/* 指针主体 */
.needle {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-25deg);
  transform-origin: 59.76% 22%;
  z-index: 9;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  background: url(/images/needle.png) center/100% 100% no-repeat;
}
.vinyl-pointer.active .needle {
  transform: rotate(-3deg);
  animation: needle-swing 1.5s ease-in-out infinite alternate;
}
@keyframes needle-swing {
  from { transform: rotate(-4deg); }
  to   { transform: rotate(-1.5deg); }
}
/* 唱片 */
.vinyl-disc {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  /* 黑胶盘面纹理：多层交替同心圆 */
  background:
    radial-gradient(circle at center,
      #000 0%, #000 3%, #222 4%, #222 5%,
      #0a0a0a 6%, #1a1a1a 7%,
      #000 8.5%, #222 9.5%,
      #0a0a0a 10.5%, #1a1a1a 11.5%,
      #000 13%, #222 14%,
      #0a0a0a 15%, #1a1a1a 16%,
      #000 17.5%, #222 18.5%,
      #0a0a0a 19.5%, #1a1a1a 20.5%,
      #000 22%, #222 23%,
      #0a0a0a 24%, #1a1a1a 25%,
      #000 27%, #222 28%,
      #0a0a0a 29%, #1a1a1a 30%,
      #000 32%, #222 33%,
      #0a0a0a 34%, #1a1a1a 36%,
      #000 37.5%, #222 38.5%,
      #0a0a0a 40%, #1a1a1a 42%,
      #000 43.5%, #222 44.5%,
      #0a0a0a 46%, #1a1a1a 48%,
      #000 50%, #222 51%,
      #0a0a0a 53%, #1a1a1a 55%,
      #000 57%, #222 58%,
      #0a0a0a 60%, #1a1a1a 62%,
      #000 64%, #222 65.5%,
      #0a0a0a 67%, #1a1a1a 69%,
      #000 71%, #222 72.5%,
      #0a0a0a 74%, #1a1a1a 76%,
      #000 78%, #222 79%,
      #0a0a0a 81%, #111 100%
    );
  box-shadow:
    0 8px 32px rgba(0,0,0,0.6),
    inset 0 2px 4px rgba(255,255,255,0.05),
    inset 0 -1px 2px rgba(0,0,0,0.5);
  animation: playerCoverRotate 40s linear infinite;
  animation-play-state: paused;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vinyl-disc.playing {
  animation-play-state: running;
}
/* 唱片内侧高光晕 */
.vinyl-disc::after {
  content: '';
  position: absolute;
  width: 64%;
  height: 64%;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%,
    rgba(255,255,255,0.06) 0%,
    transparent 70%
  );
  pointer-events: none;
}
/* 内圈封面（专辑图） */
.record-cover {
  width: 64%;
  height: 64%;
  border-radius: 50%;
  background: #d9dee8 center/cover no-repeat;
  border: 3px solid rgba(255,255,255,0.2);
  box-shadow:
    0 0 0 2px rgba(0,0,0,0.3),
    0 4px 16px rgba(0,0,0,0.5);
  position: relative;
  z-index: 1;
}
</style>
<style>
@property --hue1 { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
@property --hue2 { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
.soft-gradient-bg {
  background-image:
    linear-gradient(in oklch longer hue to right, oklch(0.95 0.07 var(--hue1) / 60%), oklch(0.92 0.08 var(--hue2) / 60%)),
    linear-gradient(in oklch longer hue to bottom, oklch(0.95 0.07 var(--hue1) / 60%), oklch(0.92 0.08 var(--hue2) / 60%));
  background-size: 100% 100%;
  animation-name: anim_bg;
  animation-duration: 7s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes anim_bg {
  0% { --hue1: 30deg; --hue2: 180deg; }
  100% { --hue1: 390deg; --hue2: 540deg; }
}
</style>
