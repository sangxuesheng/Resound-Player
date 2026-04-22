<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="podcast-page">
    <div class="header">
      <div>
        <AnimatedAppear tag="h2" variant="title" rhythm="title" class-name="title">播客列表</AnimatedAppear>
        <AnimatedAppear tag="p" variant="text" rhythm="body" class-name="subtitle">
          浏览播客与有声书，点击查看封面、分类和简介。
        </AnimatedAppear>
      </div>
      <button class="back-btn" @click="$emit('back')">返回</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="empty">加载中…</div>
      <div v-else-if="items.length" class="list">
        <button v-for="item in items" :key="item.id || item.voiceListId || item.program?.id" class="row" @click="$emit('open-detail', item)">
          <img class="cover" :src="item.coverUrl || item.picUrl || item.imgUrl || item.program?.radio?.picUrl || ''" :alt="item.name || item.program?.name || '播客'" loading="lazy" />
          <div class="meta">
            <div class="meta-top">
              <strong>{{ item.name || item.program?.name || '播客节目' }}</strong>
              <span v-if="item.category || item.type" class="badge">{{ item.category || item.type }}</span>
            </div>
            <span>{{ item.subtitle || item.description || item.briefDesc || item.creator?.nickname || item.program?.radio?.name || item.radio?.name || '播客内容' }}</span>
          </div>
        </button>
      </div>
      <p v-else class="empty">暂无播客数据</p>
    </div>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import AnimatedAppear from './AnimatedAppear.vue';

defineProps<{ items: any[]; loading?: boolean }>();
defineEmits<{ (e: 'back'): void; (e: 'open-detail', item: any): void }>();
</script>

<style scoped>
.podcast-page { display: grid; gap: var(--space-4); }
.header { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--space-3); }
.title { margin: 0; font-size: 24px; font-weight: 800; }
.subtitle { margin: var(--space-1) 0 0; color: var(--text-sub); }
.back-btn { height: 38px; padding: 0 var(--space-3); border-radius: 999px; border: 1px solid var(--border); background: var(--bg-surface); }
.panel { border: 1px solid var(--border); border-radius: 20px; background: var(--bg-surface); padding: var(--space-4); }
.list { display: grid; gap: var(--space-3); }
.row { display: flex; gap: var(--space-3); align-items: center; padding: var(--space-3) var(--space-4); border-radius: 14px; background: var(--bg-muted); border: 1px solid transparent; }
.cover { width: 64px; height: 64px; border-radius: 14px; object-fit: cover; background: var(--bg-surface); flex: 0 0 auto; }
.meta { display: grid; gap: var(--space-1); min-width: 0; }
.meta-top { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.badge { flex: 0 0 auto; padding: 3px 8px; border-radius: 999px; background: var(--bg-surface); color: var(--text-sub); font-size: 12px; }
.meta span, .empty { color: var(--text-sub); }
.empty { margin: 0; }
</style>