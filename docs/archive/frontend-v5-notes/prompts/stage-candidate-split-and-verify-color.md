# 프롬프트: 빠른메모 줄바꿈 기준 후보 분리 + 검증 UI 색상 연동

## 배경

- 현재 빠른메모(QuickMemo)의 textarea 원문은 `extractCandidates({ original })`로 전달되고, `splitMeaningUnits`에서 정규식 `.?/`와 `았었였겠고` 기준으로만 나눈다.
- 사용자가 메모에 직접 줄바꿈을 넣어 후보를 구분해 입력해도, 줄바꿈이 분리 단서로 우선 반영되지 않아 한 덩어리로 처리될 수 있다.
- 검증 화면(UserVerify)의 "수정" 버튼은 회색 외곽선 스타일이고, UNCERTAIN/EDITED 상태에서도 해당 카테고리 칩의 색과 버튼 색이 연동되지 않는다.

## 범위

1. 빠른메모 textarea에서 줄바꿈(\n)으로 입력된 문단/문장을 각각 독립 후보로 분리하도록 `splitMeaningUnits` 로직을 바꾼다.
2. 이렇게 분리된 후보가 추출 페이지(ExtractCandidates)와 그 뒤 페이지들(UserVerify → VerifyComplete → RecallSteps → TimelineReview → ResultDoc)에서 동일하게 소비되도록 경로를 점검·반영한다.
3. 후보추출 페이지에서 "수정" 버튼을 파란색으로 바꾼다.
4. UserVerify에서 "확실하지 않아요"를 누르면 카테고리 칩이 "FACT · 사실 후보" → "UNCERTAIN · 불확실"로 바뀌고, "수정"을 누르면 "EDITED · 수정됨"으로 바뀌며, 해당 칩의 배경/문자 색을 눌린 버튼의 색과 동일하게 맞춘다.

## 파일

- `frontend-v5/src/lib/extractCandidates.js`
- `frontend-v5/src/pages/QuickMemo.jsx`
- `frontend-v5/src/pages/ExtractCandidates.jsx`
- `frontend-v5/src/pages/UserVerify.jsx`
- `frontend-v5/src/App.css` (필요 최소 범위만)

## 단계별 지시

### Stage A: 줄바꿈 우선 분리 (extractCandidates.js)

1. `splitMeaningUnits(text)`를 다음과 같이 바꾼다.
   - 먼저 원문을 `\r?\n`으로 나눠 줄 배열을 만든다(줄 단위 trim, 빈 줄 제거).
   - 각 줄을 다시 `.?/` 문장 경계와 `았었였겠고` 절 경계로 나눈다.
   - 줄바꿈이 있는 경우 그 줄이 최소 분리 단위가 되고, 한 줄 안에서만 문장/절 분리를 수행한다.
   - 줄바꿈 없이 긴 문단 하나만 있을 때는 기존 동작과 동일하게 문장/절 단위로 나눈다.
2. `extractCandidates` 반환값 구조(candidateItems, categorySummary 등)는 그대로 유지한다.
3. 다음 소극적 확인문장을 경계 내로 둔다.
   - 원문에 줄바꿈이 전혀 없는 단일 문단이면 기존과 같은 수의 후보card가 나와야 한다.
   - 원문에 의미 있는 줄바꿈이 있으면, 줄 수 이상의 후보가 생기지 않되 각 줄이 최소 1 후보로 분리되어야 한다.

### Stage B: 빠른메모 입력 안내와 후속 페이지 적용

1. QuickMemo textarea의 placeholder/example에 줄바꿈으로 후보를 구분할 수 있다는 힌트를 남긴다. 기존 placeholder를 지우지 말고 끝에 한 줄 추가한다.
2. ExtractCandidates → UserVerify로 넘어가는 경로에서 `extractCandidates` 결과가 그대로 `session.candidates`로 들어가므로, Stage A 변경만으로 세분화 효과가 전파되는지 확인한다.
3. downstream에서 후보 배열을 소비하는 지점(UserVerify 목록 렌더링, VerifyComplete 카드, RecallSteps 필터, TimelineReview의 tag 기반 렌더링, ResultDoc의 수정 카운트 등)이 분리로 인해 늘어난 후보를 정상 렌더링하는지 확인한다.
   - 특히 한 세션에서 후보가 많아졌을 때 목록 스크롤·진행도 카운터·완료 버튼 활성 조건이 깨지지 않는지 본다.
   - TimelineReview의 `tag === "UNCERTAIN"` 필터 등 category/tag 기반 분기가 분리로 인해 오작동하지 않는지 확인한다.

