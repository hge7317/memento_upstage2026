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
