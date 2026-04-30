<template>
  <div class="slider-row">
    <label class="slider-label">{{ label || steps[Math.round(value / stepRatio)] || '' }}</label>
    <div class="slider-control">
      <input type="range" :min="min" :max="max" :step="step" :value="value" @input="$emit('update:value', Number(($event.target as HTMLInputElement).value))" />
    </div>
    <div class="step-labels">
      <span v-for="(l, i) in steps" :key="i" :class="{ active: activeStepIdx === i }">{{ l }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ value: number; steps: string[]; label?: string; min?: number; max?: number; step?: number }>(), {
  min: 0,
  max: 10,
  step: 1,
});
defineEmits<{ 'update:value': [value: number] }>();

const stepRatio = computed(() => (props.max - props.min) / Math.max(1, props.steps.length - 1));
const activeStepIdx = computed(() => {
  const raw = (props.value - props.min) / stepRatio.value;
  return Math.round(raw);
});
</script>

<style scoped>
.slider-row { display: grid; gap: var(--space-1, 4px); border: 1px solid var(--border-soft, rgba(255,255,255,0.08)); border-radius: var(--radius-sm, 8px); padding: var(--space-2) var(--space-3); }
.slider-label { color: var(--text-main, rgba(255,255,255,0.82)); font-size: 14px; }
.slider-control { display: flex; align-items: center; gap: var(--space-2, 8px); }
.slider-control input[type='range'] { flex: 1; accent-color: var(--accent, #c39c76); }
.step-labels { display: flex; justify-content: space-between; padding: 0 2px; }
.step-labels span { font-size: 11px; color: var(--text-soft, rgba(255,255,255,0.35)); transition: color 120ms ease; }
.step-labels span.active { color: var(--accent, #c39c76); font-weight: 600; }
</style>
