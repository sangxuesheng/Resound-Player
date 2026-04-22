<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="user-split-view">
    <div class="split-stage" :class="{ 'has-detail': !!selectedItem }">
      <aside class="left-panel">
        <div class="mini-profile" v-if="profile">
          <img class="mini-avatar" :src="profile.avatarUrl" alt="头像" />
          <div class="mini-meta">
            <strong>{{ profile.nickname || '未命名用户' }}</strong>
            <span>{{ profile.signature || '这里展示用户简介与登录状态信息' }}</span>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat"><span class="stat-value">{{ detail?.profile?.followeds ?? 0 }}</span><span class="stat-label">粉丝</span></div>
          <div class="stat"><span class="stat-value">{{ detail?.profile?.follows ?? 0 }}</span><span class="stat-label">关注</span></div>
          <div class="stat"><span class="stat-value">{{ detail?.level ?? detail?.userPoint?.userLevel ?? 0 }}</span><span class="stat-label">等级</span></div>
        </div>

        <div class="tab-row">
          <button class="tab" :class="{ active: activeTab === 'playlists' }" @click="$emit('update:activeTab', 'playlists')">歌单列表</button>
          <button class="tab" :class="{ active: activeTab === 'cloud' }" @click="$emit('update:activeTab', 'cloud')">云盘</button>
        </div>

        <div class="left-content">
          <div class="sub-tabs">
            <button class="sub-tab" :class="{ active: playlistSubTab === 'created' }" @click="$emit('update:playlistSubTab', 'created')">创建歌单</button>
            <button class="sub-tab" :class="{ active: playlistSubTab === 'collected' }" @click="$emit('update:playlistSubTab', 'collected')">收藏歌单</button>
            <button class="sub-tab" :class="{ active: playlistSubTab === 'albums' }" @click="$emit('update:playlistSubTab', 'albums')">收藏专辑</button>
          </div>

          <div v-if="playlistSubTab === 'albums'" class="list-wrap">
            <button
              v-for="item in albumItems"
              :key="item.id"
              type="button"
              class="playlist-row"
              :class="{ active: selectedItem?.id === item.id }"
              @click="$emit('update:activeTab', 'playlists'); $emit('select-item', item)"
            >
              <img class="playlist-cover" :src="item.coverImgUrl || item.picUrl || item.coverUrl || profile?.avatarUrl" :alt="item.name" loading="lazy" />
              <div class="playlist-main">
                <strong>{{ item.name }}</strong>
                <span>{{ item.subtitle || item.artistName || item.artist || `${item.songCount ?? item.trackCount ?? item.size ?? item.subCount ?? 0} 首` }}</span>
              </div>
            </button>
          </div>

          <div v-else class="list-wrap">
            <button
              v-for="item in playlistItems"
              :key="item.id"
              type="button"
              class="playlist-row"
              :class="{ active: selectedItem?.id === item.id }"
              @click="$emit('update:activeTab', 'playlists'); $emit('select-item', item)"
            >
              <img class="playlist-cover" :src="item.coverImgUrl || item.picUrl || profile?.avatarUrl" :alt="item.name" loading="lazy" />
              <div class="playlist-main">
                <strong>{{ item.name }}</strong>
                <span>{{ item.subtitle }}</span>
              </div>
            </button>
          </div>
        </div>
      </aside>

      <section class="detail-panel" :style="detailPanelStyle">
        <div v-if="selectedItem" class="detail-body-wrap">
          <slot name="detail" :item="selectedItem" />
        </div>

        <div v-else class="detail-empty">
          <h3>请选择左侧内容</h3>
          <p>点击歌单或播客后，这里会联动显示对应详情。</p>
        </div>
      </section>
    </div>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AnimatedAppear from './AnimatedAppear.vue';

const props = defineProps<{
  detail?: any;
  profile?: any;
  activeTab: 'playlists' | 'cloud';
  playlistSubTab: 'created' | 'collected' | 'albums';
  playlistItems: any[];
  albumItems?: any[];
  selectedItem?: any;
}>();

const detailPanelStyle = computed(() => {
  const cover =
    props.selectedItem?.coverImgUrl ||
    props.selectedItem?.picUrl ||
    props.selectedItem?.coverUrl ||
    props.profile?.avatarUrl ||
    '';

  const avatar = props.profile?.avatarUrl || '';

  const accent =
    props.selectedItem?.color ||
    props.selectedItem?.themeColor ||
    props.selectedItem?.highlightColor ||
    '';

  return {
    '--detail-cover': cover ? `url(${cover})` : 'none',
    '--avatar-cover': avatar ? `url(${avatar})` : 'none',
    '--panel-accent': accent,
  } as Record<string, string>;
});

defineEmits<{
  (e: 'update:activeTab', value: 'playlists' | 'cloud'): void;
  (e: 'update:playlistSubTab', value: 'created' | 'collected' | 'albums'): void;
  (e: 'select-item', item: any): void;
}>();
</script>

