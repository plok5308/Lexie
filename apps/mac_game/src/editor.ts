import "./editor.css";

interface OtherResponse {
  label: string;
  condition: string;
}

interface Scene {
  id: string;
  image: string;
  openingLine: string;
  description: string;
  advanceCondition: string;
  otherResponses: OtherResponse[];
  terminal: boolean;
}

interface GameData {
  title: string;
  scenes: Scene[];
}

interface GameRef {
  id: string;
  title: string;
}

const els = {
  gameTitle: el<HTMLHeadingElement>("gameTitle"),
  saveButton: el<HTMLButtonElement>("saveButton"),
  saveStatus: el<HTMLSpanElement>("saveStatus"),
  gameSelect: el<HTMLSelectElement>("gameSelect"),
  newGameBtn: el<HTMLButtonElement>("newGameBtn"),
  deleteGameBtn: el<HTMLButtonElement>("deleteGameBtn"),
  runGameLink: el<HTMLAnchorElement>("runGameLink"),
  titleInput: el<HTMLInputElement>("titleInput"),

  prevSceneBtn: el<HTMLButtonElement>("prevSceneBtn"),
  nextSceneBtn: el<HTMLButtonElement>("nextSceneBtn"),
  sceneCounter: el<HTMLSpanElement>("sceneCounter"),
  moveUpBtn: el<HTMLButtonElement>("moveUpBtn"),
  moveDownBtn: el<HTMLButtonElement>("moveDownBtn"),
  addSceneBtn: el<HTMLButtonElement>("addSceneBtn"),
  deleteSceneBtn: el<HTMLButtonElement>("deleteSceneBtn"),

  sceneIdInput: el<HTMLInputElement>("sceneIdInput"),
  terminalInput: el<HTMLInputElement>("terminalInput"),
  sceneImagePreview: el<HTMLImageElement>("sceneImagePreview"),
  imageDrop: el<HTMLDivElement>("imageDrop"),
  imagePathHint: el<HTMLParagraphElement>("imagePathHint"),
  imageFileInput: el<HTMLInputElement>("imageFileInput"),

  openingLineInput: el<HTMLTextAreaElement>("openingLineInput"),
  descriptionInput: el<HTMLTextAreaElement>("descriptionInput"),
  advanceConditionInput: el<HTMLTextAreaElement>("advanceConditionInput"),

  addOtherResponseBtn: el<HTMLButtonElement>("addOtherResponseBtn"),
  otherResponsesList: el<HTMLDivElement>("otherResponsesList"),

  errorBanner: el<HTMLParagraphElement>("errorBanner"),
};

const imageBox = els.sceneImagePreview.parentElement as HTMLDivElement;

let games: GameRef[] = [];
let currentGameId = "";
let data: GameData = { title: "", scenes: [] };
let currentIndex = 0;
let dirty = false;

bootstrap().catch(showError);

async function bootstrap(): Promise<void> {
  games = await fetchGames();
  if (games.length === 0) {
    await promptCreateGame(true);
    games = await fetchGames();
  }

  currentGameId = pickInitialGameId();
  data = await loadGame(currentGameId);
  if (data.scenes.length === 0) data.scenes.push(blankScene());
  currentIndex = 0;

  renderGameSelector();
  render();
  attachListeners();

  window.addEventListener("beforeunload", (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });
}

