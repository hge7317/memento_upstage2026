# 프롬프트: 배포 서비스의 첫 화면을 로그인 → 서비스 진입 화면으로 변경

## 목표
현재 배포된 서비스(`main` 기준)를 접속하면 로그인 화면이 먼저 나온다. 이 순서를 바꿔 **서비스 진입 화면(스플래시 또는 워크플로 첫 화면)이 먼저** 나오고, 로그인은 그 이후에 필요한 시점에만 보이게 만든다.

## 현재 동작 (확인된 사실)
- `frontend-v5/src/App.jsx` 기준 라우팅:
  - `/` → `<Splash onStart={(dest) => { sessionStorage.setItem("memento.dest", dest); navigate("/login"); }} />`
  - `/login` → session 있으면 `/prepared`(또는 `/archive`)로 replace redirect, 없으면 `<Login onLogin={startSession} />`
- 즉 첫 진입은 Splash → (onStart) → Login 순서다.

## 원하는 동작
- 서비스 접속 시 **먼저 서비스 진입 화면이 보인다**.
- 로그인이 필요한 흐름이라면, 로그인은 진입 화면 이후에 필요한 시점(예: 실제 워크플로 시작 직전)에만 요청한다.
- Splash와 Login 간 순서/이동 방식이 이 목표에 맞게 바뀐다.

## 작업 범위
- 대상 파일: `frontend-v5/src/App.jsx`
- 관련 컴포넌트: Splash, Login (필요 시)
- 그 외 페이지는 이 작업의 직접 대상이 아니다.

## 금지/루프 방지
- "로그인을 없애라"가 아니다. 필요한 경우 로그인을 남기되 **첫 화면 순서**만 바꾼다.
- 끝이 모호해서 같은 라우팅을 여러 번 건드리지 않는다. 아래 완료 기준으로 닫는다.
- 로그인 화면을 완전히 제거하면 안 되는 시나리오라면, 제거 대신 "첫 화면에서 로그인 노출 제거/지연"으로 처리한다.

## 완료 기준 (체크)
1. 배포 서비스 첫 진입 시 서비스 진입 화면(Splash 또는 그 역할을 하는 화면)이 먼저 렌더링된다.
2. 로그인이 여전히 필요하다면, 로그인은 첫 화면 이후 필요한 시점에만 보인다.
3. `npm run build`가 통과한다.
4. 변경된 부분은 App.jsx 라우팅/Splash·Login 상호작용에 한정된다(의도치 않게 다른 페이지 동작이 바뀌지 않았는지 확인).

## 참고
- Splash 페이지를 찾을 수 없으면 먼저 `frontend-v5/src/pages/Splash.jsx`와 `frontend-v5/src/components/Splash.jsx` 중 실제 존재하는 파일을 확인한다.
- 현재 로그인/세션 시작 흐름이 어떻게 연결되어 있는지(App.jsx의 `startSession`, `onLogin`, `sessionStorage` 사용)를 먼저 읽은 뒤 수정한다.
