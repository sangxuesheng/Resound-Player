import { reactive } from 'vue';

export const loginModalState = reactive({
  visible: false,
  callback: null as (() => void) | null,
});

export function showLoginModal(callback?: () => void) {
  loginModalState.visible = true;
  loginModalState.callback = callback ?? null;
}

export function hideLoginModal() {
  loginModalState.visible = false;
  loginModalState.callback = null;
}
