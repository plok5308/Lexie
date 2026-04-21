import { createMicrophoneSttModule, SttError } from "../../../packages/stt/src";
import { createLlmAgent, LlmError } from "../../../packages/llm/src";
import "./styles.css";

const startButton = getElement<HTMLButtonElement>("startButton");
const stopButton = getElement<HTMLButtonElement>("stopButton");
const statusText = getElement<HTMLElement>("status");
const transcriptText = getElement<HTMLTextAreaElement>("transcript");
const llmResponseText = getElement<HTMLTextAreaElement>("llmResponse");

const stt = createMicrophoneSttModule({
  language: "ko-KR",
  onTranscript: (result) => {
    transcriptText.value = result.text;
    setStatus(result.is_final ? "Heard final speech" : "Listening...");
  },
});
const agent = createLlmAgent();
let activeTranscription: Promise<void> | undefined;

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
        setStatus("Response ready");
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

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
