<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="podcast-detail-page">
    <div class="header">
      <div>
        <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="title">播客详情</AnimatedAppear>
        <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="subtitle">
          {{ title || detail?.name || '当前播客' }}
        </AnimatedAppear>
      </div>
      <button class="back-btn" @click="$emit('back')">返回播客列表</button>
    </div>

    <div class="hero" v-if="hero">
      <img class="hero-cover" :src="hero.coverUrl" :alt="hero.name || title || '播客封面'" loading="lazy" />
      <div class="hero-meta">
        <div class="category" v-if="hero.category">{{ hero.category }}</div>
        <h3>{{ hero.name || title }}</h3>
        <p>{{ hero.description || hero.desc || detail?.description || detail?.desc || '暂无简介' }}</p>
      </div>
    </div>

    <div class="panel">
      <div v-if="loading" class="empty">加载中…</div>
      <div v-else-if="items.length" class="list">
        <div v-for="item in items" :key="item.id" class="row">
          <div class="index">{{ item.index ?? '-' }}</div>
          <div class="meta">
            <strong>{{ item.name || item.programName || '声音' }}</strong>
            <span>{{ item.durationText || item.duration || '声音内容' }}</span>
          </div>
        </div>
      </div>
      <p v-else class="empty">暂无声音列表数据</p>
    </div>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AnimatedAppear from './AnimatedAppear.vue';

const props = defineProps<{ title?: string; items: any[]; loading?: boolean }>();

defineEmits<{ (e: 'back'): void }>();

const detail = computed(() => props.items?.[0]?.voiceList || props.items?.[0]?.detail || props.items?.[0]?.program?.radio || props.items?.[0]?.program || props.items?.[0] || null);
const hero = computed(() => {
  const source = detail.value || {};
  return source
    ? {
        coverUrl: source.picUrl || source.coverUrl || source.imgUrl || source.imageUrl || '',
        name: source.name || source.title || '',
        category: source.category || source.radioType || source.type || '',
        description: source.description || source.desc || source.briefDesc || '',
      }
    : null;
});
</script>

<style scoped>
.podcast-detail-page { display: grid; gap: 16px; }
.header { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
.title { margin: 0; font-size: 24px; font-weight: 800; }
.subtitle { margin: 6px 0 0; color: var(--text-sub); }
.back-btn { height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--bg-surface); }
.hero { display: flex; gap: 16px; align-items: flex-start; padding: 18px; border: 1px solid var(--border); border-radius: 20px; background: var(--bg-surface); }
.hero-cover { width: 120px; height: 120px; border-radius: 20px; object-fit: cover; flex: 0 0 auto; background: var(--bg-muted); }
.hero-meta { display: grid; gap: 8px; min-width: 0; }
.hero-meta h3 { margin: 0; font-size: 22px; }
.hero-meta p { margin: 0; color: var(--text-sub); line-height: 1.6; }
.category { display: inline-flex; width: fit-content; padding: 4px 10px; border-radius: 999px; background: var(--bg-muted); color: var(--text-sub); font-size: 12px; }
.panel { border: 1px solid var(--border); border-radius: 20px; background: var(--bg-surface); padding: 18px; }
.list { display: grid; gap: 12px; }
.row { display: flex; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 14px; background: var(--bg-muted); border: 1px solid transparent; }
.index { width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; background: var(--bg-surface); color: var(--text-sub); flex: 0 0 auto; }
.meta { display: grid; gap: 4px; }
.meta span, .empty { color: var(--text-sub); }
.empty { margin: 0; }
</style>