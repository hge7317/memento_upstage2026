export const STEPS = [
  {
    id: "context-reinstatement",
    tag: "STEP 1 · 사건 직전 맥락",
    count: "회상 1 / 4",
    question: "면접이 시작되기 직전, 어떤 상황이었는지 떠오르는 대로 말해주세요.",
    placeholder: "기억나는 내용을 자유롭게 입력하세요",
    fallback: "면접이 시작되기 직전, 어떤 상황이었는지 떠오르는 대로 말해주세요.",
  },
  {
    id: "free-recall",
    tag: "STEP 2 · 자유 서술",
    count: "회상 2 / 4",
    question: "순서를 맞추려고 하지 말고, 지금 떠오르는 질문이나 장면을 자유롭게 말해주세요.",
    placeholder: "순서와 관계없이 떠오르는 내용을 적어주세요",
    fallback: "순서를 맞추려고 하지 말고, 지금 떠오르는 질문이나 장면을 자유롭게 말해주세요.",
  },
  {
    id: "structural-cue",
    tag: "STEP 3 · 시간·공간·감각·행동 단서",
    count: "회상 3 / 4",
    question: "그다음에 기억나는 장면이나 행동이 있나요?",
    placeholder: "단서를 따라 떠오르는 내용을 입력하세요",
    fallback: "그다음에 기억나는 장면이나 행동이 있나요?",
  },
  {
    id: "reverse-recall",
    tag: "STEP 4 · 마지막 순간부터 역순 회상",
    count: "회상 4 / 4",
    question: "면접이 끝나기 직전의 마지막 장면부터 거꾸로 떠올려볼게요. 가장 마지막에 누가 무엇을 했나요?",
    placeholder: "마지막에서 앞으로 거꾸로 떠올려보세요",
    fallback: "면접이 끝나기 직전의 마지막 장면부터 거꾸로 떠올려볼게요. 가장 마지막에 누가 무엇을 했나요?",
  },
];

export function confirmedItems(session) {
  if (!Array.isArray(session?.candidates)) return [];
  return session.candidates
    .filter((c) => c && (c.status === "CONFIRMED" || c.status === "EDITED" || c.status === "UNKNOWN"))
    .map((c) => (c.status === "EDITED" && c.editedClaim ? c.editedClaim : c.claim))
    .filter(Boolean);
}

export function rejectedItems(session) {
  if (!Array.isArray(session?.candidates)) return [];
  return session.candidates
    .filter((c) => c && c.status === "REJECTED" && c.claim)
    .map((c) => c.claim);
}

export function previousUserMessage(messages, stepId) {
  const stepMessages = messages[stepId] || [];
  const userMessages = stepMessages.filter((m) => m && m.role === "user");
  if (userMessages.length === 0) return "";
  return userMessages[userMessages.length - 1].text;
}
