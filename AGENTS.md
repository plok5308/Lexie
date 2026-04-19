# AGENTS.md

## Project Name
LEXIE

## Purpose
LEXIE is a modular voice AI system built from three independent layers:

- STT (Speech-to-Text)
- LLM (Reasoning / Agent Brain)
- TTS (Text-to-Speech)

## Core Principles

1. Keep STT, LLM, and TTS independent.
2. Any provider should be replaceable.
3. Prefer clean contracts over sshortcuts.
4. Update markdown docs before major architecture changes.
5. Keep the system simple, scalable, and testable.

## Working Rules

- Read relevant package README.md before modifying a module.
- Read CONTRACT.md before changing interfaces.
- Do not couple one module to another module's internals.
- Keep future Mac and mobile clients in mind.
- Prefer clear, maintainable architecture over fast hacks.

## Priority Order

1. Interface stability
2. Simplicity
3. Modularity
4. Speed of iteration
5. Future extensibility

## Source of Truth

- Global rules: /AGENTS.md
- System purpose: /PROJECT_OVERVIEW.md
- Milestones: /ROADMAP.md
- Package scope: each package README.md
- Interfaces: each CONTRACT.md
- LLM design: /packages/llm/ARCHITECTURE.md







