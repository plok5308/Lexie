import {
  createVadSttModule,
  SttError,
} from "../../../packages/stt/src";
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
const stateIndicator = getElement<HTMLElement>("stateIndicator");
const stateLabel = getElement<HTMLElement>("stateLabel");
const transcriptText = getElement<HTMLTextAreaElement>("transcript");
const conversationLog = getElement<HTMLTextAreaElement>("conversationLog");
const audioPlayer = getElement<HTMLAudioElement>("ttsPlayer");

type UiState = "idle" | "listening" | "hearing" | "thinking" | "speaking" | "error";

const stateMeta: Record<UiState, { label: string }> = {
  idle: { label: "대기 중" },
  listening: { label: "듣는 중" },
  hearing: { label: "목소리 감지" },
  thinking: { label: "렉시 생각 중" },
  speaking: { label: "렉시가 말하는 중" },
  error: { label: "오류" },
};

function setState(next: UiState): void {
  stateIndicator.className = `state state-${next}`;
  stateLabel.textContent = stateMeta[next].label;
}

const agent = createLlmAgent({ systemPrompt: bankTellerSystemPrompt });
const session = new ConversationSession({ agent });
const tts = createTtsProvider();

let lastAudioUrl: string | undefined;
let turnInFlight = false;

const stt = createVadSttModule({
  language: "ko",
  onSpeechStart: () => {
    if (!turnInFlight) {
      setState("hearing");
      setStatus("말씀하세요 — 목소리가 감지됐어요.");
      transcriptText.value = "";
    }
  },
  onSpeechEnd: () => {
    if (!turnInFlight) {
      setState("thinking");
      setStatus("전사 중...");
    }
  },
  onTranscript: (result) => {
    void handleUtterance(result.text);
  },
  onError: (error) => {
    setState("error");
    setStatus(formatError(error));
  },
});

startButton.addEventListener("click", async () => {
  startButton.disabled = true;
  try {
    setState("thinking");
    setStatus("VAD 초기화 중 (마이크 권한 허용 필요)...");
    await stt.start();
    stopButton.disabled = false;
    setState("listening");
    setStatus("말하면 자동으로 감지합니다.");
  } catch (error) {
    startButton.disabled = false;
    setState("error");
    setStatus(formatError(error));
  }
});

stopButton.addEventListener("click", () => {
  stt.stop();
  stopButton.disabled = true;
  startButton.disabled = false;
  setState("idle");
  setStatus("세션 종료.");
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
  if (!startButton.disabled) {
    setState("idle");
  }
  setStatus("새 대화를 시작합니다.");
});

async function handleUtterance(userText: string): Promise<void> {
  if (!userText.trim()) {
    return;
  }

  if (turnInFlight) {
    // A second utterance slipped in before we paused — ignore it.
    return;
  }

  turnInFlight = true;
  stt.pause();
  transcriptText.value = userText;

  try {
    setState("thinking");
    setStatus("렉시가 생각 중...");
    const reply = await session.send(userText);
    appendTurn(userText, reply.assistantText);

    setState("speaking");
    setStatus("렉시가 말하는 중...");
    await speak(reply.assistantText);

    setState("listening");
    setStatus("말하면 자동으로 감지합니다.");
  } catch (error) {
    setState("error");
    setStatus(formatError(error));
  } finally {
    turnInFlight = false;
    stt.resume();
  }
}

async function speak(text: string): Promise<void> {
  const audio = await tts.synthesize({ text });

  if (audio.kind !== "audio_stream" || !audio.stream) {
    return;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of audio.stream) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return;
  }

  const blob = new Blob(chunks as BlobPart[], { type: audio.mimeType });
  if (lastAudioUrl) {
    URL.revokeObjectURL(lastAudioUrl);
  }
  lastAudioUrl = URL.createObjectURL(blob);

  audioPlayer.src = lastAudioUrl;
  await new Promise<void>((resolve) => {
    const done = () => {
      audioPlayer.removeEventListener("ended", done);
      audioPlayer.removeEventListener("error", done);
      resolve();
    };
    audioPlayer.addEventListener("ended", done);
    audioPlayer.addEventListener("error", done);
    audioPlayer.play().catch(done);
  });
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
