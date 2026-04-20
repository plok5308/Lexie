import type { LlmAgent, LlmProvider, LlmRequest, LlmResponse } from "../types";

export class BaseAgent implements LlmAgent {
  constructor(private readonly provider: LlmProvider) {}

  async respond(request: LlmRequest): Promise<LlmResponse> {
    return this.provider.generate(request);
  }
}
