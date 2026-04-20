# LLM API Test (OpenAI, Python)

Standalone sanity check for the OpenAI API before wiring the LLM package in. Not connected to any Lexie module — just confirms the key works and responses stream correctly.

## Setup

```bash
cd experiments/llm-api-test
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env and set OPENAI_API_KEY
```

## Run

```bash
python test.py
```

Runs one non-streaming chat request, then one streaming chat request. If both print responses, the API path is healthy.

## Env

- `OPENAI_API_KEY` — required
- `OPENAI_MODEL` — optional, defaults to `gpt-4o-mini`
