import { BaseAgent } from "./agents/baseAgent";
import { baseSystemPrompt } from "./prompts/basePrompt";
import { MockLlmProvider } from "./providers/mockLlmProvider";
import { OpenAiLlmProvider } from "./providers/openAiLlmProvider";
import type { LlmAgent, LlmProvider } from "./types";

export interface CreateLlmAgentOptions {
  systemPrompt?: string;
}

export function createLlmAgent(options: CreateLlmAgentOptions = {}): LlmAgent {
  const systemPrompt = options.systemPrompt ?? baseSystemPrompt;
  const provider = selectProvider(systemPrompt);
  return new BaseAgent(provider);
}

function selectProvider(systemPrompt: string): LlmProvider {
  const { apiKey, model } = readEnv();

  if (!apiKey) {
    console.warn("[lexie/llm] OpenAI API key not set — using MockLlmProvider.");
    return new MockLlmProvider();
  }

  return new OpenAiLlmProvider({
    apiKey,
    model,
    systemPrompt,
    dangerouslyAllowBrowser: typeof window !== "undefined",
  });
}

function readEnv(): { apiKey?: string; model?: string } {
  const viteEnv = import.meta.env as Record<string, string | undefined> | undefined;

  const apiKey = viteEnv?.VITE_OPENAI_API_KEY ?? readProcessEnv("OPENAI_API_KEY");
  const model = viteEnv?.VITE_OPENAI_MODEL ?? readProcessEnv("OPENAI_MODEL");

  if (!apiKey || apiKey.startsWith("sk-your-key")) {
    return { apiKey: undefined, model };
  }

  return { apiKey, model };
}

function readProcessEnv(key: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[key];
}
