<template>
  <div class="toggle-row">
    <span class="toggle-label">{{ label }}</span>
    <button
      type="button"
      class="toggle-btn"
      :class="{ active: modelValue }"
      :aria-pressed="modelValue"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <span class="toggle-knob"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; modelValue: boolean }>();
defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<style scoped>
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.toggle-label {
  color: var(--text-main, rgba(255,255,255,0.82));
  font-size: 14px;
}
.toggle-btn {
  width: 40px;
  height: 24px;
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(255,255,255,0.12));
  background: var(--bg-muted, rgba(255,255,255,0.15));
  cursor: pointer;
  position: relative;
  transition: background 160ms ease, border-color 160ms ease;
  padding: 0;
  flex-shrink: 0;
}
.toggle-btn.active {
  background: color-mix(in srgb, var(--accent) 74%, var(--bg-surface));
  border-color: color-mix(in srgb, var(--accent) 56%, var(--border));
}
.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bg-solid, #fff);
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: transform 160ms ease;
}
.toggle-btn.active .toggle-knob {
  transform: translateX(16px);
}
</style>
