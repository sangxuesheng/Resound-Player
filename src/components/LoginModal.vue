<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="loginModalState.visible" class="lm-mask" @click.self="close" @keydown.esc="close" tabindex="-1" ref="backdropRef">
        <div class="lm-wrapper">
          <button class="lm-close" type="button" aria-label="关闭" @click="close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <LoginPanel />
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { loginModalState, hideLoginModal } from '../stores/loginModal';
import LoginPanel from './LoginPanel.vue';

const backdropRef = ref<HTMLElement | null>(null);

function close() {
  hideLoginModal();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && loginModalState.visible) close();
}

watch(() => loginModalState.visible, (open) => {
  if (open) nextTick(() => backdropRef.value?.focus());
});

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<style scoped>
.lm-mask {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.5);
  display: grid; place-items: center;
  overflow-y: auto; padding: 20px;
}
.lm-wrapper {
  position: relative;
  width: min(560px, calc(100vw - 40px));
  max-height: 85vh;
  overflow-y: auto;
  border-radius: 16px;
  background: var(--bg-solid);
  box-shadow: 0 24px 64px rgba(0,0,0,0.4);
}
.lm-close {
  position: absolute; top: 12px; right: 12px; z-index: 10;
  width: 32px; height: 32px; border: none; border-radius: 50%;
  background: rgba(0,0,0,0.3); color: #fff; cursor: pointer;
  display: grid; place-items: center;
  transition: background 0.12s ease;
}
.lm-close:hover { background: rgba(0,0,0,0.5); }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
