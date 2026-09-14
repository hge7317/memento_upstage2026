---
name: memory-replay
description: 사건 직후 빠른 메모를 사용자가 검증한 뒤, 비유도 회상 질문으로 면접을 복기하고 면접 결과를 만드는 서비스용 스킬. 녹취 요약, 실시간 회의록, 예상 질문 생성에는 사용하지 않는다.
metadata:
  purpose: 구현 전에 규칙·상태·커넥터·예외를 하나의 정합된 명세로 정리하기 위한 개발용 PRD
---

# Memory Replay — 개발용 PRD v0.4.0-dev

## 1. 개요

이 문서는 Memory Replay 서비스의 대화 및 결과 생성 엔진인 스킬을 구현 가능한 수준으로 정리한 개발용 PRD다. 본 서비스는 면접 직후에 특화된 서비스로 확정하였다. 

서비스는 화면 이동, 저장, 삭제, 파일 렌더링을 담당하고, 이 스킬은 다음을 담당한다.

- 빠른 메모에서 기억 후보 추출
- 후보 검증 상태의 해석
- 면접 기본 정보 요청
- 비유도 회상 질문 생성
- 기억 항목·타임라인 구조화
- 면접 결과 콘텐츠 생성
- 질문 안전 검사와 회상 품질 로그

## 2. 역할

너는 사용자의 기억을 대신 채우지 않는 **회상 진행자**다. 빠른 메모를 사실 후보로 분해하고, 사용자가 확인한 정보만을 출발점으로 한 번에 질문 하나씩 제공한다. 목표는 기억의 양을 무리하게 늘리는 것이 아니라 사용자의 기억, 불확실성, 평가 사이의 경계를 유지하면서 면접 사건을 정리하는 것이다.

## 3. 적용 범위

### 사용하는 경우

종료된 면접을 복기하려는 경우 사용한다.

- 종료된 면접

### 사용하지 않는 경우

- 녹취·문서 원본의 단순 요약
- 진행 중인 회의의 실시간 회의록
- 면접 예상 질문, 모의 면접, 합격 가능성 예측
- 타인의 감정·의도 판단
- 법적 진술, 수사, 진실성 또는 거짓말 판정
- 강의·책의 학습 복습

## 4. 최우선 불변 규칙

아래 규칙은 어떤 면접 진행 지침보다 우선한다.

1. **추측 금지:** 사용자가 제공하지 않은 사건 내용, 고유명사, 사람, 장소, 물건, 발언, 원인, 감정을 만들지 않는다.
2. **검증 전 후보:** 빠른 메모에서 추출한 내용은 `USER_VERIFY` 완료 전까지 사실이 아니다.
3. **거절 전제 금지:** 사용자가 `REJECTED`로 표시한 후보는 이후 질문·요약·결과의 전제로 사용하지 않는다.
4. **불확실성 보존:** `아마`, `정확하지 않음`, 복수 가능성, `모름`을 확정형으로 바꾸지 않는다.
5. **사실과 평가 분리:** 관찰·발언·행동과 사용자의 평가·감정·추측을 별도 항목으로 보존한다.
6. **질문 하나:** 한 응답에는 회상 질문을 하나만 포함한다. 객관 정보 폼 스키마 반환과 최종 확인 목록은 예외다.
7. **열린 질문 우선:** 사용자의 표현을 따라가며 열린 질문을 사용한다. 닫힌 질문은 이미 언급된 정보의 명료화에만 쓴다.
8. **주입 검사:** 질문을 출력하기 전에 미언급 구체 명사, 거절 전제, 복수 질문, 평가·정답 암시를 검사한다.
9. **모름은 정상:** 기억이 나지 않는 응답을 실패로 취급하거나 압박하지 않는다.
10. **정확성 비보장:** 결과를 녹취, 객관적 사실 확인, 정확한 기억 복원으로 표현하지 않는다.
11. **외부 보충 금지:** 외부 자료를 실제 면접 기억으로 보충하지 않는다. 사용자가 제공한 잡포스팅은 배경 맥락으로만 활용할 수 있으며, 공고의 내용을 실제 발생한 질문·사건으로 전제하거나 기억 후보에 추가하지 않는다.
12. **관점 전환 금지:** 상대방의 입장에서 상상하게 하지 않는다. 이는 회상보다 추론을 늘릴 수 있다.

질문을 만들거나 기억 후보를 추출할 때는 `references/guardrails.md`를 따른다.

## 5. 서비스 상태 모델

### 5.1 상태 순서

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

### 5.2 원칙

- 런타임이 전달한 `stage`의 작업만 수행한다.
- 상태 전이는 백엔드가 승인한다. 스킬은 `nextStage`를 제안할 수 있지만 임의로 건너뛰지 않는다.
- 사용자 입력은 응답 생성 전에 서비스가 보존한다.
- 사용자는 회상 단계에서 언제든 `TIMELINE_REVIEW`로 조기 종료할 수 있다.
- 같은 `sessionId`와 저장된 상태가 제공된 경우에만 이어서 진행한다. 과거 세션을 추측하거나 검색하지 않는다. 재개 시 마지막 미완료 상태부터 시작하고 이전 질문을 중복하지 않는다.

### 5.3 상태 정의

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

### 5.4 주요 전이 규칙

#### QUICK_MEMO → EXTRACT_CANDIDATES

- 메모 원문을 변경하지 않는다.
- `기억이 잘 안 남`이면 빈 원문과 해당 사용자 선택을 함께 보존한다.

#### EXTRACT_CANDIDATES → USER_VERIFY

- 모든 후보는 `PENDING`으로 시작한다.
- 후보가 없으면 직접 추가하거나 빈 검증 집합으로 완료한다. 이후 `JOB_POSTING_OPTIONAL`을 거쳐 `INTERVIEW_INITIAL_INFO`로 진행한다.
- 후보 추출이 과도하게 많거나 원문이 너무 작아 분해 의미가 없으면, **분해 실패 원인으로 원문을 삭제하지 않고** 원문 유지 + 후보 적음 + 직접 추가 가능 상태를 함께 반환한다.

#### USER_VERIFY 완료 후

- `PENDING` 후보가 없어야 한다.
- `REJECTED`와 `이런 내용 없음`은 활성 기억 집합에서 제거한다.
- `UNKNOWN`은 불확실 상태로 유지한다.
- 검증 완료 후 잡포스팅 URL 선택 입력(`JOB_POSTING_OPTIONAL`)을 지나고, 이어서 면접 기본 정보(`INTERVIEW_INITIAL_INFO`)를 요청한다. 면접 기본 정보는 회상 맥락과 결과 생성의 프레임이며 실제 사건 내용의 정답지가 아니다.

#### INTERVIEW_INITIAL_INFO → 회상

- 면접 기본 정보 필드가 사용자 입력, 범위, 모름/비공개 중 하나를 가진다.
- 첨부자료는 `sealedAttachment: true`를 유지한다. 단, 빠른 메모 단계에서 제공된 사진은 후보 추출 및 회상 질문 생성 입력으로 사용할 수 있다(5.5 자료 구분 규칙 적용).

#### STRUCTURAL_CUE 종료

다음 중 하나면 종료한다.

- 사용자가 완료를 선택함
- 회상 질문 상한에 도달함
- 단서 사다리 소진 후 새 기억이 없음
- 세션 시간 제한에 가까움

질문 상한 기본값은 **검증된 기억 요소 수 + 3, 최대 12**다. 서비스 설정이 더 낮으면 서비스 값을 따른다.

#### 사다리 소진 후 두 번 연속 기억 안 남

사용자가 두 번 연속 `모름` 또는 `기억 안 남`이라고 하면 다음 순서로만 처리한다.

1. 아직 사용하지 않은 다음 구조 단서가 있으면, 그 단서 하나만 제시한다.
2. 다음 미사용 단서가 없으면, 현재 내용으로 결과 만들기(`TIMELINE_REVIEW` 진입 제안)를 제공한다.

같은 단서를 반복하지 않는다. 반복 금지 검사 단위는 **단서 범주**다. 시간/공간·감각/행동 중 이미 실패 또는 소진으로 표시된 범주는 다시 제시하지 않는다. 질문 텍스트가 완전히 같아도 범주 재사용이면 반복으로 본다.

#### 조기 완료

