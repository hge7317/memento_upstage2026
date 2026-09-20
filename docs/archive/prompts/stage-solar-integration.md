# 스테이지 SOLAR-A — useStage.js v0.4 정합 + App.jsx 라우팅 단일화 (완료 확인)

이 스테이지는 useStage.js와 App.jsx가 PRD v0.4 상태 모델에 맞게 이미 수정됐는지 확인하는 데만 쓴다. 새 수정이 아니라 현행 검증.

## 입력

처리 완료 (로컬 구현 기준):
  W-01~W-20, Stage X-1/X-2 정산 완료, PR #26 생성됨, SOLAR-A/B/C 프롬프트 작성됨

현재 상태 (확인된 사실):
  - useStage.js: STAGE_ORDER가 이미 v0.4 순서(quick-memo → extract-candidates → user-verify → job-posting-optional → interview-initial-info → context-reinstatement → free-recall → structural-cue → reverse-recall → timeline-review → generate-output → complete), "scenario"와 "objective-frame"은 없음 (6-21행)
  - App.jsx: 이미 `import { useStage } from "./lib/useStage"` 하고 `useStage("splash")` 사용 중 (13, 16행). 자체 `useState("splash")` 아님.
  - QuickMemo.jsx: onNext props를 받고, App.jsx가 이미 `onNext={handleQuickMemoSubmit}`으로 전달 중 (126-127행)
  - ScenarioSelect.jsx: 이미 삭제됨 (Stage X-1). App.jsx import 목록에 없음.

저장소 루트: /Users/minseoklee/Documents/Hermes/upstage
PRD v0.4 상태 머신 순서 (12단계): SPLASH → QUICK_MEMO → EXTRACT_CANDIDATES → USER_VERIFY → JOB_POSTING_OPTIONAL → INTERVIEW_INITIAL_INFO → CONTEXT_REINSTATEMENT → FREE_RECALL → STRUCTURAL_CUE → REVERSE_RECALL → TIMELINE_REVIEW → GENERATE_OUTPUT
참조: docs/references/state-machine.md, docs/backend/TRANSITION_APPROVAL_INTERFACE.md

## 작업 범위 (완료 확인만)

### SOLAR-A-1. useStage.js STAGE_ORDER 확인

useStage.js의 STAGE_ORDER가 PRD v0.4 순서인지 확인한다.

확인 대상 (7-21행):
  ["splash", "quick-memo", "extract-candidates", "user-verify", "job-posting-optional", "interview-initial-info", "context-reinstatement", "free-recall", "structural-cue", "reverse-recall", "timeline-review", "generate-output", "complete"]

확인 사항:
  - "scenario"가 없음 ✅
  - "objective-frame"이 없음 ✅
  - "job-posting-optional"이 있음 ✅
  - "interview-initial-info"가 있음 ✅

### SOLAR-A-2. App.jsx useStage 사용 확인

App.jsx가 useStage를 import하고 stage 상태 관리에 사용하는지 확인한다.

확인 대상:
  - 13행: `import { useStage } from "./lib/useStage"` 존재
  - 16행: `const { stage, setStage, scenario, setScenario, next, goTo, back, canGoBack } = useStage("splash")`
  - 자체 `const [stage, setStage] = useState("splash")` 없음

### SOLAR-A-3. QuickMemo props 정합 확인

App.jsx가 QuickMemo에 onNext로 전달하는지 확인한다.

확인 대상 (126-127행):
  - `<QuickMemo onNext={handleQuickMemoSubmit} ...>` — onNext로 전달 중
  - QuickMemo.jsx는 onNext props 받음

## 완료 기준 (체크 가능)

- [ ]  useStage.js STAGE_ORDER에 "scenario", "objective-frame"이 없고, "job-posting-optional", "interview-initial-info"가 있음
- [ ]  App.jsx가 useStage를 import해서 stage 상태 관리에 사용함
- [ ]  QuickMemo props 명칭이 정합됨 (App.jsx가 onNext로 전달)
- [ ]  ScenarioSelect.jsx가 더 이상 import되거나 참조되지 않음
- [ ]  빌드 오류 없음 (next build 성공)

## 범위 바깥

