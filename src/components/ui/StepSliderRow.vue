<template>
  <div class="slider-row">
    <label class="slider-label">{{ label || steps[value] || '' }}</label>
    <div class="slider-control">
      <input type="range" min="0" max="2" step="1" :value="value" @input="$emit('update:value', Number(($event.target as HTMLInputElement).value))" />
      <div class="step-labels">
        <span v-for="(l, i) in steps" :key="i" :class="{ active: value === i }">{{ l }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ value: number; steps: string[]; label?: string }>();
defineEmits<{ 'update:value': [value: number] }>();
</script>

<style scoped>
.slider-row { display: grid; gap: var(--space-1, 4px); }
.slider-label { color: var(--text-main, rgba(255,255,255,0.82)); font-size: 14px; }
.slider-control { display: flex; align-items: center; gap: var(--space-2, 8px); }
.slider-control input[type='range'] { flex: 1; accent-color: var(--accent, #c39c76); }
.step-labels { display: flex; justify-content: space-between; padding: 0 2px; }
.step-labels span { font-size: 11px; color: var(--text-soft, rgba(255,255,255,0.35)); transition: color 120ms ease; }
.step-labels span.active { color: var(--accent, #c39c76); font-weight: 600; }
</style>
