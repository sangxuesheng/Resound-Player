<template>
  <AnimatedAppear tag="div" variant="control" rhythm="actions" class-name="dd" :class="{ open }">
    <button ref="rootRef" class="dd-trigger" type="button" @click="toggleOpen">
      <span class="dd-label">
        <span v-if="props.optionColors[modelValue]" class="dd-swatch" :style="{ background: props.optionColors[modelValue] }"></span>
        {{ displayLabel }}
      </span>
      <ChevronDown :size="14" class="dd-icon" :class="{ up: open }" />
    </button>

    <Teleport to="body">
      <AnimatedAppear v-if="open" tag="div" variant="modal" rhythm="overlay" class-name="dd-menu" role="listbox" :style="menuStyle">
        <AnimatedAppear
          v-for="(opt, idx) in options"
          :key="opt"
          tag="button"
          variant="control"
          rhythm="list"
          :index="idx"
          class-name="dd-item"
          :class="{ active: opt === modelValue }"
          type="button"
          @click="select(opt)"
        >
          <span class="dd-item-label">
            <span v-if="props.optionColors[opt]" class="dd-swatch" :style="{ background: props.optionColors[opt] }"></span>
            {{ opt }}
          </span>
        </AnimatedAppear>
      </AnimatedAppear>
    </Teleport>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AnimatedAppear from '../AnimatedAppear.vue';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: string[];
    placeholder?: string;
    optionColors?: Record<string, string>;
  }>(),
  {
    placeholder: '请选择',
    optionColors: () => ({}),
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const menuTop = ref(0);
const menuLeft = ref(0);
const menuWidth = ref(120);

const displayLabel = computed(() => props.modelValue || props.placeholder);

const menuStyle = computed(() => ({
  top: `${menuTop.value}px`,
  left: `${menuLeft.value}px`,
  width: `${menuWidth.value}px`,
}));

function updateMenuPosition() {
  if (!rootRef.value) return;
  const rect = rootRef.value.getBoundingClientRect();
  menuTop.value = rect.bottom + 6;
  menuLeft.value = rect.left;
  menuWidth.value = rect.width;
}

function toggleOpen() {
  open.value = !open.value;
  if (open.value) updateMenuPosition();
}

function select(value: string) {
  emit('update:modelValue', value);
  open.value = false;
}

function onDocClick(e: MouseEvent) {
  if (!rootRef.value) return;
  const target = e.target as Node;
  if (!rootRef.value.contains(target)) open.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false;
}

function onViewportChange() {
  if (open.value) updateMenuPosition();
}

onMounted(() => {
  window.addEventListener('click', onDocClick);
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('scroll', onViewportChange, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', onDocClick);
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', onViewportChange);
  window.removeEventListener('scroll', onViewportChange, true);
});
</script>

<style scoped>
.dd {
  position: relative;
  width: 120px;
  z-index: 10;
}

.dd.open {
  z-index: 999;
}

.dd-trigger {
  width: 100%;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--glass-reflection), var(--bg-muted);
  color: var(--text-main);
  padding: 0 var(--space-2);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dd-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.dd-item-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.dd-swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--text-main) 25%, transparent);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  flex: 0 0 auto;
}

.dd-icon {
  transition: transform 0.2s ease;
}

.dd-icon.up {
  transform: rotate(180deg);
}

.dd-menu {
  position: fixed;
  z-index: 10000;
  max-height: min(260px, calc(100vh - 120px));
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-surface);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.55) inset;
  padding: var(--space-1);
  box-sizing: border-box;
  isolation: isolate;
}

.dd-item {
  width: 100%;
  min-height: 38px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-main);
  text-align: left;
  padding: var(--space-1) var(--space-2);
}

.dd-item:hover,
.dd-item.active {
  background: color-mix(in srgb, var(--accent) 14%, var(--bg-muted));
}

</style>
