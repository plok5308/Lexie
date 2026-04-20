import type { LlmAgent } from "../../../packages/llm/src";
import type { SttInput, SttModule } from "../../../packages/stt/src";
import type { TtsAudio, TtsProvider } from "../../../packages/tts/src";

export interface VoiceLoop {
  stt: SttModule;
  llm: LlmAgent;
  tts: TtsProvider;
}

export interface VoiceLoopResult {
  transcript: string;
  assistantText: string;
  audio: TtsAudio;
}

export async function runVoiceLoop(
  modules: VoiceLoop,
  input: SttInput,
): Promise<VoiceLoopResult> {
  const transcript = await modules.stt.transcribe(input);
  const response = await modules.llm.respond({ userText: transcript.text });
  const audio = await modules.tts.synthesize({ text: response.assistantText });

  return {
    transcript: transcript.text,
    assistantText: response.assistantText,
    audio,
  };
}
