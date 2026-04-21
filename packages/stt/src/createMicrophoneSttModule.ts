import { BrowserSpeechSttAdapter } from "./providers/browserSpeechSttAdapter";
import type { BrowserSpeechSttAdapterOptions } from "./providers/browserSpeechSttAdapter";
import { createSttModule } from "./sttModule";
import type { SttInput, SttModule, SttOutput } from "./types";

export interface MicrophoneSttOptions {
  language?: string;
  onTranscript?: (output: SttOutput) => void;
}

export interface MicrophoneSttModule extends SttModule {
  listen(): Promise<SttOutput>;
}

export function createMicrophoneSttModule(
  options: MicrophoneSttOptions = {},
): MicrophoneSttModule {
  const adapterOptions: BrowserSpeechSttAdapterOptions = {
    language: options.language,
    onTranscript: options.onTranscript,
  };

  const adapter = new BrowserSpeechSttAdapter(adapterOptions);
  const module = createSttModule(adapter);

  return {
    transcribe: (input: SttInput) => module.transcribe(input),
    stop: () => module.stop(),
    listen: () =>
      module.transcribe({
        kind: "microphone_stream",
        stream: emptyMicrophoneStream(),
        mimeType: "browser/speech-recognition",
      }),
  };
}

async function* emptyMicrophoneStream(): AsyncIterable<Uint8Array> {
  return;
}
