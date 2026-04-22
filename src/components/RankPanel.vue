<template>
  <PageLayoutShell shell-class="rank-page-shell" body-class="rank-page-body">
    <template #default>
      <AnimatedAppear v-if="error" tag="p" variant="text" rhythm="body" class-name="error">{{ error }}</AnimatedAppear>

      <div v-if="list.length" class="rank-content">
        <AnimatedAppear v-if="featuredList.length" tag="section" variant="content" rhythm="body" class-name="section featured">
          <AnimatedAppear tag="div" variant="content" rhythm="head" class-name="section-head">
            <AnimatedAppear tag="h3" variant="title" rhythm="title">推荐榜</AnimatedAppear>
            <AnimatedAppear tag="span" variant="text" rhythm="body" class-name="section-sub">热门榜单快捷入口</AnimatedAppear>
          </AnimatedAppear>
          <AnimatedAppear tag="div" variant="content" rhythm="list" class-name="featured-scroll">
            <AnimatedAppear
              v-for="(item, idx) in featuredList"
              :key="item.id"
              tag="button"
              variant="media"
              rhythm="list"
              :index="idx"
              class-name="featured-card"
              type="button"
              @click="openDetail(item.id)"
            >
              <AnimatedAppear tag="img" variant="media" rhythm="list" :index="idx" class-name="featured-cover" :src="item.coverImgUrl" :alt="item.name" loading="lazy" />
              <div class="featured-overlay" />
              <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="featured-meta">
                <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="featured-top">
                  <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="featured-name">{{ item.name }}</AnimatedAppear>
                  <AnimatedAppear tag="span" variant="control" rhythm="actions" :index="idx" class-name="trend" :class="trendClass(item)">{{ trendLabel(item) }}</AnimatedAppear>
                </AnimatedAppear>
                <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="featured-update">{{ normalizeUpdateFrequency(item.updateFrequency) }}</AnimatedAppear>
              </AnimatedAppear>
            </AnimatedAppear>
          </AnimatedAppear>
        </AnimatedAppear>

        <AnimatedAppear v-if="officialList.length" tag="section" variant="content" rhythm="body" class-name="section">
          <AnimatedAppear tag="div" variant="content" rhythm="head" class-name="section-head">
            <AnimatedAppear tag="h3" variant="title" rhythm="title">官方榜</AnimatedAppear>
            <AnimatedAppear tag="span" variant="text" rhythm="body" class-name="section-sub">平台重点维护榜单</AnimatedAppear>
          </AnimatedAppear>
          <AnimatedAppear tag="div" variant="content" rhythm="list" class-name="grid-wrap">
            <AnimatedAppear
              v-for="(item, idx) in officialList"
              :key="item.id"
              tag="button"
              variant="media"
              rhythm="list"
              :index="idx"
              class-name="rank-card"
              :style="rankCardStyle(item.coverImgUrl)"
              type="button"
              @click="openDetail(item.id)"
            >
              <AnimatedAppear tag="img" variant="media" rhythm="list" :index="idx" class-name="rank-cover" :src="item.coverImgUrl" :alt="item.name" loading="lazy" />
              <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="rank-main">
                <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="rank-top">
                  <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="rank-name">{{ item.name }}</AnimatedAppear>
                  <AnimatedAppear tag="div" variant="content" rhythm="actions" :index="idx" class-name="rank-tags">
                    <AnimatedAppear tag="span" variant="control" rhythm="actions" :index="idx" class-name="trend" :class="trendClass(item)">{{ trendLabel(item) }}</AnimatedAppear>
                    <AnimatedAppear tag="span" variant="text" rhythm="body" :index="idx" class-name="pill">{{ normalizeUpdateFrequency(item.updateFrequency) }}</AnimatedAppear>
                  </AnimatedAppear>
                </AnimatedAppear>
                <AnimatedAppear tag="ol" variant="content" rhythm="list" :index="idx" class-name="track-list">
                  <AnimatedAppear v-for="(track, trackIdx) in getTopTracks(item)" :key="`${item.id}-${trackIdx}`" tag="li" variant="text" rhythm="list" :index="trackIdx">
                    <AnimatedAppear tag="span" variant="text" rhythm="list" :index="trackIdx" class-name="track-no" :class="`n-${trackIdx + 1}`">{{ trackIdx + 1 }}</AnimatedAppear>
                    <AnimatedAppear tag="span" variant="content" rhythm="list" :index="trackIdx" class-name="track-text">
                      <span class="track-song">{{ track.name }}</span>
                      <template v-if="track.artists.length">
                        <span class="track-separator"> - </span>
                        <template v-if="track.clickable">
                          <button
                            v-for="artist in track.artists"
                            :key="`${item.id}-${trackIdx}-${artist.id || artist.name}`"
                            type="button"
                            class="artist-link"
                            @click.stop="openArtistDetail(artist)"
                          >
                            {{ artist.name || '未知歌手' }}
                          </button>
                        </template>
                        <template v-else>
                          <span class="track-artist-fallback">{{ track.artists.map((artist) => artist.name).filter(Boolean).join('/') }}</span>
                        </template>
                      </template>
                    </AnimatedAppear>
                  </AnimatedAppear>
                </AnimatedAppear>
              </AnimatedAppear>
            </AnimatedAppear>
          </AnimatedAppear>
        </AnimatedAppear>

        <AnimatedAppear v-if="globalList.length" tag="section" variant="content" rhythm="body" class-name="section">
          <AnimatedAppear tag="div" variant="content" rhythm="head" class-name="section-head">
            <AnimatedAppear tag="h3" variant="title" rhythm="title">全球榜</AnimatedAppear>
            <AnimatedAppear tag="span" variant="text" rhythm="body" class-name="section-sub">海外与国际热度榜单</AnimatedAppear>
          </AnimatedAppear>
          <AnimatedAppear tag="div" variant="content" rhythm="list" class-name="grid-wrap">
            <AnimatedAppear
              v-for="(item, idx) in globalList"
              :key="item.id"
              tag="button"
              variant="media"
              rhythm="list"
              :index="idx"
              class-name="rank-card"
              :style="rankCardStyle(item.coverImgUrl)"
              type="button"
              @click="openDetail(item.id)"
            >
              <AnimatedAppear tag="img" variant="media" rhythm="list" :index="idx" class-name="rank-cover" :src="item.coverImgUrl" :alt="item.name" loading="lazy" />
              <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="rank-main">
                <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="rank-top">
                  <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="rank-name">{{ item.name }}</AnimatedAppear>
                  <AnimatedAppear tag="div" variant="content" rhythm="actions" :index="idx" class-name="rank-tags">
                    <AnimatedAppear tag="span" variant="control" rhythm="actions" :index="idx" class-name="trend" :class="trendClass(item)">{{ trendLabel(item) }}</AnimatedAppear>
                    <AnimatedAppear tag="span" variant="text" rhythm="body" :index="idx" class-name="pill">{{ normalizeUpdateFrequency(item.updateFrequency) }}</AnimatedAppear>
                  </AnimatedAppear>
                </AnimatedAppear>
                <AnimatedAppear tag="ol" variant="content" rhythm="list" :index="idx" class-name="track-list">
                  <AnimatedAppear v-for="(track, trackIdx) in getTopTracks(item)" :key="`${item.id}-${trackIdx}`" tag="li" variant="text" rhythm="list" :index="trackIdx">
                    <AnimatedAppear tag="span" variant="text" rhythm="list" :index="trackIdx" class-name="track-no" :class="`n-${trackIdx + 1}`">{{ trackIdx + 1 }}</AnimatedAppear>
                    <AnimatedAppear tag="span" variant="content" rhythm="list" :index="trackIdx" class-name="track-text">
                      <span class="track-song">{{ track.name }}</span>
                      <template v-if="track.artists.length">
                        <span class="track-separator"> - </span>
                        <template v-if="track.clickable">
                          <button
                            v-for="artist in track.artists"
                            :key="`${item.id}-${trackIdx}-${artist.id || artist.name}`"
                            type="button"
                            class="artist-link"
                            @click.stop="openArtistDetail(artist)"
                          >
                            {{ artist.name || '未知歌手' }}
                          </button>
                        </template>
                        <template v-else>
                          <span class="track-artist-fallback">{{ track.artists.map((artist) => artist.name).filter(Boolean).join('/') }}</span>
                        </template>
                      </template>
                    </AnimatedAppear>
                  </AnimatedAppear>
                </AnimatedAppear>
              </AnimatedAppear>
            </AnimatedAppear>
          </AnimatedAppear>
        </AnimatedAppear>

        <AnimatedAppear v-if="otherList.length" tag="section" variant="content" rhythm="body" class-name="section">
          <AnimatedAppear tag="div" variant="content" rhythm="head" class-name="section-head">
            <AnimatedAppear tag="h3" variant="title" rhythm="title">更多榜单</AnimatedAppear>
            <AnimatedAppear tag="span" variant="text" rhythm="body" class-name="section-sub">风格与场景榜</AnimatedAppear>
          </AnimatedAppear>
          <AnimatedAppear tag="div" variant="content" rhythm="list" class-name="grid-wrap">
            <AnimatedAppear
              v-for="(item, idx) in otherList"
              :key="item.id"
              tag="button"
              variant="media"
              rhythm="list"
              :index="idx"
              class-name="rank-card"
              :style="rankCardStyle(item.coverImgUrl)"
              type="button"
              @click="openDetail(item.id)"
            >
              <AnimatedAppear tag="img" variant="media" rhythm="list" :index="idx" class-name="rank-cover" :src="item.coverImgUrl" :alt="item.name" loading="lazy" />
              <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="rank-main">
                <AnimatedAppear tag="div" variant="content" rhythm="list" :index="idx" class-name="rank-top">
                  <AnimatedAppear tag="p" variant="text" rhythm="list" :index="idx" class-name="rank-name">{{ item.name }}</AnimatedAppear>
                  <AnimatedAppear tag="div" variant="content" rhythm="actions" :index="idx" class-name="rank-tags">
                    <AnimatedAppear tag="span" variant="control" rhythm="actions" :index="idx" class-name="trend" :class="trendClass(item)">{{ trendLabel(item) }}</AnimatedAppear>
                    <AnimatedAppear tag="span" variant="text" rhythm="body" :index="idx" class-name="pill">{{ normalizeUpdateFrequency(item.updateFrequency) }}</AnimatedAppear>
                  </AnimatedAppear>
                </AnimatedAppear>
                <AnimatedAppear tag="ol" variant="content" rhythm="list" :index="idx" class-name="track-list">
                  <AnimatedAppear v-for="(track, trackIdx) in getTopTracks(item)" :key="`${item.id}-${trackIdx}`" tag="li" variant="text" rhythm="list" :index="trackIdx">
                    <AnimatedAppear tag="span" variant="text" rhythm="list" :index="trackIdx" class-name="track-no" :class="`n-${trackIdx + 1}`">{{ trackIdx + 1 }}</AnimatedAppear>
                    <AnimatedAppear tag="span" variant="content" rhythm="list" :index="trackIdx" class-name="track-text">
                      <span class="track-song">{{ track.name }}</span>
                      <template v-if="track.artists.length">
                        <span class="track-separator"> - </span>
                        <template v-if="track.clickable">
                          <button
                            v-for="artist in track.artists"
                            :key="`${item.id}-${trackIdx}-${artist.id || artist.name}`"
                            type="button"
                            class="artist-link"
                            @click.stop="openArtistDetail(artist)"
                          >
                            {{ artist.name || '未知歌手' }}
                          </button>
                        </template>
                        <template v-else>
                          <span class="track-artist-fallback">{{ track.artists.map((artist) => artist.name).filter(Boolean).join('/') }}</span>
                        </template>
                      </template>
                    </AnimatedAppear>
                  </AnimatedAppear>
                </AnimatedAppear>
              </AnimatedAppear>
            </AnimatedAppear>
          </AnimatedAppear>
        </AnimatedAppear>
      </div>

      <AnimatedAppear v-else-if="!loading" tag="p" variant="text" rhythm="body" class-name="muted">暂无排行榜数据</AnimatedAppear>
    </template>
  </PageLayoutShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getPlaylistTrackAll, getToplistDetail } from '../api/music';
