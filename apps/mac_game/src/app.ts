import { createVadSttModule, SttError } from "../../../packages/stt/src";
import { LlmError } from "../../../packages/llm/src";
import { createTtsProvider, TtsError } from "../../../packages/tts/src";
import { GameEngine, listGames, getDefaultGameId } from "./engine";
import type { SceneFrame } from "./engine";
import { Judge } from "./judge";
import "./styles.css";

const startButton = getElement<HTMLButtonElement>("startButton");
const stopButton = getElement<HTMLButtonElement>("stopButton");
const resetButton = getElement<HTMLButtonElement>("resetButton");
const statusText = getElement<HTMLElement>("status");
const stateIndicator = getElement<HTMLElement>("stateIndicator");
const stateLabel = getElement<HTMLElement>("stateLabel");
const sceneImage = getElement<HTMLImageElement>("sceneImage");
const npcLineEl = getElement<HTMLElement>("npcLine");
const transcriptText = getElement<HTMLTextAreaElement>("transcript");
const conversationLog = getElement<HTMLTextAreaElement>("conversationLog");
const audioPlayer = getElement<HTMLAudioElement>("ttsPlayer");
const gameTitle = getElement<HTMLHeadingElement>("gameTitle");
const gameSelect = getElement<HTMLSelectElement>("gameSelect");

type UiState = "idle" | "listening" | "hearing" | "thinking" | "speaking" | "error";

const stateMeta: Record<UiState, { label: string }> = {
  idle: { label: "대기 중" },
  listening: { label: "듣는 중" },
  hearing: { label: "목소리 감지" },
  thinking: { label: "NPC 생각 중" },
  speaking: { label: "NPC가 말하는 중" },
  error: { label: "오류" },
};

const games = listGames();
if (games.length === 0) {
  throw new Error("등록된 게임이 없습니다. /editor.html 에서 게임을 추가해주세요.");
}

const initialGameId = pickInitialGameId();

let engine = new GameEngine(initialGameId);
let currentScene: SceneFrame = engine.start();
const judge = new Judge();
const tts = createTtsProvider();

let lastAudioUrl: string | undefined;
let turnInFlight = false;

const stt = createVadSttModule({
  language: "ko",
  onSpeechStart: () => {
    if (!turnInFlight) {
      setState("hearing");
      setStatus("듣고 있어요...");
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

renderGameHeader(initialGameId);
renderScene(currentScene);

gameSelect.addEventListener("change", () => {
  const next = gameSelect.value;
  const url = new URL(window.location.href);
  url.searchParams.set("game", next);
  window.location.href = url.toString();
});

startButton.addEventListener("click", async () => {
  startButton.disabled = true;
  try {
    setState("thinking");
    setStatus("VAD 초기화 중 (마이크 권한 허용 필요)...");
    await stt.start();
    stopButton.disabled = false;

    setState("speaking");
    setStatus("NPC가 말하는 중...");
    appendLog("NPC", currentScene.openingLine);
    await speak(currentScene.openingLine);

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
  setStatus("게임 종료.");
});

resetButton.addEventListener("click", async () => {
  currentScene = engine.reset();
  renderScene(currentScene);
  conversationLog.value = "";
  transcriptText.value = "";
  audioPlayer.removeAttribute("src");
  audioPlayer.load();
  if (lastAudioUrl) {
    URL.revokeObjectURL(lastAudioUrl);
    lastAudioUrl = undefined;
  }
  setStatus("처음 장면으로 돌아왔습니다.");

  if (!startButton.disabled) {
    setState("idle");
    return;
  }

  setState("speaking");
  appendLog("NPC", currentScene.openingLine);
  await speak(currentScene.openingLine);
  setState("listening");
  setStatus("말하면 자동으로 감지합니다.");
});

async function handleUtterance(userText: string): Promise<void> {
  if (!userText.trim() || turnInFlight) return;

  turnInFlight = true;
  stt.pause();
  transcriptText.value = userText;
  appendLog("사용자", userText);

  try {
    setState("thinking");
    setStatus("NPC가 생각 중...");
    const verdict = await judge.evaluate(currentScene, userText);
    appendLog("NPC", verdict.reply);

    setState("speaking");
    setStatus("NPC가 말하는 중...");
    await speak(verdict.reply);

    if (verdict.advance) {
      const next = engine.advance();
      if (next) {
        currentScene = next;
        renderScene(currentScene);
        appendLog("NPC", currentScene.openingLine);

        setStatus("다음 장면...");
        await speak(currentScene.openingLine);
      }
    }

    if (engine.isTerminal()) {
      setState("listening");
      setStatus("게임이 끝났습니다. '처음부터' 로 다시 시작할 수 있어요.");
    } else {
      setState("listening");
      setStatus("말하면 자동으로 감지합니다.");
    }
  } catch (error) {
    setState("error");
    setStatus(formatError(error));
  } finally {
    turnInFlight = false;
    stt.resume();
  }
}

function pickInitialGameId(): string {
  const url = new URL(window.location.href);
  const requested = url.searchParams.get("game");
  if (requested && games.some((g) => g.id === requested)) return requested;
  return getDefaultGameId() ?? games[0].id;
}

function renderGameHeader(gameId: string): void {
  gameSelect.innerHTML = "";
  for (const g of games) {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.title;
    if (g.id === gameId) opt.selected = true;
    gameSelect.appendChild(opt);
  }
  const current = games.find((g) => g.id === gameId);
  gameTitle.textContent = current?.title ?? gameId;
  document.title = `LEXIE Game · ${current?.title ?? gameId}`;
}

function renderScene(scene: SceneFrame): void {
  sceneImage.src = scene.imagePath;
  sceneImage.alt = scene.id;
  npcLineEl.textContent = scene.openingLine;
}

async function speak(text: string): Promise<void> {
  const audio = await tts.synthesize({ text });

  if (audio.kind !== "audio_stream" || !audio.stream) return;

  const chunks: Uint8Array[] = [];
  for await (const chunk of audio.stream) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return;

  const blob = new Blob(chunks as BlobPart[], { type: audio.mimeType });
  if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
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

function appendLog(speaker: string, text: string): void {
  conversationLog.value += `${speaker}: ${text}\n\n`;
  conversationLog.scrollTop = conversationLog.scrollHeight;
}

function setState(next: UiState): void {
  stateIndicator.className = `state state-${next}`;
  stateLabel.textContent = stateMeta[next].label;
}

function setStatus(message: string): void {
  statusText.textContent = message;
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
}

function formatError(error: unknown): string {
  if (error instanceof SttError) return `STT error: ${error.code} - ${error.message}`;
  if (error instanceof LlmError) return `LLM error: ${error.code} - ${error.message}`;
  if (error instanceof TtsError) return `TTS error: ${error.code} - ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Unknown error";
}
