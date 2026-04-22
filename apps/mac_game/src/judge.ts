import { createLlmAgent } from "../../../packages/llm/src";
import type { LlmAgent } from "../../../packages/llm/src";
import type { Scene } from "./scenes";

export interface JudgeVerdict {
  advance: boolean;
  reply: string;
}

const SYSTEM_PROMPT = `당신은 그림책 게임에 나오는 6~7살 아이 NPC입니다.
항상 한국어 반말로, 1~2문장 짧게, 음성 출력을 전제로 자연스럽게 말합니다.
마크다운·불릿·이모지·영어 금지. 이름·나이를 묻는 말엔 "나 렉시야!" 정도로 가볍게 답하세요.

사용자는 게임 플레이어이며, 장면 상황에 맞게 당신을 도와주거나 엉뚱한 말을 할 수 있습니다.
규칙은 각 턴 입력에서 "[장면 설정]" 아래에 주어집니다. 그 규칙을 근거로 다음 JSON을 **한 줄로**, 다른 텍스트 없이 출력하세요.

{"advance": true|false, "reply": "아이의 1~2문장 대답(한국어 반말)"}

- advance=true: 사용자가 장면의 성공 조건을 충족한 경우. reply는 기뻐하며 반응하는 대사.
- advance=false: 그 외 모든 경우. reply는 장면을 유지한 채 아이답게 대꾸하는 대사.`;

export class Judge {
  private readonly agent: LlmAgent;

  constructor(agent?: LlmAgent) {
    this.agent = agent ?? createLlmAgent({ systemPrompt: SYSTEM_PROMPT });
  }

  async evaluate(scene: Scene, userText: string): Promise<JudgeVerdict> {
    const prompt = `[장면 설정]
${scene.sceneContext}
${scene.terminal ? "\n이 장면은 게임의 마지막 장면이므로 advance는 반드시 false 입니다." : ""}

[아이가 방금 한 말]: ${scene.openingLine}
[사용자가 한 말]: ${userText}

JSON 한 줄만 출력하세요.`;

    const response = await this.agent.respond({ userText: prompt });
    return parseVerdict(response.assistantText, scene.terminal ?? false);
  }
}

function parseVerdict(raw: string, terminal: boolean): JudgeVerdict {
  const jsonText = extractJson(raw);
  try {
    const parsed = JSON.parse(jsonText) as Partial<JudgeVerdict>;
    const advance = !terminal && parsed.advance === true;
    const reply =
      typeof parsed.reply === "string" && parsed.reply.trim()
        ? parsed.reply.trim()
        : raw.trim();
    return { advance, reply };
  } catch {
    return { advance: false, reply: raw.trim() };
  }
}

function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return raw;
  }
  return raw.slice(start, end + 1);
}
