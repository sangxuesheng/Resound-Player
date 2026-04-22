<template>
  <AnimatedAppear tag="section" variant="content" rhythm="body" class-name="editor-wrap">
    <div class="editor-toolbar">
      <AnimatedAppear tag="h3" variant="title" rhythm="title" class-name="title">组件网格布局</AnimatedAppear>
      <div class="actions">
        <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="btn" :class="{ active: editMode }" @click="toggleEditMode">
          {{ editMode ? '退出编辑' : '进入编辑' }}
        </AnimatedAppear>
        <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="1" class-name="btn" @click="saveLayout">
          {{ saveState === 'saved' ? '已保存' : saveState === 'saving' ? '保存中...' : '保存布局' }}
        </AnimatedAppear>
        <AnimatedAppear tag="button" variant="control" rhythm="actions" :index="2" class-name="btn danger" @click="resetLayout">还原示例</AnimatedAppear>
      </div>
    </div>

    <AnimatedAppear v-if="editMode && catalog.length" tag="div" variant="content" rhythm="body" class-name="catalog-bar">
      <select v-model="selectedCatalogId" class="catalog-select">
        <option value="">选择组件</option>
        <option v-for="c in addableCatalog" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
      <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="btn" :disabled="!selectedCatalogId" @click="addSelectedWidget">添加到当前页面</AnimatedAppear>
    </AnimatedAppear>

    <div ref="gridRef" class="grid-canvas" :style="canvasStyle">
      <div class="grid-bg"></div>

      <div
        v-for="item in layout"
        :key="item.id"
        class="grid-item"
        :class="{ editing: editMode, dragging: draggingId === item.id }"
        :style="itemStyle(item)"
      >
        <div class="item-header" @mousedown="onDragStart($event, item)">
          <span class="item-title">{{ item.title }}</span>
          <span class="item-meta">{{ item.w }}×{{ item.h }}</span>
        </div>

        <div class="item-content">
          <p>{{ item.content }}</p>
          <p class="xy">x={{ item.x }}, y={{ item.y }}, w={{ item.w }}, h={{ item.h }}</p>
        </div>

        <AnimatedAppear v-if="editMode" tag="button" variant="control" rhythm="actions" class-name="remove-btn" @click.stop="removeWidget(item.id)">移除</AnimatedAppear>
        <div v-if="editMode" class="resize-handle" @mousedown.stop="onResizeStart($event, item)"></div>
      </div>
    </div>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AnimatedAppear from './AnimatedAppear.vue';

const emit = defineEmits<{
  (e: 'saved', payload: unknown): void;
}>();

export type GridItem = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  content: string;
};

type CatalogItem = {
  id: string;
  title: string;
  content: string;
  defaultW?: number;
  defaultH?: number;
};

const COLS = 12;
// 为浮窗编辑场景做等比例缩小，减少纵向占用
const ROW_HEIGHT = 44;
const GAP = 6;

const props = withDefaults(
  defineProps<{
    storageKey?: string;
    initialLayout?: GridItem[];
    catalog?: CatalogItem[];
  }>(),
  {
    storageKey: 'tm_layout_editor_v1',
    initialLayout: () => [],
    catalog: () => [],
  },
);

const editMode = ref(false);
const gridRef = ref<HTMLElement | null>(null);
const draggingId = ref<string | null>(null);
const saveState = ref<'idle' | 'saving' | 'saved'>('idle');
const selectedCatalogId = ref('');

const defaultLayout: GridItem[] = [
  { id: 'a', x: 0, y: 0, w: 4, h: 2, title: '销售概览', content: '统计卡片：展示核心指标与环比。' },
  { id: 'b', x: 4, y: 0, w: 4, h: 3, title: '用户趋势', content: '趋势图区域：可接图表组件。' },
  { id: 'c', x: 8, y: 0, w: 4, h: 2, title: '告警信息', content: '告警摘要：支持优先级颜色。' },
];

const layout = ref<GridItem[]>([]);
const catalog = computed(() => props.catalog || []);
const addableCatalog = computed(() => catalog.value.filter((c) => !layout.value.some((i) => i.id === c.id)));

const canvasStyle = computed(() => {
  const maxY = layout.value.reduce((m, i) => Math.max(m, i.y + i.h), 0);
  const px = maxY > 0 ? maxY * ROW_HEIGHT + (maxY - 1) * GAP : 300;
  return { minHeight: `${Math.max(px, 300)}px` };
});

function getColWidth() {
  const total = gridRef.value?.clientWidth || 1200;
  return Math.floor((total - GAP * (COLS - 1)) / COLS);
}

