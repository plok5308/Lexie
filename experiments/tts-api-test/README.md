# TTS API Test (ElevenLabs, Python)

Standalone sanity check for the ElevenLabs API before wiring the TTS package in. Not connected to any Lexie module — just confirms the key works and audio is returned.

## Setup

```bash
cd experiments/tts-api-test
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env and set ELEVENLABS_API_KEY
```

## Run

```bash
python test.py
```

Runs a one-shot English synthesis, then a streaming Korean synthesis. Outputs two MP3 files in the current directory.

Play on macOS:

```bash
afplay output-oneshot.mp3
afplay output-stream.mp3
```

## Env

- `ELEVENLABS_API_KEY` — required
- `ELEVENLABS_VOICE_ID` — optional. If blank, the script picks the first voice in your library. Library-only voices (e.g., Rachel `21m00Tcm4TlvDq8ikWAM`) require a paid plan.
- `ELEVENLABS_MODEL_ID` — optional, defaults to `eleven_flash_v2_5` (fast, multilingual)
