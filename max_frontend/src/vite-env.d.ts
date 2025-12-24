/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_FLAG_USE_MOCKS: string
  readonly VITE_FLAG_WORKFLOWS_READONLY: string
  readonly VITE_FLAG_PREVIEW_DEFAULT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}