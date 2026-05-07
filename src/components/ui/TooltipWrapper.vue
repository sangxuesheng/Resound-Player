<template>
  <div
    class="tooltip-wrapper"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot />
    <Teleport to="body">
      <div
        v-if="visible"
        class="tooltip-teleported"
        :style="tooltipStyle"
      >
        {{ text }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  text: string;
}>();

const visible = ref(false);
const triggerRect = ref<DOMRect | null>(null);
const wrapperEl = ref<HTMLElement | null>(null);

const tooltipStyle = computed(() => {
  if (!triggerRect.value) return { display: 'none' };
  const r = triggerRect.value;
  // 居中于触发器上方 8px
  return {
    position: 'fixed' as const,
    left: `${r.left + r.width / 2}px`,
    top: `${r.top - 8}px`,
    transform: 'translate(-50%, -100%)',
  };
});

function onEnter(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  triggerRect.value = el.getBoundingClientRect();
  visible.value = true;
}

function onLeave() {
  visible.value = false;
  triggerRect.value = null;
}
</script>

<style scoped>
.tooltip-wrapper {
  display: inline-flex;
}
</style>