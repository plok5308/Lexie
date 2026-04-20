import { TtsError } from "../types";
import type { TtsAudio, TtsProvider, TtsRequest } from "../types";

export class MockTtsProvider implements TtsProvider {
  async synthesize(request: TtsRequest): Promise<TtsAudio> {
    if (!request.text.trim()) {
      throw new TtsError("EMPTY_TEXT", "Cannot synthesize empty text.");
    }

    return {
      kind: "audio_file",
      path: "mock://tts-output.wav",
      mimeType: "audio/wav",
      durationMs: Math.max(500, request.text.length * 35),
    };
  }
}
