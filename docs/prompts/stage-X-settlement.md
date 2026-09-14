# 스테이지 X-1 — 허위 완료 정산 (PDF_SERVICE_RESPONSIBILITY.md 생성 + ScenarioSelect.jsx 삭제)

이 스테이지는 Stage X(종료 정산)에서 발견된 허위 완료 2건을 실제 파일 시스템에 반영하여 완료 처리하는 데만 쓴다. 새 기능 구현이 아니다.

## 입력

처리 완료: W-15, W-12(F-01 완료, F-02 보완 필요), W-13, W-01, W-02, W-03, W-04, W-05, W-06, W-07, W-08, W-09, W-10, W-11, W-14, W-17, W-19, W-20

미해결 체크포인트 (Stage X에서 발견):
  [W-18] docs/backend/PDF_SERVICE_RESPONSIBILITY.md 미생성 — Stage K에서 "생성" 보고됐으나 실제 파일 없음
  [W-14] ScenarioSelect.jsx 미삭제 — Stage J에서 "제거" 보고됐으나 frontend/src/components/ScenarioSelect.jsx 여전히 존재

저장소 루트: /Users/minseoklee/Documents/Hermes/upstage
PRD 진본: /Users/minseoklee/.hermes/attachments/Memory-Replay_Development_PRD_v0.4-3.md (1506행, 67,047바이트)
PRD §13 (봉인 대상), §18 (F-24 PDF는 서비스 렌더러 담당)

## 작업 범위

### X-1.a. PDF_SERVICE_RESPONSIBILITY.md 생성 (W-18 완료 처리)

`docs/backend/PDF_SERVICE_RESPONSIBILITY.md` 파일을 실제 생성한다. 내용 포함:
  - PDF 바이너리는 스킬 응답에 포함되지 않음 (output-contract.md §최종 결과 객체: resultDocument.markdown만 포함, PDF 아님)
  - PDF 생성 실패 시 서비스 책임은 Markdown·화면 복사 제공
  - 스킬은 PDF를 생성하지 않음 (스킬이 PDF 바이너리를 만들지 않음)
  - 이 명세는 W-18 완료 처리를 위한 근거 문서

PRD §18 F-24 "PDF는 서비스 렌더러 담당"과 정합해야 한다.

### X-1.b. ScenarioSelect.jsx 삭제 (W-14 완료 처리)

`frontend/src/components/ScenarioSelect.jsx` 파일을 저장소에서 삭제한다.

삭제 근거:
  - PRD v0.4에서 상황 선택(SCENARIO_SELECT) 단계 제거됨 (§1.1, 상태 머신 순서에서 SCENARIO_SELECT 없음)
  - App.jsx에서 이미 미사용 상태 (Stage F-1에서 stage 흐름 연결 시 ScenarioSelect import 없음)
  - Stage J에서 "제거" 제안됐으나 실제 삭제 안 됨

삭제 전 확인:
  - 다른 파일에서 ScenarioSelect를 import 하고 있는지 확인. import 하고 있으면 먼저 그 import 제거 후 삭제.
  - 현재 App.jsx는 ScenarioSelect를 import 하지 않음 (Stage F-1 App.jsx 확인 결과). 따라서 바로 삭제 가능.

## 완료 기준 (체크 가능)

- [ ]  `docs/backend/PDF_SERVICE_RESPONSIBILITY.md` 파일이 실제 존재하고, 내용이 W-18 요구를 담고 있음
- [ ]  `frontend/src/components/ScenarioSelect.jsx` 파일이 실제 삭제됨 (저장소에 존재하지 않음)
- [ ]  App.jsx 등 다른 파일에서 ScenarioSelect import가 남아있지 않음 (삭제 전 확인 결과에서 import 없음이면 그대로)

## 범위 바깥

- PDF 생성 구현 (W-18 범위 아님 — 서비스 책임 명세까지가 W-18)
- 분실물·미팅 흐름 구현 (v0.4 범위 아님)
- 새 컴포넌트·훅 구현
- App.jsx stage 흐름 변경 (이미 F-1에서 완료, 이번 스테이지에서 건드리지 않음)
- W-01~W-13 기능 구현

## 처리 완료 목록 (이 스테이지 종료 시)

처리 완료: W-18, W-14 추가

## 스테이지 X-1 종료 시 넘길 것

