/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENAI_MODEL?: string;
  readonly VITE_ELEVENLABS_API_KEY?: string;
  readonly VITE_ELEVENLABS_VOICE_ID?: string;
  readonly VITE_ELEVENLABS_MODEL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
