// Converts src/games/<gameId>/game-data.json into the engine's runtime artifacts:
//   - src/games/<gameId>/story.ink         (knots + advance choices, in scene order)
//   - src/games/<gameId>/sceneContexts.ts  (id -> combined judge prompt)
//
// Used by the CLI (`npm run gen:game [gameId]`) and by the dev-server editor
// plugin after the user saves changes in the GUI.

import { readFile, writeFile, readdir, mkdir, rm, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "..");

export const paths = {
  appRoot: APP_ROOT,
  gamesRoot: resolve(APP_ROOT, "src", "games"),
  publicGamesRoot: resolve(APP_ROOT, "public", "games"),
};

export function gamePaths(gameId) {
  const safe = assertSafeId(gameId);
  return {
    id: safe,
    srcDir: resolve(paths.gamesRoot, safe),
    dataPath: resolve(paths.gamesRoot, safe, "game-data.json"),
    inkPath: resolve(paths.gamesRoot, safe, "story.ink"),
    ctxPath: resolve(paths.gamesRoot, safe, "sceneContexts.ts"),
    publicDir: resolve(paths.publicGamesRoot, safe),
    scenesDir: resolve(paths.publicGamesRoot, safe, "scenes"),
    sceneUrlPrefix: `/games/${safe}/scenes`,
  };
}

export async function listGames() {
  const entries = await readdir(paths.gamesRoot, { withFileTypes: true }).catch(() => []);
  const games = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dataPath = resolve(paths.gamesRoot, entry.name, "game-data.json");
    try {
      const raw = await readFile(dataPath, "utf8");
      const data = JSON.parse(raw);
      games.push({ id: entry.name, title: data.title || entry.name });
    } catch {
      // skip unreadable game folders
    }
  }
  games.sort((a, b) => a.id.localeCompare(b.id));
  return games;
}

export async function generateGame(gameId) {
  const p = gamePaths(gameId);
  const raw = await readFile(p.dataPath, "utf8");
  const data = JSON.parse(raw);
  validate(data, p.id);

  await writeFile(p.inkPath, renderInk(data), "utf8");
  await writeFile(p.ctxPath, renderSceneContexts(data), "utf8");

  return { gameId: p.id, sceneCount: data.scenes.length, inkPath: p.inkPath, ctxPath: p.ctxPath };
}

export async function createGame({ id, title }) {
  const p = gamePaths(id);
  const exists = await stat(p.srcDir).then(() => true).catch(() => false);
  if (exists) throw new Error(`Game already exists: ${p.id}`);

  await mkdir(p.srcDir, { recursive: true });
  await mkdir(p.scenesDir, { recursive: true });

  const data = {
    title: title?.trim() || p.id,
    scenes: [
      {
        id: "scene1",
        image: "",
        openingLine: "",
        description: "",
        advanceCondition: "",
        otherResponses: [],
        terminal: false,
      },
    ],
  };
  await writeFile(p.dataPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  await generateGame(p.id);
  return { id: p.id, title: data.title };
}

export async function deleteGame(gameId) {
  const p = gamePaths(gameId);
  await rm(p.srcDir, { recursive: true, force: true });
  await rm(p.publicDir, { recursive: true, force: true });
  return { id: p.id };
}

export async function saveGameData(gameId, data) {
  const p = gamePaths(gameId);
  validate(data, p.id);
  await mkdir(p.srcDir, { recursive: true });
  await writeFile(p.dataPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return generateGame(p.id);
}

function assertSafeId(raw) {
  const id = String(raw || "").trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,40}$/i.test(id)) {
    throw new Error(`Invalid gameId: "${raw}". Use letters, digits, _ or -.`);
  }
  return id;
}

function validate(data, gameId) {
  if (!data || !Array.isArray(data.scenes) || data.scenes.length === 0) {
    throw new Error(`game "${gameId}": \`scenes\` must be a non-empty array`);
  }
  const ids = new Set();
  for (const s of data.scenes) {
    if (!s.id) throw new Error(`game "${gameId}": scene missing \`id\``);
    if (ids.has(s.id)) throw new Error(`game "${gameId}": duplicate scene id ${s.id}`);
    ids.add(s.id);
  }
}

function renderInk(data) {
  const scenes = data.scenes;
  const lines = [
    "// AUTO-GENERATED from game-data.json — do not edit by hand.",
    "// Edit via the GUI editor (open /editor.html in dev) or the JSON file.",
    "",
    `-> ${scenes[0].id}`,
    "",
  ];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const next = scenes[i + 1];
    lines.push(`=== ${scene.id} ===`);
    lines.push(`# id: ${scene.id}`);
    lines.push(`# image: ${scene.image}`);
    lines.push(`# context: ${scene.id}`);
    if (scene.terminal) lines.push("# terminal");
    lines.push(escapeInkText(scene.openingLine || ""));
    if (scene.terminal || !next) {
      lines.push("-> END");
    } else {
      lines.push(`+ [advance] -> ${next.id}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function escapeInkText(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s+/, ""))
    .join(" ")
    .trim();
}

function renderSceneContexts(data) {
  const lines = [
    "// AUTO-GENERATED from game-data.json — do not edit by hand.",
    "// Edit via the GUI editor (open /editor.html in dev) or the JSON file.",
    "",
    "export const sceneContexts: Record<string, string> = {",
  ];

  for (const scene of data.scenes) {
    lines.push(`  ${JSON.stringify(scene.id)}: ${JSON.stringify(buildContext(scene))},`);
  }

  lines.push("};", "");
  return lines.join("\n");
}

function buildContext(scene) {
  const parts = [scene.description?.trim() || ""];

  if (scene.terminal) {
    parts.push(
      "이 장면은 게임의 마지막 장면입니다. 사용자가 뭐라고 말하든 advance는 반드시 false 이며, 장면은 끝난 상태로 유지됩니다.",
    );
  } else if (scene.advanceCondition?.trim()) {
    parts.push("[정답 조건 — advance=true]\n" + scene.advanceCondition.trim());
  }

  if (Array.isArray(scene.otherResponses) && scene.otherResponses.length > 0) {
    const items = scene.otherResponses
      .filter((r) => r && (r.label?.trim() || r.condition?.trim()))
      .map((r) => `- ${r.label?.trim() || "기타"}: ${r.condition?.trim() || ""}`)
      .join("\n");
    if (items) parts.push("[기타 응답 — advance=false]\n" + items);
  }

  return parts.filter(Boolean).join("\n\n");
}

// CLI: `node scripts/generate-game.mjs [gameId | --all]`
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  const run = async () => {
    if (!arg || arg === "--all") {
      const games = await listGames();
      if (games.length === 0) {
        console.warn("[generate-game] no games found in src/games/");
        return;
      }
      for (const g of games) {
        const r = await generateGame(g.id);
        console.log(`[generate-game] ${g.id}: ${r.sceneCount} scenes`);
      }
    } else {
      const r = await generateGame(arg);
      console.log(`[generate-game] ${r.gameId}: ${r.sceneCount} scenes`);
    }
  };
  run().catch((err) => {
    console.error("[generate-game] failed:", err.message);
    process.exit(1);
  });
}
