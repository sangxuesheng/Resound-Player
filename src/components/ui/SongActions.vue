<template>
  <div class="song-actions" @click.stop>
    <BookmarkIconButton :song-id="Number(song?.id || 0)" />
    <button class="sa-btn" title="下一首播放" @click.stop="$emit('play-next', song)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>
    </button>
    <button class="sa-btn" title="收藏至歌单" @click.stop="$emit('add-to-playlist', song)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
    </button>
    <button class="sa-btn" title="查看评论" @click.stop="$emit('open-comment', song.id)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
    <button class="sa-btn" title="查看专辑" @click.stop="openAlbum">
      <svg width="15" height="15" viewBox="0 0 1024 1024" fill="currentColor" stroke="currentColor" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"><path d="M150.588235 542.117647a30.117647 30.117647 0 1 1 60.235294 0 271.058824 271.058824 0 0 0 271.058824 271.058824 30.117647 30.117647 0 1 1 0 60.235294C298.917647 873.411765 150.588235 725.082353 150.588235 542.117647z m722.82353-60.235294a30.117647 30.117647 0 1 1-60.235294 0 271.058824 271.058824 0 0 0-271.058824-271.058824 30.117647 30.117647 0 1 1 0-60.235294c182.964706 0 331.294118 148.329412 331.294118 331.294118zM512 1024C229.225412 1024 0 794.774588 0 512S229.225412 0 512 0s512 229.225412 512 512-229.225412 512-512 512z m0-60.235294c249.494588 0 451.764706-202.270118 451.764706-451.764706 0-249.494588-202.270118-451.764706-451.764706-451.764706C262.505412 60.235294 60.235294 262.505412 60.235294 512c0 249.494588 202.270118 451.764706 451.764706 451.764706z m0-331.294118a120.470588 120.470588 0 1 1 0-240.941176 120.470588 120.470588 0 0 1 0 240.941176z m0-60.235294a60.235294 60.235294 0 1 0 0-120.470588 60.235294 60.235294 0 0 0 0 120.470588z"/></svg>
    </button>
    <button v-if="hasMv" class="sa-btn" title="查看 MV" @click.stop="openMv">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
    </button>
    <button class="sa-btn" title="下载" @click.stop="openDownloadPopup">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </button>
    <button class="sa-btn" title="上传至云盘" @click.stop="uploadToCloud">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
        <path d="M12 12v9"/>
        <path d="m16 16-4-4-4 4"/>
      </svg>
    </button>
    <button class="sa-btn" title="百科" @click.stop="openEncyclopedia">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
    </button>
  </div>
  <Teleport to="body">
    <SongEncyclopediaModal
      :song-id="showEncyclopediaId"
      @close="showEncyclopediaId = 0"
      @open-artist="(artist: any) => emit('open-artist', artist)"
      @open-album="(albumId: number) => emit('open-album', albumId)"
      @open-language="(language: string) => emit('open-language', language)"
    />
  </Teleport>
  <Teleport to="body">
    <transition name="quality-fade">
      <div v-if="showDownloadPopup" class="download-popup-backdrop" @click.self="showDownloadPopup = false" @wheel.passive @touchmove.passive>
        <div class="download-popup">
          <div class="download-popup__header">选择下载音质</div>
          <div class="download-popup__song-info">
            <img 
              :src="song?.al?.picUrl || ''" 
              :alt="song?.name || '封面'" 
              class="download-popup__cover"
              @error="handleCoverError"
            >
            <div class="download-popup__song-details">
              <div class="download-popup__song-name">{{ song?.name || '未知歌曲' }}</div>
              <div class="download-popup__song-artist">{{ artistName }}</div>
            </div>
          </div>
          <div class="download-popup__list">
            <button
              v-for="q in qualityOptions"
              :key="q.label"
              type="button"
              class="download-popup__item"
              :class="{
                disabled: !isQualityAvailable(q.level),
                active: selectedQuality?.level === q.level
              }"
              :disabled="!isQualityAvailable(q.level)"
              @click.stop="selectedQuality = q"
            >
              <span class="download-popup__item-label">{{ q.label }}</span>
              <span v-if="q.vip" class="download-popup__item-vip">{{ q.vip }}</span>
              <span class="download-popup__item-size">{{ downloadSizes[q.label] || '获取中…' }}</span>
            </button>
          </div>

          <!-- 非 VIP / 非真实登录用户提示音源替换 -->
          <div v-if="isUnblockSource" class="download-popup__notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>当前使用音源替换下载。非 VIP 用户下载会员歌曲时官方源仅提供 30 秒预览，音源替换可获取完整歌曲。如需更高音质，请登录会员账户。</span>
          </div>

          <div v-if="lyricsLoaded" class="download-popup__lyrics">
            <div class="download-popup__section-title">下载歌词</div>
            <label class="download-popup__checkbox">
              <input type="checkbox" v-model="downloadLyrics.main">
              <span>主歌词</span>
              <span class="download-popup__checkbox-hint">LRC 含时间轴</span>
            </label>
            <label v-if="hasLyrics.translation" class="download-popup__checkbox">
              <input type="checkbox" v-model="downloadLyrics.translation">
              <span>翻译歌词</span>
              <span class="download-popup__checkbox-hint">LRC 含时间轴</span>
            </label>
            <label v-if="hasLyrics.romalrc" class="download-popup__checkbox">
              <input type="checkbox" v-model="downloadLyrics.romalrc">
              <span>音译歌词</span>
              <span class="download-popup__checkbox-hint">LRC 含时间轴</span>
            </label>
            <label v-if="hasLyrics.yrc" class="download-popup__checkbox">
              <input type="checkbox" v-model="downloadLyrics.yrc">
              <span>逐字歌词</span>
              <span class="download-popup__checkbox-hint">YRC 逐字时间轴</span>
            </label>
          </div>
          <div class="download-popup__footer">
            <button class="download-popup__cancel" @click="showDownloadPopup = false">取消</button>
            <button class="download-popup__confirm" :disabled="!selectedQuality" @click="handleDownload">确认下载</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import BookmarkIconButton from './BookmarkIconButton.vue';
