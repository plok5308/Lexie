import { ElevenLabsTtsProvider } from "./providers/elevenLabsTtsProvider";
import { MockTtsProvider } from "./providers/mockTtsProvider";
import type { TtsProvider } from "./types";

export interface CreateTtsProviderOptions {
  apiKey?: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
}

export function createTtsProvider(options: CreateTtsProviderOptions = {}): TtsProvider {
  const apiKey = options.apiKey ?? readEnv("ELEVENLABS_API_KEY");
  const voiceId = options.voiceId ?? readEnv("ELEVENLABS_VOICE_ID");
  const modelId = options.modelId ?? readEnv("ELEVENLABS_MODEL_ID");
  const outputFormat = options.outputFormat ?? readEnv("ELEVENLABS_OUTPUT_FORMAT");

  if (!apiKey || apiKey.startsWith("your-key") || !voiceId) {
    console.warn(
      "[lexie/tts] ElevenLabs key or voice id missing — using MockTtsProvider.",
    );
    return new MockTtsProvider();
  }

  return new ElevenLabsTtsProvider({
    apiKey,
    voiceId,
    modelId,
    outputFormat,
  });
}

function readEnv(key: string): string | undefined {
  const viteEnv = import.meta.env as Record<string, string | undefined> | undefined;
  const viteKey = `VITE_${key}`;

  const fromVite = viteEnv?.[viteKey];
  if (fromVite) {
    return fromVite;
  }

  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[key];
}
