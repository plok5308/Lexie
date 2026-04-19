# TTS Contract

## Input

- text
- voice_id (optional)
- language (optional)
- speed (optional)
- style (optional)

## Output

- audio stream
- audio file
- duration metadata (optional)

## Errors

- empty text
- provider unavailable
- invalid voice id

## Rule

TTS provider details must stay inside the TTS module.