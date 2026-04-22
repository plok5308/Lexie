# TTS Package

## Purpose

Convert text into natural spoken audio.

## Responsibilities

- voice generation
- voice selection
- speed control
- tone/style control
- audio stream output

## Non Responsibilities

- reasoning
- transcription
- memory
- planning

## Replaceable Providers

Examples:

- ElevenLabs (implemented)
- OpenAI TTS
- local TTS

## Providers

### `ElevenLabsTtsProvider`

Streams MP3 audio from the ElevenLabs REST API. Use through the `createTtsProvider()`
factory so callers do not bind to a specific provider.

```ts
import { createTtsProvider } from "@lexie/tts";

const tts = createTtsProvider();
const audio = await tts.synthesize({ text: "Hello from LEXIE." });
// audio.kind === "audio_stream", audio.mimeType === "audio/mpeg"
```

### Env / options

The factory reads env first, then falls back to `MockTtsProvider` when either
the API key or voice id is missing.

- `ELEVENLABS_API_KEY` / `VITE_ELEVENLABS_API_KEY` — required
- `ELEVENLABS_VOICE_ID` / `VITE_ELEVENLABS_VOICE_ID` — required. We avoid calling
  `voices.get_all` to keep the key scoped (no `voices_read` permission needed).
- `ELEVENLABS_MODEL_ID` / `VITE_ELEVENLABS_MODEL_ID` — optional, defaults to `eleven_flash_v2_5`
- `ELEVENLABS_OUTPUT_FORMAT` / `VITE_ELEVENLABS_OUTPUT_FORMAT` — optional, defaults to `mp3_44100_128`
