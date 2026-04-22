<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" :class="['page-shell', shellClass]">
    <div v-if="$slots.back" class="page-shell__back">
      <slot name="back" />
    </div>

    <AnimatedAppear tag="header" variant="content" rhythm="head" class-name="page-shell__header playlist-detail-header-wrap" :class="normalizedHeaderClass">
      <slot name="header" />
    </AnimatedAppear>

    <AnimatedAppear tag="div" variant="content" rhythm="body" class-name="page-shell__body" :class="bodyClass">
      <slot />
    </AnimatedAppear>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AnimatedAppear from './AnimatedAppear.vue';

const props = defineProps<{
  shellClass?: string;
  headerClass?: string;
  bodyClass?: string;
}>();

const normalizedHeaderClass = computed(() => {
  const raw = Array.isArray(props.headerClass) ? props.headerClass : [props.headerClass];
  return raw.filter(Boolean) as string[];
});
</script>

<style scoped>
.page-shell {
  display: grid;
  gap: var(--space-2);
}

.page-shell__header {
  display: grid;
  align-items: center;
  gap: 0;
}

.playlist-detail-header-wrap {
  transition:
    margin 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    padding 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    border-radius 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    transform 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    box-shadow 0.56s cubic-bezier(0.2, 0.9, 0.22, 1),
    background-color 0.46s ease,
    backdrop-filter 0.46s ease,
    -webkit-backdrop-filter 0.46s ease;
}

.playlist-detail-header-wrap.is-sticky-header {
  position: sticky;
  top: 0;
  z-index: 30;
  margin: 0 calc(var(--space-4) * -1) 0;
  padding: 0 var(--space-4) var(--space-2);
  border-radius: 0 0 18px 18px;
  background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(14px) saturate(150%);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
}

.playlist-detail-header-wrap.is-sticky-header.detail-sticky-header--embedded {
  top: -18px;
  margin: 0 -18px 0;
  padding: 18px 18px var(--space-2);
}

.page-shell__body {
  min-width: 0;
}

</style>