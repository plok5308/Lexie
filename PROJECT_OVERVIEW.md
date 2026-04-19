# Project Overview

## Final Goal

Build a complete voice AI system with modular layers:

Speech Input
-> STT
-> LLM
-> TTS
-> Spoken Output

## Why Modular?

Each layer should evolve independently.

Examples:

- Change STT provider without touching LLM
- Upgrade TTS voices without changing STT
- Build many LLM agents without affecting audio layers

## Strategic Focus

The LLM package is the long-term intelligence core.

LEXIE should support many future agents such as:

- Companion AI
- Productivity assistant
- Coach
- Personal memory assistant
- Voice-first autonomous agent

## Design Philosophy

Small boundaries.
Clear contracts.
Fast iteration.
Long-term flexibility.