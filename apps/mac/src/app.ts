import { createMicrophoneSttModule, SttError } from "../../../packages/stt/src";
import { createLlmAgent, LlmError } from "../../../packages/llm/src";
import { createTtsProvider, TtsError } from "../../../packages/tts/src";
import "./styles.css";

const startButton = getElement<HTMLButtonElement>("startButton");
const stopButton = getElement<HTMLButtonElement>("stopButton");
const statusText = getElement<HTMLElement>("status");
const transcriptText = getElement<HTMLTextAreaElement>("transcript");
const llmResponseText = getElement<HTMLTextAreaElement>("llmResponse");
const audioPlayer = getElement<HTMLAudioElement>("ttsPlayer");

const stt = createMicrophoneSttModule({
  language: "ko-KR",
  onTranscript: (result) => {
    transcriptText.value = result.text;
    setStatus(result.is_final ? "Heard final speech" : "Listening...");
  },
});
const agent = createLlmAgent();
const tts = createTtsProvider();
let activeTranscription: Promise<void> | undefined;
let lastAudioUrl: string | undefined;

startButton.addEventListener("click", async () => {
  try {
    transcriptText.value = "";
    llmResponseText.value = "";
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
        const reply = await agent.respond({ userText: result.text });
        llmResponseText.value = reply.assistantText;

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
    // Autoplay policies may require a user gesture; the click that triggered
    // the flow counts, but if the tab lost focus we surface the <audio>
    // controls so the user can press play.
  });
  setStatus("Response spoken");
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
