export type SttInput =
  | {
      kind: "audio_file";
      path: string;
    }
  | {
      kind: "audio_chunks";
      chunks: Uint8Array[];
      mimeType?: string;
    }
  | {
      kind: "microphone_stream";
      stream: AsyncIterable<Uint8Array>;
      mimeType?: string;
    };

export interface SttOutput {
  text: string;
  is_final: boolean;
  confidence?: number;
  language?: string;
  timestamps?: SttTimestamp[];
}

export interface SttTimestamp {
  text: string;
  startMs: number;
  endMs: number;
}

export type SttErrorCode =
  | "NO_MICROPHONE_PERMISSION"
  | "INVALID_AUDIO"
  | "TIMEOUT"
  | "PROVIDER_UNAVAILABLE";

export class SttError extends Error {
  constructor(
    public readonly code: SttErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SttError";
  }
}

export interface SttProviderAdapter {
  transcribe(input: SttInput): Promise<SttOutput>;
}

export interface SttModule {
  transcribe(input: SttInput): Promise<SttOutput>;
}
