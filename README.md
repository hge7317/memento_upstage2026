# Memory Replay

녹취 없는 사건 직후, 사용자의 기억을 AI가 대신 만들지 않고 단계적으로 인출해 복기노트·인출 카드·재연습 일정으로 만드는 회상 무결성 에이전트 서비스.

- PRD: [docs/PRD_v0.4.md](docs/PRD_v0.4.md)
- 현재 제공 상황: 면접 복기 (v0.4.0-dev)
- 우선 제공: 면접 직후 복기

## 팀 규칙

- 브랜치: `main` 보호, 기능별 `feat/`, 버그 `fix/`, 문서 `docs/`
- 커밋: [Conventional Commits](docs/team-rules.md#commit)
- PR: 템플릿 작성 후 리뷰 1인 이상 승인
- 코드 리뷰 체크리스트: [docs/review-checklist.md](docs/review-checklist.md)
- 라벨: `p0`, `feat`, `bug`, `docs` 등

## 개발 우선순위

- P0: 스플래시, 상황 탭, 빠른 메모, 후보 추출, O/X 검증, 면접 Step1/Step2, 면접 Markdown 결과
- P1: 분실물/미팅 플로우, PDF 결과, 모바일 최적화, 오류 복구·삭제·품질 로그
- P2: 음성 입력, D+1 추가 회상, 발표·심사 탭, 상황 탭 원격 설정

## 저장소 구조

```text
frontend/     # 웹 UI, 상태 관리, 로컬 저장 유틸리티
backend/      # 목업 데이터, API 인터페이스 초안
docs/         # PRD, 팀 규칙, 상태 모델, UX 문구, QA
```
frontend/
backend/
docs/
.github/
scripts/
```

## 시작하기

```bash
git clone https://github.com/hge7317/memento_upstage2026.git
cd memento_upstage2026/frontend
npm install
npm run dev
```

## Solar 연동 메모

- Solar Pro 4 호출은 백엔드 이슈로 분리한다.
- 초기 단계는 프론트 상태 머신 + 목업 응답으로 진행한다.
