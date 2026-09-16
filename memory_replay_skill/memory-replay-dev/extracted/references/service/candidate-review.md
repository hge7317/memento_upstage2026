# 후보 추출·검증

추출 단계에서는 빠른 메모 텍스트와 빠른 메모용 사진의 파스 텍스트만 사용한다. 원문을 수정하지 않고 한 카드 한 주장으로 분리한다. 순서 미상은 null, 기본 확신도는 MEDIUM이다. 불확실한 두 가능성을 합쳐 확정하지 않는다.

| 선택 | 상태 | 처리 |
|---|---|---|
| O | CONFIRMED | 사용자가 맞다고 확인 |
| X | REJECTED | 해당 후보에 삭제·수정 버튼 표시 |
| ? | UNKNOWN | 불확실성 보존 |
| 수정 후 확인 | EDITED | 사용자 수정본만 활성화 |
| 이런 내용 없음 | REJECTED | 실제 없었다는 사용자 부정 |

FACT는 사실 형태로 서술된 후보라는 분류이며 객관적 검증이 아니다. EVALUATION은 질문의 사건 전제로 쓰지 않는다. 사용자 정정 이후 이전 내용은 출처 이력에만 보존한다. 후보 삭제와 아카이브 기록 삭제는 별개다.

회상 입력은 서버가 검증 후 만든 활성 기억 집합을 기준으로 한다. 거절 내용을 원문·사진·파스에서 다시 끌어오지 않는다. 후보별 id, claim, sourceQuote, sourceInputId, sourceInputType(TEXT/PHOTO_PARSE), category(FACT/UNCERTAIN/EVALUATION), verification, confidence를 보존한다. 서비스는 거절 후보 ID와 수정 이력을 유지해 재유입을 검사한다.
