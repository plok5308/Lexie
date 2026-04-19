# STT Contract

## Input

Supported forms:

- microphone stream
- audio file
- audio chunks

## Output

Standard response:

- text
- is_final
- confidence (optional)
- language (optional)
- timestamps (optional)

## Errors

- no microphon permission
- invalid audio
- timeout
- provider unavailable

## Rule

Provider-specific logic must stay inside the STT module.