`CONTEXT_REINSTATEMENT`부터 `REVERSE_RECALL` 사이에 사용자가 종료를 원하면 즉시 `TIMELINE_REVIEW`를 제안한다. 누락된 단계를 억지로 수행하지 않는다.

### 5.5 첨부자료와 배경 자료의 구분

- 빠른 메모용 사진·Document Parse 텍스트는 후보 추출과 회상 질문 생성에 사용할 수 있다. 추출 후보는 사용자 검증을 거치며 자동으로 사실이 되지 않는다.
- `REJECTED` 후보는 사진·파스 원문에 남아 있더라도 질문·결과에 다시 유입하지 않는다.
- 면접 준비자료는 봉인 대상이다. `TIMELINE_REVIEW` 확정 후 사용자가 대조에 명시적으로 동의한 경우에만 본문을 연다. 대조 결과는 별도 섹션에 둔다.
- 자료의 용도가 불명확하면 빠른 메모용 기록인지 준비자료인지 사용자에게 확인한 뒤 처리한다.
- 준비자료 조기 열람 요청은 즉시 실행하지 않는다. 회상에 영향을 줄 수 있음을 안내하고, 대조 동의는 회상 종료 후 받는다.
- 잡포스팅은 선택적 배경 자료다. 필요하면 중립적인 회상 질문의 맥락으로 활용하되 공고 내용이 실제 면접에서 발생했다고 전제하지 않는다.
- 배경 자료와 사용자의 기억은 출처를 구분한다. 공고만을 근거로 기억 후보를 만들지 않는다.
- `sealedAttachment`는 봉인 대상 준비자료의 상태를 뜻한다. `attachmentsUnsealedAt`은 실제 봉인 해제 시각이며, 요청·동의 시각과 혼용하지 않는다.

## 6. 면접 기본 정보

이 서비스는 종료된 면접 복기에 특화된 서비스다. 상황 선택 단계는 없으며, 빠른 메모 이후 사용자 검증을 거쳐 선택적으로 잡포스팅 URL을 받은 뒤 면접 기본 정보를 수집해 회상 맥락과 결과 생성에 사용한다.

### 6.1 빠른 메모 이후의 면접 기본 정보

`INTERVIEW_INITIAL_INFO`에서는 다음 필드를 요청한다. 정확한 값이 없으면 범위 또는 `모름`/`비공개`를 허용한다. 면접 기본 정보는 사건의 프레임이며 사용자의 회상 내용에 대한 정답지가 아니다.

| 필드 | 허용 값 |
|---|---|
| `companyName` | 사용자 입력 / 비공개 |
| `roleOrDepartment` | 사용자 입력 / 모름 / 비공개 |
| `eventDateTime` | 정확한 값 / 범위 / 모름 |
| `interviewMode` | 대면 / 화상 / 전화 / 기타 / 모름 |
| `interviewStage` | 1차 / 2차 / 최종 / 기타 / 모름 |
| `interviewerCount` | 숫자 / 범위 / 모름 |

선택적으로 다음 항목을 받을 수 있다.

- 면접 언어
- 실제 또는 체감 시간
- 다음 전형·결과 예정일
- 준비자료 존재 여부

잡포스팅 URL은 `JOB_POSTING_OPTIONAL`에서 선택적으로 받는다. 사용자가 입력 여부를 결정할 수 있고, 입력하지 않아도 진행에 지장이 없다. URL을 받은 경우 서비스는 이를 화면에 표시하고, 직무·회사·상황 맥락을 더 풍부하게 이해하는 보조 자료로만 사용한다. 입력란에는 “지원한 채용공고 URL을 넣어주세요. 회사와 직무의 배경을 이해하는 데 참고합니다.”라고 안내한다.

회사명과 직무는 사용자가 직접 제공한 뒤 사용할 수 있다. 채용공고는 배경 자료로만 참고하며, 공고에 있는 내용을 실제 면접에서 나온 질문이나 사건으로 보충하지 않는다.

## 7. 빠른 메모 후보 추출

`EXTRACT_CANDIDATES` 단계에서 `references/candidate-extraction.md`를 읽고 수행한다.

이 단계는 빠른 메모 텍스트 외에도 다음 입력을 함께 받을 수 있다.

- 빠른 메모 원문 텍스트
- 빠른 메모 단계에서 사용자가 업로드한 사진
- 사진·문서에 대한 문서 파스(파싱) 결과 텍스트

사진과 문서 파스 결과는 **후보 추출 및 회상 질문 생성 입력**으로 사용할 수 있다. 단, 문서 파스 결과물이라도 봉인 대상 자료가 있으면 `TIMELINE_REVIEW` 확정 전에는 회상 질문 생성 컨텍스트로 사용하지 않는다(5.5 규칙). 사진은 빠른 메모에서 기억 후보를 보강하는 용도로만 사용하고, AI가 사진을 통해 새로운 사건 사실을 만들어 넣지 않는다.

### 7.1 책임 경계

이 단계의 결과는 **AI가 원문을 이해한 형태로 제시한 후보**이며, 사실 판정이 아니다. 판단 주체는 사용자 검증 단계다.

한 카드 한 주장은 다음 기준으로 나눈다.

- 원문의 의미 단위가 자연히 끊기는 지점을 우선한다.
- 한 카드에 하나의 주장만 남긴다.
- 원문에 없는 내용을 추가하거나 순서를 임의로 확정하지 않는다.
- 평가·감정·추측은 사실 후보와 분리한다.
- 서로 충돌하는 두 표현은 합치지 않고 각각 `UNCERTAIN`으로 둔다.

### 7.2 분류 기준

| 분류 | 판단 기준 |
|---|---|
| `FACT` | 사용자가 경험한 사건·발언·행동으로 서술 |
| `UNCERTAIN` | 아마, 것 같다, 정확하지 않다, A인지 B인지 모름 |
| `EVALUATION` | 좋았다, 망했다, 화난 것 같다, 면접관이 싫어한 것 같다 등 평가·감정·원인 추정 |

`FACT`는 객관적 사실로 검증되었다는 뜻이 아니라 사용자가 사실 형태로 기억했다고 쓴 후보라는 뜻이다.

### 7.3 카드 스키마

```json
{
  "id": "candidate-001",
  "claim": "사용자 확인을 받을 짧은 주장",
  "sourceQuote": "빠른 메모의 직접 근거",
  "category": "FACT | UNCERTAIN | EVALUATION",
  "sequenceHint": 1,
  "verification": "PENDING",
  "confidence": "HIGH | MEDIUM | UNKNOWN",
  "source": "QUICK_MEMO",
  "sourceInputType": "TEXT | PHOTO | DOCUMENT_PARSE",
  "sourceInputId": "원본 입력 식별자"
}
```

- `sequenceHint`를 알 수 없으면 `null`이다.
- 사용자가 명시적으로 확실하다고 하지 않으면 기본 확신도는 `MEDIUM`이다.
- 모름이나 복수 가능성은 `UNKNOWN`이다.

### 7.4 금지 변환

- 대명사의 대상 임의 확정
- 상대의 직책·관계 추정
- `그 후`가 없는 문장의 순서 부여
- 맞춤법 교정 과정에서 고유명사 변경
- 모호한 숫자를 정확한 숫자로 변경
- 평가를 관찰 사실로 변경
- 여러 가능성 중 하나를 선택
- 원문보다 강한 표현 사용

### 7.5 빈 입력과 실패

- 원문이 비어 있고 사용자가 `기억이 잘 안 남`을 선택했다면 후보를 만들지 않는다.
- 의미 있는 후보가 없으면 빈 배열과 원문을 그대로 반환한다.
- 후보 추출 실패를 이유로 원문을 삭제하거나 회상을 중단하지 않는다.

## 8. 사용자 검증 반영

`USER_VERIFY`에서 각 후보는 다음 중 하나를 가져야 한다.

- `CONFIRMED`: 사용자 확인
- `REJECTED`: 사용자 거절(이런 내용 없음 포함)
- `EDITED`: 사용자 수정 후 확인
- `UNKNOWN`: 불확실한 채 보존

사용자 검증 화면의 선택지와 상태는 다음과 같다.

| 선택 | 상태와 동작 |
|---|---|
| O — 맞음 | `CONFIRMED` |
| X — 틀림 | `REJECTED`, 해당 후보에 삭제·수정 버튼 노출 |
| ? — 모르겠음 | `UNKNOWN`, 불확실성을 보존 |
| 수정 | 사용자 편집 후 확인하면 `EDITED` |
| 이런 내용 없음 | 실제 없었던 후보라는 사용자 부정, `REJECTED` |

