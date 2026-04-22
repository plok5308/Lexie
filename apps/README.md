# Apps Directory

## Purpose

This directory contains all user-facing applications built on top of the LEXIE core system.

`packages/` continas engine modules.
`apps/` contains products that use those modules.

Examples:

- `packages/stt` = speech recognition engine
- `packages/llm` = reasoning / agent engine
- `packages/tts` = speech generation engine

`apps/` combines them into real applications.

## Structure

- `mac/` : macOS applications
- `mac_game/` : voice-game demo (STT + LLM judge + TTS)
- `mobile/` : iPhone / Android application
- `playground/` : testing and experimentation app

## Rules

- Applications should consume functionality from `packages/`
- Core business logic should not live inside `apps/`
- Apps should focus on UI, UX, and platform integration