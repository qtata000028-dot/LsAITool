<template>
  <div class="designer-shell">
    <aside class="designer-sidebar">
      <section class="sidebar-card sidebar-card--brand">
        <div class="brand-kicker">Simple Process Designer</div>
        <h1 class="brand-title">{{ bootstrap.schemeName || '未命名流程方案' }}</h1>
        <p class="brand-description">
          设计与海报预览共用同一份实时流程树，切换视图或返回上一步时不会再丢失当前编辑结果。
        </p>
        <div class="brand-actions">
          <button
            type="button"
            class="view-toggle"
            :class="{ 'view-toggle--active': activeView === 'designer' }"
            @click="activeView = 'designer'"
          >
            设计模式
          </button>
          <button
            type="button"
            class="view-toggle"
            :class="{ 'view-toggle--active': activeView === 'preview' }"
            @click="activeView = 'preview'"
          >
            海报预览
          </button>
        </div>
      </section>

      <section class="sidebar-card">
        <div class="section-title">方案信息</div>
        <dl class="meta-list">
          <div class="meta-item">
            <dt>方案编码</dt>
            <dd>{{ bootstrap.schemeCode || '未设置' }}</dd>
          </div>
          <div class="meta-item">
            <dt>业务编码</dt>
            <dd>{{ bootstrap.businessCode || '未设置' }}</dd>
          </div>
          <div class="meta-item">
            <dt>业务类型</dt>
            <dd>{{ bootstrap.businessType || '未设置' }}</dd>
          </div>
          <div class="meta-item">
            <dt>所属模块</dt>
            <dd>{{ bootstrap.moduleName || '未设置' }}</dd>
          </div>
          <div class="meta-item">
            <dt>当前用户</dt>
            <dd>{{ bootstrap.currentUserName || '未识别' }}</dd>
          </div>
          <div class="meta-item">
            <dt>最近同步</dt>
            <dd>{{ lastSyncedLabel }}</dd>
          </div>
        </dl>
      </section>

      <section class="sidebar-card">
        <div class="section-title">流程统计</div>
        <div class="stats-grid">
          <article class="stat-card">
            <span class="stat-label">总节点</span>
            <strong class="stat-value">{{ flowStats.total }}</strong>
          </article>
          <article class="stat-card">
            <span class="stat-label">审批节点</span>
            <strong class="stat-value">{{ flowStats.approvals }}</strong>
          </article>
          <article class="stat-card">
            <span class="stat-label">抄送节点</span>
            <strong class="stat-value">{{ flowStats.copies }}</strong>
          </article>
          <article class="stat-card">
            <span class="stat-label">分支节点</span>
            <strong class="stat-value">{{ flowStats.branches }}</strong>
          </article>
        </div>
      </section>

      <section class="sidebar-card">
        <div class="section-title">快捷操作</div>
        <div class="action-list">
          <el-button type="primary" @click="syncDraft">同步草稿</el-button>
          <el-button @click="refreshDesigner">刷新设计器</el-button>
          <el-button @click="openStandalone">新窗口打开</el-button>
          <el-button @click="copyValue(bootstrap.schemeCode, '方案编码')">复制方案编码</el-button>
          <el-button @click="copyValue(bootstrap.businessCode, '业务编码')">复制业务编码</el-button>
          <el-button @click="scrollStageToTop">回到顶部</el-button>
        </div>
      </section>
    </aside>

    <section class="designer-stage">
      <header class="stage-header">
        <div>
          <div class="stage-kicker">流程设计工作台</div>
          <div class="stage-title">
            {{ activeView === 'designer' ? '编辑流程节点与审批规则' : '流程海报预览画布' }}
          </div>
        </div>
        <div class="stage-pill">
          {{ activeView === 'designer' ? '实时同步中' : '按海报模板渲染中' }}
        </div>
      </header>

      <div ref="stageScrollerRef" class="stage-body">
        <div v-show="activeView === 'designer'" class="stage-panel">
          <SimpleProcessDesigner
            :key="designerKey"
            :model-name="bootstrap.schemeName"
            @change="handleDesignerChange"
            @success="handleDesignerSuccess"
          />
        </div>

        <div v-show="activeView === 'preview'" class="stage-panel">
          <ProcessPosterPreview
            :flow-node="posterSchema"
            :scheme-name="bootstrap.schemeName"
            :scheme-code="bootstrap.schemeCode"
            :module-name="bootstrap.moduleName"
            :business-code="bootstrap.businessCode"
            :business-type="bootstrap.businessType"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, watch } from 'vue'

