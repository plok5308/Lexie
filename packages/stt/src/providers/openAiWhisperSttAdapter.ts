import { SttError } from "../types";
import type { SttInput, SttOutput, SttProviderAdapter } from "../types";

export interface OpenAiWhisperSttAdapterOptions {
  apiKey: string;
  model?: string;
  language?: string;
}

const DEFAULT_MODEL = "whisper-1";
const API_URL = "https://api.openai.com/v1/audio/transcriptions";

export class OpenAiWhisperSttAdapter implements SttProviderAdapter {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly language?: string;

  constructor(options: OpenAiWhisperSttAdapterOptions) {
    if (!options.apiKey) {
      throw new SttError("PROVIDER_UNAVAILABLE", "OpenAI API key is required.");
    }
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
    this.language = options.language;
  }

  async transcribe(input: SttInput): Promise<SttOutput> {
    const blob = toBlob(input);

    const form = new FormData();
    form.append("file", blob, filenameFor(blob.type));
    form.append("model", this.model);
    if (this.language) {
      form.append("language", this.language);
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: form,
    }).catch((error: unknown) => {
      throw new SttError(
        "PROVIDER_UNAVAILABLE",
        error instanceof Error ? error.message : "Whisper request failed.",
      );
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new SttError(
        "PROVIDER_UNAVAILABLE",
        `OpenAI ${response.status}: ${detail || response.statusText}`,
      );
    }

    const data = (await response.json()) as { text?: string };
    const text = (data.text ?? "").trim();

    return {
      text,
      is_final: true,
      language: this.language,
    };
  }
}

function toBlob(input: SttInput): Blob {
  if (input.kind === "audio_chunks") {
    return new Blob(input.chunks as BlobPart[], {
      type: input.mimeType ?? "audio/wav",
    });
  }

  if (input.kind === "audio_file") {
    throw new SttError(
      "INVALID_AUDIO",
      "OpenAI Whisper adapter expects audio_chunks input. Read the file into chunks first.",
    );
  }

  throw new SttError(
    "INVALID_AUDIO",
    "OpenAI Whisper adapter does not accept microphone_stream directly — use the VAD module to segment it first.",
  );
}

function filenameFor(mimeType: string): string {
  if (mimeType.includes("wav")) return "audio.wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "audio.mp3";
  if (mimeType.includes("webm")) return "audio.webm";
  if (mimeType.includes("ogg")) return "audio.ogg";
  return "audio.wav";
}
