# PDF 서비스 책임 (W-18)

이 문서는 Memory Replay에서 PDF 관련 책임이 어느 컴포넌트에 있는지 정의한다.
PRD §18 F-24 "PDF는 서비스 렌더러 담당"에 근거한다.

## 책임 경계

- 스킬 응답은 PDF 바이너리를 포함하지 않는다.
- 스킬이 반환하는 결과 문서는 `resultDocument.markdown` 형식의 Markdown 텍스트다.
- PDF 생성은 스킬이 아니라 서비스(렌더러)의 책임이다.
- 서비스는 `resultDocument.markdown`을 바탕으로 PDF를 생성한다.

## PDF 생성 실패 시 책임

- PDF 생성이 실패하면 서비스는 대체 수단을 제공한다.
- 대체 수단: Markdown 텍스트 제공, 화면 복사 제공 등.
- 스킬은 PDF 생성 실패를 이유로 결과 제공을 중단하지 않는다.
- 스킬은 PDF 생성 성공/실패 여부를 응답에 포함하지 않는다 (서비스 측 처리).

## 스킬이 하지 않는 것

- 스킬은 PDF 바이너리를 생성하지 않는다.
- 스킬은 PDF 생성 성공/실패 상태를 응답에 포함하지 않는다.
- 스킬은 PDF 렌더링 방식(폰트, 페이지 크기, 레이아웃 등)을 결정하지 않는다.

## 근거

- PRD §18 F-24: "PDF는 서비스 렌더러 담당"
- docs/references/output-contract.md §최종 결과 객체: resultDocument는 markdown 필드 포함, PDF 바이너리 아님
- docs/references/guardrails.md §5 (스킬 응답 범위): 스킬 응답은 JSON 객체 하나, PDF 등 바이너리 미포함

## 관련

- W-10 GENERATE_OUTPUT: resultDocument 생성 (markdown)
- W-17 템플릿·JSON 연결 필드 정렬: markdown 내 인출 카드 + JSON 식별 구조
- F-24: PDF는 서비스 렌더러 담당 (PRD §18)
