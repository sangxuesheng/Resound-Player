import { reactive } from 'vue';

export type LoginIntent = 'like' | 'playlist' | 'none';

export const loginModalState = reactive({
  visible: false,
  intent: 'none' as LoginIntent,
  toastMessage: '',
});

export function showLoginModal(intent: LoginIntent = 'none') {
  loginModalState.visible = true;
  loginModalState.intent = intent;
}

export function hideLoginModal() {
  loginModalState.visible = false;
  loginModalState.intent = 'none';
}
