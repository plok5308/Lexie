import type { SttInput, SttOutput, SttProviderAdapter } from "../types";

export class MockSttAdapter implements SttProviderAdapter {
  constructor(private readonly transcript = "Hello from the mock STT adapter.") {}

  async transcribe(_input: SttInput): Promise<SttOutput> {
    return {
      text: this.transcript,
      is_final: true,
      confidence: 1,
      language: "en",
    };
  }
}
