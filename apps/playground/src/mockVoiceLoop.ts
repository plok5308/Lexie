import { BaseAgent, MockLlmProvider } from "../../../packages/llm/src";
import { createSttModule, MockSttAdapter } from "../../../packages/stt/src";
import { MockTtsProvider } from "../../../packages/tts/src";
import { runVoiceLoop } from "./voiceLoop";

export async function runMockVoiceLoop() {
  return runVoiceLoop(
    {
      stt: createSttModule(new MockSttAdapter()),
      llm: new BaseAgent(new MockLlmProvider()),
      tts: new MockTtsProvider(),
    },
    {
      kind: "audio_file",
      path: "mock://input.wav",
    },
  );
}
