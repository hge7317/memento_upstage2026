import express from "express";
import { mockRecallQuestion } from "./mock-api.js";
import {
  buildMemoryReplaySystemPrompt,
  normalizeStage,
  getNextStage,
  isRecallQuestionStage,
} from "./memory-replay-skill.js";

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

// POST /api/recall — Memory Replay SERVICE mode
app.post("/api/recall", async (req, res) => {
  const {
    sessionId,
    context = {},
    contextType,
    stage: bodyStage,
  } = req.body ?? {};

  // 기존 프론트의 contextType과 새 SERVICE stage 둘 다 지원
  const requestedStage = normalizeStage(bodyStage || contextType);

  // SERVICE에서는 stage를 추정하지 않음
  if (!requestedStage) {
    return res.status(400).json({
      stage: null,
      assistantMessage: "",
      question: null,
      candidateItems: [],
      memoryItems: [],
      evaluations: [],
      openGaps: [],
      resultMarkdown: null,
      nextStageProposal: null,
      safety: {
        injectionCheckPassed: null,
        rejectedPremiseUsed: false,
      },
      error: {
        code: "INVALID_STAGE",
        message: "현재 Memory Replay 서비스 단계가 없거나 올바르지 않습니다.",
      },
    });
  }

  try {
    // memory-replay Skill의 SERVICE 규칙 로드
    const systemPrompt = buildMemoryReplaySystemPrompt(requestedStage);

    const confirmedItems = context?.confirmedItems ?? [];
    const rejectedItems = context?.rejectedItems ?? [];
    const recentMessages = context?.recentMessages ?? [];

    const userPrompt = `
executionMode: SERVICE
stage: ${requestedStage}

아래는 서비스 실행기가 전달한 현재 세션 정보입니다.
현재 stage의 작업만 수행하세요.

[확인된 기억]
${
  confirmedItems.length
    ? confirmedItems.map((item, i) => `${i + 1}. ${item}`).join("\n")
    : "없음"
}

[거절된 내용]
${
  rejectedItems.length
    ? rejectedItems.map((item) => `- ${item}`).join("\n")
    : "없음"
}

[면접 기본 정보]
${JSON.stringify(context?.interviewInfo ?? {})}

[직전 사용자 답변]
${context?.previousAnswer || "없음"}

[최근 회상 대화]
${
  recentMessages.length
    ? recentMessages
        .filter(
          (message) =>
            message &&
            (message.role === "user" || message.role === "ai")
        )
        .map(
          (message) =>
            `${message.role === "user" ? "사용자" : "회상 질문"}: ${
              message.text
            }`
        )
        .join("\n")
    : "없음"
}

[서비스 상태 정보]
검토 완료 여부: ${context?.reviewConfirmed ?? false}
준비자료 대조 동의: ${context?.comparisonConsent ?? false}

중요:
- 위 정보에 없는 사건을 만들지 마세요.
- rejectedItems의 내용을 질문의 전제로 사용하지 마세요.
- 최신 사용자 답변이 이전 정보보다 우선합니다.
- 현재 stage를 변경하지 마세요.
- nextStageProposal은 제안일 뿐입니다.
- 반드시 SERVICE 응답 계약의 JSON 객체 하나만 반환하세요.
`.trim();

    const solarContent = await callSolar(
      [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      requestedStage === "GENERATE_OUTPUT" ? 4096 : 1536
    );

    // Solar JSON 파싱
    let parsed;

    try {
      const cleaned = solarContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error(
        "Memory Replay JSON parsing failed:",
        parseError.message
      );

      return res.status(502).json({
        stage: requestedStage,
        assistantMessage: "",
        question: null,
        candidateItems: [],
        memoryItems: [],
        evaluations: [],
        openGaps: [],
        resultMarkdown: null,
        nextStageProposal: requestedStage,
        safety: {
          injectionCheckPassed: null,
          rejectedPremiseUsed: false,
        },
        error: {
          code: "INVALID_MODEL_RESPONSE",
          message:
            "Memory Replay 응답 형식을 확인하지 못했습니다. 같은 단계에서 다시 시도해 주세요.",
        },
      });
    }

    // 모델이 현재 stage를 바꾸면 거부
    const responseStage = normalizeStage(parsed?.stage);

    if (responseStage !== requestedStage) {
      return res.status(502).json({
        stage: requestedStage,
        assistantMessage: "",
        question: null,
        candidateItems: [],
        memoryItems: [],
        evaluations: [],
        openGaps: [],
        resultMarkdown: null,
        nextStageProposal: requestedStage,
        safety: {
          injectionCheckPassed: null,
          rejectedPremiseUsed: false,
        },
        error: {
          code: "STAGE_MISMATCH",
          message:
            "Memory Replay 응답 단계가 현재 서비스 단계와 일치하지 않습니다.",
        },
      });
    }

    // 회상 단계에서는 질문 하나가 반드시 필요
    if (
      isRecallQuestionStage(requestedStage) &&
      (typeof parsed.question !== "string" ||
        parsed.question.trim() === "")
    ) {
      return res.status(502).json({
        stage: requestedStage,
        assistantMessage: "",
        question: null,
        candidateItems: [],
        memoryItems: [],
        evaluations: [],
        openGaps: [],
        resultMarkdown: null,
        nextStageProposal: requestedStage,
        safety: parsed?.safety ?? {
          injectionCheckPassed: null,
          rejectedPremiseUsed: false,
        },
        error: {
          code: "QUESTION_REQUIRED",
          message:
            "현재 회상 단계에서 질문이 생성되지 않았습니다. 같은 단계에서 다시 시도해 주세요.",
        },
      });
    }

    // 회상 단계가 아닌데 질문을 생성했다면 제거
    const question = isRecallQuestionStage(requestedStage)
      ? parsed.question.trim()
      : null;

    // rejected premise 간단한 서버 측 2차 검사
    const rejectedPremise = rejectedItems.find(
      (item) =>
        typeof item === "string" &&
        item.trim() &&
        question?.includes(item.trim())
    );

    if (rejectedPremise) {
      return res.status(502).json({
        stage: requestedStage,
        assistantMessage: "",
        question: null,
        candidateItems: parsed?.candidateItems ?? [],
        memoryItems: parsed?.memoryItems ?? [],
        evaluations: parsed?.evaluations ?? [],
        openGaps: parsed?.openGaps ?? [],
        resultMarkdown: parsed?.resultMarkdown ?? null,
        nextStageProposal: requestedStage,
        safety: {
          ...(parsed?.safety ?? {}),
          injectionCheckPassed: false,
          rejectedPremiseUsed: true,
        },
        error: {
          code: "REJECTED_PREMISE_USED",
          message:
            "거절된 기억이 질문의 전제로 사용되어 응답을 폐기했습니다.",
        },
      });
    }

    /*
     * 모델은 다음 단계를 제안할 수 있지만
     * 실제 허용되는 다음 단계는 서버의 flow 기준으로 제한
     */
    const allowedNextStage = getNextStage(requestedStage);

    const proposedStage = normalizeStage(
      parsed?.nextStageProposal
    );

    const nextStageProposal =
      proposedStage === requestedStage ||
      proposedStage === allowedNextStage
        ? proposedStage
        : requestedStage;

    // 최종 SERVICE response
    return res.json({
      stage: requestedStage,

      assistantMessage:
        typeof parsed?.assistantMessage === "string"
          ? parsed.assistantMessage
          : "",

      question,

      candidateItems: Array.isArray(parsed?.candidateItems)
        ? parsed.candidateItems
        : [],

      memoryItems: Array.isArray(parsed?.memoryItems)
        ? parsed.memoryItems
        : [],

      evaluations: Array.isArray(parsed?.evaluations)
        ? parsed.evaluations
        : [],

      openGaps: Array.isArray(parsed?.openGaps)
        ? parsed.openGaps
        : [],

      resultMarkdown:
        typeof parsed?.resultMarkdown === "string"
          ? parsed.resultMarkdown
          : null,

      nextStageProposal,

      safety: {
        injectionCheckPassed:
          typeof parsed?.safety?.injectionCheckPassed === "boolean"
            ? parsed.safety.injectionCheckPassed
            : null,

        rejectedPremiseUsed:
          parsed?.safety?.rejectedPremiseUsed === true,
      },

      error: parsed?.error ?? null,

      sessionId: sessionId || null,
    });
  } catch (error) {
    console.error("Memory Replay failed:", error.message);

    /*
     * 중요:
     * Skill 실행 실패를 mock 질문으로 숨기지 않는다.
     * 같은 stage를 유지하고 재시도 가능하게 반환한다.
     */
    return res.status(500).json({
      stage: requestedStage,
      assistantMessage: "",
      question: null,
      candidateItems: [],
      memoryItems: [],
      evaluations: [],
      openGaps: [],
      resultMarkdown: null,
      nextStageProposal: requestedStage,
      safety: {
        injectionCheckPassed: null,
        rejectedPremiseUsed: false,
      },
      error: {
        code: "MEMORY_REPLAY_ERROR",
        message:
          "Memory Replay 처리 중 오류가 발생했습니다. 같은 단계에서 다시 시도해 주세요.",
      },
      sessionId: sessionId || null,
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

export default app;
