# Memory Replay - Frontend

모바일 우선 웹 UI. P0에서는 면접 복기 흐름을 우선 구현한다.

## 목표
- 모바일에서 한 손 조작이 가능한 화면 구성
- 빠른 메모 → 후보 추출 → O/X 검증 → Step 1 → Step 2 → 결과 흐름을 상태 머신으로 관리
- 결과 Markdown 다운로드 지원

## 권장 스택
- Next.js 14+ (App Router)
- React Server Components + Client Components 분리
- 상태 관리: 서버 상태는 fetch/Server Actions, 클라이언트 상태는 React 상태 또는 경량 스토어

## 개발 규칙
- 질문 1개 원칙, 미언급 명사 금지, X 후보 재사용 금지, 평가 분리는 화면/문구 수준에서도 반영한다.
- 민감정보를 클라이언트에 노출하지 않는다.
- 원문·검증 결과·결과는 세션별로 분리한다.

## 폴더 예시
frontend/
  app/
  components/
  lib/
  public/
