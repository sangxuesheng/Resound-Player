<template>
  <AnimatedAppear tag="label" variant="control" rhythm="actions" class-name="fancy-switch" :class="{ checked: modelValue, disabled }" :for="switchId">
    <input
      :id="switchId"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="onChange"
    />
    <svg viewBox="0 0 212.4992 84.4688" overflow="visible" aria-hidden="true">
      <path
        pathLength="360"
        fill="none"
        stroke="currentColor"
        d="M 42.2496 0 A 42.24 42.24 90 0 0 0 42.2496 A 42.24 42.24 90 0 0 42.2496 84.4688 A 42.24 42.24 90 0 0 84.4992 42.2496 A 42.24 42.24 90 0 0 42.2496 0 A 42.24 42.24 90 0 0 0 42.2496 A 42.24 42.24 90 0 0 42.2496 84.4688 L 170.2496 84.4688 A 42.24 42.24 90 0 0 212.4992 42.2496 A 42.24 42.24 90 0 0 170.2496 0 A 42.24 42.24 90 0 0 128 42.2496 A 42.24 42.24 90 0 0 170.2496 84.4688 A 42.24 42.24 90 0 0 212.4992 42.2496 A 42.24 42.24 90 0 0 170.2496 0 L 42.2496 0"
      />
    </svg>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AnimatedAppear from '../AnimatedAppear.vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    disabled?: boolean;
    id?: string;
  }>(),
  {
    disabled: false,
    id: undefined,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const switchId = computed(() => props.id || `fancy-switch-${Math.random().toString(36).slice(2, 9)}`);

function onChange(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.checked);
}
</script>

<style scoped>
.fancy-switch {
  --a: 0.5s ease-out;
  cursor: pointer;
  position: relative;
  display: inline-flex;
  vertical-align: middle;
  flex: 0 0 auto;
  transform: translateY(0);
  height: 12px;
  border-radius: 999px;
  aspect-ratio: 212.4992 / 84.4688;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--text-soft) 32%, transparent);
  background: color-mix(in srgb, var(--text-soft) 34%, var(--bg-muted));
  color: var(--bg-surface);
  border: 1px solid var(--border-soft);
  transition: background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
}

.fancy-switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.fancy-switch svg {
  height: 100%;
}

.fancy-switch svg path {
  stroke-width: 16;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 136 224;
  transition: all var(--a), 0s transform;
  transform-origin: center;
}

.fancy-switch.checked {
  background: color-mix(in srgb, var(--accent) 74%, var(--bg-surface));
  border-color: color-mix(in srgb, var(--accent) 56%, var(--border));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 26%, transparent);
}

.fancy-switch.checked svg path {
  stroke-dashoffset: 180;
  transform: scaleY(-1);
}

.fancy-switch.disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
