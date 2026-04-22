import { TtsError } from "../types";
import type { TtsAudio, TtsProvider, TtsRequest } from "../types";

export interface ElevenLabsTtsProviderOptions {
  apiKey: string;
  voiceId: string;
  modelId?: string;
  outputFormat?: string;
}

const DEFAULT_MODEL_ID = "eleven_flash_v2_5";
const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128";
const API_BASE = "https://api.elevenlabs.io/v1";

export class ElevenLabsTtsProvider implements TtsProvider {
  private readonly apiKey: string;
  private readonly defaultVoiceId: string;
  private readonly modelId: string;
  private readonly outputFormat: string;

  constructor(options: ElevenLabsTtsProviderOptions) {
    if (!options.apiKey) {
      throw new TtsError("PROVIDER_UNAVAILABLE", "ElevenLabs API key is required.");
    }
    if (!options.voiceId) {
      throw new TtsError("INVALID_VOICE_ID", "ElevenLabs voiceId is required.");
    }

    this.apiKey = options.apiKey;
    this.defaultVoiceId = options.voiceId;
    this.modelId = options.modelId ?? DEFAULT_MODEL_ID;
    this.outputFormat = options.outputFormat ?? DEFAULT_OUTPUT_FORMAT;
  }

  async synthesize(request: TtsRequest): Promise<TtsAudio> {
    if (!request.text.trim()) {
      throw new TtsError("EMPTY_TEXT", "Cannot synthesize empty text.");
    }

    const voiceId = request.voiceId ?? this.defaultVoiceId;
    const url = `${API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=${encodeURIComponent(this.outputFormat)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: request.text,
        model_id: this.modelId,
      }),
    }).catch((error: unknown) => {
      throw new TtsError(
        "PROVIDER_UNAVAILABLE",
        error instanceof Error ? error.message : "ElevenLabs request failed.",
      );
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new TtsError(
        mapStatusToCode(response.status),
        `ElevenLabs ${response.status}: ${detail || response.statusText}`,
      );
    }

    const body = response.body;
    if (!body) {
      throw new TtsError("PROVIDER_UNAVAILABLE", "ElevenLabs returned no audio body.");
    }

    return {
      kind: "audio_stream",
      stream: toAsyncIterable(body),
      mimeType: "audio/mpeg",
    };
  }
}

function mapStatusToCode(status: number) {
  if (status === 422 || status === 400) {
    return "INVALID_VOICE_ID" as const;
  }
  return "PROVIDER_UNAVAILABLE" as const;
}

async function* toAsyncIterable(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<Uint8Array> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        return;
      }
      if (value && value.byteLength > 0) {
        yield value;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
