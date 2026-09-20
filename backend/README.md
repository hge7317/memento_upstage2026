# Memento Backend

Express 서버에서 Solar Pro 4를 호출합니다. Node.js 20 이상이 필요합니다.

## 실행

```sh
npm ci
cp .env.example .env
# .env에 SOLAR_API_KEY 설정
node --env-file=.env src/server.js
```

기본 포트는 3001입니다. `npm start`와 `npm run dev`는 셸 환경 변수를 사용합니다. Vercel은 `api/index.js`에서 Express 앱을 가져오며 별도 리스닝 소켓을 열지 않습니다.

## API

- `POST /api/recall`: 현재 단계·확인/거절 후보·최근 대화를 받아 회상 응답을 생성합니다. 잘못된 단계는 400, 모델 응답 계약 위반은 502, 호출 실패는 500으로 반환합니다.
- `POST /api/job-posting`: `{ "url": "..." }`의 공고 페이지를 읽고 Solar로 공고 정보를 분석합니다. 빈 URL과 분석 실패는 기존 `ok: false` 응답을 유지합니다.

실제 응답 계약은 `src/routes/`와 `test/recall.test.js`에 있습니다. `src/memory-replay-skill.js`가 회상 프롬프트와 전이 검증 규칙을 제공합니다.

`FRONTEND_ORIGIN`은 추가 허용 출처를 쉼표로 구분합니다. `SOLAR_API_KEY`는 서버에만 설정합니다. 세션 DB·사용자 인증·PDF 생성·기록 영구 삭제 API는 현재 제공하지 않습니다. 공고 URL에 대한 사설망 접근 제한 등 배포 보안 검토도 별도로 필요합니다.

## 테스트

`npm test`는 주입한 Solar 대역을 사용하며 외부 API나 비용을 발생시키지 않습니다.
