# 활성 기억 집합 정의 (ACTIVE_MEMORY_SET)

이 문서는 Memory Replay에서 "사용 가능한 기억 정보"의 범위를 정의한다.
여러 단계(STRUCTURAL_CUE, REVERSE_RECALL, TIMELINE_REVIEW, GENERATE_OUTPUT)에서
질문·타임라인·결과를 만들 때 이 집합의 항목만 사용한다.

## 정의

```
ACTIVE_MEMORY_SET =
  { item ∈ candidateItems ∪ newMemoryItems
    | item.verification ∈ { CONFIRMED, EDITED, UNKNOWN } }
```

즉:

- `CONFIRMED` (O — 맞음): 포함
- `EDITED` (수정 후 확인): 포함 (AI 원문 대신 사용자 수정본 사용)
- `UNKNOWN` (? — 모름): 포함 (불확실성 보존, 가능성을 유지한 채 명료화 가능)
- `PENDING`: 제외 (아직 검증 전)
- `REJECTED` (X — 아님 / 이런 내용 없음): 제외

## 근거

- PRD §8 (사용자 검증 반영)
  - REJECTED(이런 내용 없음 포함)는 활성 기억 집합에서 제거
  - EDITED는 사용자 수정본만 사용, AI 원문은 출처 기록에만 남김
  - UNKNOWN은 불확실 상태로 유지
- docs/references/guardrails.md §4 (후보 검증 규칙)
  - CONFIRMED: 질문 전제로 사용 가능
  - EDITED: 사용자 수정본만 사용 가능
  - UNKNOWN: 가능성을 유지한 채 명료화 가능
  - REJECTED: 질문·타임라인·결과에서 사용 금지
- docs/references/candidate-extraction.md §카드 스키마
  - 후보는 PENDING으로 시작, USER_VERIFY에서 상태 확정

## "검증된 기억 요소 수" 계산

PRD §5.4 STRUCTURAL_CUE 종료 조건, §5.3 STRUCTURAL_CUE 완료 조건에서 언급하는
"검증된 기억 요소 수"는 다음 기준으로 센다:

```
검증된 기억 요소 수 =
  | { item ∈ ACTIVE_MEMORY_SET } |
```

- PENDING 후보나 REJECTED 후보는 세지 않음
- UNCERTAIN이라도 CONFIRMED 계열(CONFIRMED / EDITED / UNKNOWN)이면 셈
- newMemoryItems 중 verification이 CONFIRMED/EDITED/UNKNOWN인 항목도 포함

## 사용 예

- STRUCTURAL_CUE 질문 상한 = 검증된 기억 요소 수 + 3, 최대 12
-STRUCTURAL_CUE, REVERSE_RECALL에서 새 질문 생성 시 ACTIVE_MEMORY_SET 항목만 전제
- TIMELINE_REVIEW에서 타임라인·평가·빈 구간 구성 시 ACTIVE_MEMORY_SET 사용
- GENERATE_OUTPUT에서 결과 문서 구성 시 ACTIVE_MEMORY_SET 사용

## 주의

- REJECTED 후보를 실수로 사용하지 않도록, 질문 생성·결과 생성 시 ACTIVE_MEMORY_SET을 명시적으로 필터링한다.
- ACTIVE_MEMORY_SET은 USER_VERIFY 완료 후 확정된다.
- USER_VERIFY 완료 전에는 ACTIVE_MEMORY_SET = ∅ (아직 검증된 항목 없음) — 이 경우 질문 상한은 기본값 적용.
