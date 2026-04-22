import { createMicrophoneSttModule, SttError } from "../../../packages/stt/src";
import {
  ConversationSession,
  createLlmAgent,
  LlmError,
  bankTellerSystemPrompt,
} from "../../../packages/llm/src";
import { createTtsProvider, TtsError } from "../../../packages/tts/src";
import "./styles.css";

const startButton = getElement<HTMLButtonElement>("startButton");
const stopButton = getElement<HTMLButtonElement>("stopButton");
const resetButton = getElement<HTMLButtonElement>("resetButton");
const statusText = getElement<HTMLElement>("status");
const transcriptText = getElement<HTMLTextAreaElement>("transcript");
const conversationLog = getElement<HTMLTextAreaElement>("conversationLog");
const audioPlayer = getElement<HTMLAudioElement>("ttsPlayer");

const stt = createMicrophoneSttModule({
  language: "ko-KR",
  onTranscript: (result) => {
    transcriptText.value = result.text;
    setStatus(result.is_final ? "Heard final speech" : "Listening...");
  },
});
const agent = createLlmAgent({ systemPrompt: bankTellerSystemPrompt });
const session = new ConversationSession({ agent });
const tts = createTtsProvider();

let activeTranscription: Promise<void> | undefined;
let lastAudioUrl: string | undefined;

startButton.addEventListener("click", async () => {
  try {
    transcriptText.value = "";
    startButton.disabled = true;
    stopButton.disabled = false;
    setStatus("Starting Web STT... speak after the browser microphone prompt.");

    activeTranscription = stt
      .listen()
      .then(async (result) => {
        transcriptText.value = result.text;

        if (!result.text.trim()) {
          setStatus("Nothing to ask — empty transcript.");
          return;
        }

        setStatus("Asking LEXIE...");
        const reply = await session.send(result.text);
        appendTurn(result.text, reply.assistantText);

        setStatus("Synthesizing voice...");
        await speak(reply.assistantText);
      })
      .catch((error: unknown) => {
        setStatus(formatError(error));
      })
      .finally(() => {
        startButton.disabled = false;
        stopButton.disabled = true;
        activeTranscription = undefined;
      });
  } catch (error) {
    setStatus(formatError(error));
    startButton.disabled = false;
    stopButton.disabled = true;
  }
});

stopButton.addEventListener("click", async () => {
  try {
    stopButton.disabled = true;
    setStatus("Stopping Web STT...");
    stt.stop();
    await activeTranscription;
  } catch (error) {
    setStatus(formatError(error));
  } finally {
    startButton.disabled = false;
    stopButton.disabled = true;
  }
});

resetButton.addEventListener("click", () => {
  session.reset();
  conversationLog.value = "";
  transcriptText.value = "";
  audioPlayer.removeAttribute("src");
  audioPlayer.load();
  if (lastAudioUrl) {
    URL.revokeObjectURL(lastAudioUrl);
    lastAudioUrl = undefined;
  }
  setStatus("새 대화를 시작합니다.");
});

async function speak(text: string): Promise<void> {
  const audio = await tts.synthesize({ text });

  if (audio.kind !== "audio_stream" || !audio.stream) {
    setStatus("TTS returned no playable audio (mock mode?).");
    return;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of audio.stream) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    setStatus("TTS returned empty audio.");
    return;
  }

  const blob = new Blob(chunks as BlobPart[], { type: audio.mimeType });
  if (lastAudioUrl) {
    URL.revokeObjectURL(lastAudioUrl);
  }
  lastAudioUrl = URL.createObjectURL(blob);

  audioPlayer.src = lastAudioUrl;
  await audioPlayer.play().catch(() => {
    // Autoplay may be blocked if the tab lost focus — the <audio> controls
    // stay visible so the user can press play manually.
  });
  setStatus("Response spoken");
}

function appendTurn(userText: string, assistantText: string): void {
  const block = `고객: ${userText}\n렉시: ${assistantText}\n\n`;
  conversationLog.value += block;
  conversationLog.scrollTop = conversationLog.scrollHeight;
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }

  return element as T;
}

function setStatus(message: string): void {
  statusText.textContent = message;
}

function formatError(error: unknown): string {
  if (error instanceof SttError) {
    return `STT error: ${error.code} - ${error.message}`;
  }

  if (error instanceof LlmError) {
    return `LLM error: ${error.code} - ${error.message}`;
  }

  if (error instanceof TtsError) {
    return `TTS error: ${error.code} - ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
