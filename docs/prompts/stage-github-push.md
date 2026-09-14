# 스테이지 GITHUB-PUSH — 로컬 구현 내용 깃허브 반영

이 스테이지는 로컬 폴더에서 스테이지 0~X까지 구현한 내용을 팀 깃허브 저장소에 반영하는 데만 쓴다. 새 기능 구현이 아니다.

## 입력

처리 완료 (로컬 구현 기준):
  W-15, W-12, W-13, W-01, W-02, W-03, W-04, W-05, W-06, W-07, W-08, W-09, W-10, W-11, W-14(문서 정리), W-17, W-18(명세), W-19(schedule_calc.py 확보), W-20

로컬에 반영되지 않은 Stage X-1/X-2 작업:
  - [W-18] docs/backend/PDF_SERVICE_RESPONSIBILITY.md: 이미 로컬에 생성됨 (확인 필요)
  - [W-14] ScenarioSelect.jsx 삭제: 아직 로컬에서 실행 안 됨 — 지금 해야 함

저장소 루트: /Users/minseoklee/Documents/Hermes/upstage
팀 깃허브: https://github.com/hge7317/memento_upstage2026
작업 브랜치: feat/splash-and-scenario (이미 체크아웃됨)

## 작업 범위

### G-1. Stage X-1, X-2 로컬 실행 (아직 안 됐으면)

아직 실행되지 않은 Stage X-1, X-2 작업을 로컬에서 실행한다.

#### G-1.a. ScenarioSelect.jsx 삭제 (W-14 완료 처리)

`frontend/src/components/ScenarioSelect.jsx`를 삭제한다.

삭제 전 확인:
  - 다른 파일에서 ScenarioSelect를 import하는지 확인. import 있으면 먼저 제거.
  - 확인 결과: search_files로 ScenarioSelect import 사용처 조회, App.jsx는 이미 import 안 함 (Stage F-1 확인).

#### G-1.b. PDF_SERVICE_RESPONSIBILITY.md 존재 확인 (W-18 완료 처리)

`docs/backend/PDF_SERVICE_RESPONSIBILITY.md`가 이미 로컬에 생성돼 있는지 확인한다.
  - 있으면: 내용 확인 후 그대로 둠
  - 없으면: 생성 (PRD §18 F-24 근거, output-contract.md §최종 결과 객체 근거 포함)

#### G-1.c. 수기 대체 경로 확인 (W-19)

`frontend/src/components/GenerateOutput.jsx`에 계산 실패 시 수기 대체 경로 문구가 있는지 확인한다.
  - scheduleCalc() 실패 시 `[수기 입력 필요 — 일정 계산 실패]` 문구가 markdown에 포함되면 이미 처리됨
  - 호출 측 fallback 동작 주석이 있으면 이미 처리됨
  - 둘 다 있으면 W-19 완료

### G-2. 커밋 준비

#### G-2.a. 커밋 대상 파일 정리

