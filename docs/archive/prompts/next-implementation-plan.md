# 다음 구현 계획 — Memory Replay (면접 회상 워크플로) v0.4 MVP

작성일: 2026-09-14
저장소: /Users/minseoklee/Documents/Hermes/upstage
브랜치: feat/splash-and-scenario (커밋 13a85f9, PR #26)

이 문서는 SOLAR-A/B/C까지 완료된 시점에서, 다음으로 구현할 작업 항목들을 정리한다.
각 항목은 별도 스테이지 프롬프트로 분리해 루프 방지 가디언과 함께 실행한다.

---

## 1. 현재 상태 요약

### 1.1 구현 완료된 것

**프론트 (App.jsx 라우팅 기준 11단계 중 10단계 구현):**
- Splash.jsx → QuickMemo.jsx → UserVerify.jsx → JobPostingOptional.jsx → InterviewInitialInfo.jsx → ContextReinstatement.jsx → FreeRecall.jsx → StructuralCue.jsx → ReverseRecall.jsx → TimelineReview.jsx
- extractCandidates.js (EXTRACT_CANDIDATES, T01/T02/T03 통과)
- useStage.js (v0.4 STAGE_ORDER 정합 완료)
- sessionStore.js, objectiveFieldSchema.js, verifyLogic.js

**백엔드:**
- INTERFACE.md (API 계약 초안)
- mock-api.js (목업 데이터)
- server.js (Solar Pro 4 연동, /api/recall 엔드포인트, mock 폴백 포함)

**문서/참조:**
- docs/references/*.md 8개 + scripts/schedule_calc.py (W-15)
- docs/backend/TRANSITION_APPROVAL_INTERFACE.md, ACTIVE_MEMORY_SET_DEFINITION.md, PDF_SERVICE_RESPONSIBILITY.md
- docs/prompts/stage-solar-integration.md, stage-github-push.md, stage-X-settlement.md

### 1.2 미완료/남은 작업

1. **GENERATE_OUTPUT 미구현** — App.jsx 252-265행에서 TODO 화면만 표시 중. W-10 결과 생성 로직 미완성.
2. **프론트 → 백엔드 API 호출 전환** — 현재 컴포넌트가 질문을 하드코딩 중. App.jsx가 /api/recall을 호출해 질문을 받아 전달하는 방식으로 전환 필요.
3. **Solar 호출 프롬프트 개선** — server.js의 systemPrompt/userPrompt이 단순함. 회상 질문 품질을 높이기 위한 프롬프트 다듬기.
4. **output-contract.md 정합 확인** — 백엔드 /api/recall 응답이 output-contract.md §단계별 응답 제한(CONTEXT_REINSTATEMENT: question 하나)을 준수하는지 확인.
5. **빌드/실행 환경 정리** — 프론트(next build) + 백엔드(node server.js) 동시 실행 방법. .env / 환경 변수 관리.
6. **테스트 시나리오** — 사용자 흐름 종단 테스트 시나리오 작성 및 실행.

---

## 2. PRD v0.4 상태 머신 순서 대비 구현 현황

| # | 단계 | 컴포넌트 | 상태 | 비고 |
|---|------|---------|------|------|
| 1 | SPLASH | Splash.jsx | ✅ | F-01 완료 |
| 2 | QUICK_MEMO | QuickMemo.jsx | ✅ | F-02 안내 문구 존재, onNext props |
| 3 | EXTRACT_CANDIDATES | extractCandidates.js + App.jsx | ✅ | T01/T02/T03 통과, App.jsx에서 호출 |
| 4 | USER_VERIFY | UserVerify.jsx | ✅ | O/X/?/수정/이런 내용 없음 |
| 5 | JOB_POSTING_OPTIONAL | JobPostingOptional.jsx | ✅ | URL 입력/건너뛰기 |
| 6 | INTERVIEW_INITIAL_INFO | InterviewInitialInfo.jsx | ✅ | 필수 6필드 + 선택 4필드 |
| 7 | CONTEXT_REINSTATEMENT | ContextReinstatement.jsx | ✅ | 질문 하드코딩 → API 전환 필요 |
| 8 | FREE_RECALL | FreeRecall.jsx | ✅ | 질문 하드코딩 → API 전환 필요 |
| 9 | STRUCTURAL_CUE | StructuralCue.jsx | ✅ | 단서 사다리 하드코딩, Solar 연동 방식 미정 |
| 10 | REVERSE_RECALL | ReverseRecall.jsx | ✅ | 질문 하드코딩 → API 전환 필요 |
| 11 | TIMELINE_REVIEW | TimelineReview.jsx | ✅ | 타임라인·평가·빈 구간·대조 동의 |
| 12 | GENERATE_OUTPUT | GenerateOutput.jsx (TODO) | ❌ | 미구현 — 가장 큰 남은 작업 |

---

## 3. 미완료 항목 우선순위

### P0 — 반드시 해야 하는 것

1. **GENERATE_OUTPUT 구현** — 결과 문서(Markdown) 생성. PRD §16, output-contract.md §GENERATE_OUTPUT, docs/assets/interview-result-template.md 참조.
2. **프론트 → 백엔드 API 호출 전환 (회상 질문)** — ContextReinstatement/FreeRecall/ReverseRecall이 하드코딩 질문 대신 /api/recall로 받은 question 사용.

### P1 — 권장합니다

3. **Solar 호출 프롬프트 개선** — server.js의 프롬프트가 회상 질문 품질을 충분히 담보하는지 검토 및 개선.
4. **output-contract.md 정합 확인** — 백엔드 응답이 계약 준수하는지Checker.

### P2 — 나중에 해도 되는 것

5. **빌드/실행 환경 정리** — 프론트+백엔드 동시 실행, 환경 변수 관리, 배포 고려.
6. **테스트 시나리오** — 종단 테스트 작성/실행.

---

## 4. 다음 스테이지 제안

### 제안 1: GENERATE_OUTPUT 구현 (가장 큼)

PRD §16 + output-contract.md §GENERATE_OUTPUT + docs/assets/interview-result-template.md 기준으로 GenerateOutput.jsx 구현.

**작업 범위:**
- GenerateOutput.jsx 생성/완성: 검증 완료된 candidateItems, interviewInfo, timeline 정보 등을 Markdown 10절 구조로 조합
- 고지 문구 포함 (원문 보존, AI 보증 아님 등)
- 빈 값 처리: [사용자 기입], [확인 필요], [기억나지 않음]
- suggestedFileName: `Memory-Replay_YYYY-MM-DD_면접_{이름}.md`
- retrievalCards JSON 구조 포함 (W-17)
- sensitiveNameHidden prop 지원 (W-20)

**완료 기준 (체크 가능):**
- [ ] GenerateOutput.jsx가 candidateItems + interviewInfo + 검증 결과 기반으로 Markdown 생성
- [ ] 10절 구조 충족 (기본 정보/검증 핵심 기억/타임라인/평가 분리/AAR/인출 카드/재연습 일정 등)
- [ ] 고지 문구 포함
- [ ] 빈 값 처리 3종 포함
- [ ] suggestedFileName 형식 준수
- [ ] retrievalCards JSON 구조 포함
- [ ] sensitiveNameHidden prop 처리
- [ ] 빌드 성공

**범위 바깥:**
- PDF 생성 (W-18 — 서비스 책임)
- Solar 연동 (이미 완료)
- 컴포넌트 내부 회상 로직 변경

---

### 제안 2: 프론트 → 백엔드 API 호출 전환 (회상 질문)

ContextReinstatement.jsx, FreeRecall.jsx, ReverseRecall.jsx가 하드코딩한 질문을 App.jsx가 /api/recall로 받은 question prop으로 대체.

**작업 범위:**
- App.jsx에 fetchRecallQuestion(sessionId, context) 함수 추가 (이미 API_BASE 상수 있음 — 24행)
- ContextReinstatement.jsx: question prop 추가, 없으면 하드코딩 fallback 유지
- FreeRecall.jsx: question prop 추가, 없으면 하드코딩 fallback 유지
- ReverseRecall.jsx: question prop 추가, 없으면 하드코딩 fallback 유지
- StructuralCue.jsx: 현재 단서 사다리 방식 유지 (Solar 연동 방식 미정 — 범위 바깥)

**완료 기준 (체크 가능):**
- [ ] App.jsx에 fetchRecallQuestion 함수 존재 (async, fetch → /api/recall)
- [ ] ContextReinstatement가 question prop 받음 (없으면 하드코딩 fallback)
- [ ] FreeRecall이 question prop 받음 (없으면 하드코딩 fallback)
- [ ] ReverseRecall이 question prop 받음 (없으면 하드코딩 fallback)
- [ ] App.jsx가 해당 단계 진입 시 fetchRecallQuestion 호출 → question props 전달
- [ ] 빌드 성공
- [ ] 백엔드 서버 실행 중이면 실제 Solar 질문 받음, 서버 다운이면 mock 폴백 또는 하드코딩 fallback

**범위 바깥:**
- StructuralCue 단서 사다리 변경
- Solar 프롬프트 개선
- GENERATE_OUTPUT 구현

---

## 5. 처리 완료 목록 (이월용)

이 계획 실행 전 처리 완료 목록:

```
처리 완료: W-01~W-20, Stage X-1/X-2 정산, PR #26, SOLAR-A 확인 완료, SOLAR-B 완료, SOLAR-C 완료(백엔드 server.js + Solar Pro 4 호출 + mock 폴백)
```

각 스테이지 종료 시 이 목록에 해당 스테이름을 추가한다.

---

## 6. 루프 방지 가드 (작성 시 참고)

각 스테이지 프롬프트에는 다음을 포함한다:
- 처리 완료 목록 (위 블록) — 재방문 방지
- 범위 바깥 명시 — "~는 이 작업에서 만지지 않는다"
- 완료 기준은 체크 가능하게 — "구현했다"가 아니라 구체적 체크포인트
- 부정 대신 긍정 — "반복하지 마"가 아니라 "처리 완료 목록에 있으면 재방문하지 않는다"
a
같은 파일을 여러 스테이지에서 건드리지 않는다:
- GENERATE_OUTPUT: GenerateOutput.jsx (신규/완성)
- 프론트 API 호출: App.jsx + ContextReinstatement.jsx + FreeRecall.jsx + ReverseRecall.jsx
- Solar 프롬프트 개선: backend/src/server.js
- output-contract.md 정합: 확인만 (수정 없음)

---

## 7. 참고 문서

- PRD 진본: /Users/minseoklee/.hermes/attachments/Memory-Replay_Development_PRD_v0.4-3.md
- output-contract.md: docs/references/output-contract.md
- state-machine.md: docs/references/state-machine.md
- interview.md: docs/references/scenarios/interview.md
- interview-result-template.md: docs/assets/interview-result-template.md
- INTERFACE.md: backend/INTERFACE.md
- Solar API: https://console.upstage.ai/api/docs/for-agents/raw (Base URL: https://api.upstage.ai/v1, POST /v1/chat/completions, Bearer 인증, 모델 solar-pro4)
