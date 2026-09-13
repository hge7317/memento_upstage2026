/**
 * mock-api.js
 * Solar 연동 전 프론트 개발용 목업 응답 예시.
 * 실제 구현 시 백엔드 인터페이스(INTERFACE.md)에 맞춰 교체한다.
 */

const NOW = new Date().toISOString();

export const mockSession = {
  sessionId: "session-demo",
  scenario: "interview",
  stage: "quick-memo",
  createdAt: NOW,
};

export const mockCandidates = [
  {
    id: "c1",
    claim: "세 명이 있었다",
    category: "fact",
    sourceQuote: "세 명이 있었음",
    confidence: "medium",
  },
  {
    id: "c2",
    claim: "자기소개 다음에 프로젝트 질문이 나왔다",
    category: "fact",
    sourceQuote: "자기소개 다음에 프로젝트 질문",
    confidence: "medium",
  },
  {
    id: "c3",
    claim: "마지막에 입사 가능일 질문이 있었다",
    category: "fact",
    sourceQuote: "마지막에 입사 가능일 질문",
    confidence: "medium",
  },
  {
    id: "c4",
    claim: "아마 분위기가 조금 긴장돼 보였다",
    category: "uncertain",
    sourceQuote: "아마 분위기가 조금 긴장돼 보였다",
    confidence: "unknown",
  },
  {
    id: "c5",
    claim: "면접관이 내 답을 싫어한 것 같다",
    category: "evaluation",
    sourceQuote: "면접관이 내 답을 싫어한 것 같다",
    confidence: "unknown",
  },
];

export const mockRecallQuestion = {
  question: "면접이 시작되고 가장 먼저 기억나는 장면은 무엇인가요?",
  injectionCheck: { passed: true },
};

export const mockMarkdown = `# Memory Replay - 면접 복기

> 이 문서는 사용자의 기억을 구조화한 기록입니다. 녹취나 객관적 사실 확인 결과가 아니며, AI가 정확성을 보증하지 않습니다.

## 기본 정보
- 상황: 면접 복기
- 생성 시각: ${NOW}

## 검증된 핵심 기억
- 세 명이 있었다
- 자기소개 다음에 프로젝트 질문이 나왔다
- 마지막에 입사 가능일 질문이 있었다

## 평가·추측(분리)
- 아마 분위기가 조금 긴장돼 보였다
- 면접관이 내 답을 싫어한 것 같다

## 다음 단계
- 타임라인 검토 후 추가 회상 진행
- 필요하면 재연습 일정 제안
`;
