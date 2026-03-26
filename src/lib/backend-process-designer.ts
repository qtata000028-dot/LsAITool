import type { ProcessDesignerDocument } from '../features/dashboard/module-settings/process-designer-types';
import { apiRequest } from './http';

type FlowableApiEnvelope<T> = {
  code?: number;
  data?: T;
  message?: string;
};

export type FlowableLegacyStepConfigPayloadDto = {
  attachmentCount?: number;
  attachments: Array<Record<string, unknown>>;
  conditionCount?: number;
  conditions: Array<Record<string, unknown>>;
  flowTypeStepValues: Record<string, unknown>;
  flowValues: Record<string, unknown>;
  formKey?: string;
  gridFieldCount?: number;
  gridFields: Array<Record<string, unknown>>;
  menuCount?: number;
  menus: Array<Record<string, unknown>>;
  nodeId: string;
  nodeName: string;
  stepApplyText?: string;
  stepBackText?: string;
  stepCode?: number;
  stepGroup?: string;
  stepSql?: string;
};

export type FlowableBridgeCompileResult = {
  bpmnXml: string;
  modelKey?: string;
  processId?: string;
  processName?: string;
  userTaskCount?: number;
  warnings?: string[];
};

export type FlowableBridgeTablePreview = {
  note?: string;
  plannedRowCount?: number;
  sampleRows?: Array<Record<string, unknown>>;
  tableName: string;
};

export type FlowableBridgePreviewResult = {
  gatewayCount?: number;
  legacyFlowTypeId?: number;
  legacyFlowTypeName?: string;
  legacyTypeCode?: string;
  modelId?: number;
  modelKey?: string;
  modelName?: string;
  modelVersion?: number;
  processId?: string;
  processName?: string;
  sequenceFlowCount?: number;
  stepPreviews?: Array<Record<string, unknown>>;
  tablePreviews?: FlowableBridgeTablePreview[];
  userTaskCount?: number;
  warnings?: string[];
};

export type FlowableBridgePublishResult = {
  insertedAttachmentCount?: number;
  insertedConditionCount?: number;
  insertedGridFieldCount?: number;
  insertedMenuCount?: number;
  legacyFlowTypeId?: number;
  legacyTypeCode?: string;
  modelKey?: string;
  upsertedFlowCount?: number;
  upsertedFlowTypeStepCount?: number;
  warnings?: string[];
};

export type FlowableBridgeRequestPayload = {
  businessType?: string;
  designerSchema: ProcessDesignerDocument;
  flowTypeValues?: Record<string, unknown>;
  legacyFlowTypeId?: number;
  legacyFlowTypeName?: string;
  legacyTypeCode?: string;
  modelKey: string;
  modelName: string;
  overwriteExisting?: boolean;
  publishedBy?: string;
  stepConfigs: FlowableLegacyStepConfigPayloadDto[];
};

function unwrapFlowableEnvelope<T>(response: T | FlowableApiEnvelope<T>) {
  if (response && typeof response === 'object' && 'data' in (response as Record<string, unknown>)) {
    return (response as FlowableApiEnvelope<T>).data as T;
  }

  return response as T;
}

export function buildFlowableBridgeRequest(input: {
  businessCode?: string;
  businessType?: string;
  currentUserName?: string;
  document: ProcessDesignerDocument;
  permissionScope?: string;
  planValue?: string;
  schemeCode?: string;
  schemeName?: string;
}): FlowableBridgeRequestPayload {
  const modelKey = (input.schemeCode || input.businessCode || 'process_design').trim();
  const modelName = (input.schemeName || input.document.properties.modelName || '流程设计').trim();

  const stepConfigs: FlowableLegacyStepConfigPayloadDto[] = input.document.nodes
    .filter((node) => node.type === 'user-task' || node.type === 'approver-task')
    .map((node, index) => ({
      attachments: [],
      conditions: [],
      flowTypeStepValues: {},
      flowValues: {},
      gridFields: [],
      menus: [],
      nodeId: node.id,
      nodeName: node.textValue,
      stepApplyText: '同意',
      stepBackText: '驳回',
      stepCode: node.properties.stepCode ?? (index + 1) * 100,
      stepGroup: node.properties.stepGroup || node.textValue,
    }));

  return {
    businessType: input.businessType,
    designerSchema: input.document,
    flowTypeValues: input.permissionScope ? { permissionScope: input.permissionScope } : {},
    legacyTypeCode: input.businessCode?.trim() || undefined,
    modelKey,
    modelName,
    overwriteExisting: false,
    publishedBy: input.currentUserName,
    stepConfigs,
  };
}

export async function compileProcessDesignerXml(body: FlowableBridgeRequestPayload) {
  const response = await apiRequest<FlowableApiEnvelope<FlowableBridgeCompileResult> | FlowableBridgeCompileResult>(
    '/api/bpm/legacy-flow/compile-xml',
    {
      auth: true,
      body,
      method: 'POST',
    },
  );

  return unwrapFlowableEnvelope(response);
}

export async function previewProcessDesignerBridge(body: FlowableBridgeRequestPayload) {
  const response = await apiRequest<FlowableApiEnvelope<FlowableBridgePreviewResult> | FlowableBridgePreviewResult>(
    '/api/bpm/legacy-flow/preview',
    {
      auth: true,
      body,
      method: 'POST',
    },
  );

  return unwrapFlowableEnvelope(response);
}

export async function publishProcessDesignerBridge(body: FlowableBridgeRequestPayload) {
  const response = await apiRequest<FlowableApiEnvelope<FlowableBridgePublishResult> | FlowableBridgePublishResult>(
    '/api/bpm/legacy-flow/publish',
    {
      auth: true,
      body,
      method: 'POST',
    },
  );

  return unwrapFlowableEnvelope(response);
}
