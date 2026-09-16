# 서비스 응답 계약

SERVICE 모드에서만 JSON 객체 하나를 반환한다. 일반 대화의 출력은 원본을 따른다. 런타임은 문법·필수 필드·현재 상태를 검사하며, 실패 응답을 바로 사용자에게 노출하거나 상태를 전이하지 않는다.

```json
{
  "stage": "STRUCTURAL_CUE",
  "assistantMessage": "",
  "question": "그다음에 기억나는 것은 무엇인가요?",
  "candidateItems": [],
  "memoryItems": [],
  "evaluations": [],
  "openGaps": [],
  "resultMarkdown": null,
  "nextStageProposal": "STRUCTURAL_CUE",
  "safety": {"injectionCheckPassed": true, "rejectedPremiseUsed": false},
  "error": null
}
```

- question은 회상 단계에서 하나, 그 외 null이다. 폼·버튼은 서비스 코드에서 표시한다.
- candidateItems는 후보 추출, memoryItems·evaluations·openGaps는 회상·검토, resultMarkdown은 결과 생성에서 사용한다. 기억 항목은 id, content, confidence, source, sourceInputId, sourceQuote, verification을 포함한다.
- 검사 미실행은 safety 값을 null로 둔다. 실패나 불확실한 검사를 통과로 표시하지 않는다.
- error는 null 또는 code/message 객체다. 오류 시 nextStageProposal은 현재 상태이고 입력·기존 결과를 유지한다.
- 최종 Markdown은 기존 복기노트 서식을 기반으로 서비스 흐름에 명시된 예외만 적용한다. 상단에 ‘사용자 기억을 구조화한 기록이며 녹취나 객관적 사실 확인 결과가 아닙니다’를 표시한다.
- JSON 오류 시 서버는 동일 상태에서 재시도를 제공한다. 재시도 입력을 보존하고 중복 후보·기록 저장을 방지한다. 실패 결과를 정상 완료로 처리하지 않는다.
