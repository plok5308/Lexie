# Mac App

## Purpose

Desktop application from macOS users.

## Expected Features

- microphone input
- real-time conversation
- transcript history
- spoken responses
- keyboard shortcuts
- optional menu bar mode

## Responsibilities

Uses:

- `packages/stt`
- `packages/llm`
- `packages/tts`

## Priority

Primary envrionment for early product validation.

## Local STT + LLM + TTS Test App

This directory contains a minimal browser-based Mac test app that exercises the
STT, LLM, and TTS modules end to end: microphone → transcript → LLM reply →
spoken audio.

Current scope:

- microphone input
- start / stop recording
- show transcript
- send final transcript to the LLM and show the reply
- synthesize the reply with ElevenLabs and play it back

The app uses `packages/stt` (browser speech recognition adapter), `packages/llm`
(OpenAI provider), and `packages/tts` (ElevenLabs provider) through their public
module APIs.

Run locally:

```bash
cd apps/mac
npm install
# one-time: set up API keys
cp .env.example .env
# then edit .env and fill the keys
npm run dev
```

### Env

- `VITE_OPENAI_API_KEY` — required for real LLM replies. Without it, the app falls back to `MockLlmProvider`.
- `VITE_OPENAI_MODEL` — optional, defaults to `gpt-4o-mini`.
- `VITE_ELEVENLABS_API_KEY` — required for real voice output. Without it, the app falls back to `MockTtsProvider` (no audio).
- `VITE_ELEVENLABS_VOICE_ID` — required. Paste a voice id from your ElevenLabs library. We don't call `voices.get_all`, so the key does not need the `voices_read` permission.
- `VITE_ELEVENLABS_MODEL_ID` — optional, defaults to `eleven_flash_v2_5`.

> Keys are shipped to the browser — local dev only, never deploy.
