export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface LlmRequest {
  userText: string;
  conversationHistory?: LlmMessage[];
  memoryContext?: string;
  metadata?: Record<string, unknown>;
  toolResults?: LlmToolResult[];
}

export interface LlmToolResult {
  toolName: string;
  result: unknown;
}

export interface LlmResponse {
  assistantText: string;
  structuredAction?: Record<string, unknown>;
  toolRequest?: LlmToolRequest;
  styleTags?: string[];
}

export interface LlmToolRequest {
  toolName: string;
  input: Record<string, unknown>;
}

export type LlmErrorCode =
  | "TIMEOUT"
  | "MALFORMED_OUTPUT"
  | "PROVIDER_UNAVAILABLE";

export class LlmError extends Error {
  constructor(
    public readonly code: LlmErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

export interface LlmProvider {
  generate(request: LlmRequest): Promise<LlmResponse>;
}

export interface LlmAgent {
  respond(request: LlmRequest): Promise<LlmResponse>;
}
