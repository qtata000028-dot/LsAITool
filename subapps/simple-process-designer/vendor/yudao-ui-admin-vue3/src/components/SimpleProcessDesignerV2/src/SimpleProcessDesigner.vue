<template>
  <div v-loading="loading" class="simple-process-designer-root">
    <SimpleProcessModel
      v-if="processNodeTree"
      ref="simpleProcessModelRef"
      :flow-node="processNodeTree"
      :readonly="false"
      @change="handleFlowChange"
      @save="saveSimpleFlowModel"
    />
    <Dialog v-model="errorDialogVisible" title="保存失败" width="400" :fullscreen="false">
      <div class="mb-2">以下节点内容尚未配置完整，请修改后再保存。</div>
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
  </div>
</template>

<script setup lang="ts">
import { BpmModelFormType } from '@/utils/constants'
import { handleTree } from '@/utils/tree'
import { getForm } from '@/api/bpm/form'
import * as DeptApi from '@/api/system/dept'
import * as PostApi from '@/api/system/post'
import * as RoleApi from '@/api/system/role'
import * as UserApi from '@/api/system/user'
import * as UserGroupApi from '@/api/bpm/userGroup'

import SimpleProcessModel from './SimpleProcessModel.vue'
import { NODE_DEFAULT_TEXT, NodeId, NodeType, type SimpleFlowNode } from './consts'

defineOptions({
  name: 'SimpleProcessDesigner',
})

const emits = defineEmits(['success', 'change'])

const props = defineProps({
  modelName: {
    type: String,
    required: false,
  },
  modelFormId: {
    type: Number,
    required: false,
    default: undefined,
  },
  modelFormType: {
    type: Number,
    required: false,
    default: BpmModelFormType.NORMAL,
  },
  startUserIds: {
    type: Array,
    required: false,
  },
  startDeptIds: {
    type: Array,
    required: false,
  },
})

const processData = inject('processData') as Ref
const loading = ref(false)
const formFields = ref<string[]>([])
const formType = ref(props.modelFormType)

watch(
  () => props.modelFormType,
  (newVal) => {
    formType.value = newVal
  },
)

watch(
  () => props.modelFormId,
  async (newVal) => {
    if (newVal) {
      const form = await getForm(newVal)
      formFields.value = form?.fields
    } else {
      formFields.value = []
    }
  },
  { immediate: true },
)

const roleOptions = ref<RoleApi.RoleVO[]>([])
const postOptions = ref<PostApi.PostVO[]>([])
const userOptions = ref<UserApi.UserVO[]>([])
const deptOptions = ref<DeptApi.DeptVO[]>([])
const deptTreeOptions = ref()
const userGroupOptions = ref<UserGroupApi.UserGroupVO[]>([])

provide('formFields', formFields)
provide('formType', formType)
provide('roleList', roleOptions)
provide('postList', postOptions)
provide('userList', userOptions)
provide('deptList', deptOptions)
provide('userGroupList', userGroupOptions)
provide('deptTree', deptTreeOptions)
provide('startUserIds', props.startUserIds)
provide('startDeptIds', props.startDeptIds)
provide('tasks', [])
provide('processInstance', {})

const processNodeTree = ref<SimpleFlowNode | undefined>()
provide('processNodeTree', processNodeTree)
const errorDialogVisible = ref(false)
let errorNodes: SimpleFlowNode[] = []

const updateModel = () => {
  if (!processNodeTree.value) {
    processNodeTree.value = {
      name: '发起人',
      type: NodeType.START_USER_NODE,
      id: NodeId.START_USER_NODE_ID,
      childNode: {
        id: NodeId.END_EVENT_NODE_ID,
        name: '结束',
        type: NodeType.END_EVENT_NODE,
      },
    }
    saveSimpleFlowModel(processNodeTree.value)
  }
}

const saveSimpleFlowModel = async (simpleModelNode: SimpleFlowNode | undefined) => {
  if (!simpleModelNode) {
    return
  }

  try {
    processData.value = simpleModelNode
    emits('success', simpleModelNode)
  } catch (error) {
    console.error('Save process model failed:', error)
  }
}

const handleFlowChange = (simpleModelNode: SimpleFlowNode | undefined) => {
  processData.value = simpleModelNode
  emits('change', simpleModelNode)
}

const validateNode = (node: SimpleFlowNode | undefined, target: SimpleFlowNode[]) => {
  if (!node) {
    return
  }

  const { type, showText, conditionNodes } = node
  if (type === NodeType.END_EVENT_NODE) {
    return
  }

  if (type === NodeType.START_USER_NODE) {
    validateNode(node.childNode, target)
  }

  if (
    type === NodeType.USER_TASK_NODE
    || type === NodeType.COPY_TASK_NODE
    || type === NodeType.CONDITION_NODE
  ) {
    if (!showText) {
      target.push(node)
    }
    validateNode(node.childNode, target)
  }

  if (
    type === NodeType.CONDITION_BRANCH_NODE
    || type === NodeType.PARALLEL_BRANCH_NODE
    || type === NodeType.INCLUSIVE_BRANCH_NODE
  ) {
    conditionNodes?.forEach((item) => validateNode(item, target))
    validateNode(node.childNode, target)
  }
}

onMounted(async () => {
  try {
    loading.value = true
    roleOptions.value = await RoleApi.getSimpleRoleList()
    postOptions.value = await PostApi.getSimplePostList()
    userOptions.value = await UserApi.getSimpleUserList()
    deptOptions.value = await DeptApi.getSimpleDeptList()
    deptTreeOptions.value = handleTree(deptOptions.value as DeptApi.DeptVO[], 'id')
    userGroupOptions.value = await UserGroupApi.getUserGroupSimpleList()

    if (processData.value) {
      processNodeTree.value = processData.value
    } else {
      updateModel()
    }
  } finally {
    loading.value = false
  }
})

const simpleProcessModelRef = ref()

defineExpose({
  validateNode,
  simpleProcessModelRef,
})
</script>

<style scoped>
.simple-process-designer-root {
  display: flex;
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  height: 100%;
  overflow: hidden;
}

.simple-process-designer-root :deep(.simple-process-model-container) {
  display: flex;
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 100%;
}
</style>