import ProcessPosterPreview from '@/components/preview/ProcessPosterPreview.vue'
import { useMessage } from '@/composables/useMessage'
import { SimpleProcessDesigner } from '@/components/vendor/yudao/SimpleProcessDesigner'
import type { SimpleFlowNode } from '../../vendor/yudao-ui-admin-vue3/src/components/SimpleProcessDesignerV2/src/consts'
import { NodeType } from '../../vendor/yudao-ui-admin-vue3/src/components/SimpleProcessDesignerV2/src/consts'

type ApprovalFlowFamily = 'bill' | 'archive'
type BootstrapPayload = {
  approvalFamily?: ApprovalFlowFamily
  businessCode?: string
  businessType?: string
  currentUserName?: string
  moduleName?: string
  schemeCode?: string
  schemeName?: string
}

const props = defineProps<{
  bootstrap: BootstrapPayload
  initialSimpleSchema?: Record<string, unknown>
}>()

const emits = defineEmits<{
  'save-draft': [simpleSchema: Record<string, unknown>]
}>()

const message = useMessage()
const activeView = ref<'designer' | 'preview'>('designer')
const designerKey = ref(0)
const stageScrollerRef = ref<HTMLElement | null>(null)
const lastSyncedAt = ref<Date | null>(null)
const processData = ref<SimpleFlowNode | undefined>()
const posterSchema = ref<SimpleFlowNode | undefined>()
const isApplyingExternalSchema = ref(false)
const lastAppliedSchemaFingerprint = ref<string | undefined>()
const lastPublishedSchemaFingerprint = ref<string | undefined>()
let autoSyncTimer: number | undefined

provide('processData', processData)

function cloneFlowNode<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isSimpleFlowNode(value: unknown): value is SimpleFlowNode {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>
  return typeof record.id === 'string' && typeof record.type === 'number'
}

function normalizeFlowNode(value: unknown): SimpleFlowNode | undefined {
  return isSimpleFlowNode(value) ? cloneFlowNode(value) : undefined
}

function getSchemaFingerprint(value: unknown) {
  return value ? JSON.stringify(value) : ''
}

watch(
  () => props.initialSimpleSchema,
  (value) => {
    const normalized = normalizeFlowNode(value)
    const fingerprint = getSchemaFingerprint(normalized)
    if (fingerprint === lastAppliedSchemaFingerprint.value) {
      return
    }
    if (fingerprint && fingerprint === lastPublishedSchemaFingerprint.value) {
      lastAppliedSchemaFingerprint.value = fingerprint
      return
    }

    isApplyingExternalSchema.value = true
    processData.value = normalized
    posterSchema.value = normalized ? cloneFlowNode(normalized) : undefined
    lastAppliedSchemaFingerprint.value = fingerprint
    window.setTimeout(() => {
      isApplyingExternalSchema.value = false
    }, 0)
  },
  { immediate: true },
)

watch(
  processData,
  (value) => {
    posterSchema.value = value ? cloneFlowNode(value) : undefined
    lastPublishedSchemaFingerprint.value = getSchemaFingerprint(value)
    if (isApplyingExternalSchema.value) {
      return
    }
    scheduleAutoSync(value)
  },
  { deep: true, immediate: true },
)

