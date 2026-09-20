import {
  buildMemoryReplaySystemPrompt,
  normalizeStage,
  getNextStage,
  isRecallQuestionStage,
} from "../memory-replay-skill.js";


export function createRecallHandler(callSolar) {
// POST /api/recall — Memory Replay SERVICE mode
  return async function recall(req, res) {
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
  };
}
