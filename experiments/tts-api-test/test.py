import os
import sys

from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()

api_key = os.environ.get("ELEVENLABS_API_KEY")
if not api_key or api_key.startswith("your-key"):
    print("Missing ELEVENLABS_API_KEY. Copy .env.example to .env and set a real key.")
    sys.exit(1)

model_id = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_flash_v2_5")
output_format = "mp3_44100_128"

client = ElevenLabs(api_key=api_key)


def resolve_voice_id() -> tuple[str, str]:
    configured = os.environ.get("ELEVENLABS_VOICE_ID")
    if configured:
        return configured, "(from env)"

    # Free-tier accounts cannot use library voices (e.g., Rachel) over the API.
    # Pick whatever voice is actually in the user's library.
    result = client.voices.get_all()
    voices = getattr(result, "voices", None) or []
    if not voices:
        raise RuntimeError(
            "No voices in your ElevenLabs library. Add a voice at https://elevenlabs.io/voice-library."
        )

    first = voices[0]
    return first.voice_id, getattr(first, "name", None) or first.voice_id


def _cleanup(path: str) -> None:
    if os.path.exists(path):
        os.remove(path)


def one_shot(text: str, output_path: str, voice_id: str) -> None:
    print(f"\n[one-shot] voice={voice_id} model={model_id}")
    print(f"text: {text}")
    audio = client.text_to_speech.convert(
        voice_id=voice_id,
        model_id=model_id,
        text=text,
        output_format=output_format,
    )
    try:
        with open(output_path, "wb") as f:
            for chunk in audio:
                if chunk:
                    f.write(chunk)
    except Exception:
        _cleanup(output_path)
        raise

    size = os.path.getsize(output_path)
    if size == 0:
        _cleanup(output_path)
        raise RuntimeError("TTS returned empty audio.")
    print(f"saved: {output_path} ({size} bytes)")


def streaming(text: str, output_path: str, voice_id: str) -> None:
    print(f"\n[streaming] voice={voice_id} model={model_id}")
    print(f"text: {text}")
    stream = client.text_to_speech.stream(
        voice_id=voice_id,
        model_id=model_id,
        text=text,
        output_format=output_format,
    )
    chunks = 0
    total_bytes = 0
    try:
        with open(output_path, "wb") as f:
            for chunk in stream:
                if chunk:
                    f.write(chunk)
                    chunks += 1
                    total_bytes += len(chunk)
    except Exception:
        _cleanup(output_path)
        raise

    if total_bytes == 0:
        _cleanup(output_path)
        raise RuntimeError("TTS returned empty audio.")
    print(f"streamed {chunks} chunks, {total_bytes} bytes -> {output_path}")


def list_voices() -> None:
    result = client.voices.get_all()
    voices = getattr(result, "voices", None) or []
    if not voices:
        print("No voices available.")
        return
    print(f"\nAvailable voices ({len(voices)}):")
    for v in voices:
        name = getattr(v, "name", "?")
        category = getattr(v, "category", "?")
        print(f"  {v.voice_id}  {name}  [category={category}]")


if __name__ == "__main__":
    if "--list-voices" in sys.argv:
        list_voices()
        sys.exit(0)

    try:
        voice_id, voice_label = resolve_voice_id()
        print(f"Using voice: {voice_label} ({voice_id})")
        one_shot("Hello from LEXIE. This is a one-shot TTS test.", "output-oneshot.mp3", voice_id)
        streaming("안녕하세요, 저는 렉시입니다. 스트리밍 테스트 중이에요.", "output-stream.mp3", voice_id)
        print("\n[done] TTS reachable. Play with: afplay output-oneshot.mp3")
    except Exception as error:
        print(f"\n[failed] {error}")
        sys.exit(1)