- Solar Pro API 연동 (STAGE SOLAR-C)
- extractCandidates 호출 연결 (STAGE SOLAR-B — 따로 있음)
- 컴포넌트 내부 회상 로직 변경
- 상태 전이 승인 백엔드 구현 (목업/명세 수준 유지)

## 처리 완료 목록 (이 스테이지 종료 시)

처리 완료: SOLAR-A 확인 완료 (현행 코드에서 이미 충족)

→ SOLAR-B로 넘어간다.

---

# 스테이지 SOLAR-B — QuickMemo → extractCandidates → user-verify 연결

이 스테이지는 App.jsx의 quick-memo → user-verify 흐름에서 extractCandidates 호출이 빠져있는 것을 연결한다. extractCandidates.js 자체 로직 수정은 하지 않는다 (이미 T01/T02/T03 통과).

## 입력

처리 완료: SOLAR-A 확인 완료
현재 상태:
  - frontend/src/lib/extractCandidates.js 존재, T01/T02/T03 통과
  - App.jsx: QuickMemo onNext={handleQuickMemoSubmit} (127행)이나 handleQuickMemoSubmit이 정의되지 않음 → ReferenceError 상태
  - App.jsx: quickMemoText, candidateItems 상태 있음 (19, 24행)
  - UserVerify.jsx: candidates prop으로 candidateItems 받음 (136행)

참조:
  - frontend/src/lib/extractCandidates.js (export function extractCandidates)
  - docs/references/candidate-extraction.md
  - PRD §7 (EXTRACT_CANDIDATES)

## 작업 범위

### SOLAR-B-1. handleQuickMemoSubmit 정의 + extractCandidates 호출

App.jsx에서 handleQuickMemoSubmit 함수를 정의하고, QuickMemo 제출 시 extractCandidates를 호출하도록 한다.

현재 문제: App.jsx 127행에서 `onNext={handleQuickMemoSubmit}`으로 전달하지만, 이 함수가 App.jsx에 정의되어있지 않음. 런타임 ReferenceError.

구현:
  1. App.jsx 상단에 extractCandidates import 추가: `import { extractCandidates } from "./lib/extractCandidates";`
  2. handleQuickMemoSubmit 함수 정의 (advanceStage 앞, activeId 뒤가 적절한 위치):
     ```javascript
     const handleQuickMemoSubmit = (text) => {
       // 원문 저장
       setQuickMemoText(text || "");
       setQuickMemoEmpty(false);
       // 후보 추출 — 프론트 순수 함수 호출 (백엔드/Solar 연동과 무관)
       const result = extractCandidates({ original: text });
       setCandidateItems(result.candidateItems || []);
       // 사용자 검증 단계로 진행
       setStage("user-verify");
     };
     ```
  3. 빈 원문 + emptyChoice 처리: text가 빈 문자열이거나 emptyChoice가 true일 때도 extractCandidates({ original: "" }) 호출 → emptyResult 반환 → candidateItems=[] → user-verify 진행. 기존 extractCandidates 동작 유지.

### SOLAR-B-2. user-verify에 candidateItems 전달 확인

App.jsx가 UserVerify에 candidateItems를 props로 전달하는지 확인한다 (이미 136-137행에서 전달 중).

### SOLAR-B-3. 사용하지 않는 import 정리 (선택)

App.jsx에서 더 이상 사용하지 않는 import가 있으면 정리한다. 현재 verifyCandidates, VerificationResult는 App.jsx에서 직접 사용되지 않음 (검증 로직은 UserVerify.jsx 내부 + App.jsx의 onVerify/onEdit 인라인 핸들러로 처리됨).

## 완료 기준 (체크 가능)

- [ ]  App.jsx에 `import { extractCandidates } from "./lib/extractCandidates"` 존재
- [ ]  App.jsx에 handleQuickMemoSubmit 함수 정의가 있고, 내부에서 extractCandidates({ original: text }) 호출
- [ ]  handleQuickMemoSubmit이 result.candidateItems를 setCandidateItems에 저장
- [ ]  handleQuickMemoSubmit이 setStage("user-verify")로 진행
- [ ]  UserVerify가 candidateItems props를 받음 (이미 136-137행)
- [ ]  빌드 오류 없음 (next build 성공)

## 범위 바깥

- extractCandidates.js 내부 로직 수정 (T01/T02/T03 재작업 아님)
- user-verify 검증 로직 수정
- Solar Pro 연동 (STAGE SOLAR-C)
- useStage.js 수정 (이미 완료)

