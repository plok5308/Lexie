import { SttError } from "./types";
import type { SttInput, SttModule, SttOutput, SttProviderAdapter } from "./types";

export function createSttModule(provider: SttProviderAdapter): SttModule {
  return new DefaultSttModule(provider);
}

class DefaultSttModule implements SttModule {
  constructor(private readonly provider: SttProviderAdapter) {}

  async transcribe(input: SttInput): Promise<SttOutput> {
    validateInput(input);

    try {
      const output = await this.provider.transcribe(input);
      validateOutput(output);
      return output;
    } catch (error) {
      if (error instanceof SttError) {
        throw error;
      }

      throw new SttError(
        "PROVIDER_UNAVAILABLE",
        error instanceof Error ? error.message : "STT provider unavailable.",
      );
    }
  }
}

function validateInput(input: SttInput): void {
  if (input.kind === "audio_file" && !input.path.trim()) {
    throw new SttError("INVALID_AUDIO", "Audio file path is required.");
  }

  if (input.kind === "audio_chunks" && input.chunks.length === 0) {
    throw new SttError("INVALID_AUDIO", "At least one audio chunk is required.");
  }

  if (input.kind === "microphone_stream" && !input.stream) {
    throw new SttError("NO_MICROPHONE_PERMISSION", "Microphone stream is required.");
  }
}

function validateOutput(output: SttOutput): void {
  if (typeof output.text !== "string") {
    throw new SttError("PROVIDER_UNAVAILABLE", "STT provider returned invalid text.");
  }

  if (typeof output.is_final !== "boolean") {
    throw new SttError("PROVIDER_UNAVAILABLE", "STT provider returned invalid final state.");
  }
}