function itemStyle(item: GridItem) {
  const colWidth = getColWidth();
  const left = item.x * (colWidth + GAP);
  const top = item.y * (ROW_HEIGHT + GAP);
  const width = item.w * colWidth + (item.w - 1) * GAP;
  const height = item.h * ROW_HEIGHT + (item.h - 1) * GAP;
  return { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` };
}

function isOverlap(a: GridItem, b: GridItem) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function resolveCollision(target: GridItem) {
  let moved = true;
  while (moved) {
    moved = false;
    for (const item of layout.value) {
      if (item.id === target.id) continue;
      if (isOverlap(target, item)) {
        target.y = item.y + item.h;
        moved = true;
      }
    }
  }
}

function onDragStart(e: MouseEvent, item: GridItem) {
  if (!editMode.value) return;
  draggingId.value = item.id;

  const startX = e.clientX;
  const startY = e.clientY;
  const start = { ...item };
  const stepX = getColWidth() + GAP;
  const stepY = ROW_HEIGHT + GAP;

  const onMove = (ev: MouseEvent) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;

    let nx = Math.round(start.x + dx / stepX);
    let ny = Math.round(start.y + dy / stepY);

    nx = Math.max(0, Math.min(COLS - item.w, nx));
    ny = Math.max(0, ny);

    item.x = nx;
    item.y = ny;
    resolveCollision(item);
  };

  const onUp = () => {
    draggingId.value = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function onResizeStart(e: MouseEvent, item: GridItem) {
  if (!editMode.value) return;

  const startX = e.clientX;
  const startY = e.clientY;
  const startW = item.w;
  const startH = item.h;
  const stepX = getColWidth() + GAP;
  const stepY = ROW_HEIGHT + GAP;

  const onMove = (ev: MouseEvent) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;

    let nw = Math.round(startW + dx / stepX);
    let nh = Math.round(startH + dy / stepY);

    nw = Math.max(1, Math.min(COLS - item.x, nw));
    nh = Math.max(1, nh);

    item.w = nw;
    item.h = nh;
    resolveCollision(item);
  };

  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function toggleEditMode() {
  editMode.value = !editMode.value;
}

function saveLayout() {
  saveState.value = 'saving';
  const payload = JSON.parse(JSON.stringify(layout.value));
  localStorage.setItem(props.storageKey, JSON.stringify(payload));
  emit('saved', payload);
  saveState.value = 'saved';
  window.setTimeout(() => (saveState.value = 'idle'), 1200);
}

function resetLayout() {
  const base = props.initialLayout.length ? props.initialLayout : defaultLayout;
  layout.value = JSON.parse(JSON.stringify(base));
  localStorage.removeItem(props.storageKey);
  emit('saved', JSON.parse(JSON.stringify(layout.value)));
}

function removeWidget(id: string) {
  layout.value = layout.value.filter((x) => x.id !== id);
}

function addSelectedWidget() {
  const selected = addableCatalog.value.find((x) => x.id === selectedCatalogId.value);
  if (!selected) return;
  const y = layout.value.reduce((m, i) => Math.max(m, i.y + i.h), 0);
  layout.value.push({
    id: selected.id,
    x: 0,
    y,
    w: Math.min(selected.defaultW || 4, COLS),
    h: selected.defaultH || 2,
    title: selected.title,
    content: selected.content,
  });
  selectedCatalogId.value = '';
}

onMounted(() => {
  const saved = localStorage.getItem(props.storageKey);
  if (saved) {
    layout.value = JSON.parse(saved);
    return;
  }
  const base = props.initialLayout.length ? props.initialLayout : defaultLayout;
  layout.value = JSON.parse(JSON.stringify(base));
});
</script>

<style scoped>
.editor-wrap { border: 1px solid var(--border); border-radius: 14px; background: var(--bg-surface); padding: 14px; display: grid; gap: 12px; }
.editor-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; min-width: 0; }
.title { margin: 0; font-size: 16px; color: var(--text-main); }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn { height: 34px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-muted); color: var(--text-main); cursor: pointer; }
.btn.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.btn.danger { border-color: color-mix(in srgb, #ef4444 45%, var(--border)); color: #ef4444; }
.catalog-bar { display: flex; gap: 8px; align-items: center; min-width: 0; flex-wrap: wrap; }
.catalog-select { height: 34px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-muted); color: var(--text-main); padding: 0 10px; min-width: 0; flex: 1 1 220px; }
.grid-canvas { position: relative; width: 100%; min-width: 0; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-surface); overflow: auto; padding: 6px; box-sizing: border-box; max-height: 58vh; }
.grid-bg { position: absolute; inset: 12px; background-image: linear-gradient(to right, color-mix(in srgb, var(--border) 35%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border) 35%, transparent) 1px, transparent 1px); background-size: calc((100% - 11 * 12px) / 12 + 12px) calc(72px + 12px); pointer-events: none; }
.grid-item { position: absolute; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08); overflow: hidden; user-select: none; }
.grid-item.editing:hover,.grid-item.dragging { box-shadow: 0 10px 26px rgba(15, 23, 42, 0.16); }
.item-header { height: 32px; border-bottom: 1px solid var(--border-soft); background: var(--bg-muted); display: flex; align-items: center; justify-content: space-between; padding: 0 10px; cursor: default; }
.grid-item.editing .item-header { cursor: move; }
.item-title { font-size: 14px; font-weight: 600; color: var(--text-main); }
.item-meta { font-size: 12px; color: var(--text-sub); }
.item-content { padding: 12px; font-size: 13px; color: var(--text-main); }
.xy { margin-top: 8px; color: var(--text-sub); font-size: 12px; }
.remove-btn { position: absolute; right: 24px; bottom: 6px; height: 22px; border-radius: 6px; border: 1px solid color-mix(in srgb, #ef4444 50%, var(--border)); background: var(--bg-surface); color: #ef4444; font-size: 11px; padding: 0 6px; }
.resize-handle { position: absolute; right: 6px; bottom: 6px; width: 14px; height: 14px; border-radius: 3px; background: var(--accent); cursor: nwse-resize; }
</style>