function attachListeners(): void {
  els.saveButton.addEventListener("click", () => void save());
  els.gameSelect.addEventListener("change", () => void switchGame(els.gameSelect.value));
  els.newGameBtn.addEventListener("click", () => void promptCreateGame(false));
  els.deleteGameBtn.addEventListener("click", () => void deleteCurrentGame());

  els.titleInput.addEventListener("input", () => {
    data.title = els.titleInput.value;
    els.gameTitle.textContent = data.title || "(제목 없음)";
    markDirty();
  });

  els.prevSceneBtn.addEventListener("click", () => goToScene(currentIndex - 1));
  els.nextSceneBtn.addEventListener("click", () => goToScene(currentIndex + 1));
  els.addSceneBtn.addEventListener("click", addScene);
  els.deleteSceneBtn.addEventListener("click", deleteCurrentScene);
  els.moveUpBtn.addEventListener("click", () => moveScene(-1));
  els.moveDownBtn.addEventListener("click", () => moveScene(1));

  els.sceneIdInput.addEventListener("input", () =>
    updateScene((s) => (s.id = els.sceneIdInput.value.trim())),
  );
  els.terminalInput.addEventListener("change", () =>
    updateScene((s) => (s.terminal = els.terminalInput.checked)),
  );
  els.openingLineInput.addEventListener("input", () =>
    updateScene((s) => (s.openingLine = els.openingLineInput.value)),
  );
  els.descriptionInput.addEventListener("input", () =>
    updateScene((s) => (s.description = els.descriptionInput.value)),
  );
  els.advanceConditionInput.addEventListener("input", () =>
    updateScene((s) => (s.advanceCondition = els.advanceConditionInput.value)),
  );

  els.addOtherResponseBtn.addEventListener("click", () => {
    updateScene((s) => s.otherResponses.push({ label: "", condition: "" }));
    renderOtherResponses();
  });

  els.imageDrop.addEventListener("click", () => els.imageFileInput.click());
  els.imageFileInput.addEventListener("change", () => {
    const file = els.imageFileInput.files?.[0];
    if (file) void uploadImage(file);
    els.imageFileInput.value = "";
  });

  imageBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    imageBox.classList.add("dragover");
  });
  imageBox.addEventListener("dragleave", () => imageBox.classList.remove("dragover"));
  imageBox.addEventListener("drop", (e) => {
    e.preventDefault();
    imageBox.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) void uploadImage(file);
  });
}

function pickInitialGameId(): string {
  const url = new URL(window.location.href);
  const requested = url.searchParams.get("game");
  if (requested && games.some((g) => g.id === requested)) return requested;
  return games[0].id;
}