import AnimatedAppear from './AnimatedAppear.vue';
import PageLayoutShell from './PageLayoutShell.vue';

type ToplistTrack = { first?: string; second?: string };
type ArtistBrief = { id?: number; name?: string };
type PlaylistTrack = { id: number; name?: string; ar?: ArtistBrief[] };
type RankTrackDisplay = {
  name: string;
  artists: ArtistBrief[];
  plainText: string;
  clickable: boolean;
};
type ToplistItem = {
  id: number;
  name: string;
  coverImgUrl: string;
  updateFrequency?: string;
  description?: string;
  category?: string;
  ToplistType?: string;
  tracks?: ToplistTrack[];
};

const RECOMMEND_NAMES = [
  '云音乐飙升榜',
  '云音乐新歌榜',
  '网易原创歌曲榜',
  '云音乐热歌榜',
  '云音乐说唱榜',
  '云音乐欧美热歌榜',
  '云音乐韩国热歌榜',
  '云音乐日本热歌榜',
];

const emit = defineEmits<{
  (e: 'open-detail', playlistId: number, coverUrl?: string): void;
  (e: 'open-artist', artist: ArtistBrief): void;
}>();

const loading = ref(false);
const error = ref('');
const list = ref<ToplistItem[]>([]);
const cardTracksMap = ref<Record<number, RankTrackDisplay[]>>({});