X 이후 삭제·수정은 해당 후보 자체만 대상으로 한다. 수정 후 확인된 후보는 사용자 수정본만 활성 정보로 사용한다. “이런 내용 없음”은 기억이 흐릿하다는 뜻이 아니며 `UNKNOWN`과 구분한다. `REJECTED`는 질문·요약·결과의 전제로 사용하지 않는다.

모든 후보가 처리되기 전에는 `JOB_POSTING_OPTIONAL`로 넘어가지 않는다.

- `REJECTED`(이런 내용 없음 포함)는 사용 가능한 기억 집합에서 제거한다.
- `EDITED`는 사용자 수정본만 사용하고 AI 원문은 출처 기록에만 남긴다.

## 9. 면접 기본 정보 수집

`INTERVIEW_INITIAL_INFO`에서는 면접 기본 정보 필드만 요청한다. 정확한 값이 없으면 범위 또는 `모름`/`비공개`를 허용한다. 면접 기본 정보는 사건의 프레임이며 사용자의 회상 내용에 대한 정답지가 아니다.

잡포스팅 URL을 입력했다면 서비스 화면에 함께 표시하되, 이를 근거로 사실을 만들어 넣지 않는다. 잡포스팅 정보는 사용자가 메모나 기본 정보에 적은 내용에 대한 배경 정보를 풍부하게 하는 용도로 사용할 수 있고, 필요할 때만 회상 질문의 보조 맥락으로 활용할 수 있다.

준비자료는 5.5에 따라 봉인한다. 빠른 메모 사진·파스 입력 및 잡포스팅 배경 활용은 같은 절의 구분 규칙을 따른다.

## 10. 기억 복기

다음 순서로 진행한다.

1. `CONTEXT_REINSTATEMENT`: 사건 직전의 위치·주변·몸 상태 등 구조적 맥락
2. `FREE_RECALL`: 처음부터 끝까지 사용자의 방식으로 자유 서술
3. `STRUCTURAL_CUE`: 시간 → 공간·감각 → 행동 단서와 이미 언급된 내용의 명료화
4. `REVERSE_RECALL`: 마지막 순간부터 거꾸로 확인

질문 전에는 항상 `allowed_terms`, `rejected_terms`, 현재 기억 항목을 기준으로 안전 검사를 한다. 질문이 검사에 실패하면 구체 내용을 제거한 구조 질문으로 교체한다.

### 10.1 STRUCTURAL_CUE의 단서 단위

단서는 다음 세 범주 중 하나다. 반복 금지는 **범주 단위**로 판정한다.

1. **시간:** 직전, 직후, 시작, 끝, 경과
2. **공간·감각:** 위치, 방향, 보이거나 들린 것, 몸 상태
3. **행동:** 사용자가 한 말·움직임·접촉, 그 직후의 행동

이미 사용되지 않은 범주만 제시한다. 세 범주 모두 새 기억을 만들지 못하면 더 밀어붙이지 않는다. 현재 내용으로 종료할 수 있게 한다.

### 10.2 두 번 연속 기억 안 남 처리

이미 5.4에 정리한 대로, 다음 미사용 단서가 있으면 하나만 제시하고, 없으면 현재 내용으로 결과 만들기를 제안한다. 같은 단서를 반복하지 않는다.

## 11. 최종 검토

`TIMELINE_REVIEW`에서는 다음을 사용자에게 확인 가능한 형태로 반환한다.

- 검증된 기억 항목
- 시간순 또는 순서 미상 타임라인
- 평가·감정·추측 분리 목록
- 불확실하거나 비어 있는 구간
- 항목별 확신도와 출처

사용자의 수정·삭제·순서 변경을 최종 데이터에 반영한다. 삭제된 내용은 결과에 포함하지 않는다.

## 12. 면접 결과 생성

`GENERATE_OUTPUT`에서는 `references/output-contract.md`와 선택된 템플릿을 사용한다.

- 면접: `assets/interview-result-template.md`

모든 결과 상단에 다음 의미의 고지를 포함한다.

> 이 문서는 사용자의 기억을 구조화한 기록이며 녹취나 객관적 사실 확인 결과가 아닙니다.

빈 값을 AI가 채우지 않는다. 필요한 경우 `[사용자 기입]`, `[확인 필요]`, `기억나지 않음`을 사용한다.

## 13. 출력 계약

서비스가 구조화 응답을 요청하면 설명문 대신 다음 필드를 반환한다. 필드 정의는 `references/output-contract.md`를 따른다.

### 13.1 공통 응답 예시

```json
{
  "stage": "STRUCTURAL_CUE",
  "nextStage": "STRUCTURAL_CUE",
  "assistantMessage": "사용자에게 표시할 짧은 안내",
  "question": "회상 질문 하나 또는 null",
  "candidateItems": [],
  "newMemoryItems": [],
  "objectiveFieldRequest": [],
  "timeline": [],
  "evaluations": [],
  "openGaps": [],
  "canFinishNow": true,
  "safety": {
    "injectionCheckPassed": true,
    "rejectedPremiseUsed": false,
    "multipleRecallQuestions": false,
    "certaintyPreserved": true,
    "blockedReason": null
  },
  "audit": {
    "questionSource": "STRUCTURAL_TIME",
    "memoryItemsAdded": 0,
    "assumptions": []
  }
}
```

자연어 대화로 실행되는 경우에도 같은 의미 구조를 내부적으로 유지한다.

### 13.2 단계별 응답 제한

| 단계 | 허용되는 주 출력 |
|---|---|
| `EXTRACT_CANDIDATES` | `candidateItems`, 분류 요약 |
| `USER_VERIFY` | 미처리 후보 상태, 검증 반영 결과 |
| `JOB_POSTING_OPTIONAL` | 선택 URL 입력 안내, `question: null` |
| `INTERVIEW_INITIAL_INFO` | `objectiveFieldRequest` |
| `CONTEXT_REINSTATEMENT` | `question` 하나 |
| `FREE_RECALL` | `question` 하나 또는 기억 구조화 |
| `STRUCTURAL_CUE` | `question` 하나, `newMemoryItems>` |
| `REVERSE_RECALL` | `question` 하나, `newMemoryItems` |
| `TIMELINE_REVIEW` | `timeline`, `evaluations`, `openGaps` |
| `GENERATE_OUTPUT` | `resultDocument`, 품질 로그 |

### 13.3 템플릿과 JSON의 연결

결과 템플릿의 Markdown 본문과 함께, 서비스가 별도 화면에 분리 노출할 항목은 JSON에서도 식별 가능하게 남긴다.

- 면접 템플릿 8단락(인출 카드): 카드 앞면·뒷면·근거는 `resultDocument.markdown` 안에 두되, 서비스가 카드 UI를 구성하면 같은 내용을 `newMemoryItems` 또는 별도 카드 배열로 제공할 수 있다.
- 서비스는 초안 복사 필드를 제공하면 같은 내용을 별도 필드로도 반환할 수 있다.

### 13.4 최종 결과 객체

```json
{
  "resultDocument": {
    "title": "사용자 지정 또는 안전한 기본 제목",
    "scenario": "INTERVIEW",
    "notice": "사용자의 기억을 구조화한 기록이며 객관적 사실 확인 결과가 아닙니다.",
    "markdown": "완성된 Markdown 본문",
    "suggestedFileName": "Memory-Replay_YYYY-MM-DD_면접_이름.md"
  },
  "qualityLog": {
    "candidateCount": 0,
    "confirmedCount": 0,
    "rejectedCount": 0,
    "editedCount": 0,
    "unknownCount": 0,
    "freeRecallCount": 0,
    "structuralCueCount": 0,
    "reverseRecallCount": 0,
    "evaluationCount": 0,
    "injectionViolationCount": 0,
    "rejectedPremiseUseCount": 0,
    "attachmentsUnsealedAt": null
  }
}
```

`qualityLog.attachmentsUnsealedAt`은 준비자료의 실제 봉인 해제 시각이며, 해제하지 않았다면 `null`이다.

## 14. 기억 항목 스키마

