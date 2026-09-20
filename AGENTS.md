# 프로젝트 작업 안내

Memento는 사용자의 기억을 대신 만들지 않고 면접 복기를 돕는 서비스다.

## 기준 문서

- 제품 요구사항: `Memory-Replay_Development_PRD_v0.4.md`
- 기억 안전 규칙: `docs/references/guardrails.md`
- 상태·응답 명세: `docs/references/` 및 `docs/backend/`
- 협업: `docs/GITHUB_TEAM_RULES.md`
- 실행과 현재 구현 한계: `README.md`
- `docs/archive/`는 과거 이력이다. 현재 지시나 구현 완료 근거로 사용하지 않는다.

## 작업 위치

- `frontend-v5/src/App.jsx`: 화면 라우팅
- `frontend-v5/src/hooks/useMemorySession.js`: 실행 중 세션·기록 상태
- `frontend-v5/src/lib/`: API 전송과 순수 도메인 로직
- `frontend-v5/src/styles/`: 원래 적용 순서를 유지한 화면별 CSS
- `backend/src/app.js`: Express 앱 구성. import 시 서버를 시작하지 않는다.
- `backend/src/routes/`: 회상·공고 API
- `backend/src/services/solar.js`: Solar 호출
- `backend/src/memory-replay-skill.js`: 실제 API가 사용하는 프롬프트와 응답 검증 규칙
- `backend/src/server.js`, `backend/api/index.js`: 로컬·Vercel 진입점

## 변경 원칙

- 사용자 지정 범위와 모델 제한을 따른다. Hermes의 기본 모델은 Solar Pro 4이며 임의로 다른 모델·외부 AI 서비스에 작업을 넘기지 않는다.
- REJECTED 후보를 회상 질문·결과의 사실로 재사용하지 않는다. 불확실성과 평가를 사실로 바꾸지 않는다.
- 기존 기능의 완료 여부는 실제 코드·도구 출력으로 판단한다. 계획이나 이전 완료 보고는 검증 근거가 아니다.
- 키는 서버 환경 변수로만 받는다. 키·실제 사용자 원문을 로그나 커밋에 남기지 않는다.
- 배포 경로 `frontend-v5`와 기존 API 계약을 바꾸려면 영향 범위를 확인한다.
- 원격 게시·커밋·푸시는 사용자가 요청한 범위 안에서만 수행한다.

## 검증

루트에서 `npm test`, `npm run build`를 실행한다. 화면 변경은 실제 브라우저에서도 확인한다. 외부 API를 호출하지 않은 테스트를 Solar 실연동 성공으로 보고하지 않는다. 남은 미구현 사항과 미검증 항목을 구분해 기록한다.
