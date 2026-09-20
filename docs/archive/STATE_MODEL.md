# 상태 모델

## 상태 전이
SPLASH
→ SCENARIO_SELECT
→ QUICK_MEMO
→ EXTRACT_CANDIDATES
→ USER_VERIFY
→ OBJECTIVE_FRAME
→ CONTEXT_REINSTATEMENT
→ FREE_RECALL
→ STRUCTURAL_CUE
→ REVERSE_RECALL
→ TIMELINE_REVIEW
→ GENERATE_OUTPUT
→ COMPLETE

## 핵심 규칙
- EXTRACT_CANDIDATES 결과는 사실이 아니라 후보다.
- USER_VERIFY 완료 전에는 후보를 AI 질문의 확정 전제로 사용하지 않는다.
- X 처리된 후보는 이후 프롬프트 컨텍스트에서 제외하거나 rejected로 표시한다.
- 상황별 질문 모듈은 OBJECTIVE_FRAME 이후에만 활성화한다.
- 사용자가 현재 내용으로 결과 만들기를 누르면 TIMELINE_REVIEW로 이동할 수 있다.
- 결과 생성 이후 수정 시 새 버전을 만들고 기존 결과를 조용히 덮어쓰지 않는다.

## 세션 데이터
- sessionId, scenario, stage는 항상 함께 관리한다.
- quickMemo.original은 원문 보존용으로 별도 보관한다.
- memoryItems는 후보/검증/확신도/출처를 포함한다.
- objectiveFrame은 상황별 필수/선택 필드를 담는다.
- audit는 injectionCheckPassed, rejectedPremiseUsed 같은 규칙 검증 결과를 남긴다.
