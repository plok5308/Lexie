import type { LlmAgent, LlmMessage, LlmResponse } from "./types";

export interface ConversationSessionOptions {
  agent: LlmAgent;
  /** Cap on stored turns (user + assistant combined). Oldest pairs drop first. */
  maxMessages?: number;
}

export class ConversationSession {
  private readonly agent: LlmAgent;
  private readonly maxMessages: number;
  private history: LlmMessage[] = [];

  constructor(options: ConversationSessionOptions) {
    this.agent = options.agent;
    this.maxMessages = options.maxMessages ?? 40;
  }

  async send(userText: string): Promise<LlmResponse> {
    const response = await this.agent.respond({
      userText,
      conversationHistory: this.history.slice(),
    });

    this.history.push({ role: "user", content: userText });
    this.history.push({ role: "assistant", content: response.assistantText });
    this.trim();

    return response;
  }

  reset(): void {
    this.history = [];
  }

  getHistory(): LlmMessage[] {
    return this.history.slice();
  }

  private trim(): void {
    if (this.history.length <= this.maxMessages) {
      return;
    }
    const overflow = this.history.length - this.maxMessages;
    this.history.splice(0, overflow);
  }
}
