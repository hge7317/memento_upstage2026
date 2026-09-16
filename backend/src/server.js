import express from "express";
import { mockRecallQuestion } from "./mock-api.js";

export const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SOLAR_API_KEY = process.env.SOLAR_API_KEY;
const SOLAR_BASE_URL = "https://api.upstage.ai/v1";
const SOLAR_MODEL = "solar-pro4";

// CORS — 프론트 origin 허용 (개발 환경)
const ALLOWED_ORIGINS = [
  ...(process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(",") : []),
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3005",
  "http://127.0.0.1:3005",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Solar Pro 4 호출
async function callSolar(messages, maxTokens = 1024) {
  if (!SOLAR_API_KEY) {
    throw new Error("SOLAR_API_KEY not set");
  }

  const response = await fetch(`${SOLAR_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SOLAR_API_KEY}`,
    },
    body: JSON.stringify({
      model: SOLAR_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Solar API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty Solar response");
  return content;
}

// POST /api/recall — 회상 질문 생성
app.post("/api/recall", async (req, res) => {
  const requestStage = req.body?.contextType || "recall";
  try {
    const { sessionId, context, contextType, questionCount = 1 } = req.body;

    // Solar 호출 — 회상 질문 생성 프롬프트 (output-contract.md 준수)
    const systemPrompt = `당신은 Memory Replay 서비스의 회상 질문 생성기입니다.
사용자의 면접 기억을 구조적으로 끄집어내기 위한 질문 1개를 생성합니다.
반드시 output-contract.md를 준수합니다.
직접 답변에서 사용자가 기억 실패를 표현했는지 먼저 판단한 후 질문을 생성합니다.
기억 실패가 확인되면 직전 질문과 동일한 질문을 생성해서는 안됩니다.

## 핵심 규칙
- 한 번에 회상 질문 1개만 생성합니다.
- 질문은 구체적이고, 사용자가 제공하지 않은 고유명사를 추가하지 않습니다.
- 한 장면/사건만 묻습니다.
- 사용자의 원문/검증된 기억에 없는 내용을 주입하지 않습니다.
- 불확실한 기억을 확정형으로 바꾸지 않습니다.
- 평가·정답을 암시하지 않습니다.
- REJECTED(이런 내용 없음) 후보를 질문 전제로 사용하지 않습니다.
- 질문에 쓰는 구체 명사(사람·장소·물건·발언)는 반드시 "확인된 기억" 또는 "직전 답변"에 등장한 표현이어야 한다. 그 밖의 명사는 쓰지 않습니다.

## 회상 실패 및 질문 전환 규칙
- 사용자가 "기억이 안 난다.", "모르겠다.", "생각나지 않는다." 또는 이에 준하는 표현을 하면, 직전 질문의 내용을 다시 묻거나 표현만 바꿔 재질문하지 않습니다.
- 사용자가 기억하지 못한다고 밝힌 사건·발언·질문은 이후 질문의 전제로 사용하지 않습니다.
- 회상 실패가 발생하면 해당 단서를 즉시 포기하고 다른 범주로 전환합니다.
- 같은 사건에 대한 질문을 연속 5회 이상 생성하지 않습니다.
- 사용자가 새롭게 제공한 정보가 있다면, 그 정보를 우선적인 다음 회상 단서로 사용합니다.
- 사용자의 답변이 "1:3 면접이었다."처럼 새로운 사실을 포함하면, 이전에 실패한 '코드 질문 내용'을 다시 묻지 말고 새롭게 확인된 사실에서 질문을 생성합니다.
- 구체적인 발언 내용이 기억나지 않는 경우, 발언 내용을 억지로 회상시키지 말고 시간·공간·감각·행동 등 다른 종류의 단서로 이동합니다.

## 출력 형식
반드시 유효한 JSON으로만 응답합니다. Markdown 코드 펜스(\`\`\`)를 붙이지 않습니다.
output-contract.md의 공통 응답 필드를 따릅니다.

공통 응답 예시:
{
  "stage": "<요청된 단계>",
  "nextStage": "<완료 조건에 따른 제안 단계>",
  "assistantMessage": "사용자에게 표시할 짧은 안내 (질문과 중복되지 않음)",
  "question": "회상 질문 하나",
  "candidateItems": [],
  "newMemoryItems": [],
  "objectiveFieldRequest": [],
  "timeline": [],
  "evaluations": [],
  "openGaps": [],
  "canFinishNow": true,
  "safety": {
    "injectionCheckPassed": true,
    "rejectedPremiseUsed": false,
    "multipleRecallQuestions": false,
    "certaintyPreserved": true,
    "blockedReason": null
  },
  "audit": {
    "questionSource": "<단서 범주: STRUCTURAL_TIME | STRUCTURAL_SPACE_SENSORY | STRUCTURAL_ACTION | FREE_RECALL | REVERSE_RECALL | CONTEXT_REINSTATEMENT>",
    "memoryItemsAdded": 0,
    "assumptions": []
  }
}

## 단계별 응답 제한
- CONTEXT_REINSTATEMENT: question 하나만 포함, 나머지는 null/빈 배열
- FREE_RECALL: question 하나 포함, 나머지는 null/빈 배열
- REVERSE_RECALL: question 하나, newMemoryItems(새 기억 구조화 시)

## safety 필드 규칙
- injectionCheckPassed: 미언급 구체 명사, 거절 전제, 복수 질문, 평가·정답 암시 검사를 통과한 경우 true
- 검사를 실행하지 않았거나 판정할 수 없으면 true로 두지 않습니다.
- blockedReason: 질문을 만들지 않는 단계에서는 "NOT_APPLICABLE" 사용 가능

questionSource는 질문의 출처 범주를 나타냅니다:
- CONTEXT_REINSTATEMENT: "CONTEXT_REINSTATEMENT"
- FREE_RECALL: "FREE_RECALL"
- REVERSE_RECALL: "REVERSE_RECALL"
- STRUCTURAL_CUE 시간 단서: "STRUCTURAL_TIME"
- STRUCTURAL_CUE 공간·감각 단서: "STRUCTURAL_SPACE_SENSORY"
- STRUCTURAL_CUE 행동 단서: "STRUCTURAL_ACTION"
`;

    const userPrompt = `다음 세션 정보를 바탕으로 회상 질문을 생성해 주세요.

요청 단계: ${contextType}
확인된 기억(이 목록에 있는 표현만 질문에 쓸 수 있음):
${(context?.confirmedItems ?? []).map((s,i)=>`${i+1}. ${s}`).join("\n") || "없음"}
거절된 내용(질문·전제에 절대 사용 금지):
${(context?.rejectedItems ?? []).map(s=>`- ${s}`).join("\n") || "없음"}
면접 기본 정보(배경으로만): ${JSON.stringify(context?.interviewInfo ?? {})}
직전 답변: ${context?.previousAnswer || "없음"}

참고: 면접 기본 정보(회사, 직무, 일시, 방식, 단계, 면접관 수)가 있으면 배경으로만 참고하고, 잡포스팅 URL이 있으면 배경 맥락으로만 참고합니다. 공고 내용을 실제 면접 질문/사건으로 전제하지 않습니다.

위 컨텍스트에 없는 고유명사를 질문에 추가하지 마세요.

반드시 JSON으로만 응답하세요. Markdown 코드 펜스를 붙이지 마세요.`;

    const solarMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const solarContent = await callSolar(solarMessages, 1536);

    // Solar 응답 파싱 — output-contract.md 공통 응답 JSON
    let parsed = null;
    try {
      const jsonMatch = solarContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Solar JSON 파싱 실패:", parseError.message);
    }

    if (parsed && typeof parsed.question === "string") {
      const rejected = context?.rejectedItems ?? [];
      const hit = rejected.find(r => r && parsed.question.includes(r));
      if (hit) { parsed.question = "그다음에 기억나는 것은 무엇인가요?"; parsed.safety = { ...(parsed.safety||{}), injectionCheckPassed:false, blockedReason:"REJECTED_PREMISE" }; }
      const response = {
        stage: requestStage.toUpperCase().replace(/-/g, "_"),
        nextStage: requestStage === "context-reinstatement" ? "FREE_RECALL"
          : requestStage === "free-recall" ? "STRUCTURAL_CUE"
          : "TIMELINE_REVIEW",
        assistantMessage: parsed.assistantMessage || "회상 질문을 준비했습니다.",
        question: parsed.question,
        candidateItems: parsed.candidateItems || [],
        newMemoryItems: parsed.newMemoryItems || [],
        objectiveFieldRequest: parsed.objectiveFieldRequest || [],
        timeline: parsed.timeline || [],
        evaluations: parsed.evaluations || [],
        openGaps: parsed.openGaps || [],
        canFinishNow: parsed.canFinishNow ?? true,
        safety: parsed.safety || {
          injectionCheckPassed: true,
          rejectedPremiseUsed: false,
          multipleRecallQuestions: false,
          certaintyPreserved: true,
          blockedReason: null,
        },
        audit: parsed.audit || {
          questionSource: requestStage === "context-reinstatement" ? "CONTEXT_REINSTATEMENT"
            : requestStage === "free-recall" ? "FREE_RECALL"
            : "REVERSE_RECALL",
          memoryItemsAdded: 0,
          assumptions: [],
        },
      };
      res.json(response);
    } else {
      console.error("Solar 응답이 output-contract.md 형식을 준수하지 않음, mock 폴백 사용");
      res.json({
        stage: requestStage.toUpperCase().replace(/-/g, "_"),
        nextStage: requestStage === "context-reinstatement" ? "FREE_RECALL"
          : requestStage === "free-recall" ? "STRUCTURAL_CUE"
          : "TIMELINE_REVIEW",
        assistantMessage: "회상 질문을 준비했습니다.",
        question: mockRecallQuestion.question,
        candidateItems: [],
        newMemoryItems: [],
        objectiveFieldRequest: [],
        timeline: [],
        evaluations: [],
        openGaps: [],
        canFinishNow: true,
        safety: {
          injectionCheckPassed: mockRecallQuestion.injectionCheck?.passed ?? true,
          rejectedPremiseUsed: false,
          multipleRecallQuestions: false,
          certaintyPreserved: true,
          blockedReason: null,
        },
        audit: {
          questionSource: requestStage === "context-reinstatement" ? "CONTEXT_REINSTATEMENT"
            : requestStage === "free-recall" ? "FREE_RECALL"
            : "REVERSE_RECALL",
          memoryItemsAdded: 0,
          assumptions: [],
        },
        source: "MOCK_FALLBACK",
        sessionId: req.body?.sessionId || "session-demo",
      });
    }
  } catch (error) {
    console.error("Solar call failed, using mock fallback:", error.message);
    res.json({
      stage: requestStage.toUpperCase().replace(/-/g, "_"),
      nextStage: requestStage === "context-reinstatement" ? "FREE_RECALL"
        : requestStage === "free-recall" ? "STRUCTURAL_CUE"
        : "TIMELINE_REVIEW",
      assistantMessage: "회상 질문을 준비했습니다.",
      question: mockRecallQuestion.question,
      candidateItems: [],
      newMemoryItems: [],
      objectiveFieldRequest: [],
      timeline: [],
      evaluations: [],
      openGaps: [],
      canFinishNow: true,
      safety: {
        injectionCheckPassed: mockRecallQuestion.injectionCheck?.passed ?? true,
        rejectedPremiseUsed: false,
        multipleRecallQuestions: false,
        certaintyPreserved: true,
        blockedReason: null,
      },
      audit: {
        questionSource: requestStage === "context-reinstatement" ? "CONTEXT_REINSTATEMENT"
          : requestStage === "free-recall" ? "FREE_RECALL"
          : "REVERSE_RECALL",
        memoryItemsAdded: 0,
        assumptions: [],
      },
      source: "MOCK_FALLBACK",
      sessionId: req.body?.sessionId || "session-demo",
    });
  }
});

// 서버 시작 (Vercel 환경에서는 호출하지 않음)
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Memory Replay backend running on port ${PORT}`);
    console.log(`Solar Pro 4: ${SOLAR_API_KEY ? "configured" : "NOT CONFIGURED — using mock fallback"}`);
  });
}

export default app;