처리 완료: W-18, W-14
PDF_SERVICE_RESPONSIBILITY.md 경로: docs/backend/PDF_SERVICE_RESPONSIBILITY.md
ScenarioSelect.jsx 삭제 확인: (삭제 완료 또는 import 제거 후 삭제 완료)

→ 이 결과가 Stage X-2 이후에서 참조된다.

---

# 스테이지 X-2 — 수기 대체 경로 명확화 (W-19) + F-02 퀵 메모 보완/보류 명시

이 스테이지는 Stage X에서 발견된 두 건의 잔여 이슈를 정리한다. 하나는 이미 부분적으로 처리됐고(W-19), 하나는 선택 보완(F-02)이다.

## 입력

처리 완료: W-15, W-12(F-01 완료), W-13, W-01~W-11, W-14, W-17, W-18, W-19(부분), W-20
(Stage X-1에서 W-18, W-14 완료 처리 후 넘어온 것으로 가정)

W-19 현재 상태:
  - scripts/schedule_calc.py 실행 가능: 확인됨 (Stage A)
  - D+1/D+3/D+7/최종 연습일이 계산값 그대로 결과에 반영: 확인됨 (Stage H/K GenerateOutput.jsx에서 scheduleCalc() 사용)
  - 계산 실패 시 수기 대체 경로: GenerateOutput.jsx에서 scheduleCalc() 실패 시 빈 객체 반환, markdown에 "[수기 입력 필요 — 일정 계산 실패]" 포함. 호출 측(서비스) fallback 동작은 명시되지 않음.

F-02 현재 상태:
  - QuickMemo.jsx에 사진·문서 업로드 안내 UI 없음 (Stage B에서 확인)
  - v0.4 MVP 범위에서 필수는 아님
  - F-02 상태가 "부분 구현"으로 남아있음

## 작업 범위

### X-2.a. W-19 수기 대체 경로 명확화

GenerateOutput.jsx에서 계산 실패 시 수기 대체 경로가 이미 markdown에 포함돼 있는지 확인하고, 부족하면 보완한다.

확인 대상:
  - scheduleCalc()가 null 반환 시 markdown에 "[수기 입력 필요 — 일정 계산 실패]" 문구가 포함되는지
  - 포함되면 이미 처리됨 → 완료
  - 포함되지 않으면 markdown에 해당 문구 추가

추가로, 호출 측(서비스)에서 markdown을 그대로 사용할 때 수기 대체 경로가 어떻게 동작하는지 한 줄로 명시한다 (예: "호출 측은 markdown을 그대로 반환하면 되고, 수기 입력이 필요한 경우 서비스 측에서 사용자에게 날짜 입력을 요청할 수 있다"). 이 명시는 GenerateOutput.jsx 주석 또는 별도 문서에 남긴다.

### X-2.b. F-02 퀵 메모 사진·문서 업로드 안내 처리

Stage B에서 "보완 필요"로 기록된 F-02를 현재 시점에서 어떻게 처리할지 결정한다.

옵션:
  - 보완: QuickMemo.jsx에 사진·문서 업로드 안내 UI 추가 (PRD §5.3 QUICK_MEMO 의도와 정합)
  - 보류 명시: v0.4 MVP 범위에서 필수가 아니므로 "보류"로 상태 변경, 그 이유를 문서화

어느 옵션이든 결과 문서에 F-02의 최종 상태를 명시한다.

### X-2.c. 충돌 문서화

X-2.a, X-2.b에서 처리한 내용 중 "정리하지 않기로 한 것"이 있으면 그 이유와 함께 기록한다.

## 완료 기준 (체크 가능)

- [ ]  W-19: 계산 실패 시 수기 대체 경로가 markdown에 포함돼 있음 (이미 포함됐으면 확인으로 완료, 없으면 추가)
- [ ]  W-19: 호출 측 fallback 동작이 한 줄로 명시돼 있음 (주석 또는 문서)
- [ ]  F-02: 최종 상태(보완 완료 / 보류 명시)가 문서로 기록됨
- [ ]  충돌 문서화: 정리하지 않기로 한 지점이 있으면 이유와 함께 기록됨

## 범위 바깥

- W-10 결과 Markdown 생성 로직 재작업 (수기 대체 문구 추가만)
- 사진·문서 업로드 기능 구현 자체 (F-02 보완 선택 시 UI 안내까지만, 업로드 백엔드 구현은 범위 밖)
- PDF (W-18)
- 백엔드 구현 (W-18/F-36 보류와 연결)