function formatDateTime(value: Date | null) {
  if (!value) {
    return '尚未同步'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

const lastSyncedLabel = computed(() => formatDateTime(lastSyncedAt.value))

type FlowStats = {
  approvals: number
  branches: number
  copies: number
  total: number
}

function summarizeFlow(node: SimpleFlowNode | undefined): FlowStats {
  const stats: FlowStats = {
    approvals: 0,
    branches: 0,
    copies: 0,
    total: 0,
  }

  const visit = (current: SimpleFlowNode | undefined) => {
    if (!current) {
      return
    }

    stats.total += 1

    if (current.type === NodeType.USER_TASK_NODE || current.type === NodeType.TRANSACTOR_NODE) {
      stats.approvals += 1
    }
    if (current.type === NodeType.COPY_TASK_NODE) {
      stats.copies += 1
    }
    if (
      current.type === NodeType.CONDITION_BRANCH_NODE
      || current.type === NodeType.PARALLEL_BRANCH_NODE
      || current.type === NodeType.INCLUSIVE_BRANCH_NODE
      || current.type === NodeType.ROUTER_BRANCH_NODE
    ) {
      stats.branches += 1
      current.conditionNodes?.forEach((branchNode) => visit(branchNode))
    }

    visit(current.childNode)
  }

  visit(posterSchema.value)
  return stats
}

const flowStats = computed(() => summarizeFlow(posterSchema.value))

function emitDraft(simpleSchema: SimpleFlowNode | undefined, options?: { silent?: boolean }) {
  if (!simpleSchema) {
    if (!options?.silent) {
      message.warning('当前还没有可以同步的流程草稿')
    }
    return
  }

  const clonedSchema = cloneFlowNode(simpleSchema)
  lastAppliedSchemaFingerprint.value = getSchemaFingerprint(clonedSchema)
  lastPublishedSchemaFingerprint.value = lastAppliedSchemaFingerprint.value
  emits('save-draft', clonedSchema as unknown as Record<string, unknown>)
  lastSyncedAt.value = new Date()
}

function scheduleAutoSync(simpleSchema: SimpleFlowNode | undefined) {
  if (autoSyncTimer !== undefined) {
    window.clearTimeout(autoSyncTimer)
  }
  autoSyncTimer = window.setTimeout(() => {
    emitDraft(simpleSchema, { silent: true })
  }, 220)
}

function handleDesignerChange(simpleSchema: SimpleFlowNode | undefined) {
  processData.value = simpleSchema ? cloneFlowNode(simpleSchema) : undefined
}

function handleDesignerSuccess(simpleSchema: SimpleFlowNode | undefined) {
  processData.value = simpleSchema ? cloneFlowNode(simpleSchema) : undefined
  emitDraft(processData.value)
}

function syncDraft() {
  emitDraft(processData.value)
}

function refreshDesigner() {
  processData.value = processData.value ? cloneFlowNode(processData.value) : undefined
  designerKey.value += 1
  activeView.value = 'designer'
  message.success('设计器已刷新并保留当前草稿')
}

function openStandalone() {
  window.open(window.location.href, '_blank', 'noopener')
}

async function copyValue(value: string | undefined, label: string) {
  if (!value) {
    message.warning(`${label}尚未设置`)
    return
  }

  await navigator.clipboard.writeText(value)
  message.success(`${label}已复制`)
}

function scrollStageToTop() {
  stageScrollerRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

onBeforeUnmount(() => {
  if (autoSyncTimer !== undefined) {
    window.clearTimeout(autoSyncTimer)
  }
})
</script>

<style scoped>
.designer-shell {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 100%;
  min-width: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.16), transparent 34%),
    linear-gradient(135deg, #eff6ff 0%, #f8fbff 38%, #eef4ff 100%);
  color: #0f172a;
}

.designer-sidebar {
  display: flex;
  flex: 0 0 320px;
  flex-direction: column;
  gap: 16px;
  min-width: 320px;
  padding: 20px;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.03);
  border-right: 1px solid rgba(148, 163, 184, 0.2);
}

.sidebar-card {
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 24px 48px -38px rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(10px);
}

.sidebar-card--brand {
  background: linear-gradient(180deg, rgba(30, 64, 175, 0.92), rgba(37, 99, 235, 0.86));
  color: #eff6ff;
}

.brand-kicker,
.stage-kicker,
.section-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.brand-kicker {
  color: rgba(219, 234, 254, 0.8);
}

.brand-title {
  margin: 8px 0 10px;
  font-size: 28px;
  line-height: 1.15;
}

.brand-description {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(239, 246, 255, 0.86);
}

.brand-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.view-toggle {
  min-height: 42px;
  border: 1px solid rgba(219, 234, 254, 0.26);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  color: #dbeafe;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-toggle:hover,
.view-toggle--active {
  background: rgba(255, 255, 255, 0.94);
  color: #1d4ed8;
}

.meta-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 14px 0 0;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.meta-item dt {
  color: #64748b;
}

.meta-item dd {
  margin: 0;
  font-weight: 700;
  text-align: right;
  word-break: break-all;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.stat-card {
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fbff, #edf4ff);
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #64748b;
}

.stat-value {
  display: block;
  margin-top: 8px;
  font-size: 24px;
  line-height: 1;
  color: #1d4ed8;
}

.action-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.action-list :deep(.el-button) {
  justify-content: flex-start;
  min-height: 40px;
  margin: 0;
  border-radius: 14px;
}

.designer-stage {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 20px;
  gap: 16px;
}

.stage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 24px 48px -38px rgba(15, 23, 42, 0.28);
}

.stage-kicker {
  color: #1d4ed8;
}

.stage-title {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.stage-pill {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.stage-body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.stage-panel {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  height: 100%;
}

.stage-panel :deep(.simple-process-designer-root),
.stage-panel :deep(.simple-process-model-container) {
  min-height: 100%;
  height: 100%;
}

@media (max-width: 1280px) {
  .designer-shell {
    flex-direction: column;
  }

  .designer-sidebar {
    flex: none;
    min-width: 0;
    border-right: 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  }
}
</style>
