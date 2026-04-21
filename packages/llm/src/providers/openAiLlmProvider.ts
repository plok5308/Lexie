import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { LlmError } from "../types";
import type { LlmProvider, LlmRequest, LlmResponse } from "../types";

export interface OpenAiLlmProviderOptions {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  /** Required when running in a browser. Key is visible to the page — local dev only. */
  dangerouslyAllowBrowser?: boolean;
}

export class OpenAiLlmProvider implements LlmProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly systemPrompt?: string;

  constructor(options: OpenAiLlmProviderOptions) {
    if (!options.apiKey) {
      throw new LlmError("PROVIDER_UNAVAILABLE", "OpenAI API key is required.");
    }

    this.client = new OpenAI({
      apiKey: options.apiKey,
      dangerouslyAllowBrowser: options.dangerouslyAllowBrowser,
    });
    this.model = options.model ?? "gpt-4o-mini";
    this.systemPrompt = options.systemPrompt;
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: this.buildMessages(request),
      });

      const text = completion.choices[0]?.message?.content?.trim() ?? "";

      if (!text) {
        throw new LlmError("MALFORMED_OUTPUT", "OpenAI returned an empty response.");
      }

      return { assistantText: text };
    } catch (error) {
      if (error instanceof LlmError) {
        throw error;
      }

      throw new LlmError(
        "PROVIDER_UNAVAILABLE",
        error instanceof Error ? error.message : "OpenAI request failed.",
      );
    }
  }

  private buildMessages(request: LlmRequest): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [];

    if (this.systemPrompt) {
      messages.push({ role: "system", content: this.systemPrompt });
    }

    if (request.memoryContext) {
      messages.push({ role: "system", content: `Context:\n${request.memoryContext}` });
    }

    if (request.conversationHistory) {
      for (const entry of request.conversationHistory) {
        if (entry.role === "tool") {
          continue;
        }

        messages.push({ role: entry.role, content: entry.content });
      }
    }

    messages.push({ role: "user", content: request.userText });
    return messages;
  }
}