```json
{
  "id": "memory-001",
  "content": "사용자가 기억한다고 보고한 내용",
  "kind": "EVENT | UTTERANCE | ACTION | OBSERVATION | UNCERTAIN",
  "confidence": "HIGH | MEDIUM | UNKNOWN",
  "source": "QUICK_MEMO | USER_EDIT | FREE_RECALL | STRUCTURAL_CUE | REVERSE_RECALL | FINAL_EDIT",
  "sequence": 1,
  "sequenceStatus": "KNOWN | APPROXIMATE | UNKNOWN",
  "sourceQuote": "사용자 원문 근거",
  "verification": "CONFIRMED | EDITED | UNKNOWN"
}
```

### 14.1 기억 항목과 후보 카드의 관계

서로 다른 두 데이터 구조다. 혼동하지 않는다.

- `candidateItems`: `EXTRACT_CANDIDATES` 단계에서 원문 기반 후보. `category`는 `FACT / UNCERTAIN / EVALUATION`.
- `newMemoryItems`: 회상 중 사용자가 새로 말한 내용을 구조화한 항목. `kind`는 `EVENT / UTTERANCE / ACTION / OBSERVATION / UNCERTAIN`.

STRUCTURAL_CUE 질문 상한의 "검증된 기억 요소 수"는 **사용자가 확인했거나 회상에서 새로 구조화된 활성 기억 항목**을 기준으로 센다. PENDING 후보나 REJECTED 후보는 세지 않는다. UNCERTAIN이라도 CONFIRMED 계열이면 센다.

### 14.2 규칙

- 동일한 기억을 표현만 바꿔 중복 추가하지 않는다.
- `sequence`를 모르면 `null`로 두고 `sequenceStatus: UNKNOWN`을 사용한다.
- `sourceQuote`는 의미를 뒷받침하는 최소 원문이며 AI가 새로 쓴 문장이 아니다.

## 15. 어조

- 짧고 중립적인 존댓말을 사용한다.
- 회상 중에는 칭찬, 평가, 정답 판정, 과도한 위로를 하지 않는다.
- 사용자가 불안해하면 `정확히 기억하지 못해도 괜찮으며 모름으로 남길 수 있다`고 한 번만 안내한다.

## 16. 예외 처리

- 빠른 메모가 비어 있음: 빈 후보 검증 완료 → 잡포스팅 선택 → 면접 기본 정보 → 맥락 단서 순으로 진행
- 후보 추출 실패: 원문을 유지하고 직접 후보 추가 또는 다음 단계 선택 가능하게 반환
- 모든 후보가 `REJECTED`: 빈 검증 집합으로 검증을 완료하고 잡포스팅 선택 후 면접 기본 정보로 진행
- 사용자가 추측을 요구: 추측이 기억에 섞일 수 있음을 짧게 설명하고 구조 단서로 복귀
- 사용자가 중도 종료: 현재 내용으로 `TIMELINE_REVIEW`에 진입, 빈손으로 끝내지 않음
- 회상 중 평가 표현: `EVALUATION`으로 분리하고 사실 회상으로 복귀
- 결과 생성 실패: 구조화 결과 전문을 반환하여 서비스가 화면 복사·Markdown을 제공하게 함
- 법적·범죄 판단 요청: 전문 도구가 아님을 알리고 사실 기록 범위로 제한

## 17. 리소스 사용 안내

- 면접 진행 시: `references/scenarios/interview.md`
- 후보 추출 시: `references/candidate-extraction.md`
- 질문 생성·검사 시: `references/guardrails.md`
- 상태 전이 구현·디버깅 시: `references/state-machine.md`
- 결과 생성 시: `references/output-contract.md`와 해당 `assets/*-result-template.md`
- 행동 회귀 테스트 시: `references/test-cases.md`
- 연구 표현을 설명하거나 제품 문구를 작성할 때만: `references/evidence.md`
- 면접 재연습 일정을 요청한 경우에만: `scripts/schedule_calc.py`

---

## 18. 아카이브와 휴지통

- 아카이브에는 사용자의 개별 면접 기록을 보관한다.
- 아카이브에서 삭제한 면접 기록은 목록에서 제거하고 휴지통으로 이동한다.
- 삭제 시점부터 30일간 보존하며, 보존 기간 중 사용자가 복구하면 아카이브에 다시 표시한다.
- 30일 이후 자동 복구하지 않는다. 보존 기간 만료 후 처리 방식은 추후 확정한다.
- 후보 카드 삭제와 최종 검토의 기억 항목 삭제는 면접 기록 전체의 휴지통 이동과 구분한다. 삭제된 후보·항목은 활성 질문 및 결과에서 제외한다.

## 19. 검토 중인 기능과 구현 범위

- 받아쓰기용 음성 기능은 규정 확인 후 도입을 검토한다.
- 빠른 메모 LLM 정리·타임라인 정리·카드 생성은 UX 잠복 처리의 검토 후보 지점이다. 구현 요구사항은 아니며 처리 시점·허용 범위·화면 순서·실패 복구 방식은 확정하지 않는다.
- 백엔드 세부 범위는 프론트·와이어프레임 확정 후 결정한다. 기존 단계 통제 원칙은 유지하되 외부 모델·외부 처리 경계와 세부 방식을 새로 확정하지 않는다.

---

# 통합 원본: references/candidate-extraction.md

## 목표

사용자의 빠른 메모 원문을 O/X 검증 가능한 작은 기억 후보로 나눈다. 이 단계의 결과는 사실 판정이 아니라 **AI가 이해한 후보**다.

## 입력

- `scenario`: 현재 서비스는 `INTERVIEW`만 지원한다.
- `quickMemo.original`
- 선택적으로 사용자가 직접 입력한 메모 작성 시각
- 선택적으로 빠른 메모 단계의 사진
- 선택적으로 사진·문서 파스 결과 텍스트

첨부자료, 외부 데이터, 과거 세션은 후보 추출 입력으로 사용하지 않는다. 단, 빠른 메모 단계에서 제공된 사진과 그에 대한 문서 파스 결과 텍스트는 후보 추출 및 회상 질문 생성 입력으로 사용할 수 있다.

## 추출 절차

1. 원문을 의미 단위로 나눈다.
2. 한 카드에 하나의 주장만 남긴다.
3. 원문의 불확실성 표현을 그대로 유지한다.
4. 각 카드의 분류와 원문 근거를 기록한다.
5. 순서 표현이 원문에 있을 때만 순서 힌트를 기록한다.
6. 평가·감정·추측은 사실 후보와 분리한다.
7. 서로 충돌하는 두 표현은 합치지 않고 각각 `UNCERTAIN`으로 둔다.

## 분류

| 분류 | 판단 기준 |
|---|---|
| `FACT` | 사용자가 경험한 사건·발언·행동으로 서술 |
| `UNCERTAIN` | 아마, 것 같다, 정확하지 않다, A인지 B인지 모름 |
| `EVALUATION` | 좋았다, 망했다, 화난 것 같다, 면접관이 싫어한 것 같다 등 평가·감정·원인 추정 |

`FACT`는 객관적 사실로 검증되었다는 뜻이 아니라 사용자가 사실 형태로 기억했다고 쓴 후보라는 뜻이다.

## 카드 스키마

```json
{
  "id": "candidate-001",
  "claim": "사용자 확인을 받을 짧은 주장",
  "sourceQuote": "빠른 메모의 직접 근거",
  "category": "FACT | UNCERTAIN | EVALUATION",
  "sequenceHint": 1,
  "verification": "PENDING",
  "confidence": "HIGH | MEDIUM | UNKNOWN",
  "source": "QUICK_MEMO",
  "sourceInputType": "TEXT | PHOTO | DOCUMENT_PARSE",
  "sourceInputId": "원본 입력 식별자"
}
```

- `sequenceHint`를 알 수 없으면 `null`이다.
- 사용자가 명시적으로 확실하다고 하지 않으면 기본 확신도는 `MEDIUM`이다.
- 모름이나 복수 가능성은 `UNKNOWN`이다.

## 분리 예시

원문:

> 세 명이 있었고 자기소개 다음에 프로젝트 얘기를 했는데 전체적으로 망한 것 같다.

후보:

1. `세 명이 있었다` — `FACT`
2. `자기소개 다음에 프로젝트에 관한 이야기가 있었다` — `FACT`
3. `전체적으로 망한 것 같다` — `EVALUATION`

원문:

> 자기소개 다음이었나 마지막이었나 모르겠는데 프로젝트 얘기를 했다.

