import { reactive } from 'vue';

export type LoginIntent = 'like' | 'playlist' | 'none';

export type ToastType = 'warning' | 'success' | 'error';

export const loginModalState = reactive({
  visible: false,
  intent: 'none' as LoginIntent,
  globalToast: '',
  toastType: 'warning' as ToastType,
  toastTimer: undefined as ReturnType<typeof setTimeout> | undefined,
});

export function showLoginModal(intent: LoginIntent = 'none') {
  loginModalState.visible = true;
  loginModalState.intent = intent;
}

export function hideLoginModal() {
  loginModalState.visible = false;
  loginModalState.intent = 'none';
}

export function showGlobalToast(msg: string, type: ToastType = 'warning', duration = 4000) {
  if (loginModalState.toastTimer) clearTimeout(loginModalState.toastTimer);
  loginModalState.globalToast = msg;
  loginModalState.toastType = type;
  loginModalState.toastTimer = setTimeout(() => {
    loginModalState.globalToast = '';
    loginModalState.toastTimer = undefined;
  }, duration);
}
