<template>
  <div class="radio-row">
    <span class="radio-label">{{ label }}</span>
    <div class="radio-group">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="radio-chip"
        :class="{ active: value === opt.value }"
        @click="$emit('update:value', opt.value)"
      >{{ opt.label }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface RadioOption { value: string; label: string }
defineProps<{ label: string; value: string; options: RadioOption[] }>();
defineEmits<{ 'update:value': [value: string] }>();
</script>

<style scoped>
.radio-row { display: grid; gap: var(--space-1, 4px); }
.radio-label { color: var(--text-main, rgba(255,255,255,0.82)); font-size: 14px; }
.radio-group { display: flex; flex-wrap: wrap; gap: var(--space-1, 4px); }
.radio-chip {
  padding: 5px 14px; border-radius: var(--button-radius-pill, 999px);
  border: 1px solid var(--border-soft, rgba(255,255,255,0.12));
  background: transparent; color: var(--text-soft, rgba(255,255,255,0.7));
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all 120ms ease;
}
.radio-chip.active {
  background: color-mix(in srgb, var(--accent) 88%, var(--bg-surface));
  border-color: transparent; color: #fff;
}
.radio-chip:hover:not(.active) {
  border-color: var(--border, rgba(255,255,255,0.3));
  color: var(--text-main, #fff);
}
</style>
