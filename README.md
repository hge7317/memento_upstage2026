# Memento · Memory Replay

면접 직후의 기억을 입력하고 후보 확인·회상·타임라인 검토를 거쳐 복기 기록으로 정리하는 웹 앱입니다.

## 구조

- `frontend-v5/`: React + Vite 프론트엔드. 배포 루트 이름을 유지합니다.
- `backend/`: Express API와 Solar 호출. 로컬 서버와 Vercel 진입점을 분리합니다.
- `docs/references/`, `docs/backend/`: 회상 안전 규칙과 설계 명세.
- `memory_replay_skill/memory-replay-dev/`: 회상 스킬 원본 한 벌.
- `docs/archive/`: 이전 구현·프롬프트·설계 이력. 현재 구현 상태를 설명하는 문서가 아닙니다.

제품 명세는 [PRD](Memory-Replay_Development_PRD_v0.4.md), 협업 규칙은 [GitHub 팀 규칙](docs/GITHUB_TEAM_RULES.md), 검토 항목은 [리뷰 체크리스트](docs/guides/REVIEW_CHECKLIST.md)를 참고합니다. 명세의 모든 기능이 구현된 것은 아닙니다.

## 로컬 실행

Node.js 20 이상이 필요합니다. 프로젝트 루트에서 의존성을 각각 설치합니다.

```sh
npm --prefix frontend-v5 ci
npm --prefix backend ci
cp frontend-v5/.env.example frontend-v5/.env.local
cp backend/.env.example backend/.env
```

`backend/.env`의 `SOLAR_API_KEY`를 설정합니다. 키는 서버에만 보관합니다. 터미널 두 개에서 각각 실행합니다.

```sh
# 터미널 1: 프로젝트 루트
npm run dev

# 터미널 2
cd backend
node --env-file=.env src/server.js
```

프론트엔드는 `http://localhost:3005`, 백엔드는 `http://localhost:3001`입니다. `npm run dev:backend`는 이미 셸에 설정된 환경 변수를 사용하며 `.env`를 자동으로 읽지 않습니다.

`VITE_API_BASE`를 생략하면 기존 배포 API 주소를 사용합니다. 로컬 백엔드 검증 시 `.env.local`을 설정하고 프론트엔드를 재시작하세요. Vite 환경 변수는 빌드 시 반영됩니다.

## 검증

```sh
npm test
npm run build
npm run preview -- --port 3005
```

테스트는 외부 Solar API 호출 없이 계약·오류 처리·기록 상태를 검증합니다. 빌드 성공과 실제 Solar 응답 또는 전체 브라우저 동작 검증은 별개입니다.

## 현재 구현의 한계

- 로그인은 데모 흐름이며 인증·DB 저장은 구현되지 않았습니다.
- 기록은 브라우저 실행 중 메모리에 보관됩니다. 새로고침하면 입력 기록이 사라지고 예시 기록이 다시 생성됩니다.
- 삭제는 휴지통 이동이며 영구 삭제·30일 자동 만료는 구현되지 않았습니다.
- 후보 추출은 로컬 규칙 기반입니다. 회상 질문과 공고 분석은 Solar API를 사용합니다.
- 회상 API 실패 시 정적 질문으로 대체되는 기존 동작이 있습니다.
- 타임라인에는 후보 순서로 계산하는 예시 시각이 남아 있습니다. 실제 사건 시각으로 신뢰하면 안 됩니다.
- 문서 생성 대기 화면은 타이머 기반이며 PDF 생성·서버 저장을 뜻하지 않습니다.

2026-09-17 정리 범위와 검증 기록은 [정리 보고서](docs/CLEANUP_20260917.md)를 참고하세요.
