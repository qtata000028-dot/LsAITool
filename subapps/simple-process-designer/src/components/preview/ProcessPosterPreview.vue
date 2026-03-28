<template>
  <div class="poster-shell">
    <div class="poster-scroll">
      <div class="poster-canvas">
        <header class="poster-header">
          <div class="poster-header__title">{{ resolvedTitle }}</div>
          <div class="poster-header__brand">
            <span class="poster-header__line"></span>
            <span class="poster-header__brand-name">lumsoft 朗速</span>
            <span class="poster-header__line"></span>
          </div>
        </header>

        <section class="poster-body">
          <div class="poster-body__main">
            <div v-if="flowNode" class="poster-graph">
              <ProcessPosterNode :node="flowNode" :depth="0" />
            </div>
            <div v-else class="poster-empty">
              还没有可预览的流程数据，请先在设计模式中完成流程配置。
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { SimpleFlowNode } from '../../../vendor/yudao-ui-admin-vue3/src/components/SimpleProcessDesignerV2/src/consts'
import ProcessPosterNode from './ProcessPosterNode.vue'

const props = defineProps<{
  businessCode?: string
  businessType?: string
  flowNode?: SimpleFlowNode
  moduleName?: string
  schemeCode?: string
  schemeName?: string
}>()

const resolvedTitle = computed(() => {
  if (props.schemeName && props.schemeName.trim()) {
    return `${props.schemeName.trim()}图`
  }
  return '流程图'
})
</script>

<style scoped>
.poster-shell {
  display: flex;
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  height: 100%;
  padding: 18px;
  box-sizing: border-box;
  background: #fff;
}

.poster-scroll {
  display: flex;
  flex: 1;
  justify-content: center;
  overflow: auto;
  background: #fff;
}

.poster-canvas {
  width: 420px;
  background: #fff;
  box-shadow: 0 22px 40px -34px rgba(15, 23, 42, 0.24);
}

.poster-header {
  padding: 18px 18px 12px;
  background: linear-gradient(180deg, #134a88 0%, #1f67ac 100%);
  color: #fff;
  text-align: center;
}

.poster-header__title {
  font-size: 26px;
  line-height: 1.18;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.poster-header__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
  color: rgba(255, 255, 255, 0.84);
  font-size: 12px;
  font-style: italic;
  font-weight: 700;
}

.poster-header__line {
  width: 20px;
  height: 2px;
  background: rgba(238, 242, 255, 0.45);
}

.poster-body {
  background: #fff;
}

.poster-body__main {
  padding: 30px 22px 24px;
  background: #fff;
}

.poster-graph {
  display: flex;
  justify-content: center;
  width: 100%;
}

.poster-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  color: #64748b;
  text-align: center;
  font-size: 13px;
  line-height: 1.8;
}
</style>
