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
            <span v-if="props.optionVipLabels[opt]" class="dd-item-vip">{{ props.optionVipLabels[opt] }}</span>
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
    optionVipLabels?: Record<string, string>;
  }>(),
  {
    placeholder: '请选择',
    optionColors: () => ({}),
    optionVipLabels: () => ({}),
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
const direction = ref<'down' | 'up'>('down');

const displayLabel = computed(() => props.modelValue || props.placeholder);

const menuStyle = computed(() => {
  const originX = menuLeft.value + menuWidth.value > window.innerWidth - 16 ? 'right' : 'left';
  const originY = direction.value === 'up' ? 'bottom' : 'top';
  return {
    top: `${menuTop.value}px`,
    left: `${menuLeft.value}px`,
    width: `${menuWidth.value}px`,
    transformOrigin: `${originY} ${originX}`,
  };
});

function updateMenuPosition() {
  if (!rootRef.value) return;
  const rect = rootRef.value.getBoundingClientRect();
  menuWidth.value = Math.max(rect.width, 120);

  const itemHeight = 38;
  const padding = 16;
  const estimatedHeight = Math.min(props.options.length * itemHeight + padding, 260);
  const gap = 6;

  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  // Vertical: show below if enough room, otherwise flip upward
  const fitsBelow = spaceBelow >= estimatedHeight + gap;
  const fitsAbove = spaceAbove >= estimatedHeight + gap;

  if (fitsBelow) {
    direction.value = 'down';
    menuTop.value = rect.bottom + gap;
  } else if (fitsAbove) {
    direction.value = 'up';
    menuTop.value = rect.top - estimatedHeight - gap;
  } else {
    // Neither fits fully — use the side with more room
    if (spaceAbove > spaceBelow) {
      direction.value = 'up';
      menuTop.value = Math.max(gap, rect.top - estimatedHeight - gap);
    } else {
      direction.value = 'down';
      menuTop.value = rect.bottom + gap;
    }
  }

  // Horizontal: left-align by default, right-align if overflowing right edge
  if (rect.left + menuWidth.value > window.innerWidth) {
    menuLeft.value = Math.max(8, window.innerWidth - menuWidth.value - 8);
  } else {
    menuLeft.value = rect.left;
  }
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
  height: var(--button-height-md);
  border-radius: var(--button-radius-md);
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
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  overflow: hidden;
}

.dd-swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--text-main) 25%, transparent);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  flex: 0 0 auto;
}

.dd-item-vip {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  height: 14px;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
  margin-left: auto;
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
  border-radius: 10px;
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
