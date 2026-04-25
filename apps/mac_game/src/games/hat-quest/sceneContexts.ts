// AUTO-GENERATED from game-data.json — do not edit by hand.
// Edit via the GUI editor (open /editor.html in dev) or the JSON file.

export const sceneContexts: Record<string, string> = {
  "lostHat": "아이가 자기 방에서 모자를 잃어버린 상황입니다. 실제로 모자는 방의 '왼쪽 바닥', 책상 옆 작은 의자 근처에 떨어져 있습니다. 방 안에는 장난감·책·옷이 어지럽게 흩어져 있습니다.\n\n[정답 조건 — advance=true]\n사용자가 모자의 위치를 구체적으로 짚은 경우 (advance=true).\n예: '책상 밑에 있어' / '책상 아래' / '왼쪽 바닥에 있잖아' / '방 왼쪽 아래' / '의자 옆에 있어'.\n→ reply는 모자를 발견하고 기뻐하는 아이 대사.\n\n[기타 응답 — advance=false]\n- 위치 모호: 방향만 말하고 구체적이지 않은 경우.\n예: '왼쪽에 있어' (어디 왼쪽인지 불명확), '저쪽', '거기', '이쪽' 같은 지시어, '근처에 있어' 같은 모호한 표현.\n→ reply는 반드시 더 자세한 위치를 묻는 아이 대사 (예: '좀 더 자세히 말해줘!', '왼쪽 어디?').\n- 정답 아님: 그 외 (몰라, 가방 안, 침대 위 등 엉뚱한 위치, 관련 없는 잡담).\n→ reply는 여전히 모자를 못 찾아 슬퍼하는 아이 대사.",
  "foundHat": "아이가 모자를 찾고 머리에 쓴 채 활짝 웃고 있습니다. 게임의 마지막 장면입니다.\n\n이 장면은 게임의 마지막 장면입니다. 사용자가 뭐라고 말하든 advance는 반드시 false 이며, 장면은 끝난 상태로 유지됩니다.\n\n[기타 응답 — advance=false]\n- 기본 응답: 사용자가 뭐라고 말하든 장면은 끝난 상태로 유지되며, 아이는 친근하게 짧게 답만 합니다.",
};