async function switchGame(nextId: string): Promise<void> {
  if (nextId === currentGameId) return;
  if (dirty && !confirm("저장하지 않은 변경이 있습니다. 게임을 바꿀까요?")) {
    els.gameSelect.value = currentGameId;
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("game", nextId);
  window.location.href = url.toString();
}

async function promptCreateGame(forced: boolean): Promise<void> {
  const id = window.prompt(
    forced ? "등록된 게임이 없습니다. 새 게임 ID를 입력하세요" : "새 게임 ID (영문/숫자/_-)",
    "",
  );
  if (!id) {
    if (forced) throw new Error("게임 ID 없이는 시작할 수 없습니다.");
    return;
  }
  const title = window.prompt("게임 제목", id) || id;
  try {
    const res = await fetch("/api/create-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
    if (forced) return;
    const url = new URL(window.location.href);
    url.searchParams.set("game", body.id);
    window.location.href = url.toString();
  } catch (err) {
    showError(err);
    if (forced) throw err;
  }
}

async function deleteCurrentGame(): Promise<void> {
  if (games.length <= 1) {
    showError("최소 한 게임은 남아 있어야 합니다.");
    return;
  }
  if (!confirm(`'${currentGameId}' 게임을 정말 삭제할까요? (이미지 포함 모든 파일이 사라집니다)`)) {
    return;
  }
  try {
    const res = await fetch("/api/delete-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId: currentGameId }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
    const remaining = games.filter((g) => g.id !== currentGameId);
    const url = new URL(window.location.href);
    url.searchParams.set("game", remaining[0].id);
    window.location.href = url.toString();
  } catch (err) {
    showError(err);
  }
}

function currentScene(): Scene {
  return data.scenes[currentIndex];
}

function updateScene(mutate: (s: Scene) => void): void {
  mutate(currentScene());
  markDirty();
  els.sceneCounter.textContent = `${currentIndex + 1} / ${data.scenes.length}`;
}

function markDirty(): void {
  dirty = true;
  setSaveStatus("저장하지 않은 변경", "");
}

function setSaveStatus(text: string, kind: "" | "success" | "error"): void {
  els.saveStatus.textContent = text;
  els.saveStatus.className = `saveStatus ${kind}`;
}

function goToScene(next: number): void {
  if (next < 0 || next >= data.scenes.length) return;
  currentIndex = next;
  render();
}

function addScene(): void {
  const scene = blankScene();
  data.scenes.splice(currentIndex + 1, 0, scene);
  currentIndex += 1;
  markDirty();
  render();
}

function deleteCurrentScene(): void {
  if (data.scenes.length <= 1) {
    showError("최소 한 장면은 있어야 합니다.");
    return;
  }
  if (!confirm(`'${currentScene().id}' 장면을 삭제할까요?`)) return;
  data.scenes.splice(currentIndex, 1);
  currentIndex = Math.min(currentIndex, data.scenes.length - 1);
  markDirty();
  render();
}

function moveScene(delta: -1 | 1): void {
  const target = currentIndex + delta;
  if (target < 0 || target >= data.scenes.length) return;
  const [scene] = data.scenes.splice(currentIndex, 1);
  data.scenes.splice(target, 0, scene);
  currentIndex = target;
  markDirty();
  render();
}

function renderGameSelector(): void {
  els.gameSelect.innerHTML = "";
  for (const g of games) {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.title;
    if (g.id === currentGameId) opt.selected = true;
    els.gameSelect.appendChild(opt);
  }
  els.deleteGameBtn.disabled = games.length <= 1;
  els.runGameLink.href = `/index.html?game=${encodeURIComponent(currentGameId)}`;
}

function render(): void {
  els.gameTitle.textContent = data.title || "(제목 없음)";
  els.titleInput.value = data.title;
  els.sceneCounter.textContent = `${currentIndex + 1} / ${data.scenes.length}`;
  els.prevSceneBtn.disabled = currentIndex === 0;
  els.nextSceneBtn.disabled = currentIndex >= data.scenes.length - 1;
  els.moveUpBtn.disabled = currentIndex === 0;
  els.moveDownBtn.disabled = currentIndex >= data.scenes.length - 1;
  els.deleteSceneBtn.disabled = data.scenes.length <= 1;

  const scene = currentScene();
  els.sceneIdInput.value = scene.id;
  els.terminalInput.checked = scene.terminal;
  els.openingLineInput.value = scene.openingLine;
  els.descriptionInput.value = scene.description;
  els.advanceConditionInput.value = scene.advanceCondition;

  renderImage();
  renderOtherResponses();
}

function renderImage(): void {
  const scene = currentScene();
  if (scene.image) {
    els.sceneImagePreview.src = scene.image;
    els.imagePathHint.textContent = scene.image;
    imageBox.classList.add("has-image");
  } else {
    els.sceneImagePreview.removeAttribute("src");
    els.imagePathHint.textContent = "아직 이미지가 없습니다.";
    imageBox.classList.remove("has-image");
  }
}

function renderOtherResponses(): void {
  const scene = currentScene();
  els.otherResponsesList.innerHTML = "";
  scene.otherResponses.forEach((resp, idx) => {
    const item = document.createElement("div");
    item.className = "otherResponseItem";
    item.innerHTML = `
      <div class="row">
        <label class="field">
          <span class="fieldLabel">라벨</span>
          <input type="text" data-role="label" placeholder="예: 위치 모호" />
        </label>
        <button type="button" class="secondary small removeBtn">삭제</button>
      </div>
      <label class="field">
        <span class="fieldLabel">조건 (이 응답이 나오는 경우와 NPC 반응)</span>
        <textarea rows="3" data-role="condition" placeholder="예: 방향만 말하고 구체적이지 않은 경우. → reply는 더 자세히 묻는 대사."></textarea>
      </label>
    `;
    const labelInput = item.querySelector<HTMLInputElement>('[data-role="label"]')!;
    const condInput = item.querySelector<HTMLTextAreaElement>('[data-role="condition"]')!;
    const removeBtn = item.querySelector<HTMLButtonElement>(".removeBtn")!;
    labelInput.value = resp.label;
    condInput.value = resp.condition;
    labelInput.addEventListener("input", () =>
      updateScene((s) => (s.otherResponses[idx].label = labelInput.value)),
    );
    condInput.addEventListener("input", () =>
      updateScene((s) => (s.otherResponses[idx].condition = condInput.value)),
    );
    removeBtn.addEventListener("click", () => {
      updateScene((s) => s.otherResponses.splice(idx, 1));
      renderOtherResponses();
    });
    els.otherResponsesList.appendChild(item);
  });
}

async function uploadImage(file: File): Promise<void> {
  try {
    setSaveStatus("이미지 업로드 중...", "");
    const base64 = await fileToBase64(file);
    const res = await fetch("/api/upload-image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        gameId: currentGameId,
        sceneId: currentScene().id || "scene",
        filename: file.name,
        contentType: file.type,
        base64,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
    updateScene((s) => (s.image = body.path));
    renderImage();
    setSaveStatus("이미지 업로드 완료 (저장 누르면 반영)", "success");
  } catch (err) {
    showError(err);
  }
}

async function save(): Promise<void> {
  try {
    validateBeforeSave();
    setSaveStatus("저장 중...", "");
    els.saveButton.disabled = true;
    const res = await fetch("/api/save-game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId: currentGameId, data }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
    dirty = false;
    setSaveStatus(`저장됨 (${body.scenes} 장면)`, "success");
    hideError();
  } catch (err) {
    showError(err);
    setSaveStatus("저장 실패", "error");
  } finally {
    els.saveButton.disabled = false;
  }
}

function validateBeforeSave(): void {
  if (!data.title.trim()) throw new Error("게임 제목이 비어있습니다.");
  const ids = new Set<string>();
  for (const scene of data.scenes) {
    if (!scene.id.trim()) throw new Error("모든 장면에 ID가 필요합니다.");
    if (ids.has(scene.id)) throw new Error(`중복된 장면 ID: ${scene.id}`);
    ids.add(scene.id);
    if (!scene.image) throw new Error(`'${scene.id}' 장면에 이미지가 없습니다.`);
    if (!scene.openingLine.trim()) {
      throw new Error(`'${scene.id}' 장면에 NPC 첫 대사가 비어있습니다.`);
    }
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolveB64, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolveB64(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

async function fetchGames(): Promise<GameRef[]> {
  const res = await fetch("/api/games");
  if (!res.ok) throw new Error(`/api/games HTTP ${res.status}`);
  const body = (await res.json()) as { games?: GameRef[] };
  return body.games ?? [];
}

async function loadGame(gameId: string): Promise<GameData> {
  const res = await fetch(`/api/load-game?gameId=${encodeURIComponent(gameId)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `load-game HTTP ${res.status}`);
  }
  const body = (await res.json()) as Partial<GameData>;
  return {
    title: body.title || "",
    scenes: (body.scenes || []).map(normalizeScene),
  };
}

function normalizeScene(raw: Partial<Scene>): Scene {
  return {
    id: raw.id || "",
    image: raw.image || "",
    openingLine: raw.openingLine || "",
    description: raw.description || "",
    advanceCondition: raw.advanceCondition || "",
    otherResponses: Array.isArray(raw.otherResponses)
      ? raw.otherResponses.map((r) => ({
          label: r?.label || "",
          condition: r?.condition || "",
        }))
      : [],
    terminal: !!raw.terminal,
  };
}

function blankScene(): Scene {
  const id = `scene${Date.now().toString(36)}`;
  return {
    id,
    image: "",
    openingLine: "",
    description: "",
    advanceCondition: "",
    otherResponses: [],
    terminal: false,
  };
}

function showError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  els.errorBanner.textContent = msg;
  els.errorBanner.hidden = false;
}

function hideError(): void {
  els.errorBanner.hidden = true;
}

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: ${id}`);
  return node as T;
}