### Stage C: 추출 페이지 "수정" 버튼 파란색화

1. ExtractCandidates 페이지에 현재 "수정" 라벨이 쓰이는 버튼이 있는지 확인하고, 있다면 그 버튼의 배경/문자 색을 파란색 계열(accent)로 바꾼다.
2. ExtractCandidates에 "수정" 개입 지점이 없다면, 후보 카드에 수정 액션이 노출되는 구조를 먼저 확인한 뒤 그 버튼의 색을 바꾼다.
3. 다른 버튼의 강조색 체계를 무너뜨리지 않는 범위에서 버튼 하나에만 적용한다.

### Stage D: UserVerify UNCERTAIN/EDITED 칩 색상 연동

1. UserVerify의 `renderCandidate`에서 각 후보 카드 상단에 있는 칩(라벨)을 확인한다. 현재 `labelForChip(c)`가 category 기반 라벨을 반환하고, 칩 background/color는 `chipBg`/`chipColor`로 설정되어 있다.
2. "확실하지 않아요" 버튼 클릭 시 해당 후보의 category가 UNCERTAIN로 바뀌고 칩 라벨이 "UNCERTAIN · 불확실"가 되도록 한다. 현재 `markUnknown`은 status를 UNKNOWN으로 바꾸는데, category까지 UNCERTAIN으로 내리도록 수정한다. 기존 UNKNOWN 상태의 쓰임(검증 완료 처리 등)을 해치지 않는 선에서 category 연동을 추가한다.
3. "수정" 버튼 클릭 시 해당 카드에 "EDITED · 수정됨" 라벨이 드러나도록 한다. 현재 `markEdited`는 status=EDITED와 editedClaim을 설정하므로, 칩 라벨이 EDITED 상태에서 "EDITED · 수정됨"을 표시하도록 `labelForChip` 또는 칩 렌더링 분기를 추가한다.
4. 칩의 배경색·문자색을 눌린 버튼의 색과 맞춘다.
   - "확실하지 않아요" 버튼 색(background/color)과 UNCERTAIN 칩의 배경/문자 색을 동일한 CSS 변수 또는 동일 값으로 맞춘다.
   - "수정" 버튼 색과 EDITED 칩의 배경/문자 색을 동일한 값으로 맞춘다.
   - 기존 FACT EVALUATION 칩 색 체계와 어긋나지 않도록, 불확실/수정 상태에서만 색을 바꾼다.
5. 칩을 누를 수 있는 버튼처럼 보이지 않게 한다(칩은 상태 표시, 조작은 하단 버튼). 색상만 연동하고 칩 자체의 클릭 동작은 추가하지 않는다.

## 완료 기준(체크리스트)

- [ ] `splitMeaningUnits`가 줄바꿈 우선 분리를 하고, 줄바꿈 없는 단일 문단은 기존과 동일하게 동작한다.
- [ ] 빠른메모에 줄바꿈을 넣어 저장하면 추출 단계에서 줄 수만큼 후보가 나뉘어 UserVerify 목록에 보인다.
- [ ] UserVerify → VerifyComplete → RecallSteps → TimelineReview → ResultDoc에서 늘어난 후보 표시가 정상이다(진행도 카운터, 완료 버튼 활성, 태그 필터 포함).
- [ ] ExtractCandidates 페이지의 "수정" 관련 버튼이 파란색 계열로 보인다.
- [ ] UserVerify에서 "확실하지 않아요"를 누르면 카테고리 칩이 "UNCERTAIN · 불확실"로 바뀌고 색이 버튼과 같다.
- [ ] UserVerify에서 "수정"을 누르면 칩이 "EDITED · 수정됨"으로 바뀌고 색이 버튼과 같다.
- [ ] FACT/EVALUATION 카드에서는 기존 칩 색이 유지된다.

## 하지 말 것

- candidate 스키마(status/verification/confidence 등)를 불필요하게 확장하지 않는다. 필요한 최소 필드만 건드린다.
- 칩에 클릭 핸들러를 넣지 않는다(색만 연동).
- QuickMemo placeholder 예시를 완전히 새로 쓰지 않는다(기존 예시 유지 + 힌트 추가).
- App.css 전역 토큰을 한 번에 대폭 바꾸지 않는다(필요시 버튼·칩 로컬 범위만 건드린다).
