// Dev-only Vite plugin powering the multi-game editor GUI.
//   GET  /api/games                            → [{ id, title }]
//   GET  /api/load-game?gameId=<id>            → game-data.json
//   POST /api/save-game     { gameId, data }   → writes JSON, runs generator
//   POST /api/upload-image  { gameId, sceneId, filename, base64, contentType }
//                                              → writes to public/games/<id>/scenes/, returns { path }
//   POST /api/create-game   { id, title }      → creates folder + blank scene
//   POST /api/delete-game   { gameId }         → removes src+public folders
//
// Plain-JSON bodies (no multipart) keep the plugin tiny and dependency-free.
// Disabled in production builds — the editor is a dev-time tool.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import {
  gamePaths,
  listGames,
  generateGame,
  saveGameData,
  createGame,
  deleteGame,
} from "./generate-game.mjs";

const MAX_BODY_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export function gameEditorPlugin() {
  return {
    name: "lexie-game-editor",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/games", async (req, res) => {
        if (req.method !== "GET") return send(res, 405, { error: "GET only" });
        try {
          send(res, 200, { games: await listGames() });
        } catch (err) {
          send(res, 500, { error: err.message });
        }
      });

      server.middlewares.use("/api/load-game", async (req, res) => {
        if (req.method !== "GET") return send(res, 405, { error: "GET only" });
        try {
          const url = new URL(req.url || "", "http://localhost");
          const gameId = url.searchParams.get("gameId");
          if (!gameId) throw new Error("missing `gameId`");
          const p = gamePaths(gameId);
          const raw = await readFile(p.dataPath, "utf8");
          send(res, 200, JSON.parse(raw));
        } catch (err) {
          send(res, 400, { error: err.message });
        }
      });

      server.middlewares.use("/api/save-game", async (req, res) => {
        if (req.method !== "POST") return send(res, 405, { error: "POST only" });
        try {
          const body = await readJson(req);
          if (!body?.gameId) throw new Error("missing `gameId`");
          if (!body?.data) throw new Error("missing `data`");
          const result = await saveGameData(body.gameId, body.data);
          send(res, 200, { ok: true, scenes: result.sceneCount });
        } catch (err) {
          send(res, 400, { error: err.message });
        }
      });

      server.middlewares.use("/api/upload-image", async (req, res) => {
        if (req.method !== "POST") return send(res, 405, { error: "POST only" });
        try {
          const body = await readJson(req);
          const path = await handleUpload(body);
          send(res, 200, { path });
        } catch (err) {
          send(res, 400, { error: err.message });
        }
      });

      server.middlewares.use("/api/create-game", async (req, res) => {
        if (req.method !== "POST") return send(res, 405, { error: "POST only" });
        try {
          const body = await readJson(req);
          if (!body?.id) throw new Error("missing `id`");
          const result = await createGame({ id: body.id, title: body.title });
          send(res, 200, result);
        } catch (err) {
          send(res, 400, { error: err.message });
        }
      });

      server.middlewares.use("/api/delete-game", async (req, res) => {
        if (req.method !== "POST") return send(res, 405, { error: "POST only" });
        try {
          const body = await readJson(req);
          if (!body?.gameId) throw new Error("missing `gameId`");
          const games = await listGames();
          if (games.length <= 1) throw new Error("cannot delete the last game");
          await deleteGame(body.gameId);
          send(res, 200, { ok: true });
        } catch (err) {
          send(res, 400, { error: err.message });
        }
      });
    },
  };
}

async function handleUpload({ gameId, sceneId, filename, base64, contentType }) {
  if (!gameId) throw new Error("missing `gameId`");
  if (!base64) throw new Error("missing `base64`");

  const p = gamePaths(gameId);
  const ext = pickExtension(filename, contentType);
  const safeId = sanitizeId(sceneId || "scene");
  const stamp = Date.now().toString(36);
  const outName = `${safeId}_${stamp}${ext}`;
  const outPath = resolve(p.scenesDir, outName);

  if (!outPath.startsWith(p.scenesDir + "/") && outPath !== p.scenesDir) {
    throw new Error("invalid output path");
  }

  await mkdir(p.scenesDir, { recursive: true });
  const buf = Buffer.from(base64, "base64");
  if (buf.length === 0) throw new Error("empty file");
  if (buf.length > MAX_BODY_BYTES) throw new Error("file too large");
  await writeFile(outPath, buf);

  return `${p.sceneUrlPrefix}/${outName}`;
}

function pickExtension(filename, contentType) {
  if (filename) {
    const ext = extname(filename).toLowerCase();
    if (ALLOWED_EXT.has(ext)) return ext;
  }
  switch (contentType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      throw new Error(`unsupported image type: ${contentType ?? "unknown"}`);
  }
}

function sanitizeId(raw) {
  const cleaned = String(raw).replace(/[^a-zA-Z0-9_-]/g, "_");
  return cleaned.slice(0, 40) || "scene";
}

function readJson(req) {
  return new Promise((resolveBody, rejectBody) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        rejectBody(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolveBody(text ? JSON.parse(text) : {});
      } catch {
        rejectBody(new Error("invalid JSON body"));
      }
    });
    req.on("error", rejectBody);
  });
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
