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

## Local STT + LLM Test App

This directory contains a minimal browser-based Mac test app that exercises the STT and LLM modules together. TTS is not wired in yet.

Current scope:

- microphone input
- start / stop recording
- show transcript
- send final transcript to the LLM and show the reply

The app uses `packages/stt` (browser speech recognition adapter) and `packages/llm` (OpenAI provider) through their public module APIs.

Run locally:

```bash
cd apps/mac
npm install
# one-time: set up the OpenAI key
cp .env.example .env
# then edit .env and fill VITE_OPENAI_API_KEY
npm run dev
```

### Env

- `VITE_OPENAI_API_KEY` — required for real LLM replies. Without it, the app falls back to `MockLlmProvider`.
- `VITE_OPENAI_MODEL` — optional, defaults to `gpt-4o-mini`.

> The key is shipped to the browser — local dev only, never deploy.
