/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string
  readonly SUPABASE_ANON_KEY: string
  readonly VITE_PUBLIC_APP_URL?: string
  readonly ONESIGNAL_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