const featuredList = computed(() => {
  const selected: ToplistItem[] = [];
  for (const name of RECOMMEND_NAMES) {
    const found = list.value.find((item) => item.name === name || item.name.includes(name));
    if (found && !selected.some((x) => x.id === found.id)) selected.push(found);
  }
  if (selected.length >= 4) return selected.slice(0, 8);
  const fallback = [...selected];
  for (const item of list.value) {
    if (!fallback.some((x) => x.id === item.id)) fallback.push(item);
    if (fallback.length >= 8) break;
  }
  return fallback;
});

const officialList = computed(() => list.value.filter((item) => item.ToplistType === 'A' || item.category === '官方'));

const globalList = computed(() => {
  const officialIds = new Set(officialList.value.map((item) => item.id));
  return list.value.filter((item) => {
    if (officialIds.has(item.id)) return false;
    const byType = item.ToplistType === 'G';
    const byName = /欧美|英国|日本|韩国|Billboard|iTunes|UK|Hito/i.test(item.name);
    return byType || byName;
  });
});

const otherList = computed(() => {
  const occupied = new Set<number>();
  for (const item of featuredList.value) occupied.add(item.id);
  for (const item of officialList.value) occupied.add(item.id);
  for (const item of globalList.value) occupied.add(item.id);
  return list.value.filter((item) => !occupied.has(item.id));
});

