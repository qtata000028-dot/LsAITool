<template>
  <div v-if="renderNode" class="poster-node">
    <template v-if="isBranchNode">
      <div class="poster-node__branch-shell">
        <div class="poster-node__branch-spine"></div>
        <div
          class="poster-node__branch-grid"
          :class="`poster-node__branch-grid--cols-${branchColumnCount}`"
          :style="{ width: branchConnectorWidth }"
        >
          <div class="poster-node__branch-topline"></div>
          <div
            v-for="(branchNode, index) in visibleBranchNodes"
            :key="branchNode.id || `branch-${index}`"
            class="poster-node__branch-col"
          >
            <div class="poster-node__branch-drop"></div>
            <ProcessPosterNode :node="branchNode" :depth="depth + 1" />
            <div v-if="visibleBranchNodes.length > 1" class="poster-node__branch-rise"></div>
          </div>
        </div>
      </div>

      <div
        v-if="visibleBranchNodes.length > 1"
        class="poster-node__merge-track"
        :style="{ width: branchConnectorWidth }"
      >
        <div class="poster-node__merge-topline"></div>
        <div class="poster-node__merge-line"></div>
      </div>

      <div v-if="renderNode.childNode" class="poster-node__arrow">
        <span class="poster-node__arrow-line"></span>
        <span v-if="!childIsBranch" class="poster-node__arrow-head"></span>
      </div>

      <div v-if="renderNode.childNode" class="poster-node__next">
        <ProcessPosterNode :node="renderNode.childNode" :depth="depth + 1" />
      </div>
    </template>

    <template v-else>
      <div class="poster-node__entry">
        <div class="poster-node__box">{{ nodeTitle }}</div>
      </div>

      <div v-if="renderNode.childNode" class="poster-node__arrow">
        <span class="poster-node__arrow-line"></span>
        <span v-if="!childIsBranch" class="poster-node__arrow-head"></span>
      </div>

      <div v-if="renderNode.childNode" class="poster-node__next">
        <ProcessPosterNode :node="renderNode.childNode" :depth="depth + 1" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { SimpleFlowNode } from '../../../vendor/yudao-ui-admin-vue3/src/components/SimpleProcessDesignerV2/src/consts'
import { NodeType } from '../../../vendor/yudao-ui-admin-vue3/src/components/SimpleProcessDesignerV2/src/consts'

const props = defineProps<{
  depth?: number
  node: SimpleFlowNode
}>()

function unwrapPreviewNode(node: SimpleFlowNode | undefined): SimpleFlowNode | undefined {
  if (!node) {
    return undefined
  }

  if (node.type === NodeType.CONDITION_NODE) {
    return unwrapPreviewNode(node.childNode)
  }

  return node
}

const renderNode = computed(() => unwrapPreviewNode(props.node))

const isBranchNode = computed(() => {
  const node = renderNode.value
  if (!node) {
    return false
  }

  return node.type === NodeType.CONDITION_BRANCH_NODE
    || node.type === NodeType.PARALLEL_BRANCH_NODE
    || node.type === NodeType.INCLUSIVE_BRANCH_NODE
    || node.type === NodeType.ROUTER_BRANCH_NODE
})

const visibleBranchNodes = computed(() => {
  const node = renderNode.value
  if (!node?.conditionNodes?.length) {
    return []
  }

  return node.conditionNodes
    .map((item) => unwrapPreviewNode(item))
    .filter((item): item is SimpleFlowNode => Boolean(item))
})

const childIsBranch = computed(() => {
  const childNode = unwrapPreviewNode(renderNode.value?.childNode)
  if (!childNode) {
    return false
  }

  return childNode.type === NodeType.CONDITION_BRANCH_NODE
    || childNode.type === NodeType.PARALLEL_BRANCH_NODE
    || childNode.type === NodeType.INCLUSIVE_BRANCH_NODE
    || childNode.type === NodeType.ROUTER_BRANCH_NODE
})

const branchColumnCount = computed(() => {
  const count = visibleBranchNodes.value.length
  if (count <= 1) {
    return 1
  }
  if (count === 2) {
    return 2
  }
  return 3
})

const branchConnectorWidth = computed(() => {
  const count = Math.max(branchColumnCount.value, 1)
  const gap = count > 1 ? (count - 1) * 26 : 0
  return `${count * 114 + gap}px`
})

const nodeTitle = computed(() => {
  const node = renderNode.value
  if (!node) {
    return ''
  }

  const label = node.showText || node.name
  if (label && label.trim()) {
    return label.trim()
  }

  switch (node.type) {
    case NodeType.START_USER_NODE:
      return '发起申请'
    case NodeType.USER_TASK_NODE:
      return '审批节点'
    case NodeType.TRANSACTOR_NODE:
      return '办理节点'
    case NodeType.COPY_TASK_NODE:
      return '抄送节点'
    case NodeType.END_EVENT_NODE:
      return '流程结束'
    default:
      return '流程节点'
  }
})
</script>

<style scoped>
.poster-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.poster-node__entry {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.poster-node__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 114px;
  min-width: 114px;
  height: 38px;
  padding: 0 10px;
  box-sizing: border-box;
  border: 2px solid #8ea6c8;
  border-radius: 8px;
  background: #fff;
  color: #456089;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
}

.poster-node__arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 28px;
  margin: 4px 0;
}

.poster-node__arrow-line {
  width: 1px;
  height: 14px;
  background: #d7dce5;
}

.poster-node__arrow-head {
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-top: 10px solid #1f66ab;
}

.poster-node__next {
  width: 100%;
}

.poster-node__branch-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.poster-node__branch-spine {
  width: 1px;
  height: 16px;
  background: #d7dce5;
}

.poster-node__branch-grid {
  position: relative;
  display: grid;
  gap: 0 26px;
  justify-content: center;
  padding-top: 16px;
  width: 100%;
}

.poster-node__branch-grid--cols-1 {
  grid-template-columns: 1fr;
}

.poster-node__branch-grid--cols-2 {
  grid-template-columns: repeat(2, 114px);
}

.poster-node__branch-grid--cols-3 {
  grid-template-columns: repeat(3, 114px);
}

.poster-node__branch-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.poster-node__branch-topline {
  position: absolute;
  top: 0;
  left: 57px;
  right: 57px;
  height: 1px;
  background: #d7dce5;
}

.poster-node__branch-drop {
  width: 1px;
  height: 16px;
  background: #d7dce5;
}

.poster-node__branch-rise {
  width: 1px;
  height: 20px;
  margin-top: auto;
  background: #d7dce5;
}

.poster-node__merge-track {
  position: relative;
  display: flex;
  justify-content: center;
  max-width: 100%;
  height: 20px;
  box-sizing: border-box;
  margin-top: -1px;
}

.poster-node__merge-topline {
  position: absolute;
  top: 0;
  left: 57px;
  right: 57px;
  height: 1px;
  background: #d7dce5;
}

.poster-node__merge-line {
  width: 1px;
  height: 20px;
  background: #d7dce5;
}
</style>
