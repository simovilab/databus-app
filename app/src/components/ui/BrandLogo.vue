<template>
  <img
    :src="src"
    class="brand-logo"
    :style="{ height }"
    alt="Databús"
    data-testid="brand-logo"
  />
</template>

<script setup lang="ts">
// Databús wordmark. Two PNG variants ship in public/logo/: the black wordmark
// ("dark") for light surfaces and a white one ("light") for dark surfaces —
// both keep the green accent bar.
//
//   variant="dark"   black wordmark, for light backgrounds
//   variant="light"  white wordmark, for dark backgrounds (splash/login)
//   variant="auto"   follow the OS light/dark preference (safe on themed
//                    surfaces whose background flips with the palette)
//
// Height is caller-controlled; width scales with the aspect ratio.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'dark' | 'light' | 'auto';
    /** CSS height, e.g. "48px" or "2.5rem". Width follows the aspect ratio. */
    height?: string;
  }>(),
  { variant: 'dark', height: '48px' },
);

const prefersDark = ref(false);
let media: MediaQueryList | undefined;
function syncScheme(): void {
  prefersDark.value = media?.matches ?? false;
}

onMounted(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    media = window.matchMedia('(prefers-color-scheme: dark)');
    syncScheme();
    media.addEventListener('change', syncScheme);
  }
});
onBeforeUnmount(() => media?.removeEventListener('change', syncScheme));

const effectiveVariant = computed(() =>
  props.variant === 'auto' ? (prefersDark.value ? 'light' : 'dark') : props.variant,
);

const src = computed(() =>
  effectiveVariant.value === 'light'
    ? '/logo/databus-wordmark-light.png'
    : '/logo/databus-wordmark.png',
);
const height = computed(() => props.height);
</script>

<style scoped>
.brand-logo {
  display: block;
  width: auto;
  max-width: 100%;
  object-fit: contain;
}
</style>