function rankCardStyle(coverUrl?: string) {
  if (!coverUrl) return {};
  return { '--cover-bg': `url(${coverUrl})`, '--detail-head-fade-height': '102px', '--detail-head-fade-soft': '72px' } as Record<string, string>;
}

function openDetail(id: number) {
  const item = list.value.find((x) => x.id === id);
  emit('open-detail', id, item?.coverImgUrl || '');
}

function normalizeUpdateFrequency(text?: string) {
  const source = (text || '').trim();
  if (!source) return '实时更新';
  if (/刚刚|实时/.test(source)) return '实时更新';
  if (/小时/.test(source)) return '每小时更新';
  if (/天|日/.test(source)) return '每日更新';
  if (/周/.test(source)) return '每周更新';
  return source;
}

function trendLabel(item: ToplistItem) {
  if (/飙升|上升/i.test(item.name)) return '升';
  if (/新歌/i.test(item.name)) return '新';
  return '稳';
}

function trendClass(item: ToplistItem) {
  const label = trendLabel(item);
  if (label === '升') return 'rise';
  if (label === '新') return 'new';
  return 'steady';
}

function normalizeArtistBriefs(artists: ArtistBrief[] = []) {
  return artists.filter((artist) => artist?.id || artist?.name);
}

function buildRankTrackDisplay(song: string, artists: ArtistBrief[] = []): RankTrackDisplay | null {
  const cleanSong = (song || '').trim();
  if (!cleanSong) return null;
  const normalizedArtists = normalizeArtistBriefs(artists);
  const artistText = normalizedArtists.map((artist) => artist.name).filter(Boolean).join('/');
  return {
    name: cleanSong,
    artists: normalizedArtists,
    plainText: artistText ? `${cleanSong} - ${artistText}` : cleanSong,
    clickable: normalizedArtists.some((artist) => artist?.id),
  };
}

