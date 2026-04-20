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

## Local STT Test App

This directory contains a minimal browser-based Mac test app for the STT module.

Current scope:

- microphone input
- start recording
- stop recording
- show transcript text

The app uses `packages/stt` through its public module API. It uses the browser speech recognition STT adapter for quick local testing. It does not implement LLM or TTS.

Run locally:

```bash
cd apps/mac
npm install
npm run dev
```
