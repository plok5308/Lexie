import { SttError } from "../types";
import type { SttInput, SttOutput, SttProviderAdapter } from "../types";

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface BrowserSpeechSttAdapterOptions {
  language?: string;
  onTranscript?: (output: SttOutput) => void;
}

export class BrowserSpeechSttAdapter implements SttProviderAdapter {
  private recognition?: SpeechRecognition;
  private mediaStream?: MediaStream;

  constructor(private readonly options: BrowserSpeechSttAdapterOptions = {}) {}

  async transcribe(input: SttInput): Promise<SttOutput> {
    if (input.kind !== "microphone_stream") {
      throw new SttError(
        "INVALID_AUDIO",
        "Browser speech recognition requires microphone stream input.",
      );
    }

    const SpeechRecognitionApi =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      throw new SttError(
        "PROVIDER_UNAVAILABLE",
        "Speech recognition is not supported in this browser. Try Chrome on macOS.",
      );
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new SttError(
        "PROVIDER_UNAVAILABLE",
        "Microphone API is unavailable. Serve the app over http://localhost or https.",
      );
    }

    const mediaStream = await requestMicrophone();
    this.mediaStream = mediaStream;

    return new Promise<SttOutput>((resolve, reject) => {
      let transcript = "";
      let confidence: number | undefined;
      let hasResult = false;
      let pendingError: SttError | undefined;

      const recognition = new SpeechRecognitionApi();
      this.recognition = recognition;

      recognition.lang = this.options.language ?? "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      const cleanup = () => {
        this.recognition = undefined;
        this.mediaStream = undefined;
        mediaStream.getTracks().forEach((track) => track.stop());
      };

      recognition.onresult = (event) => {
        let nextTranscript = "";
        let isFinal = false;

        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          const alternative = result[0];

          if (!alternative) {
            continue;
          }

          hasResult = true;
          nextTranscript += alternative.transcript;
          confidence = alternative.confidence;
          isFinal = isFinal || result.isFinal;
        }

        transcript = nextTranscript.trim();

        if (transcript) {
          this.options.onTranscript?.({
            text: transcript,
            is_final: isFinal,
            confidence,
            language: recognition.lang,
          });
        }
      };

      recognition.onerror = (event) => {
        pendingError = toSttError(event);
      };

      recognition.onend = () => {
        cleanup();

        if (pendingError) {
          reject(pendingError);
          return;
        }

        if (!hasResult || !transcript) {
          reject(
            new SttError(
              "INVALID_AUDIO",
              "No speech was recognized. Check microphone input, speak after pressing Start, or try Chrome.",
            ),
          );
          return;
        }

        resolve({
          text: transcript,
          is_final: true,
          confidence,
          language: recognition.lang,
        });
      };

      try {
        recognition.start();
      } catch (error) {
        cleanup();
        reject(
          new SttError(
            "PROVIDER_UNAVAILABLE",
            error instanceof Error ? error.message : "Could not start speech recognition.",
          ),
        );
      }
    });
  }

  stop(): void {
    this.recognition?.stop();
  }
}

async function requestMicrophone(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : "Microphone unavailable.";

    if (name === "NotAllowedError" || name === "SecurityError") {
      throw new SttError(
        "NO_MICROPHONE_PERMISSION",
        "Microphone access was blocked. Allow it in the browser site settings and macOS System Settings > Privacy & Security > Microphone.",
      );
    }

    if (name === "NotFoundError" || name === "OverconstrainedError") {
      throw new SttError("INVALID_AUDIO", "No microphone device was found.");
    }

    if (name === "NotReadableError") {
      throw new SttError(
        "PROVIDER_UNAVAILABLE",
        "Microphone is in use by another application.",
      );
    }

    throw new SttError("NO_MICROPHONE_PERMISSION", message);
  }
}

function toSttError(event: SpeechRecognitionErrorEvent): SttError {
  if (event.error === "not-allowed" || event.error === "service-not-allowed") {
    return new SttError("NO_MICROPHONE_PERMISSION", event.message || "Microphone denied.");
  }

  if (event.error === "no-speech" || event.error === "audio-capture") {
    return new SttError("INVALID_AUDIO", event.message || "No speech was captured.");
  }

  if (event.error === "network") {
    return new SttError("PROVIDER_UNAVAILABLE", event.message || "Speech service unavailable.");
  }

  return new SttError("PROVIDER_UNAVAILABLE", event.message || event.error);
}
