<template>
  <AnimatedAppear tag="section" variant="content" rhythm="body" class-name="panel">
    <div class="head">
      <div>
        <AnimatedAppear tag="h2" variant="title" rhythm="title">搜索歌曲</AnimatedAppear>
        <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="muted">支持歌曲、专辑、歌手、歌单、用户与 MV 搜索</AnimatedAppear>
      </div>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="ghost" :disabled="disabled || loading" @click="loadHot">
        {{ loading ? '加载中…' : '热搜' }}
      </AnimatedAppear>
    </div>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="toolbar">
      <input
        v-model="keywords"
        class="input"
        :disabled="disabled"
        placeholder="输入关键词，支持空格分隔多个词"
        @keydown.enter="onSearch"
      />
      <select v-model.number="searchType" class="select" :disabled="disabled || loading">
        <option :value="1">单曲</option>
        <option :value="10">专辑</option>
        <option :value="100">歌手</option>
        <option :value="1000">歌单</option>
        <option :value="1002">用户</option>
        <option :value="1004">MV</option>
        <option :value="1006">歌词</option>
        <option :value="1009">电台</option>
        <option :value="1014">视频</option>
        <option :value="1018">综合</option>
      </select>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="btn" :disabled="disabled || loading" @click="onSearch">
        {{ loading ? '搜索中...' : '搜索' }}
      </AnimatedAppear>
    </AnimatedAppear>

    <div v-if="hotKeywords.length" class="chips">
      <button v-for="item in hotKeywords" :key="item" class="chip" :disabled="disabled || loading" @click="useKeyword(item)">{{ item }}</button>
    </div>

    <AnimatedAppear v-if="error" tag="p" variant="text" rhythm="body" class-name="err">{{ error }}</AnimatedAppear>

    <ul class="list">
      <AnimatedAppear
        v-for="(song, idx) in songs"
        :key="song.id || idx"
        tag="li"
        variant="text" rhythm="body"
        :index="idx"
        class-name="item"
        @dblclick="playSong(idx)"
      >
        <div class="left">
          <div class="name">{{ song.name || song.keyword || song.nickname || song.artists?.[0]?.name || '搜索结果' }}</div>
          <div class="artist">{{ resolveSubtitle(song) }}</div>
        </div>
        <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="idx" class-name="play" :disabled="disabled" @click="playSong(idx)">播放</AnimatedAppear>
      </AnimatedAppear>
    </ul>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { searchMusic, searchMusicHot, searchMusicSuggest } from '../api/music';
import { playerStore } from '../stores/player';
import AnimatedAppear from './AnimatedAppear.vue';

const props = defineProps<{ disabled?: boolean }>();

const keywords = ref('周杰伦');
const searchType = ref(1);
const loading = ref(false);
const error = ref('');
const songs = ref<any[]>([]);
const hotKeywords = ref<string[]>([]);

function resolveSubtitle(item: any) {
  return (
    item.ar?.map((a: any) => a.name).join('/') ||
    item.artists?.map((a: any) => a.name).join('/') ||
    item.album?.name ||
    item.company ||
    item.nickname ||
    item.userName ||
    '暂无描述'
  );
}

function extractSearchResults(data: any) {
  return (
    data?.result?.songs ||
    data?.result?.albums ||
    data?.result?.artists ||
    data?.result?.playlists ||
    data?.result?.users ||
    data?.result?.mvs ||
    data?.result?.videos ||
    data?.result?.djRadios ||
    data?.result?.voiceList ||
    data?.result?.order ||
    []
  );
}

async function loadHot() {
  if (props.disabled) return;
  loading.value = true;
  error.value = '';
  try {
    const res = await searchMusicHot();
    hotKeywords.value = (res.data?.result || res.data?.data || []).slice(0, 10).map((item: any) => item.searchWord || item.keyword || item.first || item.name).filter(Boolean);
  } catch (e: any) {
    error.value = e?.message || '热搜加载失败';
  } finally {
    loading.value = false;
  }
}

async function onSearch() {
  if (props.disabled) {
    error.value = 'API 尚未就绪，请稍后重试';
    return;
  }

  const kw = keywords.value.trim();
  if (!kw) return;
  loading.value = true;
  error.value = '';

  try {
    const [suggestRes, searchRes] = await Promise.all([
      searchMusicSuggest(kw).catch(() => null),
      searchMusic(kw, { type: searchType.value }),
    ]);
    songs.value = extractSearchResults(searchRes);
    const suggest = suggestRes?.data?.result?.allMatch || suggestRes?.data?.result?.songs || [];
    if (!songs.value.length && suggest.length) songs.value = suggest;
  } catch (e: any) {
    error.value = e?.message || '搜索失败';
  } finally {
    loading.value = false;
  }
}

function useKeyword(kw: string) {
  keywords.value = kw;
  void onSearch();
}

async function playSong(index: number) {
  if (!songs.value.length) return;
  playerStore.setPlaylist(songs.value, index);
  await playerStore.playByIndex(index);
}
</script>

<style scoped>
.panel {
  padding: 16px;
  color: var(--text-main);
  display: grid;
  gap: 14px;
}
.head,
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
}
.head {
  justify-content: space-between;
}
.muted {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-sub);
}
.input,
.select {
  height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-muted);
  color: var(--text-main);
}
.input { flex: 1; }
.select { min-width: 112px; }
.btn,
.play,
.ghost {
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-muted);
  color: var(--text-main);
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease;
}
.btn:hover,
.play:hover,
.ghost:hover,
.chip:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 34%, var(--border));
  box-shadow: 0 10px 18px color-mix(in srgb, var(--accent) 10%, transparent);
}
.btn:active,
.play:active,
.ghost:active,
.chip:active {
  transform: translateY(0) scale(0.99);
}
.ghost { min-width: 84px; }
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  color: var(--text-main);
  padding: 6px 10px;
  cursor: pointer;
}
.err {
  color: #ef4444;
  margin: 0;
}
.list {
  margin: 0;
  list-style: none;
  padding: 0;
}
.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 8px;
}
.name {
  font-weight: 600;
}
.artist {
  font-size: 12px;
  color: var(--text-sub);
}
.left { min-width: 0; }
@media (max-width: 767px) {
  .head, .toolbar { flex-direction: column; align-items: stretch; }
  .select, .ghost, .btn { width: 100%; }
}
</style>