import SongEncyclopediaModal from './SongEncyclopediaModal.vue';
import { getSongUrlV1, getSongLyric, getSongLyricNew, importToCloud } from '../../api/music';
import { userStore } from '../../stores/user';
import { tryUnblockMatch } from '../../api/unblock';
import { showGlobalToast, showLoginModal } from '../../stores/loginModal';

const props = defineProps<{
  song: any;
}>();

const emit = defineEmits<{
  (e: 'play-next', song: any): void;
  (e: 'add-to-playlist', song: any): void;
  (e: 'open-comment', songId: number): void;
  (e: 'open-album', albumId: number): void;
  (e: 'open-artist', artist: any): void;
  (e: 'open-language', language: string): void;
  (e: 'open-mv-player', mv: any): void;
}>();

const showEncyclopediaId = ref(0);
const hasMv = computed(() => Number(props.song?.mv || 0) > 0);

function openAlbum() {
  const albumId = Number(props.song?.al?.id || 0);
  if (albumId) emit('open-album', albumId);
}

function openMv() {
  const mvId = Number(props.song?.mv || 0);
  if (!mvId) return;
  const artists = Array.isArray(props.song?.ar) ? props.song.ar : [];
  const artistName = artists.map((a: any) => a?.name).filter(Boolean).join('/');
  emit('open-mv-player', {
    id: mvId,
    name: props.song?.name || '未知 MV',
    cover: props.song?.al?.picUrl || '',
    artistName,
  });
}

function openEncyclopedia() {
  showEncyclopediaId.value = Number(props.song?.id || 0);
}

