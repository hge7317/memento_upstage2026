# SYSTEM.md — Hermes Agent 시스템 프롬프트

이 파일은 Hermes Agent가 이 프로젝트(upstage)를 작업할 때 따르는 기본 규칙을 정의한다.
실행할 때마다 이 파일을 읽고, 규칙에 따라 행동한다.

## 프로젝트 정체성

- 프로젝트: Memory Replay (memento_upstage2026)
- 저장소: https://github.com/hge7317/memento_upstage2026
- 로컬 루트: /Users/minseoklee/Documents/Hermes/upstage
- 목적: 녹취 없는 사건 직후, 사용자의 기억을 오염 없이 인출·확인하는 회상 워크플로 웹 MVP
- 현재 범위: 면접 복기 전용 (PRD v0.4, v0.4-3이 진본)

## 모델 규칙

### 기본 모델

- Hermes Agent의 기본 모델은 Solar Pro 4다.
- 별도로 모델 지정이 필요한 경우에만 다른 모델을 사용한다.
- 기본값을 변경할 때는 SYSTEM.md에 기록하고, 변경 이유를 남긴다.

### delegate_task 사용 시

delegate_task로 하위 에이전트를 생성할 때:
-provider: "solar-pro4"
- model: "solar-pro4"
- 를 기본값으로 사용한다.

하위 에이전트에 다른 모델을 지정할 타당한 이유가 있으면(예: 특정 작업에 더 적합한 모델, 비용 고려, 실험 목적), 그 이유를 작업 설명에 명시한다.

하위 에이전트의 결과는 SELF-REPORT이므로, 외부 사이드 이펙트(파일 생성, API 호출, 푸시 등)가 있는 경우 반드시 직접 검증한다.

## 컴퓨터 사용 규칙

computer_use 도구로 데스크톱을 조작할 때:
- Hermes 데스크톱 앱을 기본 UI로 우선 사용한다.
- 앱으로 충분한 작업을 터미널/브라우저로 우회하지 않는다.
- 앱 외부에서 처리해야 하는 작업(파일 편집, git, 빌드, 테스트)은 해당 도구를 사용한다.

## 작업 방식

### 단계별 실행

- 한 실행 = 한stage= 하나의 명확한 작업 단위.
- 여러 stage를 한 번에 던지지 않는다.
- stage 진입 전 "처리 완료 목록"을 받고, 완료된 항목은 재방문하지 않는다.
- 각 stage는 완료 기준(체크 가능)을 갖는다.

### 루프 방지

- "이미 완료된 작업"을 다시 하지 않는다. 재방문이 정당화되려면(예: 범위 변경, 새 PRD 버전, 명백한 오류) 그 이유를 명시한다.
- 부정 표현("반복하지 마") 대신 긍정 표현("처리 완료 목록의 W-xx는 재방문하지 않는다")으로 작성한다.
- 범위 바깥을 명시한다. "무엇을 하지 않는지"가 없으면 범위를 확장해 같은 코드를 여러 작업 항목에서 건드린다.

### 문서 소비

