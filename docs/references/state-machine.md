# 통합 원본: references/state-machine.md

## 상태 순서

```text
SPLASH
→ QUICK_MEMO
→ EXTRACT_CANDIDATES
→ USER_VERIFY
→ JOB_POSTING_OPTIONAL
→ INTERVIEW_INITIAL_INFO
→ CONTEXT_REINSTATEMENT
→ FREE_RECALL
→ STRUCTURAL_CUE
→ REVERSE_RECALL
→ TIMELINE_REVIEW
→ GENERATE_OUTPUT
→ COMPLETE
```

## 원칙

- 런타임이 전달한 `stage`의 작업만 수행한다.
- 상태 전이는 백엔드가 승인한다. 스킬은 `nextStage`를 제안할 수 있지만 임의로 건너뛰지 않는다.
- 사용자 입력은 응답 생성 전에 서비스가 보존한다.
- 사용자는 회상 단계에서 언제든 `TIMELINE_REVIEW`로 조기 종료할 수 있다.
- 같은 `sessionId`와 저장된 상태가 제공된 경우에만 이어서 진행한다. 과거 세션을 추측하거나 검색하지 않는다. 재개 시 마지막 미완료 상태부터 시작하고 이전 질문을 중복하지 않는다.

## 상태 정의

| 상태 | 스킬의 작업 | 완료 조건 | 다음 상태 |
|---|---|---|---|
| `SPLASH` | 생성 작업 없음 | 서비스가 표시 완료 | `QUICK_MEMO` |
| `QUICK_MEMO` | 입력 안내 제공, 사진·문서 업로드 안내 | 메모 제출 또는 기억 안 남 선택 | `EXTRACT_CANDIDATES` |
| `EXTRACT_CANDIDATES` | 후보 분해·분류, 사진·문서 파스 입력 반영 | 추출 응답 성공 또는 빈 후보 허용 | `USER_VERIFY` |
| `USER_VERIFY` | O/X/?/수정/이런 내용 없음으로 검증 상태 반영 | 모든 후보가 PENDING 아님 | `JOB_POSTING_OPTIONAL` |
| `JOB_POSTING_OPTIONAL` | 잡포스팅 URL 선택 입력 안내 | 입력 또는 건너뛰기 | `INTERVIEW_INITIAL_INFO` |
| `INTERVIEW_INITIAL_INFO` | 면접 기본 정보 요청 | 값 또는 모름/비공개 입력 | `CONTEXT_REINSTATEMENT` |
| `CONTEXT_REINSTATEMENT` | 구조적 맥락 질문 하나 | 응답 또는 넘기기 | `FREE_RECALL` |
| `FREE_RECALL` | 자유 서술 질문 하나 | 서술 완료 표시 | `STRUCTURAL_CUE` |
| `STRUCTURAL_CUE` | 단서·명료화 질문 하나씩 | 질문 상한, 새 정보 없음, 사용자 완료, 사다리 소진 | `REVERSE_RECALL` |
| `REVERSE_RECALL` | 마지막부터 거꾸로 질문 | 사용자 응답 또는 넘기기 | `TIMELINE_REVIEW` |
| `TIMELINE_REVIEW` | 기억·평가·불확실성 구조 반환 | 사용자 수정·확인 완료 | `GENERATE_OUTPUT` |
| `GENERATE_OUTPUT` | 면접 최종 콘텐츠 생성 | 구조화 결과 생성 | `COMPLETE` |
| `COMPLETE` | 추가 생성 없음 | 세션 종료 | 종료 |

## 주요 전이 규칙

### QUICK_MEMO → EXTRACT_CANDIDATES

- 메모 원문을 변경하지 않는다.
- `기억이 잘 안 남`이면 빈 원문과 해당 사용자 선택을 함께 보존한다.

### EXTRACT_CANDIDATES → USER_VERIFY

- 모든 후보는 `PENDING`으로 시작한다.
- 후보가 없으면 직접 추가하거나 빈 검증 집합으로 완료한다. 이후 `JOB_POSTING_OPTIONAL`을 거쳐 `INTERVIEW_INITIAL_INFO`로 진행한다.
- 후보 추출이 과도하게 많거나 원문이 너무 작아 분해 의미가 없으면, **분해 실패 원인으로 원문을 삭제하지 않고** 원문 유지 + 후보 적음 + 직접 추가 가능 상태를 함께 반환한다.