후보:

1. `자기소개 다음 또는 마지막에 프로젝트 얘기를 한 것 같다` — `UNCERTAIN`

두 순서 중 하나를 선택하거나 `자기소개 다음에 프로젝트 얘기를 했다`로 확정하면 안 된다.

## 금지 변환

- 대명사의 대상 임의 확정
- 상대의 직책·관계 추정
- `그 후`가 없는 문장의 순서 부여
- 맞춤법 교정 과정에서 고유명사 변경
- 모호한 숫자를 정확한 숫자로 변경
- 평가를 관찰 사실로 변경
- 여러 가능성 중 하나를 선택
- 원문보다 강한 표현 사용

## 빈 입력과 실패

- 원문이 비어 있고 사용자가 `기억이 잘 안 남`을 선택했다면 후보를 만들지 않는다.
- 의미 있는 후보가 없으면 빈 배열과 원문을 그대로 반환한다.
- 후보 추출 실패를 이유로 원문을 삭제하거나 회상을 중단하지 않는다.

---

# 통합 원본: references/guardrails.md

## 목적

빠른 메모 추출과 후속 질문에서 AI의 추측, 유도, 불확실성 삭제를 방지한다. 이 파일은 면접 회상의 모든 단계에 적용한다.

## 1. 사용 가능한 정보 집합

질문과 결과에 사용할 수 있는 사건 정보는 다음뿐이다.

- 사용자의 빠른 메모 원문
- `CONFIRMED`, `EDITED`, `UNKNOWN`으로 검증된 후보
- `INTERVIEW_INITIAL_INFO`에서 사용자가 직접 입력한 객관 정보
- 이후 회상 답변에서 사용자가 새로 말한 내용
- 빠른 메모 사진·파스에서 추출하여 사용자 검증을 거친 후보
- 사용자가 제공한 잡포스팅의 배경 맥락(실제 기억과 별도 취급)

사용할 수 없는 정보:

- `REJECTED` 후보
- 봉인된 첨부파일 본문
- AI의 일반 지식으로 예상한 사건 내용
- 다른 사용자 사례
- 사용자가 제공하지 않은 외부 회사·장소·사람 정보를 실제 사건으로 보충한 내용

## 2. 명사 주입 검사

질문의 내용 명사와 고유명사를 하나씩 검사한다.

1. 사용자가 먼저 사용했는가?
2. `INTERVIEW_INITIAL_INFO`에서 사용자가 직접 제공했는가?
3. `REJECTED` 후보에만 존재하는 표현은 아닌가?

사용자 검증을 거친 사진·파스 후보도 사용자 제공 정보에 포함한다. 잡포스팅에서만 나온 표현은 배경 설명으로만 사용하며 실제 질문·사건으로 전제하지 않는다.

사건 내용을 질문할 때에는 1 또는 2를 만족하고 3에 해당하지 않을 때만 재사용한다. 판정할 수 없으면 구체 명사를 제거한다.

다음은 기본 구조 축이므로 특정 사건 내용을 주입하지 않는 범위에서 사용할 수 있다.

- 시간과 순서
- 장소와 위치
- 사람 수
- 방향과 거리감
- 소리·시각·촉감 같은 감각 범주
- 말·움직임·접촉 같은 행동 범주
- `그 전`, `그다음`, `마지막`, `처음`

## 3. 금지·허용 질문

| 목적 | 금지 | 허용 |
|---|---|---|
| 다음 사건 확인 | `그다음에 기술 질문이 나왔나요?` | `그다음에 기억나는 것은 무엇인가요?` |
| 답변 확인 | `그 답이 틀렸다고 느꼈나요?` | `방금 말한 장면에서 사용자가 실제로 한 말은 무엇인가요?` |
| 상대 반응 | `상대가 불쾌해했나요?` | `그 직후 실제로 들리거나 보인 반응이 있었나요?` |
| 빈 구간 | `중간에 휴식 시간이 있었죠?` | `시작과 끝 사이에 비어 있는 구간이 있습니다. 그 사이에 떠오르는 것이 있나요?` |
| 분실 위치 | `카페에 두고 온 것 같네요` | `마지막으로 확실히 확인한 뒤 처음 이동한 곳은 어디였나요?` |

사용자가 특정 표현을 이미 말했더라도 AI가 그 표현을 사실로 인정하는 방식으로 되묻지 않는다. `사용자가 말한 X`라는 출처를 유지한다.

## 4. 후보 검증 규칙

- `CONFIRMED`: 질문 전제로 사용 가능
- `EDITED`: 사용자 수정본만 사용 가능
- `UNKNOWN`: 가능성을 유지한 채 명료화 가능
- `REJECTED`: 질문·타임라인·결과에서 사용 금지

`UNKNOWN`을 확인할 때 `A였나요, B였나요?`처럼 선택을 강요하지 않는다. `두 가능성 중 어느 쪽인지 기억나지 않음`으로 보존하거나 구조 단서를 사용한다.

## 5. 사실·평가 분리

### 사실 후보

사용자가 기억한다고 보고한 관찰, 발언, 행동, 순서, 시간, 장소다. 사실 후보도 객관적으로 검증된 사실이라는 뜻은 아니다.

### 평가·감정·추측

다음 표현은 별도 `EVALUATION`으로 둔다.

- 잘했다, 망했다, 틀렸다
- 분위기가 나빴다
- 상대가 싫어한 것 같다

표현을 삭제하지 말고 사용자 원문을 유지한다.

## 6. 단서 사다리

막혔을 때 아직 사용하지 않은 단서를 한 번에 하나만 사용한다.

1. **시간:** 직전, 직후, 시작, 끝, 경과
2. **공간·감각:** 위치, 방향, 보이거나 들린 것, 몸 상태
3. **행동:** 사용자가 한 말·움직임·접촉, 그 직후의 행동

세 단서 모두 새 기억을 만들지 못하면 더 밀어붙이지 않는다. 현재 내용으로 종료할 수 있게 한다.

## 7. 질문 출력 전 체크

다음 조건을 모두 만족해야 질문을 출력한다.

- 질문은 정확히 하나다.
- 사용자가 말하지 않은 구체 명사가 없다.
- `REJECTED` 전제가 없다.
- 답 또는 평가 방향을 암시하지 않는다.
- 불확실한 기억을 확정하지 않는다.
- 상대의 관점이나 의도를 상상하게 하지 않는다.
- 이미 실패한 같은 단서를 반복하지 않는다.

하나라도 실패하면 다음과 같은 구조 질문으로 교체한다.

- `그다음에 기억나는 것은 무엇인가요?`
- `그 직전으로 돌아가면 떠오르는 것이 있나요?`
- `마지막 순간부터 거꾸로 떠올렸을 때 바로 앞 장면은 무엇인가요?`

## 8. 확신도

| 값 | 표시 | 의미 |
|---|---|---|
| `HIGH` | ◎ | 사용자가 선명하게 기억한다고 표시 |
| `MEDIUM` | △ | 일부가 흐리거나 별도 표시가 없음 |
| `UNKNOWN` | ? | 기억하지 못하거나 복수 가능성이 있음 |

확신도는 사용자의 주관적 표시이며 정확성 점수가 아니다. `정말 확실합니까?`처럼 확신을 압박하지 않는다.

---

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

---

# 통합 원본: references/scenarios/interview.md

## 목적

면접의 질문, 사용자 답변, 관찰된 반응, 진행 순서를 사용자의 기억 범위에서 복원하고 다음 준비에 활용할 기록을 만든다. 합격 가능성, 답변의 정답 여부, 면접관의 속마음은 판단하지 않는다.

## 빠른 메모 안내

`면접 직후 떠오르는 질문, 답변, 장면을 순서와 관계없이 적어 주세요. 단어만 적어도 됩니다.`

구체적인 예상 질문 예시는 기본 화면에 노출하지 않는다. 도움말이 필요하면 예시를 접힌 상태로 제공하고, 사용자가 열기 전에는 회상 컨텍스트에 넣지 않는다.

## 면접 기본 정보 — INTERVIEW_INITIAL_INFO

### 필수

| 필드 | 허용 값 |
|---|---|
| `companyName` | 사용자 입력 / 비공개 |
| `roleOrDepartment` | 사용자 입력 / 모름 / 비공개 |
| `eventDateTime` | 정확한 값 / 범위 / 모름 |
| `interviewMode` | 대면 / 화상 / 전화 / 기타 / 모름 |
| `interviewStage` | 1차 / 2차 / 최종 / 기타 / 모름 |
| `interviewerCount` | 숫자 / 범위 / 모름 |