커밋할 파일을 결정한다. 포함할 것:
  - frontend/src/components 아래 신규/수정 컴포넌트 (Splash.jsx, QuickMemo.jsx, UserVerify.jsx, JobPostingOptional.jsx, InterviewInitialInfo.jsx, ContextReinstatement.jsx, FreeRecall.jsx, StructuralCue.jsx, ReverseRecall.jsx, TimelineReview.jsx, GenerateOutput.jsx)
  - frontend/src/lib 아래 신규 모듈 (extractCandidates.js, verifyLogic.js, objectiveFieldSchema.js, useStage.js, sessionStore.js)
  - frontend/src/App.jsx, App.css
  - docs/ 아래 신규 문서 (references/*.md 8개, assets/interview-result-template.md, backend/ACTIVE_MEMORY_SET_DEFINITION.md, backend/PDF_SERVICE_RESPONSIBILITY.md, prompts/stage-X-settlement.md)
  - scripts/schedule_calc.py
  - 기타 신규 파일 (frontend/build.js, next.config.js, next-env.d.ts, public/favicon.svg, vite.config.js 등 — v0.4 MVP에 필요한 것만)

커밋에서 제외할 것:
  - frontend/public/index.html.bak, frontend/public/prototype.html, landing.html (임시/프로토타입 파일)
  - package-lock.json 등 자동 생성 파일 (이미 추적 중이면 유지)

#### G-2.b. 커밋 메시지

커밋 메시지는 Conventional Commits 형식을 따른다.
예시: `feat: 면접 회상 워크플로 프론트엔드 구현 (W-01~W-20, Stage 0~X)`

포함할 내용:
  - 어떤 W-xx를 구현했는지 요약
  - Stage X-1/X-2에서 처리한 정리 작업 (ScenarioSelect.jsx 삭제, PDF_SERVICE_RESPONSIBILITY.md)

### G-3. 커밋

`git add`로 커밋 대상 파일을 staged 한다.
`git commit -m "<커밋 메시지>"`로 커밋한다.

커밋 전 확인:
  - git status로 커밋 대상 확인
  - git diff --stat으로 변경 규모 확인

### G-4. 푸시

`git push origin feat/splash-and-scenario`로 푸시한다.

푸시 후 확인:
  - `git status`로 로컬이 깨끗한지 확인
  - `gh pr list --head feat/splash-and-scenario`로 브랜치가 리모트에 반영됐는지 확인

## 완료 기준 (체크 가능)

- [ ]  ScenarioSelect.jsx가 로컬에서 삭제됨 (frontend/src/components/ScenarioSelect.jsx 존재하지 않음)
- [ ]  docs/backend/PDF_SERVICE_RESPONSIBILITY.md가 로컬에 존재함
- [ ]  GenerateOutput.jsx에 수기 대체 경로 문구 + fallback 주석이 있음
- [ ]  git status가 깨끗함 (커밋 후 tracked 파일 기준)
- [ ]  커밋이 성공함 (git log에 커밋 보임)
- [ ]  푸시가 성공함 (gh pr list / git branch -vv로 리모트 추적 확인)

## 범위 바깥

- 새 기능 구현
- PR 생성/머지 (푸시까지가 이 스테이지 범위, PR은 별도 결정)
- main 브랜치로의 직접 푸시 (feat/splash-and-scenario로만 푸시)
- W-01~W-20 기능 재구현

## 처리 완료 목록 (이 스테이지 종료 시)

처리 완료: Stage X-1, X-2 로컬 실행 완료, 커밋, 푸시

## 스테이지 종료 시 남길 것

- 로컬 git status 깨끗함
- feat/splash-and-scenario 브랜치가 리모트에 푸시됨
- 커밋 해시: (푸시 후 기록)

→ 이 결과가 PR 생성이나 머지 결정 시 참조된다.

---

# 루프 방지 가드

## 이미 완료된 건 다시 하지 않는다

- Stage A~K는 이미 로컬에서 실행 완료. 다시 실행하지 않는다.
- Stage X-1/X-2 중 이미 로컬에 반영된 건 확인만 하고 넘어간다 (PDF_SERVICE_RESPONSIBILITY.md 생성 여부, 수기 대체 경로 존재 여부).
- Stage X-1/X-2 중 아직 로컬에 반영 안 된 건 (ScenarioSelect.jsx 삭제) 지금 실행한다.

"이미 했으면 확인, 안 했으면 실행"으로 구분해서, 재실행 루프를 방지한다.

## 커밋 대상은 한 번만 정한다

커밋할 파일 목록을 G-2.a에서 한 번 정한다. 정했다면 변경 불가. "이건 빼자" "저건 넣자"를 반복하지 않는다. 애매하면 제외 쪽을 선택한다.

## 푸시는 한 번만

푸시는 G-4에서 한 번만 한다. 실패하면 오류 확인하고 한 번 재시도. 두 번 푸시하지 않는다 (같은 커밋을 중복 푸시하지 않음).

## 커밋 메시지는 정해진다

G-2.b에서 커밋 메시지를 정한다. 커밋 직전에 메시지를 바꾸지 않는다. 바꾸면 재작성이므로 루프 신호가 된다.

---

# 출력 형식

1. 가설 한 줄: "로컬 구현 내용을 깃허브에 반영했다."
2. Stage X-1/X-2 로컬 실행 결과: (삭제/생성/확인 각 결과)
3. 커밋 대상 파일 목록 (G-2.a에서 정한 것)
4. 커밋 해시
5. 푸시 결과 (성공/실패, 실패 시 오류)
6. git status 결과 (깨끗한지)

---

# 주의

- ScenarioSelect.jsx 삭제 전 import 사용처를 반드시 확인한다. import가 남아있는 상태에서 삭제하면 빌드 오류.
- PDF_SERVICE_RESPONSIBILITY.md는 이미 로컬에 있을 가능성이 높다 (이전 세션에서 생성 보고됨). 확인 먼저, 생성은 없을 때만.
- 푸시 실패 시 (예: 리모트 브랜치가 더 앞서있음) pull/rebase가 필요할 수 있다. 이 경우 푸시 재시도 전에 상태를 확인하고, 필요한 경우만 pull 한다. 무작정 force push 하지 않는다.
- PR 생성은 이 스테이지 범위 밖. 푸시까지 하고, PR은 별도 결정.
