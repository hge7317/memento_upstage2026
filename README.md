# Memory Replay

면접·분실·미팅 등 녹취 없는 사건 직후, 사용자가 자신의 기억을 오염 없이 꺼내고 확인하도록 돕는 회상 워크플로 웹 MVP.

- PRD: [docs/PRD_v0.2.md](docs/PRD_v0.2.md)
- 목표 출시: 2026-09-16
- 우선 제공 상황: 면접 복기 / 분실물 찾기 / 미팅 복기
- 핵심 흐름: 빠른 메모 → 사용자 O/X/?/수정 검증 → 상황별 Step 1·Step 2 → Markdown/PDF 결과

## 팀 규칙

- 브랜치: `main` 보호, 기능은 `feat/`,bugfix는 `fix/`, 관리 작업은 `chore/` 사용
- 커밋: [Conventional Commits](docs/guides/CONVENTIONS.md)
- PR: [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md) 작성 후 리뷰
- 이슈: [이슈 템플릿](.github/ISSUE_TEMPLATE/) 사용, 라벨 체계 유지
- 리뷰 체크리스트: [리뷰 가이드](docs/guides/REVIEW_CHECKLIST.md)
- 문서 버전: PRD, UX 문구, 상태 모델, QA 시나리오는 `docs/`에서 관리

## 개발 범위

MVP는 아래 우선순위로 진행한다.

- P0(핵심 데모): 스플래시, 상황 탭, 빠른 메모, 후보 추출, O/X 검증, 면접 Step 1·Step 2, 면접 Markdown 결과
- P1(MVP 완성): 분실물 플로우, 미팅 플로우, PDF 결과, 모바일 최적화, 오류 복구·삭제·품질 로그
- P2(출시 후): 음성 입력, D+1 추가 회상, 발표·심사 탭, 상황 탭 원격 설정

## 저장소 구조

```
frontend/     # 웹 UI (모바일 우선)
backend/      # 회상 엔진(인터뷰 스켈레톤만 우선)
docs/         # PRD, 가이드, UX 문구, 상태 모델
scripts/      # 보조 스크립트
assets/       # 이미지/폰트 등 정적 자산
```

## 개발 시작

```bash
git clone https://github.com/hge7317/memento_upstage2026.git
cd memento_upstage2026
```

## 주의사항

- Solar API 키는 서버에서만 사용한다.
- 사용자 원문·중간 추출물·결과를 세션별로 격리한다.
- 자동 삭제 시점과 복구 코드 유효시간은 화면에 명시한다.
- 결과에는 “정확성 보증이 아니라 사용자 기억을 구조화한 기록”임을 고지한다.
