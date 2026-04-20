export interface TtsRequest {
  text: string;
  voiceId?: string;
  language?: string;
  speed?: number;
  style?: string;
}

export interface TtsAudio {
  kind: "audio_file" | "audio_stream";
  path?: string;
  stream?: AsyncIterable<Uint8Array>;
  mimeType: string;
  durationMs?: number;
}

export type TtsErrorCode =
  | "EMPTY_TEXT"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_VOICE_ID";

export class TtsError extends Error {
  constructor(
    public readonly code: TtsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TtsError";
  }
}

export interface TtsProvider {
  synthesize(request: TtsRequest): Promise<TtsAudio>;
}
