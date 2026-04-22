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
STT, LLM, and TTS modules end to end: microphone → VAD → transcript → LLM reply
→ spoken audio.

Current scope:

- always-on microphone with local VAD (Silero via `@ricky0123/vad-web`)
- speech start/end detection — no button press per turn
- each segment transcribed with OpenAI Whisper
- multi-turn conversation (bank teller persona) with "새 대화" reset
- reply synthesized with ElevenLabs and played back; listening pauses while TTS plays

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

- `VITE_OPENAI_API_KEY` — required for both LLM (chat) and STT (Whisper). Without it, LLM falls back to `MockLlmProvider` and VAD STT will error.
- `VITE_OPENAI_MODEL` — optional chat model, defaults to `gpt-4o-mini`.
- `VITE_OPENAI_STT_MODEL` — optional transcription model, defaults to `whisper-1`.
- `VITE_ELEVENLABS_API_KEY` — required for real voice output. Without it, the app falls back to `MockTtsProvider` (no audio).
- `VITE_ELEVENLABS_VOICE_ID` — required. Paste a voice id from your ElevenLabs library. We don't call `voices.get_all`, so the key does not need the `voices_read` permission.
- `VITE_ELEVENLABS_MODEL_ID` — optional, defaults to `eleven_flash_v2_5`.

> Keys are shipped to the browser — local dev only, never deploy.
