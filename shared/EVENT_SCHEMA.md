# Event Schema

## Purpose

Shared events across STT, LLM, and TTS.

## Core Events

### Input Events

- speech_started
- speech_stopped
- transcript_partial
- transcript_final

### LLM Events

- llm_request_started
- llm_request_completed
- llm_response_streaming
- llm_error

### TTS Events

- tts_started
- tts_streaming
- tts_complted
- tts_error

### Session Events

- session_started
- session_ended
- user_interrupted

## Rule

All modules should use consistent event names.