## 처리 완료 목록 (이 스테이지 종료 시)

처리 완료: W-19 완료 처리, F-02 (보완 완료 또는 보류 명시)

## 스테이지 X-2 종료 시 넘길 것

처리 완료: W-19, F-02
수기 대체 경로 상태: (확인/보완 완료)
F-02 최종 상태: (보완 완료 / 보류 명시 + 이유)

→ 이 결과가 후속 스테이지에서 참조된다.

---

# 루프 방지 가드 (Stage X-1, X-2 공통)

## 처리 완료 목록을 반드시 넘긴다

Stage X-1 실행 전 처리 완료: W-15, W-12, W-13, W-01~W-11, W-14, W-17, W-19(부분), W-20
Stage X-1 종료 시 처리 완료: 위 + W-18, W-14
Stage X-2 실행 전 처리 완료: Stage X-1 결과 (W-18, W-14 포함)
Stage X-2 종료 시 처리 완료: 위 + W-19(완료), F-02(보완/보류)

이 목록을 매번 프롬프트 입력란에 그대로 복사해서 전달한다. 에이전트는 이 목록에 있는 W-xx/F-xx를 재방문하지 않는다. 재방문이 정당화되려면(예: 범위 변경, 새 PRD 버전) 그 이유를 새로 적는다.

## 범위 바깥을 명시한다

각 스테이지 프롬프트에 "~는 이 작업에서 만지지 않는다"를 명시했다. 범위 바깥을 읽지 않은 에이전트가 범위를 확장해서 같은 코드를 여러 작업 항목에서 건드리는 것을 막는다.

## 부정 대신 긍정으로 작성한다

"반복하지 마"가 아니라 "처리 완료 목록에 있으면 재방문하지 않는다"로 작성했다. "허위 완료 재분석 금지" 같은 부정 표현 대신, "이미 실제 파일에 반영된 완료는 다시 분석하지 않는다"로 긍정 표현한다.

## 완료 기준은 체크 가능하게

Stage X-1: 파일 존재/부재 확인 — 체크 가능
Stage X-2: markdown 포함 여부 확인, F-02 상태 문서화 — 체크 가능

"이해에 도달" 같은 모호한 바운드는 사용하지 않는다.

## 같은 PRD_ID를 PRD에서 다시 뒤지지 않는다

Stage X-1, X-2에서 PRD 참조는 §13(봉인), §18(F-24 PDF), §5.3(QUICK_MEMO) 등 이미 Stage X에서 기록된 참조로 충분하다. PRD를 다시 통독하지 않는다. 필요한 섹션만 가리킨다.

## 깃허브 조회는 필요한 범위만

Stage X-1, X-2에서 깃허브 조회는 필요 없다. 모든 정보는 로컬 파일 시스템에 있다. PR 상태 확인은 Stage X에서 이미 완료(오픈 PR 없음).

---

# 출력 형식

Stage X-1, X-2 각각 종료할 때 아래 순서로 출력한다.

1. 가설 한 줄: "Stage X에서 발견된 허위 완료 2건과 잔여 이슈 2건을 정리했다."
2. 처리 완료: (이 스테이지에서 추가된 W-xx/F-xx)
3. 완료 기준 점검: 각 체크포인트별 ✅/❌
4. 충돌 문서화: (정리하지 않기로 한 것, 있으면)
5. 다음 스테이지 제안: Stage X-2 (X-1 종료 시) 또는 종료 (X-2 종료 시)

---

# 주의 (재분석 루프 방지)

- Stage X-1은 "파일 생성 + 파일 삭제"만 한다. 다른 스테이지의 완료 기준을 다시 점검하지 않는다.
- Stage X-2는 "W-19 수기 대체 경로 확인/보완 + F-02 상태 결정"만 한다. W-19의 다른 완료 기준(schedule_calc.py 실행 가능, 계산값 반영)은 이미 Stage A/H에서 충족 확인됐다.
- F-02 보완을 선택하더라도 사진·문서 업로드 기능 자체를 구현하지 않는다 (UI 안내까지만). 업로드 백엔드는 v0.4 이후 검토.
- Stage X-1, X-2 모두 새 기능 구현이 아니다. 정리·정산만 한다.
