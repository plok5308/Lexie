# LLM Contract

## Input

Possible inputs:

- user_text
- conversation_history
- memory_context (optional)
- metadata
- tool_results (optional)

## Output

Standard response:

- assistant_text
- structured_action (optional)
- tool_request (optional)
- style_tags (optional)

## Errors

- timeout
- malformed output
- provider unavailable

## Rule

LLM must not depend on STT or TTS internals.