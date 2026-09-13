# Backend 인터페이스 (목업 기준)

Solar Pro 4 연동은 별도 이슈로 진행한다. 현재는 프론트와 백엔드가 주고받을 인터페이스와 책임 범위만 정의한다.

## 기본 원칙
- 세션별 격리
- 원문/중간 추출물/결과 분리 보관
- 로그에는 원문·첨부내용 미기록
- Solar API 키는 서버에서만 사용

## API 계약(초안)

### 세션
- POST /api/session
  - 생성: sessionId, scenario, stage
  - 응답: sessionId, createdAt

### 빠른 메모
- POST /api/quick-memo
  - 입력: sessionId, original, scenario
  - 저장: 원문 보존, 추출 대상으로 표시

### 후보 추출
- POST /api/extract-candidates
  - 입력: sessionId, quickMemo
  - 응답(임시): 후보 배열(fact/uncertain/evaluation), 원문 근거 구절
  - 규칙: 원문에 없는 고유명사 추가 금지, 한 카드 한 주장

### O/X 검증
- PATCH /api/verify
  - 입력: sessionId, itemId, verification(confirmed/rejected/edited/unknown), editedText?
  - rejected 항목은 이후 질문/결과에서 제외

### 객관 정보
- POST /api/objective-frame
  - 입력: sessionId, fields(상황별)
  - 검증: 필수값 또는 모름 처리

### 회상 질문
- POST /api/recall
  - 입력: sessionId, context
  - 응답: 다음 질문 1개, injectionCheck 결과
  - 규칙: 질문 1개, 미언급 명사 금지, X 후보 재사용 금지

### 결과 생성
- POST /api/generate-output
  - 입력: sessionId
  - 응답: markdown, 품질 로그
  - 상황별 구조: 기본 정보/검증 핵심 기억/타임라인/평가 분리/AAR/인출 카드/재연습 일정

### 삭제
- DELETE /api/session
  - 세션·원문·중간 결과·결과 즉시 삭제
  - 삭제 후 재접근 불가

## 목업 범위
- 프론트 초기에는 위 API를 호출하는 형태만 만들고, 백엔드는 임시 목업/스켈레톤으로 응답한다.
- 실제 Solar 연동은 별도 브랜치/이슈로 분리한다.
