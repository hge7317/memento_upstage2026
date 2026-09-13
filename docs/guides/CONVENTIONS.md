# 커밋 컨벤션 (Conventional Commits)

## 형식

```
<타입>(<범위>): <요약>

<본문>

<꼬리말>
```

요약은 한국어 또는 영어 모두 허용한다. 팀 내에서 한 가지로 통일하는 것을 권장한다.

## 타입

| 타입 | 용도 |
|---|---|
| feat | 새로운 기능 |
| fix | 버그 수정 |
| docs | 문서만 변경 |
| style | 포맷, 세미콜론, 공백 등 코드 의미 변경 없는 수정 |
| refactor | 동작을 바꾸지 않는 코드 재구성 |
| perf | 성능 개선 |
| test | 테스트 추가·수정 |
| chore | 빌드, 설정, 의존성, 스크립트 등 유지보수 작업 |
| ui | 화면·UX·카피 변경(기능 로직 변경 없음) |

## 범위(선택)

범위는 짧게 표시한다. 예: `candidate`, `quick-memo`, `objective-frame`, `interview`, `lost-item`, `meeting`, `output`, `pdf`, `session`, `kvsession`.

예:
- `feat(candidate): O/X/수정/모름 검증 카드 렌더링`
- `fix(quick-memo): 긴 입력 제출 시 원문 유실 방지`
- `docs(prd): v0.2 반영 및 미결정 사항 정리`

## 규칙

- 한 커밋은 한 가지 변경만 담는다.
- PR merges는 squash merge를 기본으로 한다.
- `main` 직접 커밋은 금지한다.
- 커밋 메시지에 민감정보를 적지 않는다.
