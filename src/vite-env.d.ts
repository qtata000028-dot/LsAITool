/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_SAME_ORIGIN?: string;
  readonly VITE_ONLYOFFICE_DOCUMENT_SERVER_URL?: string;
  readonly VITE_RESEARCH_RECORD_TEMPLATE_CALLBACK_URL?: string;
  readonly VITE_RESEARCH_RECORD_TEMPLATE_DOCX_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
