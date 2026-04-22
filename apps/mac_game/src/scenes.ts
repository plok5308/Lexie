export interface Scene {
  id: string;
  imagePath: string;
  /** Shown in the bubble and spoken via TTS when the scene opens. */
  openingLine: string;
  /** Natural-language description of the scene + what makes the user's answer "correct". */
  sceneContext: string;
  /** Scene to enter when the judge returns advance=true. Undefined means terminal. */
  nextSceneId?: string;
  /** Terminal scenes never advance; the judge still speaks, but scene does not change. */
  terminal?: boolean;
}

export const scenes: Record<string, Scene> = {
  lostHat: {
    id: "lostHat",
    imagePath: "/scenes/scene1.png",
    openingLine: "어? 내 모자가 어디갔지? 아까 쓰고 있었는데...",
    sceneContext: `아이가 자기 방에서 모자를 잃어버린 상황입니다. 실제로 모자는 방의 '왼쪽 바닥', 책상 옆 작은 의자 근처에 떨어져 있습니다. 방 안에는 장난감·책·옷이 어지럽게 흩어져 있습니다.

사용자 발화를 다음 세 갈래로 판정하세요:

1. 정답 (advance=true): 모자의 위치를 구체적으로 짚은 경우.
   - "책상 밑에 있어" / "책상 아래" 계열
   - "왼쪽 바닥에 있잖아" / "왼쪽 바닥" / "방 왼쪽 아래" 계열
   - "의자 옆에 있어" 도 정답으로 인정
   → reply는 모자를 발견하고 기뻐하는 아이 대사.

2. 위치가 애매함 (advance=false): 방향만 말하고 구체적이지 않은 경우.
   - "왼쪽에 있어" (어디 왼쪽인지 불명확)
   - "저쪽", "거기", "이쪽" 같은 지시어만
   - "근처에 있어" 같은 모호한 표현
   → reply는 반드시 "좀 더 자세히 말해줘"와 같은 뜻의, 더 자세한 위치를 묻는 아이 대사 (예: "좀 더 자세히 말해줘!", "왼쪽 어디?" 등).

3. 정답 아님 (advance=false): 그 외.
   - "몰라", "가방 안", "침대 위" 등 엉뚱한 위치
   - 관련 없는 잡담
   → reply는 여전히 모자를 못 찾아 슬퍼하는 아이 대사.`,
    nextSceneId: "foundHat",
  },
  foundHat: {
    id: "foundHat",
    imagePath: "/scenes/scene2.png",
    openingLine: "우와! 진짜 책상 밑에 있었네! 고마워, 모자 찾았어!",
    sceneContext:
      "아이가 모자를 찾고 머리에 쓴 채 활짝 웃고 있습니다. 게임의 마지막 장면입니다. 사용자가 뭐라고 말하든 장면은 끝난 상태로 유지되며, 아이는 친근하게 짧게 답만 합니다.",
    terminal: true,
  },
};

export const INITIAL_SCENE_ID = "lostHat";
