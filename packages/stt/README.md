# STT Package

## Purpose

Convert spoken audio into text.

## Responsibilities

- microphone input processing
- streaming transcription
- file transcription
- final transcript output
- optional language detection

## Non Responsibilities

- reasoning
- memory
- response generation
- audio playback

## Replaceable Providers

- `BrowserSpeechSttAdapter` — Web Speech API (Chrome only; legacy, push-to-talk)
- `OpenAiWhisperSttAdapter` — OpenAI `/v1/audio/transcriptions` (one-shot blob)
- `MockSttAdapter` — tests

## Modules

### `createVadSttModule`

Always-on microphone with local VAD (Silero via `@ricky0123/vad-web`). Detects
speech start / end, hands each segment to an STT adapter (defaults to the
OpenAI Whisper adapter), and fires `onTranscript`.

```ts
const stt = createVadSttModule({
  language: "ko",
  onTranscript: ({ text }) => console.log(text),
});
await stt.start();    // requests mic, begins listening
stt.pause();          // e.g. while TTS is speaking
stt.resume();
stt.stop();           // tear down
```

Defaults load VAD assets (worklet + Silero ONNX + onnxruntime-web WASM) from
jsDelivr. Override with `baseAssetPath` / `onnxWASMBasePath` if you want to
ship them yourself.

### `createMicrophoneSttModule` (legacy)

Push-to-talk wrapper around the Web Speech API. Kept for quick fallbacks;
prefer `createVadSttModule` for anything conversational.
