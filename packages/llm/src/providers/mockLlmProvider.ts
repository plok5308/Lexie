import type { LlmProvider, LlmRequest, LlmResponse } from "../types";

export class MockLlmProvider implements LlmProvider {
  async generate(request: LlmRequest): Promise<LlmResponse> {
    return {
      assistantText: `Mock response to: ${request.userText}`,
      styleTags: ["mock"],
    };
  }
}
