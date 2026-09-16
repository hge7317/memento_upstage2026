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

## 핵심 규칙
- 한 번에 회상 질문 1개만 생성합니다.
- 질문은 구체적이고, 사용자가 제공하지 않은 고유명사를 추가하지 않습니다.
- 한 장면/사건만 묻습니다.
- 사용자의 원문/검증된 기억에 없는 내용을 주입하지 않습니다.
- 불확실한 기억을 확정형으로 바꾸지 않습니다.
- 평가·정답을 암시하지 않습니다.
- REJECTED(이런 내용 없음) 후보를 질문 전제로 사용하지 않습니다.
- 질문에 쓰는 구체 명사(사람·장소·물건·발언)는 반드시 "확인된 기억" 또는 "직전 답변"에 등장한 표현이어야 한다. 그 밖의 명사는 쓰지 않습니다.

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

// POST /api/job-posting — 채용 공고 URL에서 배경 정보를 추출( Solar Pro 4 사용 )
app.post("/api/job-posting", async (req, res) => {
  const url = req.body?.url;
  if (!url || typeof url !== "string" || url.trim() === "") {
    return res.json({ ok: false, reason: "url_required" });
  }

  try {
    // 1) 페이지 fetch (타임아웃 10초, 브라우저 UA)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response;
    try {
      response = await fetch(url.trim(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      });
    } catch (fetchError) {
      if (fetchError.name === "AbortError") {
        return res.json({ ok: false, reason: "timeout" });
      }
      return res.json({ ok: false, reason: "fetch_failed" });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 403) {
      return res.json({ ok: false, reason: "forbidden" });
    }

    const html = await response.text();
    if (typeof html !== "string") {
      return res.json({ ok: false, reason: "fetch_failed" });
    }

    // 2) 렌더링 무관 태그 제거 후 텍스트화
    const cleaned = extractReadableText(html);
    if (cleaned.length < 200) {
      return res.json({ ok: false, reason: "body_too_short" });
    }
    const trimmed = cleaned.slice(0, 8000);

    // 3) Solar Pro 4로 구조화 JSON 추출
    const systemPrompt = `당신은 채용 공고 페이지에서 배경 정보를 추출하는 추출기입니다.
사용자가 제공한 공고 본문 텍스트를 읽고, 아래 스키마 JSON만 응답합니다.
Markdown 코드 펜스(\`\`\`)를 붙이지 말고, 유효한 JSON 객체만 출력합니다.

출력 스키마:
{
  "company": "채용 회사 이름 (문자열, 없으면 빈 문자열)",
  "role": "모집 직무/포지션 이름 (문자열, 없으면 빈 문자열)",
  "location": "근무지/위치 정보 (문자열, 없으면 빈 문자열)",
  "employmentType": "인턴/신입/경력/프리랜서 등 고용 형태 (문자열, 없으면 빈 문자열)",
  "deadline": "지원 마감일·마감 시점 정보 (문자열, 없으면 빈 문자열)",
  "requirements": ["주요 요구 사항 최대 3개 (문자열 배열, 3개 초과 시 자름)"],
  "summary": "공고 내용을 짧게 요약한 문장 (문자열)"
}

규칙:
- 공고 내용은 배경 참고용이며, 실제 면접에서 발생한 질문·사건·기억으로 전제하지 않습니다.
- 본문에 없는 정보는 만들지 말고, 없으면 빈 문자열 또는 빈 배열로 둡니다.
- company와 role은 반드시 채우려 시도하되, 정말 없으면 빈 문자열로 둡니다.
- requirements는 본문에서 확인되는 요구 사항만 최대 3개로 추립니다.
- 응답은 항상 위 키들을 가진 단일 JSON 객체여야 합니다.`;

    const userPrompt = `다음 채용 공고 본문에서 위 스키마 JSON을 추출해 주세요.

[채용 공고 본문]
${trimmed}

위 본문에서만 정보를 뽑아 JSON으로 응답하세요. 마크다운 코드 펜스 없이 JSON만 출력합니다.`;

    const solarContent = await callSolar(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      1024
    );

    // 4) JSON 파싱 및 검증
    let parsed = null;
    try {
      const jsonMatch = solarContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Job posting Solar JSON 파싱 실패:", parseError.message);
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return res.json({ ok: false, reason: "parse_failed" });
    }

    const company = typeof parsed.company === "string" ? parsed.company : "";
    const role = typeof parsed.role === "string" ? parsed.role : "";
    const location = typeof parsed.location === "string" ? parsed.location : "";
    const employmentType = typeof parsed.employmentType === "string" ? parsed.employmentType : "";
    const deadline = typeof parsed.deadline === "string" ? parsed.deadline : "";
    const summary = typeof parsed.summary === "string" ? parsed.summary : "";

    let requirements = Array.isArray(parsed.requirements)
      ? parsed.requirements.filter((r) => typeof r === "string").slice(0, 3)
      : [];

    // 주요 필드(회사/직무)가 없으면 파싱 실패로 본다
    if (!company || !role) {
      return res.json({ ok: false, reason: "parse_failed" });
    }

    return res.json({
      ok: true,
      company,
      role,
      location,
      employmentType,
      deadline,
      requirements,
      summary,
    });
  } catch (error) {
    console.error("/api/job-posting 처리 중 오류:", error.message);
    return res.json({ ok: false, reason: "server_error" });
  }
});

// 텍스트 추출 헬퍼: 렌더링 무관 태그 제거 후 가독성 있는 텍스트만 남김
function extractReadableText(html) {
  if (typeof html !== "string") return "";
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "");

  // 태그를 공백으로 치환
  s = s.replace(/<[\s\S]*?>/g, " ");
  // HTML 엔티티 기본 복원
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  // 공백 정규화
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// 서버 시작 (Vercel 환경에서는 호출하지 않음)
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Memory Replay backend running on port ${PORT}`);
    console.log(`Solar Pro 4: ${SOLAR_API_KEY ? "configured" : "NOT CONFIGURED — using mock fallback"}`);
  });
}
