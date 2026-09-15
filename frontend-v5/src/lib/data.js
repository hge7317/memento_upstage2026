export const MOCK_SESSIONS = [
  {
    id: "session-1",
    company: "Memento Labs",
    role: "Product Designer",
    date: "2026.09.15",
    type: "대면",
    round: "1차 면접",
    createdAt: "2026-09-15T14:00:00.000Z",
    stage: "timeline-review",
    quickMemo: "면접 직후의 인상만 짧게 남김",
    answers: {
      "free-recall": "자기소개 다음에 최근 프로젝트를 설명했고, 보드에 코드가 있었어요.",
      "structural-cue": "면접관 두 명의 맞은편에 앉았고, 가운데 보드를 보며 답했던 것 같아요.",
      "reverse-recall": "면접관이 추가로 궁금한 점이 있는지 물었고, 제가 질문 하나를 했어요.",
      "timeline-after": "건물에 도착해서 엘리베이터를 타고 올라갔고, 대기실에서 잠시 기다렸어요.",
    },
  },
  {
    id: "session-2",
    company: "Nori Studio",
    role: "UX Researcher",
    date: "2026.08.31",
    type: "화상",
    round: "2차 면접",
    createdAt: "2026-08-31T15:30:00.000Z",
    stage: "result-doc",
  },
  {
    id: "session-3",
    company: "Pado Works",
    role: "Service Planner",
    date: "2026.08.12",
    type: "대면",
    round: "1차 면접",
    createdAt: "2026-08-12T11:00:00.000Z",
    stage: "result-doc",
  },
];

export const MOCK_CANDIDATES = [
  { id: "c1", claim: "세 명이 있었다", category: "fact", sourceQuote: "세 명이 있었음", confidence: "medium" },
  { id: "c2", claim: "자기소개 다음에 프로젝트 질문이 나왔다", category: "fact", sourceQuote: "자기소개 다음에 프로젝트 질문", confidence: "medium" },
  { id: "c3", claim: "마지막에 입사 가능일 질문이 있었다", category: "fact", sourceQuote: "마지막에 입사 가능일 질문", confidence: "medium" },
  { id: "c4", claim: "아마 분위기가 조금 긴장돼 보였다", category: "uncertain", sourceQuote: "아마 분위기가 조금 긴장돼 보였다", confidence: "unknown" },
  { id: "c5", claim: "면접관이 내 답을 싫어한 것 같다", category: "evaluation", sourceQuote: "면접관이 내 답을 싫어한 것 같다", confidence: "unknown" },
];

export const CATEGORY_LABELS = {
  fact: "FACT",
  uncertain: "UNCERTAIN",
  evaluation: "EVALUATION",
};

export const CATEGORY_COLORS = {
  fact: { bg: "#ddf1ec", text: "#0f766e" },
  uncertain: { bg: "#fff4d9", text: "#b7791f" },
  evaluation: { bg: "#e8edff", text: "#5164b0" },
};
