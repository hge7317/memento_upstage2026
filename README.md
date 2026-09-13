 Mokdong src/components/Splash.jsx
{{ filePath: "/Users/minseoklee/Documents/Hermes/upstage/frontend/src/components/Splash.jsx" }}
# memory-replay
면접·분실·미팅 등 녹취 없는 사건 직후, 사용자가 자신의 기억을 오염 없이 꺼내고 확인하도록 돕는 회상 워크플로 웹 MVP.

- PRD: [docs/PRD_v0.2.md](docs/PRD_v0.2)
- 팀 규칙: [docs/GITHUB_TEAM_RULES.md](docs/GITHUB_TEAM_RULES.md)
- 상태 모델: [docs/STATE_MODEL.md](docs/STATE_MODEL.md)
- UX 문구: [docs/UX_STRINGS.md](docs/UX_STRINGS.md)
- QA 시나리오: [docs/QA_SCENARIOS.md](docs/QA_SCENARIOS.md)

## 개발 우선순위

- P0: 스플래시, 상황 탭, 빠른 메모, 후보 추출, O/X 검증, 면접 Step 1·Step 2, 면접 Markdown 결과
- P1: 분실물 찾기, 미팅 복기, PDF 결과, 모바일 최적화, 오류 복구·삭제·품질 로그
- P2: 음성 입력, D+1 추가 회상, 발표·심사 탭, 상황 탭 원격 설정

## 저장소 구조

```
frontend/     # 웹 UI (모배일 우선)
backend/      # 회상 엔진(스켈레톤)
docs/         # PRD, 가이드, UX 문구, 상태 모델, QA
scripts/      # 보조 스크립트
assets/       # 정적 자산
```

## 시작 방법

```bash
git clone https://github.com/hge7317/memento_upstage2026.git
cd memento_upstage2026
```

## Solar 연동
- Solar Pro 4 호출은 백엔드 이슈로 분리한다.
- 초기에는 프론트 상태 머신과 회상 흐름 위주로 개발한다.