function getTopTracks(item: ToplistItem) {
  const enriched = cardTracksMap.value[item.id] || [];
  if (enriched.length) return enriched;
  const tracks = Array.isArray(item.tracks) ? item.tracks : [];
  const picked = tracks
    .slice(0, 3)
    .map((it) => buildRankTrackDisplay(it.first || '', [{ name: (it.second || '').trim() }]))
    .filter(Boolean) as RankTrackDisplay[];
  if (picked.length) return picked;
  return [
    { name: '暂无歌曲摘要', artists: [], plainText: '暂无歌曲摘要', clickable: false },
    { name: '点击进入查看完整榜单', artists: [], plainText: '点击进入查看完整榜单', clickable: false },
  ];
}

function openArtistDetail(artist: ArtistBrief) {
  const artistId = Number(artist?.id || 0);
  if (!artistId) return;
  emit('open-artist', artist);
}

function formatTrackDisplay(track: PlaylistTrack) {
  return buildRankTrackDisplay(track.name || '', Array.isArray(track.ar) ? track.ar : []);
}

let hydrateToken = 0;

async function hydrateCardTracks() {
  const currentToken = ++hydrateToken;
  const merged: ToplistItem[] = [];
  const appendUnique = (items: ToplistItem[]) => {
    for (const item of items) if (!merged.some((x) => x.id === item.id)) merged.push(item);
  };
  appendUnique(featuredList.value);
  appendUnique(officialList.value);
  appendUnique(globalList.value);
  appendUnique(otherList.value);
  const targets = merged.slice(0, 36);
  if (!targets.length) return;
  await Promise.all(
    targets.map(async (item) => {
      if (cardTracksMap.value[item.id]?.length) return;
      try {
        const { data } = await getPlaylistTrackAll({ id: item.id, limit: 3, offset: 0 });
        if (currentToken !== hydrateToken) return;
        const songs = (data?.songs || []) as PlaylistTrack[];
        const lines = songs.map(formatTrackDisplay).filter(Boolean).slice(0, 3) as RankTrackDisplay[];
        if (lines.length) {
          cardTracksMap.value = { ...cardTracksMap.value, [item.id]: lines };
        }
      } catch {
        // ignore single card fetch failure
      }
    }),
  );
}

async function fetchToplist() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await getToplistDetail();
    list.value = (data?.list || []) as ToplistItem[];
    loading.value = false;
    void hydrateCardTracks();
  } catch (e: any) {
    error.value = e?.message || '排行榜加载失败';
    list.value = [];
    loading.value = false;
  }
}

onMounted(() => {
  fetchToplist();
});
</script>

<style scoped>
.rank-page-shell { }

.rank-page-body { }