### USER_VERIFY 완료 후

- `PENDING` 후보가 없어야 한다.
- `REJECTED`와 `이런 내용 없음`은 활성 기억 집합에서 제거한다.
- `UNKNOWN`은 불확실 상태로 유지한다.
- 검증 완료 후 잡포스팅 URL 선택 입력(`JOB_POSTING_OPTIONAL`)을 지나고, 이어서 면접 기본 정보(`INTERVIEW_INITIAL_INFO`)를 요청한다. 면접 기본 정보는 회상 맥락과 결과 생성의 프레임이며 실제 사건 내용의 정답지가 아니다.

### INTERVIEW_INITIAL_INFO → 회상

- 면접 기본 정보 필드가 사용자 입력, 범위, 모름/비공개 중 하나를 가진다.
- 첨부자료는 `sealedAttachment: true`를 유지한다. 단, 빠른 메모 단계에서 제공된 사진은 후보 추출 및 회상 질문 생성 입력으로 사용할 수 있다(5.5 자료 구분 규칙 적용).

### STRUCTURAL_CUE 종료

다음 중 하나면 종료한다.

- 사용자가 완료를 선택함
- 회상 질문 상한에 도달함
- 단서 사다리 소진 후 새 기억이 없음
- 세션 시간 제한에 가까움

질문 상한 기본값은 **검증된 기억 요소 수 + 3, 최대 12**다. 서비스 설정이 더 낮으면 서비스 값을 따른다.

### 사다리 소진 후 두 번 연속 기억 안 남

사용자가 두 번 연속 `모름` 또는 `기억 안 남`이라고 하면 다음 순서로만 처리한다.

1. 아직 사용하지 않은 다음 구조 단서가 있으면, 그 단서 하나만 제시한다.
2. 다음 미사용 단서가 없으면, 현재 내용으로 결과 만들기(`TIMELINE_REVIEW` 진입 제안)를 제공한다.

같은 단서를 반복하지 않는다. 반복 금지 검사 단위는 **단서 범주**다. 시간/공간·감각/행동 중 이미 실패 또는 소진으로 표시된 범주는 다시 제시하지 않는다. 질문 텍스트가 완전히 같아도 범주 재사용이면 반복으로 본다.

### 조기 완료

`CONTEXT_REINSTATEMENT`부터 `REVERSE_RECALL` 사이에 사용자가 종료를 원하면 즉시 `TIMELINE_REVIEW`를 제안한다. 누락된 단계를 억지로 수행하지 않는다.

## 첨부자료와 배경 자료의 구분

- 빠른 메모용 사진·Document Parse 텍스트는 후보 추출과 회상 질문 생성에 사용할 수 있다. 추출 후보는 사용자 검증을 거치며 자동으로 사실이 되지 않는다.
- `REJECTED` 후보는 사진·파스 원문에 남아 있더라도 질문·결과에 다시 유입하지 않는다.
- 면접 준비자료는 봉인 대상이다. `TIMELINE_REVIEW` 확정 후 사용자가 대조에 명시적으로 동의한 경우에만 본문을 연다. 대조 결과는 별도 섹션에 둔다.
- 자료의 용도가 불명확하면 빠른 메모용 기록인지 준비자료인지 사용자에게 확인한 뒤 처리한다.
- 준비자료 조기 열람 요청은 즉시 실행하지 않는다. 회상에 영향을 줄 수 있음을 안내하고, 대조 동의는 회상 종료 후 받는다.
- 잡포스팅은 선택적 배경 자료다. 필요하면 중립적인 회상 질문의 맥락으로 활용하되 공고 내용이 실제 면접에서 발생했다고 전제하지 않는다.
- 배경 자료와 사용자의 기억은 출처를 구분한다. 공고만을 근거로 기억 후보를 만들지 않는다.
- `sealedAttachment`는 봉인 대상 준비자료의 상태를 뜻한다. `attachmentsUnsealedAt`은 실제 봉인 해제 시각이며, 요청·동의 시각과 혼용하지 않는다.