const qualityOptions = [
  { label: '标准', level: 'standard', vip: '' },
  { label: '较高', level: 'higher', vip: '' },
  { label: '极高(HQ)', level: 'exhigh', vip: '' },
  { label: '无损(SQ)', level: 'lossless', vip: '黑胶VIP' },
  { label: 'Hi-Res', level: 'hires', vip: '黑胶VIP' },
  { label: '高清臻音', level: 'jyeffect', vip: 'SVIP' },
  { label: '沉浸环绕声', level: 'sky', vip: 'SVIP' },
  { label: '杜比全景声', level: 'dolby', vip: 'SVIP' },
  { label: '超清母带', level: 'jymaster', vip: 'SVIP' },
];

const VIP_ONLY_LEVELS = new Set([
  'lossless', 'hires', 'jyeffect', 'sky', 'dolby', 'jymaster',
]);

function isQualityAvailable(level: string): boolean {
  const isRealLogin = userStore.loginMode === 'cookie' || userStore.loginMode === 'qr';
  if (isRealLogin && userStore.isVip) return true;
  return !VIP_ONLY_LEVELS.has(level);
}

const isUnblockSource = computed(() => {
  const isRealLogin = userStore.loginMode === 'cookie' || userStore.loginMode === 'qr';
  return !(isRealLogin && userStore.isVip);
});

const showDownloadPopup = ref(false);
const downloadSizes = ref<Record<string, string>>({});
const selectedQuality = ref<{ label: string; level: string; vip: string } | null>(null);
const lyricsLoaded = ref(false);
const hasLyrics = ref({ translation: false, romalrc: false, yrc: false });
const downloadLyrics = ref({ main: true, translation: false, romalrc: false, yrc: false });

async function fetchDownloadSizes() {
  const songId = Number(props.song?.id || 0);
  if (!songId) return;
  const sizes: Record<string, string> = {};

  const isRealLogin = userStore.loginMode === 'cookie' || userStore.loginMode === 'qr';
  const useOfficial = isRealLogin && userStore.isVip;

  if (!useOfficial) {
    // 非会员/未登录/搜索用户：使用音源替换的文件大小
    const unblockSources = ['bodian', 'kugou', 'migu', 'qq', 'bilibili'];
    try {
      const match = await tryUnblockMatch(songId, unblockSources);
      if (match?.size > 0) {
        const mb = match.size / 1048576;
        const sizeLabel = mb >= 1 ? mb.toFixed(1) + 'M' : Math.round(match.size / 1024) + 'K';
        for (const q of qualityOptions) {
          if (isQualityAvailable(q.level)) sizes[q.label] = sizeLabel;
        }
        downloadSizes.value = sizes;
        return;
      }
    } catch { /* 音源替换不可用，回退到官方大小 */ }
  }

  // 会员或音源替换失败：使用官方大小
  for (const q of qualityOptions) {
    try {
      const { data: body } = await getSongUrlV1(songId, q.level, userStore.loginCookie || undefined);
      const item = Array.isArray(body?.data) ? body.data[0] : null;
      if (item?.size > 0) {
        const mb = item.size / 1048576;
        sizes[q.label] = mb >= 1 ? mb.toFixed(1) + 'M' : Math.round(item.size / 1024) + 'K';
      }
    } catch {
      // skip if unavailable
    }
  }
  downloadSizes.value = sizes;
}

async function fetchLyricsInfo() {
  const songId = Number(props.song?.id || 0);
  if (!songId) return;
  try {
    const { data: body } = await getSongLyric(songId);
    const hasTranslation = !!(body?.tlyric?.lyric || '').trim();
    const hasRomalrc = !!(body?.romalrc?.lyric || '').trim();
    let hasYrc = !!(body?.yrc?.lyric || '').trim();
    // YRC 可能只在 /lyric/new 中返回，尝试补充检测
    if (!hasYrc) {
      try {
        const { data: newBody } = await getSongLyricNew(songId);
        hasYrc = !!(newBody?.yrc?.lyric || '').trim();
      } catch { /* ignore */ }
    }
    hasLyrics.value = { translation: hasTranslation, romalrc: hasRomalrc, yrc: hasYrc };
    downloadLyrics.value = { main: false, translation: false, romalrc: false, yrc: false };
    lyricsLoaded.value = true;
  } catch {
    lyricsLoaded.value = true;
    hasLyrics.value = { translation: false, romalrc: false, yrc: false };
  }
}

