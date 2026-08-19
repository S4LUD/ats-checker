/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly OLLAMA_AI_ENDPOINT?: string
  readonly OLLAMA_AI_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