## 처리 완료 목록 (이 스테이지 종료 시)

처리 완료: SOLAR-B 완료 (QuickMemo → extractCandidates → user-verify 연결)

## 스테이지 종료 시 남길 것

- App.jsx: extractCandidates import + handleQuickMemoSubmit 정의 + candidateItems 상태 채움
- 사용자 흐름: quick-memo 제출 → 후보 추출 → user-verify에서 후보 확인

→ SOLAR-C에서 참조.

---

# 스테이지 SOLAR-C — Solar Pro 연동 구현

이 스테이지는 Memory Replay가 실제로 Solar Pro를 호출하여 회상 질문을 생성하고 응답을 처리하는 연동을 구현하는 데만 쓴다.

## 입력

처리 완료: SOLAR-A, SOLAR-B 완료 (가정)
현재 상태:
  - 백엔드: backend/src/index.js는 mock-api.js를 재수출만 함 (실제 HTTP 서버 없음). backend/src/mock-api.js는 mockSession/mockCandidates/mockRecallQuestion/mockMarkdown을 export하는 목업 데이터 모듈.
  - 백엔드 인터페이스 명세: backend/INTERFACE.md — POST /api/recall 등 API 계약 초안. "Solar Pro 4 연동은 별도 이슈로 진행", "Solar API 키는 서버에서만 사용" 명시.
  - 프론트: App.jsx + 컴포넌트들 (목업 응답 기준 구현)
  - Solar Pro: Solar Pro 4 모델 사용 중 (이 세션도 Solar Pro 4)

Solar 연동 방식 결정 (아래 답변 반영):
  - Solar Pro API 키 보유: 예, env 이름 SOLAR_API_KEY
  - 호출 방식: 백엔드 proxy (권장)
  - 백엔드 방식: mock-api.js를 Solar 호출로 대체 (별도 엔드포인트 아님)
  - 모델/엔드포인트: solar-pro4 (Upstage Solar API 문서 기준 정확한 엔드포인트 확인 필요)

참조:
  - backend/INTERFACE.md (API 계약 초안, Solar 키 서버 전용 원칙)
  - backend/src/mock-api.js (현재 목업)
  - backend/src/index.js (현재 재수출만)
  - frontend/src/lib/useStage.js (목업 단계 주석: "실제 Solar/백엔드 연동 전에는 목업 단계로 진행")
  - docs/references/output-contract.md (공통 응답 형식)
  - Upstage Solar API 문서 (엔드포인트/요청 스키마 확인)

## 작업 범위

### SOLAR-C-1. 백엔드 HTTP 서버 생성 여부 결정

현행 backend/src/index.js는 HTTP 서버가 아니라 mock-api.js를 재수출하는 모듈이다. 백엔드에서 Solar를 호출하려면 HTTP 서버가 필요하다. 두 가지 접근:

옵션 A: 경량 HTTP 서버 추가 (권장 — API 키 노출 방지, INTERFACE.md 계약과 정합)
  - backend/src/server.js (또는 index.js 확장) 생성: Express/Fastify 등 경량 서버
  - INTERFACE.md의 API 계약(POST /api/recall 등)에 따른 라우팅
  - Solar 호출은 서버 내부에서 수행, SOLAR_API_KEY 환경 변수 사용
  - 프론트는 백엔드 API를 호출하도록 변경 (현재는 목업 데이터 import 방식일 수 있음 — 확인 필요)

옵션 B: 프론트에서 직접 Solar 호출 (API 키 노출 위험, 개발 환경 전용)
  - 프론트 컴포넌트가 Solar API 직접 호출
  - SOLAR_API_KEY를 환경 변수로 주입
  - production에서는 권장하지 않음

사용자 답변 기준: 옵션 A (백엔드 proxy, mock-api.js를 Solar 호출로 대체). 단, 현행 백엔드에 HTTP 서버가 없으므로 서버 생성이 선행 필요.

### SOLAR-C-2. 백엔드 HTTP 서버 + Solar 호출 구현

옵션 A 선택 시:

