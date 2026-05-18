<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="local-context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @click.stop
      @contextmenu.prevent
    >
      <button
        v-for="item in items"
        :key="item.key"
        class="context-item"
        :class="{ danger: item.danger }"
        @click="handleAction(item.key)"
      >
        <span class="context-icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </button>
    </div>
    <div v-if="visible" class="context-backdrop" @click="close" @contextmenu.prevent="close"></div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch } from 'vue'

export interface ContextMenuItem {
  key: string
  label: string
  icon?: string
  danger?: boolean
}

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}>()

const emit = defineEmits<{
  action: [key: string]
  close: []
}>()

function handleAction(key: string) {
  emit('action', key)
  emit('close')
}

function close() {
  emit('close')
}

watch(() => props.visible, (v) => {
  if (v) {
    // 确保菜单不超出视口
    const el = document.querySelector('.local-context-menu') as HTMLElement | null
    if (!el) return
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      if (rect.right > window.innerWidth) el.style.left = (window.innerWidth - rect.width - 8) + 'px'
      if (rect.bottom > window.innerHeight) el.style.top = (window.innerHeight - rect.height - 8) + 'px'
    })
  }
})
</script>

<style scoped>
.local-context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 160px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 6px 20px rgba(0,0,0,0.2);
  padding: var(--space-1);
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}
.context-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: none;
  background: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-label-sm);
  color: var(--text-main);
  text-align: left;
  white-space: nowrap;
  transition: background 0.1s;
}
.context-item:hover {
  background: var(--bg-muted);
}
.context-item.danger {
  color: var(--danger);
}
.context-item.danger:hover {
  background: var(--danger-soft);
}
.context-icon {
  width: 16px;
  text-align: center;
  font-size: 12px;
  flex-shrink: 0;
}
</style>