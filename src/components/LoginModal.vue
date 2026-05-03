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
        <transition name="toast-fade">
          <div v-if="toast" class="lm-toast">{{ toast }}</div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { loginModalState, hideLoginModal } from '../stores/loginModal';
import { userStore } from '../stores/user';
import LoginPanel from './LoginPanel.vue';

const backdropRef = ref<HTMLElement | null>(null);
const toast = ref('');

function close() {
  // 检测是否通过搜索用户方式登录（无 cookie = 搜索用户）
  if (loginModalState.intent === 'like' && userStore.isLogin && !userStore.loginCookie) {
    toast.value = '搜索用户方式登录不支持收藏功能，请使用扫码或 Cookie 登录';
    loginModalState.toastMessage = toast.value;
    setTimeout(() => { toast.value = ''; loginModalState.toastMessage = ''; }, 4000);
  }
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
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateY(8px); }
.lm-toast {
  position: fixed; bottom: 12%; left: 50%; transform: translateX(-50%);
  padding: 10px 20px; border-radius: 999px; max-width: 400px; text-align: center;
  background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
  color: #fbbf24; font-size: 13px; font-weight: 500; line-height: 1.4;
  pointer-events: none; z-index: 310;
}
</style>