watch(showDownloadPopup, (val) => {
  if (val) {
    selectedQuality.value = null;
    lyricsLoaded.value = false;
    void fetchDownloadSizes();
    void fetchLyricsInfo();
  }
});

async function openDownloadPopup() {
  await userStore.fetchVipInfo();
  showDownloadPopup.value = true;
}

async function handleDownload() {
  if (!selectedQuality.value) return;
  if (!isQualityAvailable(selectedQuality.value.level)) return;
  showDownloadPopup.value = false;
  await downloadSong(selectedQuality.value.level, selectedQuality.value.label);
  void downloadSelectedLyrics();
}

async function downloadSelectedLyrics() {
  const songId = Number(props.song?.id || 0);
  if (!songId) return;
  const { data: body } = await getSongLyric(songId);
  const base = `${props.song?.name || '未知歌曲'} - ${(Array.isArray(props.song?.ar) ? props.song.ar : []).map((a: any) => a?.name).filter(Boolean).join('、') || '未知歌手'}`;
  if (downloadLyrics.value.main && body?.lrc?.lyric) {
    triggerDownload(body.lrc.lyric, base + '.lrc');
  }
  if (downloadLyrics.value.translation && body?.tlyric?.lyric) {
    triggerDownload(body.tlyric.lyric, base + '（翻译）.lrc');
  }
  if (downloadLyrics.value.romalrc && body?.romalrc?.lyric) {
    triggerDownload(body.romalrc.lyric, base + '（音译）.lrc');
  }
  if (downloadLyrics.value.yrc) {
    let yrcContent = body?.yrc?.lyric || '';
    if (!yrcContent) {
      try { const { data: nb } = await getSongLyricNew(songId); yrcContent = nb?.yrc?.lyric || ''; } catch { /* ignore */ }
    }
    if (yrcContent) triggerDownload(yrcContent, base + '.yrc');
  }
}