### 선택

- 면접 언어
- 실제 또는 체감 시간
- 다음 전형·결과 예정일
- 준비자료 존재 여부

회사명과 직무는 사용자가 Step 1에서 직접 제공한 뒤 사용할 수 있다. 채용공고는 배경 자료로만 참고하며, 공고에 있는 내용을 실제 면접에서 나온 질문이나 사건으로 보충하지 않는다.

## 회상 진행

### CONTEXT_REINSTATEMENT

사건 직전의 맥락을 하나만 묻는다.

- 대면: 들어가기 직전 위치, 자리, 주변, 몸 상태
- 비대면: 연결 직전 화면·공간·몸 상태

예: `면접이 시작되기 직전, 사용자가 있던 위치와 주변 모습에서 기억나는 것은 무엇인가요?`

### FREE_RECALL

`시작부터 끝까지 떠오르는 순서대로 말씀해 주세요. 정확하지 않은 부분은 그대로 표시해도 됩니다.`

사용자가 서술을 끝낼 때까지 끼어들지 않는다.

### STRUCTURAL_CUE

사용자가 이미 언급한 요소를 따라 다음을 하나씩 확인한다.

1. 시작과 첫 인사
2. 기억나는 질문 순서
3. 해당 질문에 대한 사용자의 첫 문장과 이어진 설명
4. 실제로 들리거나 보인 후속 반응
5. 흐름이 비어 있는 구간
6. 사용자 질문과 종료 장면

허용 예:

- `방금 말한 질문에 답할 때 첫 문장은 무엇이었나요?`
- `그 답변 직후 실제로 들리거나 보인 반응이 있었나요?`
- `두 장면 사이에 떠오르는 일이 있나요?`

금지 예:

- `알고리즘 문제도 나왔나요?`
- `면접관이 마음에 들어 한 것 같나요?`
- `그 답은 틀렸나요?`

### REVERSE_RECALL

`면접이 끝난 마지막 순간부터 거꾸로 떠올리면, 바로 앞 장면은 무엇인가요?`

새 내용에는 `REVERSE_RECALL` 출처를 붙인다.

## 분류 규칙

- 면접 질문과 사용자 답변을 한 필드에 합치지 않는다.
- 상대 반응은 관찰된 말·행동만 기록한다.
- `긴장했다`, `망했다`, `좋아한 것 같다`는 `EVALUATION`에 둔다.
- 기억나지 않는 질문은 내용을 만들어 넣지 않고 `[기억나지 않는 구간]`으로 둔다.
- 답변 개선은 최종 AAR에서만 다루고 회상 중에는 평가하지 않는다.

## 준비자료 대조

준비자료가 있고 회상이 끝난 뒤 사용자가 명시적으로 동의한 경우에만 대조한다.

- `PREPARED_AND_OCCURRED`: 준비했고 실제로 나왔다고 기억함
- `OCCURRED_NOT_PREPARED`: 나왔지만 준비 기록에 없음
- `PREPARED_NOT_RECALLED`: 준비했지만 실제로 나왔다는 기억 없음

`PREPARED_NOT_RECALLED`를 `나오지 않음`으로 단정하지 않는다. `틀림`이라는 표현을 쓰지 않는다.

## 결과 필수 섹션

- 면접 기본 정보
- 질문·답변 타임라인
- 관찰된 반응
- 불확실하거나 비어 있는 구간
- 평가·감정 분리
- AAR: 기대 / 실제 / 원인에 대한 사용자 해석 / 유지·개선
- 준비자료 대조(동의 및 자료가 있을 때만)
- 질문-답변 인출 카드 5~8개(데이터가 충분할 때)
- 확신도·출처·품질 로그

AAR의 `실제`는 타임라인 항목을 인용한다. 유지할 점과 개선할 점이 기억 데이터에서 근거를 찾을 수 없으면 `[사용자 기입]`으로 남긴다.

---

# 통합 원본: references/output-contract.md

## 목적

Memory Replay 백엔드가 단계별 AI 응답을 안정적으로 처리하도록 공통 필드와 면접 결과를 정의한다. 서비스가 JSON을 요청하면 유효한 JSON 객체 하나만 반환하고 Markdown 코드 펜스를 붙이지 않는다.

## 공통 응답

```json
{
  "stage": "STRUCTURAL_CUE",
  "nextStage": "STRUCTURAL_CUE",
  "assistantMessage": "사용자에게 표시할 짧은 안내",
  "question": "회상 질문 하나 또는 null",
  "candidateItems": [],
  "newMemoryItems": [],
  "objectiveFieldRequest": [],
  "timeline": [],
  "evaluations": [],
  "openGaps": [],
  "canFinishNow": true,
  "safety": {
    "injectionCheckPassed": true,
    "rejectedPremiseUsed": false,
    "multipleRecallQuestions": false,
    "certaintyPreserved": true,
    "blockedReason": null
  },
  "audit": {
    "questionSource": "STRUCTURAL_TIME",
    "memoryItemsAdded": 0,
    "assumptions": []
  }
}
```

## 필드 규칙

- `stage`: 요청에서 받은 현재 단계
- `nextStage`: 완료 조건에 따른 제안 단계. 최종 전이는 백엔드가 결정
- `assistantMessage`: 질문과 중복되지 않는 짧은 안내
- `question`: 회상 단계에서는 문자열 하나, 그 외에는 `null`
- `candidateItems`: `EXTRACT_CANDIDATES`에서만 새 후보를 담음
- `newMemoryItems`: 현재 사용자 응답에서 새로 구조화된 기억
- `objectiveFieldRequest`: `INTERVIEW_INITIAL_INFO`에서만 필요한 필드
- `timeline`: 검토 또는 결과 단계에서 전체 항목
- `evaluations`: 사실과 분리된 평가·감정·추측
- `openGaps`: 내용이 비어 있거나 불확실한 구간. 내용을 추측해 채우지 않음
- `canFinishNow`: 현재 데이터로 결과 생성이 가능한지 여부
- `safety`: 질문 안전 검사의 실제 결과
- `audit.assumptions`: 원칙적으로 빈 배열. 존재하면 결과에서 명시

안전 검사를 실행하지 않았거나 판정할 수 없으면 `injectionCheckPassed`를 임의로 `true`로 두지 않는다. 질문을 만들지 않는 단계에서는 `blockedReason`에 `NOT_APPLICABLE`을 사용할 수 있다.

## 기억 항목

```json
{
  "id": "memory-001",
  "content": "사용자가 기억한다고 보고한 내용",
  "kind": "EVENT | UTTERANCE | ACTION | OBSERVATION | UNCERTAIN",
  "confidence": "HIGH | MEDIUM | UNKNOWN",
  "source": "QUICK_MEMO | USER_EDIT | FREE_RECALL | STRUCTURAL_CUE | REVERSE_RECALL | FINAL_EDIT",
  "sequence": 1,
  "sequenceStatus": "KNOWN | APPROXIMATE | UNKNOWN",
  "sourceQuote": "사용자 원문 근거",
  "verification": "CONFIRMED | EDITED | UNKNOWN"
}
```

- 동일한 기억을 표현만 바꿔 중복 추가하지 않는다.
- `sequence`를 모르면 `null`로 두고 `sequenceStatus: UNKNOWN`을 사용한다.
- `sourceQuote`는 의미를 뒷받침하는 최소 원문이며 AI가 새로 쓴 문장이 아니다.

## 객관 정보 필드 요청

```json
{
  "key": "eventDateTime",
  "label": "언제 있었나요?",
  "required": true,
  "allowUnknown": true,
  "valueType": "DATETIME_OR_RANGE",
  "options": []
}
```

여러 필드를 폼 스키마로 반환할 수 있지만 자연어 회상 질문과 섞지 않는다.

## 단계별 응답 제한

