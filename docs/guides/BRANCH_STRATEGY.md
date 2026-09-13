# Git 브랜치 전략

## 기본 규칙

- `main`은 항상 배포 가능한 상태를 유지한다.
- `main` 직접 푸시는 허용하지 않는다.
- 모든 기능은 브랜치에서 작업한 뒤 PR로 병합한다.
- PR은 1인 이상 리뷰 후 병합한다.

## 브랜치 이름

```
feat/<간략설명>
fix/<간략설명>
chore/<간략설명>
docs/<간략설명>
```

예시:
- `feat/quick-memo-candidate-flow`
- `fix/interview-timeline-empty-state`
- `chore/setup-vercel-project`

## 병합 방식

- PR 병합은 squash merge를 기본으로 한다.
- 병합 후 로컬 브랜치는 삭제한다.

## 보호 규칙(권장)

- `main` 브랜치 보호 활성화
- PR 리뷰 승인 1회 이상
- CI 통과 후 병합(설정되는 경우)
- 강제 푸시 금지
