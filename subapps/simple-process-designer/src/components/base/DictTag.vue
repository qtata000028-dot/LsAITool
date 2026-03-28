<template>
  <span class="dict-tag">{{ text }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  type?: string;
  value?: number | string;
}>();

const text = computed(() => `${props.value ?? '-'}`);
</script>

<style scoped>
.dict-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(29, 78, 216, 0.08);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}
</style>
