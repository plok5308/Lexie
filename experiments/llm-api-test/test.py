import os
import sys

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

api_key = os.environ.get("OPENAI_API_KEY")
if not api_key or api_key.startswith("sk-your-key"):
    print("Missing OPENAI_API_KEY. Copy .env.example to .env and set a real key.")
    sys.exit(1)

model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
client = OpenAI(api_key=api_key)

system_prompt = "You are LEXIE, a concise voice-first assistant. Keep answers short."


def one_shot() -> None:
    print(f"\n[one-shot] model={model}")
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Say hello in one short sentence."},
        ],
    )
    print("response:", response.choices[0].message.content)
    print("usage:", response.usage)


def streaming() -> None:
    print(f"\n[streaming] model={model}")
    stream = client.chat.completions.create(
        model=model,
        stream=True,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Count from 1 to 5. One number per line."},
        ],
    )
    print("response: ", end="", flush=True)
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            print(delta, end="", flush=True)
    print()


if __name__ == "__main__":
    try:
        one_shot()
        streaming()
        print("\n[done] API reachable, responses received.")
    except Exception as error:
        print(f"\n[failed] {error}")
        sys.exit(1)
