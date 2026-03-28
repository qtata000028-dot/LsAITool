<template>
  <div class="simple-process-model-container">
    <div class="designer-toolbar">
      <el-row class="designer-toolbar-row" type="flex" justify="end">
        <el-button-group key="scale-control" size="default">
          <el-button v-if="!readonly" size="default" @click="exportJson">
            <Icon icon="ep:download" /> 导出
          </el-button>
          <el-button v-if="!readonly" size="default" @click="importJson">
            <Icon icon="ep:upload" /> 导入
          </el-button>
          <input
            v-if="!readonly"
            id="files"
            ref="refFile"
            type="file"
            style="display: none"
            accept=".json"
            @change="importLocalFile"
          />
          <el-button size="default" :icon="ScaleToOriginal" @click="processReZoom()" />
          <el-button size="default" :plain="true" :icon="ZoomOut" @click="zoomOut()" />
          <el-button size="default" class="w-80px">{{ scaleValue }}%</el-button>
          <el-button size="default" :plain="true" :icon="ZoomIn" @click="zoomIn()" />
          <el-button size="default" @click="resetPosition">重置</el-button>
        </el-button-group>
      </el-row>
    </div>

    <div
      class="simple-process-model"
      :style="`transform: translate(${currentX}px, ${currentY}px) scale(${scaleValue / 100});`"
      @mousedown="startDrag"
      @mousemove="onDrag"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
      @mouseenter="setGrabCursor"
    >
      <ProcessNodeTree v-if="processNodeTree" v-model:flow-node="processNodeTree" />
    </div>
  </div>

  <Dialog v-model="errorDialogVisible" title="保存失败" width="400" :fullscreen="false">
    <div class="mb-2">以下节点内容不完整，请修改后再保存</div>
    <div
      v-for="(item, index) in errorNodes"
      :key="index"
      class="mb-3 b-rounded-1 bg-gray-100 p-2 line-height-normal"
    >
      {{ item.name }} : {{ NODE_DEFAULT_TEXT.get(item.type) }}
    </div>
    <template #footer>
      <el-button type="primary" @click="errorDialogVisible = false">知道了</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ZoomIn, ZoomOut, ScaleToOriginal } from '@element-plus/icons-vue';
import { watch } from 'vue';

import download from '@/utils/download';
import { isString } from '@/utils/is';

import { NODE_DEFAULT_TEXT, NodeType, type SimpleFlowNode } from './consts';
import { useWatchNode } from './node';
import ProcessNodeTree from './ProcessNodeTree.vue';

defineOptions({
  name: 'SimpleProcessModel',
});

const props = defineProps({
  flowNode: {
    type: Object as () => SimpleFlowNode,
    required: true,
  },
  readonly: {
    type: Boolean,
    required: false,
    default: true,
  },
});

const emits = defineEmits<{
  change: [node: SimpleFlowNode | undefined];
  save: [node: SimpleFlowNode | undefined];
}>();

const processNodeTree = useWatchNode(props);

provide('readonly', props.readonly);

const scaleValue = ref(100);
const MAX_SCALE_VALUE = 200;
const MIN_SCALE_VALUE = 50;
const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);
const currentX = ref(0);
const currentY = ref(0);
const initialX = ref(0);
const initialY = ref(0);

const setGrabCursor = () => {
  document.body.style.cursor = 'grab';
};

const resetCursor = () => {
  document.body.style.cursor = 'default';
};

const startDrag = (e: MouseEvent) => {
  isDragging.value = true;
  startX.value = e.clientX - currentX.value;
  startY.value = e.clientY - currentY.value;
  setGrabCursor();
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) {
    return;
  }

  e.preventDefault();

  requestAnimationFrame(() => {
    currentX.value = e.clientX - startX.value;
    currentY.value = e.clientY - startY.value;
  });
};

const stopDrag = () => {
  isDragging.value = false;
  resetCursor();
};

const zoomIn = () => {
  if (scaleValue.value === MAX_SCALE_VALUE) {
    return;
  }
  scaleValue.value += 10;
};

const zoomOut = () => {
  if (scaleValue.value === MIN_SCALE_VALUE) {
    return;
  }
  scaleValue.value -= 10;
};

const processReZoom = () => {
  scaleValue.value = 100;
};

const resetPosition = () => {
  currentX.value = initialX.value;
  currentY.value = initialY.value;
};

const errorDialogVisible = ref(false);
let errorNodes: SimpleFlowNode[] = [];

const validateNode = (node: SimpleFlowNode | undefined, target: SimpleFlowNode[]) => {
  if (!node) {
    return;
  }

  const { type, showText, conditionNodes } = node;
  if (type === NodeType.END_EVENT_NODE) {
    return;
  }

  if (type === NodeType.START_USER_NODE) {
    validateNode(node.childNode, target);
  }

  if (
    type === NodeType.USER_TASK_NODE
    || type === NodeType.COPY_TASK_NODE
    || type === NodeType.CONDITION_NODE
  ) {
    if (!showText) {
      target.push(node);
    }
    validateNode(node.childNode, target);
  }

  if (
    type === NodeType.CONDITION_BRANCH_NODE
    || type === NodeType.PARALLEL_BRANCH_NODE
    || type === NodeType.INCLUSIVE_BRANCH_NODE
  ) {
    conditionNodes?.forEach((item) => validateNode(item, target));
    validateNode(node.childNode, target);
  }
};

const getCurrentFlowData = async () => {
  try {
    errorNodes = [];
    validateNode(processNodeTree.value, errorNodes);
    if (errorNodes.length > 0) {
      errorDialogVisible.value = true;
      return undefined;
    }
    return processNodeTree.value;
  } catch (error) {
    console.error('获取流程数据失败:', error);
    return undefined;
  }
};

defineExpose({
  getCurrentFlowData,
});

const exportJson = () => {
  download.json(new Blob([JSON.stringify(processNodeTree.value)]), 'model.json');
};

const refFile = ref();
const importJson = () => {
  refFile.value.click();
};

const importLocalFile = () => {
  const file = refFile.value.files[0];
  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = function () {
    if (isString(this.result)) {
      processNodeTree.value = JSON.parse(this.result);
      emits('save', processNodeTree.value);
    }
  };
};

watch(
  processNodeTree,
  (value) => {
    emits('change', value);
  },
  { deep: true },
);

onMounted(() => {
  initialX.value = currentX.value;
  initialY.value = currentY.value;
});
</script>

<style lang="scss" scoped>
.simple-process-model-container {
  display: flex;
  flex: 1;
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 100%;
  position: relative;
  overflow: hidden;
  user-select: none;
}

.designer-toolbar {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  max-width: calc(100% - 24px);
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 30px -24px rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(10px);
}

.designer-toolbar-row {
  min-width: 0;
}

.simple-process-model {
  position: relative;
  width: 100%;
  min-width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  padding: 72px 40px 40px;
}

.designer-toolbar :deep(.el-button-group) {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.designer-toolbar :deep(.el-button) {
  margin: 0;
}
</style>
