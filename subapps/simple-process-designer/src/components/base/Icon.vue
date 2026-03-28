<template>
  <span class="base-icon" :style="styleObject">{{ resolved }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  color?: string;
  icon?: string;
  size?: number | string;
}>(), {
  color: 'currentColor',
  icon: '',
  size: 14,
});

const resolved = computed(() => {
  const icon = props.icon || '';
  const mapping: Record<string, string> = {
    'ep:arrow-right-bold': '>',
    'ep:circle-close-filled': 'x',
    'ep:plus': '+',
    'ep:edit-pen': 'e',
    'ep:download': 'D',
    'ep:upload': 'U',
  };

  return mapping[icon] ?? icon.split(':').pop() ?? '*';
});

const styleObject = computed(() => ({
  color: props.color,
  fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size,
}));
</script>

<style scoped>
.base-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1em;
  line-height: 1;
  font-weight: 700;
}
</style>