1. backend/src/server.js 생성 (또는 index.js 확장):
   - 경량 HTTP 서버 (Express 권장 — 이미 사용 중인지 확인, 아니면 추가)
   - INTERFACE.md 계약 기반 라우팅: POST /api/recall 등
   - Solar Pro 4 호출: Upstage Solar API 엔드포인트로 요청
   - 환경 변수: SOLAR_API_KEY (process.env.SOLAR_API_KEY)

2. Solar 호출 구현:
   - Upstage Solar API 문서에서 정확한 엔드포인트/요청 스키마 확인
   - 요청: 모델 solar-pro4, 프롬프트(회상 질문 생성용), 세션 컨텍스트 등
   - 응답 파싱: Solar 응답 → output-contract.md 형식(question, candidateItems 등)으로 변환

3. mock-api.js 처리:
   - 목업 데이터를 Solar 호출로 대체하거나, Solar 호출 실패 시 목업 폴백으로 사용
   - 현재 mock-api.js가 export하는 mockSession/mockCandidates/mockRecallQuestion/mockMarkdown 중 회상 질문 관련(mocRecallQuestion)을 Solar 호출로 교체

4. 프론트 변경 (필요시):
   - 프론트가 백엔드 API를 호출하도록 변경 (현재는 목업 import 방식이면 API 호출 방식으로 전환)
   - API 베이스 URL 환경 변수 (VITE_API_BASE_URL 등)

### SOLAR-C-3. 응답 처리 정합

Solar 응답이 output-contract.md 공통 응답 형식과 맞도록 파싱한다.

Solar 응답 → output-contract.md 필드 매핑:
  - question: Solar이 생성한 회상 질문 문자열
  - candidateItems: Solar이 추출한 후보 (또는 프론트 extractCandidates 결과와 병합)
  - stage/nextStage: 프론트에서 설정 (Solar은 질문+후보만 제공)
  - safety: Solar 응답 기반 injectionCheckPassed 등 (백엔드/스킬에서 최종 결정)

### SOLAR-C-4. 오류 처리 + 목업 폴백

Solar 호출 실패 시:
  - 목업 응답으로 폴백 (현재 mock-api.js 응답 활용)
  - 또는 사용자에게 재시도 안내
  - 호출 실패가 회상 흐름을 중단하지 않도록 처리

### SOLAR-C-5. API 키 환경 변수 설정

- SOLAR_API_KEY를 환경 변수로 주입 (코드에 하드코딩하지 않음)
- .env 파일 생성 (로컬 개발용) — .gitignore 확인, 커밋 제외
- 또는 배포 환경 변수로 설정

## 완료 기준 (체크 가능)

- [ ]  백엔드 HTTP 서버 존재 (서버가 요청을 받을 수 있음)
- [ ]  Solar Pro 호출 코드 존재 (백엔드에서 Solar API 요청)
- [ ]  SOLAR_API_KEY가 환경 변수로 주입됨 (코드 하드코딩 아님)
- [ ]  Solar 응답이 output-contract.md 형식으로 파싱되어 프론트에 전달됨
- [ ]  Solar 호출 실패 시 목업 폴백/오류 처리 있음
- [ ]  프론트가 백엔드 API를 호출하여 회상 질문을 받음 (또는 목업 폴백으로 동작)
- [ ]  빌드/실행 시 Solar 호출이 동작하거나, 호출 없이도 목업 폴백으로 흐름 유지됨

## 범위 바깥

- Solar Pro 모델 자체 변경 (Solar Pro 4 유지)
- 백엔드 전체 재구조화 (경량 서버 생성 + Solar 호출 통합 수준)
- PDF 생성, 파일명 규칙 등 이미 완료된 명세 재작업
- 프론트 컴포넌트 UI 재설계

## 처리 완료 목록 (이 스테이지 종료 시)

처리 완료: SOLAR-C 완료 (백엔드 서버 + Solar Pro 연동 + API 키 환경 변수 + 응답 파싱 + 오류 처리)

## 스테이지 종료 시 남길 것

- 백엔드 서버 코드 (backend/src/server.js 또는 index.js 확장)
- Solar 호출 코드 + 응답 파싱
- API 키 환경 변수 설정 방법 (.env 예시 또는 배포 설정)
- 프론트 API 호출 코드 (필요시)
- 오류 처리 코드

→ 회상 워크플로 실제 동작에 필요.

---

# 솔라 통합 스테이지 순서 + 루프 방지 가드

