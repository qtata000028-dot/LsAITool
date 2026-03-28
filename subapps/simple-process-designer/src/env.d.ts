/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_PROXY_TARGET?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_SAME_ORIGIN?: string;
  readonly VITE_SIMPLE_DESIGNER_DEPT_SIMPLE_LIST_PATH?: string;
  readonly VITE_SIMPLE_DESIGNER_FORM_GET_PATH?: string;
  readonly VITE_SIMPLE_DESIGNER_POST_SIMPLE_LIST_PATH?: string;
  readonly VITE_SIMPLE_DESIGNER_ROLE_SIMPLE_LIST_PATH?: string;
  readonly VITE_SIMPLE_DESIGNER_USER_GROUP_SIMPLE_LIST_PATH?: string;
  readonly VITE_SIMPLE_DESIGNER_USER_SIMPLE_LIST_PATH?: string;
  readonly VITE_SIMPLE_PROCESS_DESIGNER_PUBLIC_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, never>, Record<string, never>, any>;
  export default component;
}
