# LLM Architecture

## Goal

Support many future agents withtout redesigning the system.

## Internal Layers

1. Provider Layer
- OpenAI
- Anthropic
- local models
- future providers

2. Prompt Layer
- system prompts
- persona prompts
- task prompts

3. Agent Layer
Examples:
- base agent
- companion agent
- coach agent
- planner agent

4. Memory Layer (future)
- short-term memory
- long-term memory

5. Tool Layer (future)
- search
- notes
- calendar
- custom tools

## Rule

Provider logic must remain separate from agent behavior.