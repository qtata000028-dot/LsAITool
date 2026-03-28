import type { AuthSession } from './backend-auth';

export type ApprovalFlowFamily = 'bill' | 'archive';
export type SimpleProcessSchema = Record<string, unknown>;
export type SimpleProcessSchemaVersion = 'v1';

export type SimpleProcessDesignerBootstrapPayload = {
  approvalFamily?: ApprovalFlowFamily;
  businessCode?: string;
  businessType?: string;
  currentUserName?: string;
  moduleName?: string;
  schemeCode?: string;
  schemeName?: string;
};

export type SimpleProcessDesignerHostMessage =
  | {
      source: 'lserp-simple-process-designer';
      type: 'ready';
      payload: SimpleProcessDesignerBootstrapPayload;
    }
  | {
      source: 'lserp-simple-process-designer';
      type: 'save-draft';
      payload: SimpleProcessDesignerBootstrapPayload & {
        simpleSchema: SimpleProcessSchema;
        simpleSchemaVersion: SimpleProcessSchemaVersion;
      };
    };

export type SimpleProcessDesignerChildMessage = {
  source: 'lserp-simple-process-designer-host';
  type: 'hydrate';
  payload: {
    authSession?: AuthSession | null;
    simpleSchema?: SimpleProcessSchema;
    simpleSchemaVersion?: SimpleProcessSchemaVersion;
  };
};

const DEFAULT_SIMPLE_PROCESS_DESIGNER_DEV_URL = 'http://127.0.0.1:5174';
const DEFAULT_SIMPLE_PROCESS_DESIGNER_PROD_URL = '/simple-process-designer/';

export function resolveSimpleProcessDesignerBaseUrl() {
  const envValue = import.meta.env.VITE_SIMPLE_PROCESS_DESIGNER_URL;
  if (envValue && String(envValue).trim()) {
    return String(envValue).trim();
  }

  return import.meta.env.DEV
    ? DEFAULT_SIMPLE_PROCESS_DESIGNER_DEV_URL
    : DEFAULT_SIMPLE_PROCESS_DESIGNER_PROD_URL;
}

export function buildSimpleProcessDesignerUrl(payload: SimpleProcessDesignerBootstrapPayload) {
  const url = new URL(resolveSimpleProcessDesignerBaseUrl());

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export function isSimpleProcessDesignerHostMessage(
  value: unknown,
): value is SimpleProcessDesignerHostMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record.source === 'lserp-simple-process-designer' && typeof record.type === 'string';
}

export function createSimpleProcessDesignerHydrateMessage(payload: {
  authSession?: AuthSession | null;
  simpleSchema?: SimpleProcessSchema;
  simpleSchemaVersion?: SimpleProcessSchemaVersion;
}): SimpleProcessDesignerChildMessage {
  return {
    source: 'lserp-simple-process-designer-host',
    type: 'hydrate',
    payload,
  };
}