function triggerDownload(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function downloadSong(level: string, label: string) {
  const songId = Number(props.song?.id || 0);
  if (!songId) return;

  try {
    const { data: body } = await getSongUrlV1(songId, level, userStore.loginCookie || undefined);
    const item = Array.isArray(body?.data) ? body.data[0] : null;
    const url: string | undefined = item?.url;
    if (!url) {
      alert('该音质暂无可下载的音频地址');
      return;
    }

    const artists = Array.isArray(props.song?.ar) ? props.song.ar : [];
    const artistName = artists.map((a: any) => a?.name).filter(Boolean).join('、') || '未知歌手';
    const songName = props.song?.name || '未知歌曲';
    const ext = item.type === 'flac' ? 'flac' : 'mp3';
    const fileName = `${songName} - ${artistName}.${ext}`;

    showDownloadPopup.value = false;

    async function doFetch(): Promise<Response> {
      // 直连：music.126.net 等 CDN 有 CORS 支持，可直接 fetch
      // music.163.com 不支持 CORS，跳过直连避免控制台报错
      if (!url.includes('music.163.com')) {
        try {
          const direct = await fetch(url);
          if (direct.ok) return direct;
        } catch { /* 直连失败，走回退 */ }
      }
      // 回退：走 Vite 代理（处理 music.163.com/package 等需 Cookie 的 URL）
      const isRealLogin = userStore.loginMode === 'cookie' || userStore.loginMode === 'qr';
      const c = isRealLogin ? (userStore.loginCookie || '') : '';
      return fetch('/dl-proxy?url=' + encodeURIComponent(url) + '&cookie=' + encodeURIComponent(c));
    }
    let resp = await doFetch();
    let blob: Blob | null = null;
    let finalFileName = fileName;
    if (resp.ok) {
      blob = await resp.blob();
    }
    // 官方源失败时，尝试音源替换
    if (!resp.ok || (blob && blob.size < 200)) {
      const unblockSources = ['bodian', 'kugou', 'migu', 'qq', 'bilibili'];
      const match = await tryUnblockMatch(songId, unblockSources);
      if (match?.url) {
        const uResp = await fetch('/dl-proxy?url=' + encodeURIComponent(match.url) + '&cookie=');
        if (uResp.ok) {
          resp = uResp;
          blob = await resp.blob();
          finalFileName = `${songName} - ${artistName}.mp3`;
        }
      }
    }
    if (!blob || blob.size < 200) { alert('下载失败，所有音源均不可用'); return; }
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = finalFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    alert('下载失败，请稍后重试');
  }
}
async function uploadToCloud() {
  const songId = Number(props.song?.id || 0);
  if (!songId) {
    showGlobalToast('无法获取歌曲ID', 'error');
    return;
  }

  // 检查登录状态
  if (!userStore.isLogin) {
    showLoginModal('none');
    return;
  }
  if (userStore.loginMode !== 'cookie' && userStore.loginMode !== 'qr') {
    showGlobalToast('搜索用户方式登录不支持上传云盘功能，请使用扫码或 Cookie 登录', 'warning', 5000);
    return;
  }

  const artists = Array.isArray(props.song?.ar) ? props.song.ar : [];
  const artistName = artists.map((a: any) => a?.name).filter(Boolean).join('/') || '未知歌手';
  const songName = props.song?.name || '未知歌曲';
  const albumName = props.song?.al?.name || '未知专辑';

  try {
    // 获取歌曲URL信息以获取md5、size、bitrate
    const { data: body } = await getSongUrlV1(songId, 'exhigh', userStore.loginCookie || undefined);
    const item = Array.isArray(body?.data) ? body.data[0] : null;

    if (!item) {
      showGlobalToast('无法获取歌曲信息', 'error');
      return;
    }

    // 准备导入参数
    const fileType = item.type === 'flac' ? 'flac' : 'mp3';
    const fileSize = item.size || 0;
    const bitrate = Math.floor((item.br || 128000) / 1000);
    const md5 = item.md5 || '';

    if (!md5) {
      showGlobalToast('无法获取文件MD5，无法导入云盘', 'error');
      return;
    }

    // 调用云盘导入API
    const { data: result } = await importToCloud({
      song: songName,
      fileType,
      fileSize,
      bitrate,
      md5,
      id: songId,
      artist: artistName,
      album: albumName,
      cookie: userStore.loginCookie || undefined,
    });

    if (result?.code === 200) {
      showGlobalToast('已成功上传至云盘', 'success');
    } else if (result?.code === 401 || result?.code === 301) {
      showGlobalToast('登录已过期，请重新登录', 'error');
    } else {
      showGlobalToast(result?.message || '上传至云盘失败', 'error');
    }
  } catch (error: any) {
    showGlobalToast(error?.message || '上传至云盘失败，请稍后重试', 'error');
  }
}

</script>

<style scoped>
.song-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sa-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-surface);
  color: var(--text-soft);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition:
    color 0.12s ease,
    background 0.12s ease,
    transform 0.12s ease;
  box-shadow: var(--glass-highlight);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.sa-btn:hover {
  background: var(--bg-muted);
  color: var(--text-main);
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 32%, var(--border));
}

.sa-btn:active {
  transform: translateY(0);
}

/* 覆盖 BookmarkIconButton，使其与 sa-btn 视觉一致 */
.song-actions :deep(.bookmark-icon-button) {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-surface);
  color: var(--text-soft);
  box-shadow: var(--glass-highlight);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  overflow: hidden;
}

.song-actions :deep(.bookmark-icon-button)::before,
.song-actions :deep(.bookmark-icon-button)::after {
  display: none;
}