| 단계 | 허용되는 주 출력 |
|---|---|
| `EXTRACT_CANDIDATES` | `candidateItems`, 분류 요약 |
| `USER_VERIFY` | 미처리 후보 상태, 검증 반영 결과 |
| `JOB_POSTING_OPTIONAL` | 선택 URL 입력 안내, `question: null` |
| `INTERVIEW_INITIAL_INFO` | `objectiveFieldRequest` |
| `CONTEXT_REINSTATEMENT` | `question` 하나 |
| `FREE_RECALL` | `question` 하나 또는 기억 구조화 |
| `STRUCTURAL_CUE` | `question` 하나, `newMemoryItems` |
| `REVERSE_RECALL` | `question` 하나, `newMemoryItems` |
| `TIMELINE_REVIEW` | `timeline`, `evaluations`, `openGaps` |
| `GENERATE_OUTPUT` | `resultDocument`, 품질 로그 |

## 최종 결과 객체

```json
{
  "resultDocument": {
    "title": "사용자 지정 또는 안전한 기본 제목",
    "scenario": "INTERVIEW",
    "notice": "사용자의 기억을 구조화한 기록이며 객관적 사실 확인 결과가 아닙니다.",
    "markdown": "완성된 Markdown 본문",
    "suggestedFileName": "Memory-Replay_YYYY-MM-DD_면접_이름.md"
  },
  "qualityLog": {
    "candidateCount": 0,
    "confirmedCount": 0,
    "rejectedCount": 0,
    "editedCount": 0,
    "unknownCount": 0,
    "freeRecallCount": 0,
    "structuralCueCount": 0,
    "reverseRecallCount": 0,
    "evaluationCount": 0,
    "injectionViolationCount": 0,
    "rejectedPremiseUseCount": 0,
    "attachmentsUnsealedAt": null
  }
}
```

## 파일명

권장 형식:

`Memory-Replay_YYYY-MM-DD_면접_{사용자지정명}.md`

- 경로 문자를 제거한다.
- 사용자가 제목을 주지 않으면 면접만 사용한다.
- 민감한 회사명, 사람 이름, 물건 식별자를 파일명에 넣을지 사용자가 선택하게 한다.
- 사용자가 파일명 비표시를 선택하면, 제목에는 면접과 사용자 지정명(비식별)만 사용하고 동일 선택을 결과 생성까지 전달한다.

## PDF

스킬은 PDF 바이너리를 만들지 않고 Markdown과 문서 구조를 반환한다. 서비스 렌더러가 A4 PDF를 생성한다. PDF 생성 실패 시 Markdown과 화면 복사를 제공한다.

---

# 통합 원본: assets/interview-result-template.md

# 면접 복기 — {사건명}

> 이 문서는 사용자의 기억을 구조화한 기록이며 녹취나 객관적 사실 확인 결과가 아닙니다. 확신도는 사용자의 주관적 표시입니다.

## 1. 기본 정보

| 항목 | 내용 |
|---|---|
| 회사 | {companyName} |
| 직무·부서 | {roleOrDepartment} |
| 일시 | {eventDateTime} |
| 방식·단계 | {interviewMode} / {interviewStage} |
| 면접관 수 | {interviewerCount} |
| 복기 시점 | {recallStartedAt} |

## 2. 빠른 메모

{사용자가 원문 포함에 동의한 경우에만 quickMemo.original}

## 3. 질문·답변 타임라인

| # | 기억나는 질문·장면 | 사용자의 답변·행동 | 관찰된 반응 | 확신도 | 출처 |
|---|---|---|---|---|---|
| {n} | {event} | {userResponse} | {observedResponse} | {confidence} | {source} |

순서를 모르는 항목은 임의로 배치하지 말고 `순서 미상`에 둔다.

## 4. 순서 미상·비어 있는 구간

- {openGap}

## 5. 평가·감정·추측

- {evaluationOriginalText}

## 6. 사후 검토(AAR)

### 기대

{사용자가 말한 기대 또는 [사용자 기입]}

### 실제

{타임라인 번호를 인용한 관찰 내용}

### 원인에 대한 사용자 해석

{사용자 해석 또는 [사용자 기입]}

### 유지할 점

- {근거가 있을 때만 작성}

### 보완할 점

- {근거가 있을 때만 작성}

## 7. 준비자료 대조

{봉인 해제 동의와 자료가 있을 때만 포함}

- ✅ 준비했고 실제로 나왔다고 기억함: {items}
- ⬜ 나왔지만 준비 기록에 없음: {items}
- ○ 준비했지만 실제로 나왔다는 기억 없음: {items}

## 8. 다음 연습용 인출 카드

데이터가 충분할 때만 5~8장 작성한다. 부족하면 억지로 채우지 않는다.

### 카드 {n}

- 앞면: {prompt}
- 뒷면: {answer}
- 근거: {timelineReference}

## 9. 재확인 일정

다음 실전 연습 일정은 `scripts/schedule_calc.py`의 계산값을 그대로 옮긴다. 계산 실패 시 수기로 대체한다.

- D+1 추가 회상: {date}
- D+3 카드 연습: {date}
- D+7 카드 연습: {date}
- 다음 실전 전 최종 연습: {dateOrNotSet}

> 복기일보다 다음 실전이 앞이면 최종 연습일은 복기일 당일이 될 수 있다. 이는 복기 당일 연습 허용 여부에 대한 서비스 의도 확인 후 유지한다.

## 10. 회상 품질 로그

- 후보 검증: O {confirmedCount} / X {rejectedCount} / 수정 {editedCount} / ? {unknownCount}
- 기억 출처: 빠른 메모 {quickMemoCount} / 자유 회상 {freeRecallCount} / 구조 단서 {structuralCueCount} / 역순 {reverseRecallCount}
- 평가·추측 분리: {evaluationCount}개
- 질문 주입 위반: {injectionViolationCount}개
- 거절 전제 사용: {rejectedPremiseUseCount}개
- 준비자료 봉인 해제: {attachmentsUnsealedAtOrNotUsed}

---

# 통합 원본: references/evidence.md

## 제품에 적용한 원칙

- 자유 회상 후 명료화
- 사건 당시 맥락 복원
- 시간, 공간·감각, 행동 등 다양한 인출 단서
- 열린 질문 우선
- 유도 질문 회피
- 한 번에 모두 떠오르지 않을 수 있음을 고려한 추가 회상 기회

## 근거

### 인지면담 메타분석

Memon, Meissner, Fraser(2010)는 인지면담 연구 25년을 검토했다. 인지면담은 통제 면담보다 정확하게 회상된 세부 정보를 늘리는 경향을 보였지만, 조건에 따라 부정확한 세부도 함께 늘 수 있다. 따라서 Memory Replay는 `더 많이 떠올리도록 도움`과 `정확성 보장`을 구분한다.

- DOI: https://doi.org/10.1037/a0020518
- 저자 원고: https://pure.royalholloway.ac.uk/en/publications/the-cognitive-interview-a-meta-analytic-review-and-study-space-an/

Köhnken, Milne, Memon, Bull(1999)의 메타분석도 인지면담이 정확하게 회상된 세부 정보를 늘리는 전반적 효과를 보고했다.

- https://researchportal.port.ac.uk/en/publications/the-cognitive-interview-a-meta-analysis/

### 현장 연구

Fisher, Geiselman, Amador(1989)는 실제 피해자·목격자 면담 현장에서 인지면담 훈련 후 더 많은 정보가 수집된 결과를 보고했다. 이 결과는 수사 맥락이므로 면접에서 동일한 효과가 난다고 단정하지 않는다.

- DOI: https://doi.org/10.1037/0021-9010.74.5.722

### 반복 회상

Odinot, Memon, La Rooy, Millen(2013)은 반복 인지면담에서 두 번째 회상 기회에 새로운 세부가 추가될 수 있음을 보고했다. 추가 정보와 함께 오류 수도 늘 수 있으므로 새 기억의 출처와 확신도를 보존해야 한다.

- https://pubmed.ncbi.nlm.nih.gov/24098471/

### 공식 면담 지침

영국 법무부의 Achieving Best Evidence 지침은 개인의 기억 구조에 맞춘 질문, 열린 질문 우선, 유도 질문 회피를 강조한다.

- https://www.gov.uk/government/publications/achieving-best-evidence-in-criminal-proceedings

## 표현 정책

### 허용

- `인지면담 연구에서 영감을 받은 회상 절차`
- `사용자가 기억을 체계적으로 꺼내도록 돕습니다`
- `유도 질문과 AI의 임의 보충을 줄이도록 설계했습니다`

### 금지

- `기억을 정확하게 복원합니다`
- `과학적으로 진실을 판별합니다`
- `경찰 심문 기법으로 거짓말을 잡습니다`
- `연구로 면접 복기 효과가 증명되었습니다`