.page-head__content { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.title { margin: 0; font-size: 20px; font-weight: 700; }
.refresh-btn { height: 32px; padding: 0 var(--space-3); border-radius: 8px; border: 1px solid var(--border); background: var(--bg-muted); color: var(--text-main); cursor: pointer; }
.refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: var(--danger); margin: 0; }
.section { display: grid; gap: var(--space-2); }
.section-head { display: flex; align-items: baseline; gap: var(--space-2); }
.section-head h3 { margin: 0; font-size: 17px; color: var(--text-main); }
.section-sub { color: var(--text-soft); font-size: 12px; }
.featured-scroll { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-2); }
.featured-card { position: relative; border: none; border-radius: 14px; overflow: hidden; padding: 0; text-align: left; cursor: pointer; background: #111827; aspect-ratio: 2.35 / 1; min-height: 96px; box-shadow: 0 8px 18px rgba(2, 6, 23, 0.18); }
.featured-cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.featured-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(2, 6, 23, 0.2), rgba(2, 6, 23, 0.74)); }
.featured-meta { position: relative; z-index: 1; padding: var(--space-3); display: grid; gap: var(--space-1); }
.featured-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
.featured-name { margin: 0; color: #fff; font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.featured-update { margin: 0; color: rgba(255, 255, 255, 0.92); font-size: 12px; }
.trend { height: 20px; min-width: 20px; border-radius: 999px; padding: 0 var(--space-1); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border: 1px solid transparent; }
.trend.rise { color: #b91c1c; background: #fee2e2; border-color: #fecaca; }
.trend.new { color: #92400e; background: #fef3c7; border-color: #fde68a; }
.trend.steady { color: #065f46; background: #d1fae5; border-color: #a7f3d0; }
.grid-wrap { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); }
.rank-card { position: relative; isolation: isolate; border: 1px solid var(--border); border-radius: 14px; background: var(--bg-surface); display: grid; grid-template-columns: 96px 1fr; padding: var(--space-2); gap: var(--space-2); text-align: left; cursor: pointer; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.rank-card::before { content: ''; position: absolute; inset: 0; z-index: 0; background-image: var(--cover-bg); background-size: cover; background-position: center; filter: blur(18px) saturate(128%); transform: scale(1.08); opacity: 0.56; pointer-events: none; }
.rank-card::after { content: ''; position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.26) 34%, rgba(255, 255, 255, 0.56) 62%, rgba(255, 255, 255, 0) 100%); pointer-events: none; }
.rank-card > * { position: relative; z-index: 2; }
.rank-card:hover { transform: translateY(-2px); box-shadow: 0 10px 18px color-mix(in srgb, var(--accent) 16%, rgba(15, 23, 42, 0.1)); }
.rank-cover { width: 96px; height: 96px; border-radius: 10px; object-fit: cover; }
.rank-main { min-width: 0; display: grid; gap: var(--space-1); }
.rank-top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2); }
.rank-name { margin: 0; font-size: 14px; color: var(--text-main); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-tags { display: inline-flex; align-items: center; gap: var(--space-1); }
.pill { flex: 0 0 auto; font-size: 11px; color: var(--text-sub); background: var(--bg-muted); border: 1px solid var(--border); border-radius: 999px; padding: 2px var(--space-1); }
.track-list { margin: 0; padding: 0; list-style: none; color: var(--text-sub); font-size: 12px; display: grid; gap: var(--space-1); }
.track-list li { display: grid; grid-template-columns: 18px 1fr; align-items: center; gap: var(--space-1); min-width: 0; }
.track-no { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 6px; font-size: 11px; font-weight: 700; color: var(--text-sub); background: var(--bg-muted); }
.track-text { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.track-song,
.track-artist-fallback { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.track-separator { color: var(--text-soft); }
.artist-link { border: 0; padding: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.artist-link:hover { color: var(--accent); text-decoration: underline; }
.artist-link + .artist-link::before { content: '/'; margin: 0 2px; color: var(--text-soft); }
.muted { margin: 0; color: var(--text-soft); }
.rank-content { display: grid; gap: var(--space-3); }
@media (max-width: 1280px) { .featured-scroll { grid-template-columns: repeat(3, minmax(0, 1fr)); } .grid-wrap { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 980px) { .featured-scroll { grid-template-columns: repeat(2, minmax(0, 1fr)); } .grid-wrap { grid-template-columns: repeat(1, minmax(0, 1fr)); } }
@media (max-width: 767px) { .rank-page-header { align-items: flex-start; flex-direction: column; } .featured-scroll { display: flex; overflow-x: auto; padding-bottom: var(--space-0); } .featured-card { flex: 0 0 196px; } .rank-card { grid-template-columns: 80px 1fr; } .rank-cover { width: 80px; height: 80px; } .rank-tags { flex-wrap: wrap; justify-content: flex-end; } }
</style>