.song-actions :deep(.bookmark-icon-button:hover) {
  background: var(--bg-muted);
  color: var(--text-main);
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 32%, var(--border));
}

.song-actions :deep(.bookmark-icon-button:active) {
  transform: translateY(0);
}

.song-actions :deep(.bookmark-icon-button.saved) {
  border-color: color-mix(in srgb, var(--accent) 32%, var(--border));
  background: var(--bg-surface);
  color: #ff6b8a;
}

.song-actions :deep(.bookmark-icon-button.saved:hover) {
  background: var(--bg-muted);
}

.song-actions :deep(.glow),
.song-actions :deep(.pulse),
.song-actions :deep(.sparkles) {
  display: none;
}

/* 未收藏时心形图标颜色与其他 sa-btn 图标一致 */
.song-actions :deep(.outline-heart) {
  color: var(--text-soft);
}

/* 下载弹窗 */
.download-popup-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
}

.download-popup {
  width: min(320px, calc(100vw - 40px));
  background: var(--bg-solid);
  border-radius: 16px;
  padding: var(--space-3);
  display: grid;
  gap: var(--space-2);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border);
}

.download-popup__cover {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md, 12px);
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
}

.download-popup__header {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  padding: 0 var(--space-1);
}

.download-popup__song-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-1) var(--space-1);
}

.download-popup__song-details {
  flex: 1;
  min-width: 0;
}

.download-popup__song-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.download-popup__song-artist {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.download-popup__sub {
  font-size: 12px;
  color: var(--text-sub);
  padding: 0 var(--space-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.download-popup__list {
  display: grid;
  gap: 2px;
  max-height: 300px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.download-popup__list::-webkit-scrollbar {
  display: none;
}

.download-popup__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-main);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.12s ease;
  text-align: left;
  width: 100%;
}

.download-popup__item:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 6%, var(--bg-solid));
}

.download-popup__item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.download-popup__item-label {
  flex: 1;
}

.download-popup__item-vip {
  font-size: 10px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-solid));
  padding: 1px 6px;
  border-radius: 4px;
}

.download-popup__item-size {
  font-size: 11px;
  color: var(--text-sub);
  min-width: 50px;
  text-align: right;
}

.download-popup__item.active {
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-solid));
  color: var(--accent);
}

.download-popup__item.vip-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.download-popup__notice {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: color-mix(in srgb, var(--accent) 6%, var(--bg-solid));
  border-radius: 10px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-sub);
}

.download-popup__notice svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--accent);
}

.download-popup__lyrics {
  border-top: 1px solid var(--border);
  padding-top: var(--space-2);
  display: grid;
  gap: var(--space-1);
}

.download-popup__section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
  padding: 0 var(--space-1);
  margin-bottom: var(--space-1);
}

.download-popup__checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s ease;
  font-size: 13px;
  color: var(--text-main);
}

.download-popup__checkbox:hover {
  background: color-mix(in srgb, var(--accent) 6%, var(--bg-solid));
}

.download-popup__checkbox input[type="checkbox"] {
  accent-color: var(--accent);
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.download-popup__checkbox-hint {
  font-size: 10px;
  color: var(--text-sub);
  margin-left: auto;
}

.download-popup__footer {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.download-popup__cancel,
.download-popup__confirm {
  flex: 1;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  padding: var(--space-2);
  cursor: pointer;
  transition: background 0.12s ease;
}

.download-popup__cancel {
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-solid));
  color: var(--text-main);
}

.download-popup__cancel:hover {
  background: color-mix(in srgb, var(--accent) 14%, var(--bg-solid));
}

.download-popup__confirm {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
}

.download-popup__confirm:hover:not(:disabled) {
  filter: brightness(1.15);
}

.download-popup__confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 弹窗入场动画 */
.quality-fade-enter-active,
.quality-fade-leave-active {
  transition: opacity 0.15s ease;
}
.quality-fade-enter-from,
.quality-fade-leave-to {
  opacity: 0;
}
</style>