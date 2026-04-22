# Mac Game · 모자를 찾아라

Voice-game demo built on `packages/stt` (VAD + Whisper), `packages/llm`
(judge → JSON verdict), and `packages/tts` (ElevenLabs). Mirrors the
structure of `apps/mac`.

## Game rules

- A scene image shows an NPC's situation. The NPC opens with a line via TTS.
- The player responds by voice. VAD detects utterance boundaries automatically.
- An LLM judge decides whether the player's answer satisfies the scene's
  success condition. If yes, the scene advances and the NPC reacts. If no,
  the NPC just replies in character and the scene stays.

The bundled scenes:

1. `lostHat` — a child has lost their hat (it's under the desk). Answer with
   something like "모자는 책상 밑에 있어" to advance.
2. `foundHat` — terminal scene: the child has found the hat and is happy.

## Setup

```bash
cd apps/mac_game
npm install
# reuse the mac app's keys (OpenAI + ElevenLabs):
cp ../mac/.env .env
# (optional) generate the scene images with DALL·E 3 — costs ~$0.08
npm run gen:scenes
npm run dev
```

Dev server runs on `http://localhost:5174`.

## Env

- `VITE_OPENAI_API_KEY` — LLM judge + Whisper STT.
- `VITE_OPENAI_MODEL` — chat model (default `gpt-4o-mini`).
- `VITE_ELEVENLABS_API_KEY` / `VITE_ELEVENLABS_VOICE_ID` — NPC voice.
- `IMAGE_MODEL` — used only by `gen:scenes` (default `dall-e-3`).

> Keys are shipped to the browser — local dev only.

## Flow

```
Start ─→ VAD listens
        │
        ▼
   [onSpeechStart]  → state: hearing
   [onSpeechEnd]    → Whisper → state: thinking
        │
        ▼
   judge.evaluate(scene, userText)
        │
        ├─ advance=true  → speak reply → advance scene → speak new opening → listen
        └─ advance=false → speak reply → listen
```

VAD is paused during TTS playback and resumed afterwards.

## Adding scenes

Edit `src/scenes.ts`. Each scene declares `openingLine` (spoken on entry),
`sceneContext` (what the judge needs to know to decide "advance"), and
optional `nextSceneId` / `terminal`. Drop a matching PNG into
`public/scenes/` (or rerun `gen:scenes` with extended prompts).