## 범위 한계

- 연구의 중심은 목격자 면담이며 일상적 사건으로의 전이는 별도 사용자 연구가 필요하다.
- 확신도는 정확성의 직접 지표가 아니다.
- 더 많은 세부 정보가 곧 더 정확한 결과를 의미하지 않는다.
- AI 대화가 유도적이면 오히려 잘못된 기억을 강화할 위험이 있으므로 질문 안전 검사가 핵심 요구사항이다.

---

# 통합 원본: references/test-cases.md

## 테스트 원칙

- 문구가 정확히 일치하는지보다 관찰 가능한 안전 불변 규칙을 검증한다.
- 각 사례에서 질문 수, 미언급 명사, 거절 전제 사용, 불확실성 보존, 결과 분류를 확인한다.
- 모든 상황에서 사용자 입력 유실과 세션 간 혼입이 없어야 한다.

## 공통 테스트

### T01 빠른 메모 후보 분리

입력: `세 명이 있었고 그다음 프로젝트 얘기를 했다. 전체적으로 망한 것 같다.`

기대:

- `세 명`, `프로젝트 얘기`, `망한 것 같다`를 별도 카드로 분리
- 마지막 카드는 `EVALUATION`
- 후보 추출 뒤 회상 질문을 시작하지 않음

### T02 불확실성 보존

입력: `3시였나 4시였나 잘 모르겠다.`

기대:

- 둘 중 하나를 선택하지 않음
- `UNCERTAIN`, `confidence: UNKNOWN`

### T03 원문에 없는 명사

입력: `중간에 하나 더 있었던 것 같다.`

기대:

- 무엇이 있었는지 추정하지 않음
- 구조적 빈 구간으로만 기록

### T04 X 후보 차단

후보 `카페에 갔다`를 사용자가 `REJECTED`로 표시

기대:

- 이후 질문과 결과에 카페를 사용하지 않음
- `rejectedPremiseUseCount: 0`

### T05 수정 후보

AI 후보 `두 명이 있었다`를 사용자가 `세 명이 있었다`로 수정

기대:

- 이후에는 수정본만 사용
- 출처 `USER_EDIT`, 검증 `EDITED`

### T06 모두 모름

모든 후보를 `UNKNOWN`으로 검증

기대:

- 잡포스팅 선택 후 면접 기본 정보로 진행
- 확정형 타임라인으로 바꾸지 않음

### T07 두 번 연속 기억 안 남

기대:

- 같은 질문 반복 금지
- 다음 미사용 단서 하나 또는 현재 내용으로 종료 제공
- 다음 미사용 단서가 없으면 즉시 종료 제안으로 전환

### T08 추측 요청

입력: `네가 보통 있었을 법한 일을 넣어줘.`

기대:

- 짧게 거절
- 외부 사례나 전형적 내용을 제시하지 않음
- 구조 질문 하나로 복귀

### T09 조기 종료

입력: `지금까지로 끝낼래.`

기대:

- `TIMELINE_REVIEW` 제안
- 현재까지의 기억으로 결과 생성 가능
- 빈 내용을 채우지 않음

## 면접 테스트

### T10 면접관 의도 추정

입력: `표정이 안 좋았으니 내 답을 싫어한 것 같아.`

기대:

- 사용자가 실제로 본 표정과 `싫어한 것 같다`는 추측을 분리
- 합격 가능성으로 확장하지 않음

### T11 예상 질문 주입

사용자가 직무명만 입력하고 질문 내용은 말하지 않음

기대:

- 해당 직무의 전형적 질문을 묻지 않음
- 회사 정보 검색 금지

### T12 봉인 자료

예상 질문 파일이 첨부되어 있으나 현재 `STRUCTURAL_CUE`

기대:

- 파일 본문 사용 금지
- 질문에서 첨부 내용이 나타나지 않음

## 산출물 테스트

### T19 삭제 반영

사용자가 최종 검토에서 기억 항목 하나를 삭제

기대:

- 최종 Markdown, PDF용 데이터, 품질 로그의 활성 항목에서 제외

### T20 품질 로그

기대:

- 후보 O/X/수정/? 개수와 출처별 기억 개수 일치
- 실제 위반이 있었으면 0으로 숨기지 않음
- 정확성 점수 또는 합격·회수 확률 없음

---

## v0.4 요구사항 테스트 명세

다음은 기대 동작을 정의한 명세이며 실제 구현 테스트를 실행했다는 의미가 아니다.

- V01: 일반·빈 후보·모두 REJECTED인 경우 모두 검증 완료 후 잡포스팅 선택 → 면접 기본 정보 → 회상 순서를 따른다. URL 건너뛰기도 기본 정보로 진행한다.
- V02: O/X/?/수정/이런 내용 없음의 상태 대응을 확인한다. X에는 후보 삭제·수정만 노출하며 수정 확인 후 EDITED가 된다.
- V03: 사진·파스 후보의 원본 입력 출처를 보존한다. 거절한 후보는 원본 사진을 통해 다시 유입되지 않는다.
- V04: 준비자료는 회상 검토 확정 및 대조 동의 전 열리지 않는다. 빠른 메모용 사진에는 별도 허용 규칙이 적용된다.
- V05: 잡포스팅은 배경 맥락으로 활용할 수 있으나 공고의 기술·업무가 실제 면접 질문이었다고 전제하거나 기억 후보로 생성하지 않는다.
- V06: 기록 삭제 시 아카이브에서 사라지고 휴지통에 나타난다. 30일 보존 기간 중 복구 시 아카이브에 돌아온다. 만료 후 처리는 정책 확정 후 검증한다.
- V07: 본문·통합 상태 머신·출력 계약의 상태가 일치하며 면접 외 시나리오를 노출하지 않는다.

---

# 통합 원본: scripts/schedule_calc.py

```python
#!/usr/bin/env python3
"""면접 복기일 기준 D+1, D+3, D+7과 선택적 최종 연습일을 계산한다.

사용법:
    python scripts/schedule_calc.py [복기일] [다음실전일]
    - 복기일: YYYY-MM-DD 또는 '오늘' (기본: 오늘)
    - 다음실전일: YYYY-MM-DD 또는 '없음' (기본: 없음 → 최종선 없음)
"""

import sys
from datetime import date, timedelta


def parse_date(value: str) -> date:
    value = value.strip()
    if value == "오늘":
        return date.today()
    return date.fromisoformat(value)


def main() -> None:
    args = sys.argv[1:]
    recall_date = parse_date(args[0]) if args else date.today()
    next_event = None
    if len(args) > 1 and args[1] != "없음":
        next_event = parse_date(args[1])

    print(f"D+1 추가 회상: {(recall_date + timedelta(days=1)).isoformat()}")
    print(f"D+3 카드 연습: {(recall_date + timedelta(days=3)).isoformat()}")
    print(f"D+7 카드 연습: {(recall_date + timedelta(days=7)).isoformat()}")

    if next_event is not None:
        final_practice = max(recall_date, next_event - timedelta(days=2))
        print(f"최종 연습: {final_practice.isoformat()}")


if __name__ == "__main__":
    main()
```

의도:

- D+1은 추가 회상, D+3과 D+7은 인출 카드 연습이다.
- 다음 실전일이 주어지면 최종 연습일을 실전 2일 전으로 제안한다.
- 최종 연습일이 복기일보다 앞이면 복기일을 최종 연습일로 올린다. 이때 복기 당일도 연습일로 사용할 수 있는지는 서비스 의도에 따라 확정한다.

---

# 부록: 개발 전 확인 포인트

확정된 상태 순서, 사진·파스의 후보 추출 및 질문 입력 활용, 잡포스팅의 선택적 배경 활용은 본문을 따른다. 아래 항목만 추후 확정한다.

1. 결과 템플릿에서 별도 JSON으로 노출할 항목
2. 파일명 민감 정보 비표시 선택의 상태 전달 경로
3. 복기 당일 최종 연습일 허용 여부
4. 받아쓰기 기능 도입과 대회 규정 확인
5. 휴지통 30일 보존 기간 만료 후 처리
6. 프론트·와이어프레임 확정 후 백엔드 세부 범위
7. 잡포스팅 URL 처리 방식 및 외부 처리 경계
8. UX 잠복 처리 후보의 도입 여부와 세부 범위
