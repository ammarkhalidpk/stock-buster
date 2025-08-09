/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL_REST: string
  readonly VITE_API_URL_WS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}