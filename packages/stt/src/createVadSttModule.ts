import { MicVAD, utils as vadUtils } from "@ricky0123/vad-web";
import { OpenAiWhisperSttAdapter } from "./providers/openAiWhisperSttAdapter";
import { SttError } from "./types";
import type { SttOutput, SttProviderAdapter } from "./types";

export interface VadSttOptions {
  adapter?: SttProviderAdapter;
  language?: string;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onTranscript?: (output: SttOutput) => void;
  onError?: (error: SttError) => void;
  /** pulled from env (VITE_OPENAI_API_KEY) when adapter is not provided */
  openAiApiKey?: string;
  openAiModel?: string;
  /** vad-web asset URLs — default to jsDelivr CDN */
  baseAssetPath?: string;
  onnxWASMBasePath?: string;
  vadModel?: "v5" | "legacy";
}

export interface VadSttModule {
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  isRunning(): boolean;
}

const DEFAULT_ASSET_PATH = "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.24/dist/";
const DEFAULT_ONNX_PATH = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/";

export function createVadSttModule(options: VadSttOptions = {}): VadSttModule {
  const adapter = options.adapter ?? buildDefaultAdapter(options);

  let vad: MicVAD | undefined;
  let running = false;
  let paused = false;

  const start = async (): Promise<void> => {
    if (vad) {
      if (paused) {
        vad.start();
        paused = false;
      }
      running = true;
      return;
    }

    try {
      vad = await MicVAD.new({
        model: options.vadModel ?? "v5",
        baseAssetPath: options.baseAssetPath ?? DEFAULT_ASSET_PATH,
        onnxWASMBasePath: options.onnxWASMBasePath ?? DEFAULT_ONNX_PATH,
        onSpeechStart: () => {
          options.onSpeechStart?.();
        },
        onSpeechEnd: (audio: Float32Array) => {
          options.onSpeechEnd?.();
          void transcribe(audio);
        },
      });
    } catch (error) {
      throw toSttError(error, "Could not initialize VAD.");
    }

    vad.start();
    running = true;
    paused = false;
  };

  const pause = (): void => {
    vad?.pause();
    paused = true;
  };

  const resume = (): void => {
    if (!vad || !running) return;
    vad.start();
    paused = false;
  };

  const stop = (): void => {
    vad?.destroy();
    vad = undefined;
    running = false;
    paused = false;
  };

  const transcribe = async (audio: Float32Array): Promise<void> => {
    try {
      const wav = vadUtils.encodeWAV(audio);
      const result = await adapter.transcribe({
        kind: "audio_chunks",
        chunks: [new Uint8Array(wav)],
        mimeType: "audio/wav",
      });

      if (!result.text.trim()) {
        return;
      }

      options.onTranscript?.(result);
    } catch (error) {
      options.onError?.(toSttError(error, "Transcription failed."));
    }
  };

  return {
    start,
    pause,
    resume,
    stop,
    isRunning: () => running && !paused,
  };
}

function buildDefaultAdapter(options: VadSttOptions): SttProviderAdapter {
  const apiKey = options.openAiApiKey ?? readEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new SttError(
      "PROVIDER_UNAVAILABLE",
      "No STT adapter configured and OpenAI API key missing — pass `adapter` or set VITE_OPENAI_API_KEY.",
    );
  }

  return new OpenAiWhisperSttAdapter({
    apiKey,
    model: options.openAiModel ?? readEnv("OPENAI_STT_MODEL"),
    language: options.language,
  });
}

function readEnv(key: string): string | undefined {
  const viteEnv = import.meta.env as Record<string, string | undefined> | undefined;
  const viteKey = `VITE_${key}`;
  const fromVite = viteEnv?.[viteKey];
  if (fromVite && !fromVite.startsWith("sk-your-key") && !fromVite.startsWith("your-key")) {
    return fromVite;
  }

  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[key];
}

function toSttError(error: unknown, fallbackMessage: string): SttError {
  if (error instanceof SttError) {
    return error;
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  const name = error instanceof Error ? error.name : "";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return new SttError(
      "NO_MICROPHONE_PERMISSION",
      "Microphone access was blocked. Allow it in the browser and macOS Privacy settings.",
    );
  }

  if (name === "NotFoundError") {
    return new SttError("INVALID_AUDIO", "No microphone device was found.");
  }

  return new SttError("PROVIDER_UNAVAILABLE", message);
}
