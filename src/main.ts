import { createApp } from 'vue';
import App from './App.vue';
import './styles/animations.css';
import './styles/interactive-media.css';
import './styles/theme.css';

const allowNativeSelection = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(target.closest('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]'));

const blockGlobalCopyActions = (event: Event) => {
  if (allowNativeSelection(event.target)) {
    return;
  }

  event.preventDefault();
};

const blockShortcutCopyActions = (event: KeyboardEvent) => {
  if (allowNativeSelection(event.target)) {
    return;
  }

  const isModifierPressed = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();

  if (isModifierPressed && ['a', 'c', 'x'].includes(key)) {
    event.preventDefault();
  }
};

document.addEventListener('copy', blockGlobalCopyActions);
document.addEventListener('cut', blockGlobalCopyActions);
document.addEventListener('selectstart', blockGlobalCopyActions);
document.addEventListener('contextmenu', blockGlobalCopyActions);
document.addEventListener('keydown', blockShortcutCopyActions);

createApp(App).mount('#app');