<style scoped>
.user-split-view { display: grid; gap: 16px; height: 100%; min-height: 0; }
.split-stage { display: grid; grid-template-columns: minmax(360px, 420px) minmax(0, 1fr); gap: 16px; align-items: start; min-height: 0; height: 100%; }
.left-panel, .detail-panel { border: 1px solid var(--border); border-radius: 20px; background: var(--bg-surface); }
.left-panel { padding: 18px; display: grid; gap: 16px; align-content: start; grid-auto-rows: min-content; min-height: 0; max-height: 100%; overflow: auto; scrollbar-width: none; -ms-overflow-style: none; }
.left-panel::-webkit-scrollbar, .detail-panel::-webkit-scrollbar, .list-wrap::-webkit-scrollbar { width: 0; height: 0; }
.mini-profile { display: flex; gap: 12px; align-items: center; padding: 14px; border-radius: 16px; background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent) 0%, color-mix(in srgb, var(--bg-surface) 94%, transparent) 100%), var(--avatar-cover) center/cover no-repeat; position: relative; overflow: hidden; }
.mini-profile::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)), radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 62%); pointer-events: none; }
.mini-avatar { width: 90px; height: 90px; border-radius: 22px; object-fit: cover; position: relative; z-index: 1; }
.mini-meta { display: grid; gap: 4px; color: var(--text-sub); position: relative; z-index: 1; }
.mini-meta strong { color: var(--text-main); font-size: 18px; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.stat { padding: 12px; border-radius: 16px; background: var(--bg-muted); display: grid; gap: 4px; text-align: center; }
.stat-value { font-size: 22px; font-weight: 800; }
.stat-label { color: var(--text-sub); font-size: 12px; }
.tab-row, .sub-tabs { display: flex; gap: 8px; padding: 8px; border-radius: 18px; background: var(--bg-muted); width: 100%; box-sizing: border-box; min-height: 66px; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; }
.tab-row::-webkit-scrollbar, .sub-tabs::-webkit-scrollbar { width: 0; height: 0; }
.tab, .sub-tab { height: 40px; padding: 0 16px; margin: 0; border: 1px solid var(--border); border-radius: 999px; background: var(--glass-reflection), var(--bg-muted); color: var(--text-sub); font-weight: 600; cursor: pointer; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; user-select: none; box-sizing: border-box; transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}
.tab:hover, .sub-tab:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--accent) 34%, var(--border)); box-shadow: 0 10px 18px color-mix(in srgb, var(--accent) 10%, transparent); }
.tab:active, .sub-tab:active { transform: translateY(0) scale(0.99); }
.tab { font-size: 16px; flex: 1 1 0; }
.sub-tab { font-size: 14px; flex: 0 0 auto; }
.tab.active, .sub-tab.active { background: var(--glass-reflection), var(--bg-surface); color: var(--text-main); border-color: color-mix(in srgb, var(--accent) 42%, var(--border)); box-shadow: 0 8px 18px color-mix(in srgb, var(--accent) 12%, transparent); }
.left-content { display: grid; gap: 12px; min-height: 0; width: 100%; align-content: start; justify-items: stretch; grid-auto-rows: min-content; }
.list-wrap { display: grid; gap: 10px; min-height: 0; overflow: auto; scrollbar-width: none; -ms-overflow-style: none; }
.playlist-row, .dj-card { display: flex; gap: 12px; align-items: center; width: 100%; padding: 12px 14px; border-radius: 16px; border: 1px solid var(--border); text-align: left; background: var(--bg-muted); color: inherit; font: inherit; cursor: pointer; box-sizing: border-box; transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease; }
.playlist-row:hover, .dj-card:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--accent) 34%, var(--border)); box-shadow: 0 10px 18px color-mix(in srgb, var(--accent) 10%, transparent); }
.playlist-row:active, .dj-card:active { transform: translateY(0) scale(0.99); }
.playlist-row.active { border-color: var(--accent); padding: 10px 12px; }
.playlist-cover, .dj-cover { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; flex: 0 0 auto; }
.playlist-main, .dj-main { display: grid; gap: 4px; min-width: 0; flex: 1; }
.playlist-main strong, .playlist-main span, .dj-main strong, .dj-main span, .dj-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.playlist-main span, .dj-main span, .dj-main small { color: var(--text-sub); font-size: 13px; }
.detail-panel { padding: 18px; min-height: 0; max-height: 100%; position: relative; overflow: auto; isolation: isolate; scrollbar-width: none; -ms-overflow-style: none; }
.detail-panel::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(8, 15, 30, 0.06) 0%, rgba(8, 15, 30, 0) 100%), radial-gradient(520px 220px at 50% 0%, color-mix(in srgb, var(--panel-accent, var(--accent)) 38%, transparent) 0%, rgba(255, 255, 255, 0) 72%); background-repeat: no-repeat; background-size: 100% 220px, 100% 200px; background-position: top left, top center; opacity: 1; pointer-events: none; z-index: -2; }
.detail-panel::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 100%), radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--panel-accent, var(--accent)) 20%, transparent) 0%, transparent 66%), var(--detail-cover) center top / cover no-repeat; background-repeat: no-repeat; background-size: 100% 220px, 100% 180px, cover; background-position: top left, top center, center top; opacity: 0.16; filter: saturate(1.12) blur(14px); transform: scale(1.02); pointer-events: none; z-index: -1; }
.detail-body-wrap { min-height: 320px; position: relative; z-index: 1; }
.detail-empty { min-height: 320px; display: grid; place-items: center; gap: 14px; text-align: center; color: var(--text-sub); }
.detail-empty h3 { margin: 0; color: var(--text-main); }
.detail-empty p { margin: 0; max-width: 28ch; line-height: 1.6; }
@media (max-width: 1180px) { .split-stage { grid-template-columns: 1fr; height: auto; } .left-panel, .detail-panel { max-height: none; } }
@media (max-width: 767px) { .tab, .sub-tab { height: 44px; } .tab { font-size: 16px; } .sub-tab { font-size: 15px; } .stats-grid { grid-template-columns: 1fr; } .tab-row, .sub-tabs { width: 100%; } .playlist-row.active { padding: 9px 11px; } }
</style>