## 순서 (고정)

SOLAR-A → SOLAR-B → SOLAR-C. SOLAR-A 없이 SOLAR-B 먼저 하지 않는다. SOLAR-B 없이 SOLAR-C 먼저 하지 않는다.

## 처리 완료 목록 이월

  SOLAR-A 실행 전: W-01~W-20, Stage X-1/X-2 정산, PR #26
  SOLAR-A 종료 시: 위 + SOLAR-A
  SOLAR-B 실행 전: 위 + SOLAR-A
  SOLAR-B 종료 시: 위 + SOLAR-A + SOLAR-B
  SOLAR-C 실행 전: 위 + SOLAR-A + SOLAR-B

이 목록을 매 스테이지 프롬프트 입력란에 그대로 복사해서 전달한다. 에이전트는 이 목록에 있는 항목을 재방문하지 않는다.

## 범위 바깥 명시

  SOLAR-A: Solar 연동, extractCandidates 호출, 컴포넌트 내부 로직 변경 제외
  SOLAR-B: extractCandidates.js 수정, Solar 연동, useStage 수정 제외
  SOLAR-C: 모델 변경, 백엔드 전체 재구조화(서버 생성 + Solar 통합은 포함), PDF/파일명 등 완료 명세 재작업 제외

## 부정 대신 긍정

"반복하지 마"가 아니라 "처리 완료 목록에 있으면 재방문하지 않는다".

## 같은 파일 충돌 관리

  SOLAR-A: 확인만 (수정 없음)
  SOLAR-B: App.jsx (extractCandidates import + handleQuickMemoSubmit 추가)
  SOLAR-C: backend/src/server.js(또는 index.js) + mock-api.js + 프론트 API 호출(필요시)

SOLAR-A는 수정이 아니라 확인이므로 App.jsx 충돌 없음. SOLAR-B와 SOLAR-C는 서로 다른 파일/계층을 건드림.

## Solar 연동은 질문 답이 먼저 → 이미 답변 있음

SOLAR-C-1 질문 4개에 대한 사용자 답변:
  1. Solar Pro API 키 보유: 예, env 이름 SOLAR_API_KEY
  2. 호출 방식: 백엔드 proxy (권장)
  3. 백엔드 방식: mock-api.js를 Solar 호출로 대체 (별도 엔드포인트 아님)
  4. 모델/엔드포인트: solar-pro4 (Upstage Solar API 문서 기준 정확한 엔드포인트 확인 필요)

이 답변을 SOLAR-C 프롬프트 입력란에 복사해서 전달한다. SOLAR-C는 이 답변 기반으로 구현한다.

---

# 출력 형식

각 스테이지 종료 시 아래 순서로 출력한다.

1. 가설 한 줄 (예: "SOLAR-A 확인 완료 — useStage.js v0.4 정합 + App.jsx 라우팅 단일화 이미 충족")
2. 처리 완료: (이 스테이지에서 추가된 항목)
3. 완료 기준 점검: 각 체크포인트별 체크
4. 변경 파일 목록
5. 빌드 결과 (성공/실패, 실패 시 오류)
6. 다음 스테이지 제안: SOLAR-B (SOLAR-A 종료 시) 또는 SOLAR-C (SOLAR-B 종료 시) 또는 질문 대기 (SOLAR-C-1 답 없을 때 — 이미 답 있음)

---

# 주의

- SOLAR-A는 이미 완료됐을 가능성이 높다. 실행 전에 현행 코드를 먼저 확인하고, 충족됐으면 "확인 완료"로 종료하고 SOLAR-B로 넘어간다.
- SOLAR-B는 handleQuickMemoSubmit이 App.jsx에 정의되어있는지 먼저 확인한다. 이미 있으면 재작업하지 않는다.
- SOLAR-C는 현행 백엔드에 HTTP 서버가 없음을 감안한다. mock-api.js는 목업 데이터 export 모듈이고, index.js는 재수출만 한다. Solar 호출을 추가하려면 서버 생성이 선행돼야 한다.
- Solar API 엔드포인트/요청 스키마는 Upstage Solar API 문서에서 확인한다. 추측하지 않는다.
- SOLAR_API_KEY는 코드에 하드코딩하지 않는다. .env 또는 배포 환경 변수로 주입한다. .env는 .gitignore 확인.