- 이 프로젝트에는 에이전트가 소비할 문서가 여러 개 있다: SYSTEM.md, 프롬프트 파일(docs/prompts/*.md), 참조 명세(docs/references/*.md), 백엔드 명세(docs/backend/*.md).
- 문서를 작성할 때는 writing-for-agents 원칙을 따른다: 맥락 포인터, 정보 계층(스텝/레퍼런스/디스클로즈드 레퍼런스), 완료 기준의 clarity+demand, 부정 대신 긍정, no-op 헌트, prune discipline.

## 파일 구조 (현재 기준)

frontend/
  src/
    App.jsx              — 메인 상태 머신 + 라우팅 (현재 자체 useState stage 사용)
    App.css
    components/
      Splash.jsx         — 스플래시
      QuickMemo.jsx      — 빠른 메모 (onNext props, 현재 onSubmit으로 전달됨)
      UserVerify.jsx     — O/X/?/수정/이런 내용 없음 검증 UI
      JobPostingOptional.jsx
      InterviewInitialInfo.jsx
      ContextReinstatement.jsx
      FreeRecall.jsx
      StructuralCue.jsx
      ReverseRecall.jsx
      TimelineReview.jsx
    lib/
      extractCandidates.js   — EXTRACT_CANDIDATES 순수 함수 (T01/T02/T03 통과)
      verifyLogic.js         — 검증 로직 헬퍼
      objectiveFieldSchema.js
      useStage.js            — stage 상태 훅 (v0.2 순서, v0.4와 불일치)
      sessionStore.js
    main.jsx
backend/
  src/
    index.js
    mock-api.js          — 목업 API (Solar 연동 없음)
docs/
  references/            — candidate-extraction.md, guardrails.md, state-machine.md 등
  backend/               — TRANSITION_APPROVAL_INTERFACE.md, ACTIVE_MEMORY_SET_DEFINITION.md, PDF_SERVICE_RESPONSIBILITY.md
  prompts/               — stage-solar-integration.md 등 스테이지 프롬프트
scripts/
  schedule_calc.py
PRD 진본:
  /Users/minseoklee/.hermes/attachments/Memory-Replay_Development_PRD_v0.4-3.md (1506행, 67,047바이트)
  저장소 docs/PRD_v0.4.md (681바이트)는 별도·오래된 파일 — 진본 아님

## PRD 버전 관계

- 첨부 v0.4-3 (1506행) = 진본
- 저장소 docs/PRD_v0.4.md (681바이트) = 별도·오래된 파일, v0.4-3과 불일치
- docs/PRD_v0.3.md (저장소) = 중간 버전, v0.4-3과 비교 필요 시 확인
- docs/PRD_v0.2.md (저장소) = 구버전, reference 용도로만 참조

## v0.4 상태 머신 순서 (12단계)

SPLASH → QUICK_MEMO → EXTRACT_CANDIDATES → USER_VERIFY → JOB_POSTING_OPTIONAL → INTERVIEW_INITIAL_INFO → CONTEXT_REINSTATEMENT → FREE_RECALL → STRUCTURAL_CUE → REVERSE_RECALL → TIMELINE_REVIEW → GENERATE_OUTPUT

참조: docs/references/state-machine.md

v0.4 주요 변경:
- 상황 선택(SCENARIO_SELECT) 단계 삭제 (§1.1)
- 면접 전용으로 한정 (§3)
- JOB_POSTING_OPTIONAL, INTERVIEW_INITIAL_INFO 단계 추가
- // 주석 대신 .md 별도 파일화 (§17)

## Solar Pro 연동 상태

현재: backend/src/mock-api.js 목업만 존재. Solar Pro 실제 호출 없음.
Solar 연동은 STAGE SOLAR-C에서 구현 예정 (API 키, 호출 방식 결정 필요).

## 완료 기준 원칙

- 완료 기준은 체크 가능해야 한다: "구현했다"가 아니라 구체적인 체크포인트 통과로 끝낸다.
- "이해에 도달" 같은 모호한 바운드는 조기 완료 유도 → 사용하지 않는다.
- 가장 강한 기준 = 체크 가능 + 완전 exhaustive.

## 처리 완료 목록 관리

- 각 stage 프롬프트는 "처리 완료 목록"을 입력으로 받는다.
- stage 종료 시 처리 완료 목록을 업데이트해서 다음 stage에 넘긴다.
- 처리 완료 목록에 있는 W-xx/F-xx는 재방문하지 않는다.

## 보류 목록

현재 보류:
- F-24 PDF 렌더러(서비스 책임) — W-18에서 docs/backend/PDF_SERVICE_RESPONSIBILITY.md로 정리됨
- F-27 파일명 비표시 상태 전달 경로 — frontend prop(sensitiveNameHidden) 구현됨, 백엔드 연결은 F-36 보류와 연결
- F-35/F-36 검토중 — 백엔드 세부 범위 확정 이전
- F-21 30일 만료 후 처리 (W-16) — 백엔드 범위 미확정, frontend localStorage는 세션 단위라 30일 보존 개념과 맞지 않음

## 코드 리뷰 체크리스트

코드 변경 시 아래를 확인한다 (docs/review-checklist.md가 있으면 그것을 우선 사용):
- PRD/v0.4 상태 머신 순서와 일치하는가
- output-contract.md §단계별 응답 제한을 따르는가
- guardrails.md 안전 규칙을 위반하지 않는가
- 후보 검증 상태 스키마(CONFIRMED/REJECTED/EDITED/UNKNOWN)가 유지되는가
- REJECTED(이런 내용 없음 포함) 후보가 이후 질문·타임라인·결과에서 사용되지 않는가
- API 키가 코드에 하드코딩되지 않았는가 (환경 변수 사용)

## Git 규칙

- 브랜치: feat/, fix/, docs/ 접두사 사용
- 커밋: Conventional Commits 형식
- PR: 템플릿 작성 후 리뷰 1인 이상 승인
- 현재 작업 브랜치: feat/splash-and-scenario
- main은 보호 브랜치 아님 (확인 필요 시 gh api로 확인)

## 팀 규칙

docs/GITHUB_TEAM_RULES.md를 참조한다. 규칙 변경 시 이 파일을 갱신한다.

## 마지막 업데이트

- PR #26 생성: feat: 면접 회상 워크플로 프론트엔드 구현 (W-01~W-20, Stage 0~X)
- 커밋: 13a85f9
- Stage X-1/X-2 정산: ScenarioSelect.jsx 삭제, PDF_SERVICE_RESPONSIBILITY.md 생성, 수기 대체 경로 주석 추가
