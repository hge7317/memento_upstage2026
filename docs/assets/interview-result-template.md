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
