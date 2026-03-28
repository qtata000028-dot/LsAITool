<template>
  <div class="poster-shell">
    <div class="poster-scroll">
      <div class="poster-canvas">
        <header class="poster-header">
          <div class="poster-header__title">{{ resolvedTitle }}</div>
        </header>

        <div class="poster-brandbar">
          <span class="poster-brandbar__line"></span>
          <span class="poster-brandbar__name">lumsoft 朗速</span>
          <span class="poster-brandbar__line"></span>
        </div>

        <section class="poster-stage">
          <div class="poster-stage__rail poster-stage__rail--left"></div>

          <div class="poster-stage__main">
            <div v-if="flowNode" class="poster-graph">
              <ProcessPosterNode :node="flowNode" :depth="0" />
            </div>
            <div v-else class="poster-empty">
              还没有可预览的流程数据，请先在设计模式中完成流程配置。
            </div>
          </div>

          <div class="poster-stage__rail poster-stage__rail--right"></div>
        </section>

        <footer class="poster-footer"></footer>
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
    return `${props.schemeName.trim()}流程图`
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
  width: 440px;
  min-height: 760px;
  background: #fff;
  box-shadow: 0 22px 40px -34px rgba(15, 23, 42, 0.24);
}

.poster-header {
  padding: 16px 18px 14px;
  background: linear-gradient(180deg, #154780 0%, #1e5fa2 100%);
  color: #fff;
  text-align: center;
}

.poster-header__title {
  font-size: 26px;
  line-height: 1.18;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.poster-brandbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 38px;
  background: linear-gradient(180deg, #1f6bac 0%, #1b5c9b 100%);
  color: rgba(255, 255, 255, 0.9);
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.poster-brandbar__name {
  font-size: 12px;
  font-style: italic;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.poster-brandbar__line {
  width: 24px;
  height: 2px;
  background: rgba(255, 243, 199, 0.8);
}

.poster-stage {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 22px;
  align-items: stretch;
  min-height: 640px;
  background: #fff;
}

.poster-stage__rail {
  min-height: 100%;
}

.poster-stage__rail--left {
  background: linear-gradient(180deg, #f6fbff 0%, #dbeeff 24%, #add4f1 100%);
}

.poster-stage__rail--right {
  background: linear-gradient(180deg, #f7fcff 0%, #e3f2ff 24%, #b8daf2 100%);
}

.poster-stage__main {
  padding: 34px 18px 56px;
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

.poster-footer {
  height: 32px;
  background: linear-gradient(180deg, #1f5a95 0%, #16497f 100%);
}
</style>
