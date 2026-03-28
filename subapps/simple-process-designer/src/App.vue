<template>
  <el-config-provider>
    <div class="page-shell">
      <div v-if="!isHydrated" class="hydration-shell">
        <el-skeleton animated :rows="8" />
        <div class="hydration-hint">正在等待宿主回填流程草稿...</div>
      </div>
      <YudaoSimpleDesignerHost
        v-else
        :bootstrap="bootstrap"
        :initial-simple-schema="initialSimpleSchema"
        @save-draft="handleSaveDraft"
      />
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import YudaoSimpleDesignerHost from './components/YudaoSimpleDesignerHost.vue';
import { persistHydratedAuthSession } from './lib/auth-session';
import type { AuthSession } from './lib/backend-auth';

type ApprovalFlowFamily = 'bill' | 'archive';
type SimpleProcessSchemaVersion = 'v1';
type SimpleProcessSchema = Record<string, unknown>;

type BootstrapPayload = {
  approvalFamily?: ApprovalFlowFamily;
  businessCode?: string;
  businessType?: string;
  currentUserName?: string;
  moduleName?: string;
  schemeCode?: string;
  schemeName?: string;
};

type HostHydrateMessage = {
  source: 'lserp-simple-process-designer-host';
  type: 'hydrate';
  payload: {
    authSession?: AuthSession | null;
    simpleSchema?: SimpleProcessSchema;
    simpleSchemaVersion?: SimpleProcessSchemaVersion;
  };
};

function readBootstrap(): BootstrapPayload {
  if (typeof window === 'undefined') {
    return {};
  }

  const url = new URL(window.location.href);

  return {
    approvalFamily: (url.searchParams.get('approvalFamily') as ApprovalFlowFamily | null) ?? undefined,
    businessCode: url.searchParams.get('businessCode') ?? undefined,
    businessType: url.searchParams.get('businessType') ?? undefined,
    currentUserName: url.searchParams.get('currentUserName') ?? undefined,
    moduleName: url.searchParams.get('moduleName') ?? undefined,
    schemeCode: url.searchParams.get('schemeCode') ?? undefined,
    schemeName: url.searchParams.get('schemeName') ?? undefined,
  };
}

function isHostHydrateMessage(value: unknown): value is HostHydrateMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record.source === 'lserp-simple-process-designer-host' && record.type === 'hydrate';
}

const bootstrap = readBootstrap();
const initialSimpleSchema = ref<SimpleProcessSchema | undefined>();
const isHydrated = ref(false);
let hydrationFallbackTimer: number | undefined;

function postMessageToHost(message: unknown) {
  if (typeof window === 'undefined' || !window.parent) {
    return;
  }

  window.parent.postMessage(message, '*');
}

function postReady() {
  postMessageToHost({
    source: 'lserp-simple-process-designer',
    type: 'ready',
    payload: bootstrap,
  });
}

function handleSaveDraft(simpleSchema: Record<string, unknown>) {
  postMessageToHost({
    source: 'lserp-simple-process-designer',
    type: 'save-draft',
    payload: {
      ...bootstrap,
      simpleSchemaVersion: 'v1',
      simpleSchema,
    },
  });
}

function handleWindowMessage(event: MessageEvent) {
  if (!isHostHydrateMessage(event.data)) {
    return;
  }

  persistHydratedAuthSession(event.data.payload.authSession);
  initialSimpleSchema.value = event.data.payload.simpleSchema;
  isHydrated.value = true;
  if (hydrationFallbackTimer !== undefined) {
    window.clearTimeout(hydrationFallbackTimer);
    hydrationFallbackTimer = undefined;
  }
}

onMounted(() => {
  window.addEventListener('message', handleWindowMessage);
  postReady();

  hydrationFallbackTimer = window.setTimeout(() => {
    isHydrated.value = true;
  }, 300);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', handleWindowMessage);
  if (hydrationFallbackTimer !== undefined) {
    window.clearTimeout(hydrationFallbackTimer);
  }
});
</script>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  width: 100%;
  height: 100%;
  margin: 0;
}

.page-shell {
  display: flex;
  width: 100%;
  min-height: 100%;
  height: 100%;
  overflow: hidden;
  background: #fff;
  color: #0f172a;
}

.hydration-shell {
  flex: 1;
  min-height: 100%;
  padding: 24px;
}

.hydration-hint {
  margin-top: 12px;
  color: #64748b;
  font-size: 13px;
}
</style>
