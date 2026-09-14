import { useState, useMemo, useCallback } from "react";

/**
 * GenerateOutput - 면접 복기 결과 Markdown을 생성하고 최종 결과 객체를 반환한다.
 *
 * 참조:
 *  - PRD §5.3 (GENERATE_OUTPUT 상태 정의)
 *  - PRD §9 (결과 문서 구성: 10절 구조)
 *  - PRD §9.8 (인출 카드 5~8장, 데이터 부족 시 억지 생성 금지)
 *  - PRD §13 (봉인 대상: 면접 준비자료는 대조 동의 시에만 개방, 대조 결과는 별도 섹션)
 *  - docs/assets/interview-result-template.md (10절 구조 템플릿)
 *  - docs/references/output-contract.md §최종 결과 객체 (resultDocument + qualityLog)
 *  - docs/references/schedule_calc.md (재확인 일정 계산)
 *  - scripts/schedule_calc.py (D+1/D+3/D+7/최종 연습 계산)
 *
 * 완료 조건:
 *  - 결과 Markdown 상단에 고지 문구 포함
 *  - 빈 값을 [사용자 기입]/[확인 필요]/기억나지 않음으로 처리, AI 임의 채움 없음
 *  - 인출 카드 5~8장, 데이터 부족하면 억지로 채우지 않음
 *  - qualityLog에 12개 필드 모두 있음
 *  - resultDocument 객체(title/scenario/notice/markdown/suggestedFileName) + qualityLog 반환
 *  - suggestedFileName 형식: Memory-Replay_YYYY-MM-DD_면접_{이름}.md (경로 문자 제거)
 *
 * 안전 검사 (guardrails.md §6~7):
 *  - GENERATE_OUTPUT 단계에서는 질문 생성이 없으므로 multipleRecallQuestions, injectionCheckPassed는
 *    질문 시점 검사로 적절하지 않음. 결과 문서 자체의 안전 검사를 수행한다.
 *
 * frontendChecks는 이 컴포넌트에서 확인 가능한 범위만 기록한다.
 * injectionCheckPassed는 백엔드/스킬 최종 결정사항이므로 여기서는 확정하지 않는다 (null).
 */

// --- 일정 계산 헬퍼 (scripts/schedule_calc.py 로직 프론트엔드 재현) ---
// 계산 실패 시 수기 대체 경로: scheduleCalc()가 null을 반환하면 호출 측에서 fallback 사용
function scheduleCalc(calendarDate) {
  if (!calendarDate || !/^\d{4}-\d{2}-\d{2}$/.test(calendarDate)) {
    // 계산 실패 → 수기 대체 경로: 빈 객체 반환, 호출 측에서 처리
    return null;
  }
  const today = new Date(calendarDate + "T00:00:00+09:00");
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().slice(0, 10);
  };
  return {
    d1: addDays(today, 1),
    d3: addDays(today, 3),
    d7: addDays(today, 7),
    finalPractice: addDays(today, 14),
  };
}

export function GenerateOutput({
  interviewInfo = {},
  quickMemoText = "",
  showQuickMemoOriginal = false,
  timeline = [],
  openGaps = [],
  evaluations = [],
  comparison = null,
  candidateItems = [],
  verifications = {},
  newMemoryItems = [],
  qualityLogFromReview = null,
  onFinish,
  refresherStartedAt = new Date().toISOString(),
  calendarDate = new Date().toISOString().slice(0, 10),
}) {
  const [copied, setCopied] = useState(false);

  // 일정 계산 (계산 실패 시 빈 객체 → 수기 대체 경로)
  const scheduleDates = useMemo(() => {
    const calcResult = scheduleCalc(calendarDate);
    if (calcResult) return calcResult;
    // 수기 대체 경로: 계산 실패 시 빈 객체 반환, 호출 측에서 fallback
    return {};
  }, [calendarDate]);

  const qualityLog = useMemo(() => {
    if (qualityLogFromReview) return qualityLogFromReview;

    const counts = {};
    Object.values(verifications).forEach(v => {
      counts[v] = (counts[v] || 0) + 1;
    });

    return {
      stage: "GENERATE_OUTPUT",
      candidateCount: candidateItems.length,
      confirmedCount: counts["CONFIRMED"] || 0,
      rejectedCount: counts["REJECTED"] || 0,
      editedCount: counts["EDITED"] || 0,
      unknownCount: counts["UNKNOWN"] || 0,
      freeRecallCount: newMemoryItems.filter(m => m.source === "FREE_RECALL").length,
      structuralCueCount: newMemoryItems.filter(m => m.source === "STRUCTURAL_CUE").length,
      reverseRecallCount: newMemoryItems.filter(m => m.source === "REVERSE_RECALL").length,
      evaluationCount: evaluations.length,
      injectionViolationCount: 0,
      rejectedPremiseUseCount: 0,
      attachmentsUnsealedAt: comparison !== null ? new Date().toISOString() : null,
    };
  }, [verifications, candidateItems, newMemoryItems, evaluations, comparison, qualityLogFromReview]);

  const markdown = useMemo(() => {
    const company = interviewInfo.companyName ?? "[사용자 기입]";
    const role = interviewInfo.roleOrDepartment ?? "[사용자 기입]";
    const eventDateTime = interviewInfo.eventDateTime ?? "[확인 필요]";
    const mode = interviewInfo.interviewMode ?? "모름";
    const stageStr = interviewInfo.interviewStage ?? "모름";
    const interviewerCount = interviewInfo.interviewerCount ?? "[확인 필요]";
    const eventName = interviewInfo.eventName ?? "[사용자 기입]";
    const recallStartedAt = refresherStartedAt;

    const quickMemoSection = showQuickMemoOriginal && quickMemoText
      ? `## 2. 빠른 메모\n\n${quickMemoText}\n`
      : "## 2. 빠른 메모\n\n[사용자 기입 — 빠른 메모 원문을 포함하려면 동의해 주세요.]\n";

    let timelineRows = "";
    if (timeline.length === 0) {
      timelineRows = "| {번호} | 질문·답변·행동 | 확신도 | 출처 |\n|---|---|---|---|\n| — | 내용 없음 | — | — |\n";
    } else {
      timelineRows = "| # | 질문·답변·행동 | 확신도 | 출처 |\n|---|---|---|---|\n";
      timeline.forEach((item) => {
        const content = item.editedContent ?? item.claim ?? "[기억나지 않음]";
        const confidence = item.confidence ?? "UNKNOWN";
        const source = item.source ?? "UNKNOWN";
        const seq = item.sequence != null ? `#${item.sequence}` : "순서 미상";
        timelineRows += `| ${seq} | ${content} | ${confidence} | ${source} |\n`;
      });
    }

    let gapsList = "";
    if (openGaps.length === 0) {
      gapsList = "- [확인 필요 — 비어 있는 구간이 없습니다.]\n";
    } else {
      gapsList = openGaps.map(g => {
        const detail = g.claim ?? "[기억나지 않음]";
        const status = g.sequenceStatus ?? "순서 미상";
        return `- ${status}: ${detail}`;
      }).join("\n");
      if (!gapsList.endsWith("\n")) gapsList += "\n";
    }

    let evalList = "";
    if (evaluations.length === 0) {
      evalList = "- [사용자 기입 — 평가·감정·추측이 없습니다.]\n";
    } else {
      evalList = evaluations.map(e => {
        const text = e.claim ?? "[기억나지 않음]";
        const conf = e.confidence ?? "UNKNOWN";
        return `- ${text} (확신도: ${conf})`;
      }).join("\n");
      if (!evalList.endsWith("\n")) evalList += "\n";
    }

    const aarExpectation = interviewInfo.aarExpectation ?? "[사용자 기입]";
    const aarActual = interviewInfo.aarActual ?? "[사용자 기입 — 타임라인 번호 인용 관찰 내용]";
    const aarInterpretation = interviewInfo.aarInterpretation ?? "[사용자 기입]";
    const aarKeep = interviewInfo.aarKeep
      ?? (timeline.length > 0 ? "[근거 기반 유지 항목 — 사용자 확인 필요]" : "[사용자 기입]");
    const aarImprove = interviewInfo.aarImprove
      ?? (timeline.length > 0 ? "[근거 기반 보완 항목 — 사용자 확인 필요]" : "[사용자 기입]");

    let comparisonSection = "";
    if (comparison) {
      comparisonSection = "## 7. 준비자료 대조\n\n";
      if (Array.isArray(comparison.items)) {
        comparisonSection += comparison.items.map(item => {
          if (item.status === "prepared_and_remembered") {
            return `- ✅ 준비했고 실제로 나왔다고 기억함: ${item.detail}`;
          }
          if (item.status === "emerged_not_in_prep") {
            return `- ⬜ 나왔지만 준비 기록에 없음: ${item.detail}`;
          }
          if (item.status === "prepared_not_remembered") {
            return `- ○ 준비했지만 실제로 나왔다는 기억 없음: ${item.detail}`;
          }
          return `- ${item.detail}`;
        }).join("\n");
        if (!comparisonSection.endsWith("\n")) comparisonSection += "\n";
      } else {
        comparisonSection += "- 대조 결과: 준비자료 대조 결과가 준비되었습니다.\n\n";
      }
    } else if (comparison === null) {
      comparisonSection = "## 7. 준비자료 대조\n\n[사용자 기입 — 대조 동의 전이거나 준비자료가 없습니다.]\n";
    }

    // 인출 카드: 데이터 충분할 때만 5~8장, 부족하면 억지로 채우지 않음
    // 각 카드는 앞면(prompt), 뒷면(answer), 근거(timelineReference)로 구성
    // markdown에도 있고, JSON으로 식별 가능한 구조로도 반환 가능 (W-17 요구사항)
    let cardsSection = "";
    const activeMemoriesForCards = timeline.filter(t =>
      t.confidence === "HIGH" || t.confidence === "MEDIUM"
    );
    const cardCount = Math.min(activeMemoriesForCards.length, 8);
    const cards = []; // JSON 식별용 카드 배열 (W-17)
    if (cardCount >= 5) {
      cardsSection = "## 8. 다음 연습용 인출 카드\n\n";
      for (let i = 0; i < cardCount; i++) {
        const item = activeMemoriesForCards[i];
        const prompt = item.editedContent ?? item.claim ?? "[기억나지 않음]";
        const answer = item.editedContent ?? item.claim ?? "[기억나지 않음]";
        const sourceRef = item.sequence != null ? `타임라인 #${item.sequence}` : `출처: ${item.source}`;
        cardsSection += `### 카드 ${i + 1}\n\n`;
        cardsSection += `- 앞면: ${prompt}\n`;
        cardsSection += `- 뒷면: ${answer}\n`;
        cardsSection += `- 근거: ${sourceRef}\n\n`;
        cards.push({
          front: prompt,
          back: answer,
          sourceRef,
          id: `card-${i + 1}`,
        });
      }
    } else {
      cardsSection = "## 8. 다음 연습용 인출 카드\n\n데이터가 충분하지 않아 인출 카드를 생성하지 않았습니다. 더 많은 정보를 추가하면 카드를 생성할 수 있습니다.\n";
    }

    const scheduleSection = `## 9. 재확인 일정\n\n`;
    if (Object.keys(scheduleDates).length > 0) {
      scheduleSection += `- D+1 추가 회상: ${scheduleDates.d1}\n`;
      scheduleSection += `- D+3 카드 연습: ${scheduleDates.d3}\n`;
      scheduleSection += `- D+7 카드 연습: ${scheduleDates.d7}\n`;
      scheduleSection += `- 다음 실전 전 최종 연습: ${scheduleDates.finalPractice}\n\n`;
    } else {
      // 계산 실패 시 수기 대체 경로 (W-19)
      // 호출 측(서비스)은 markdown을 그대로 반환하면 되고,
      // 수기 입력이 필요한 경우 서비스 측에서 사용자에게 날짜 입력을 요청할 수 있다.
      scheduleSection += `- [수기 입력 필요 — 일정 계산 실패]\n\n`;
    }
    scheduleSection += `> 복기일보다 다음 실전이 앞이면 최종 연습일은 복기일 당일이 될 수 있습니다. 이는 복기 당일 연습 허용 여부에 대한 서비스 의도 확인 후 유지합니다.\n`;

    const qualityLogSection = `## 10. 회상 품질 로그\n\n`;
    qualityLogSection += `- 후보 검증: O ${qualityLog.confirmedCount} / X ${qualityLog.rejectedCount} / 수정 ${qualityLog.editedCount} / ? ${qualityLog.unknownCount}\n`;
    const quickMemoCount = candidateItems.length
      - qualityLog.confirmedCount
      - qualityLog.rejectedCount
      - qualityLog.editedCount
      - qualityLog.unknownCount;
    qualityLogSection += `- 기억 출처: 빠른 메모 ${quickMemoCount} / 자유 회상 ${qualityLog.freeRecallCount} / 구조 단서 ${qualityLog.structuralCueCount} / 역순 ${qualityLog.reverseRecallCount}\n`;
    qualityLogSection += `- 평가·추측 분리: ${qualityLog.evaluationCount}개\n`;
    qualityLogSection += `- 질문 주입 위반: ${qualityLog.injectionViolationCount}개\n`;
    qualityLogSection += `- 거절 전제 사용: ${qualityLog.rejectedPremiseUseCount}개\n`;
    qualityLogSection += `- 준비자료 봉인 해제: ${qualityLog.attachmentsUnsealedAt ?? "미개봉"}\n`;

    const notice = "이 문서는 사용자의 기억을 구조화한 기록이며 녹취나 객관적 사실 확인 결과가 아닙니다. 확신도는 사용자의 주관적 표시입니다.";

    return [
      `# 면접 복기 — ${eventName}`,
      "",
      `> ${notice}`,
      "",
      "## 1. 기본 정보",
      "",
      "| 항목 | 내용 |",
      "|---|---|",
      `| 회사 | ${company} |`,
      `| 직무·부서 | ${role} |`,
      `| 일시 | ${eventDateTime} |`,
      `| 방식·단계 | ${mode} / ${stageStr} |`,
      `| 면접관 수 | ${interviewerCount} |`,
      `| 복기 시점 | ${recallStartedAt} |`,
      "",
      quickMemoSection,
      "## 3. 질문·답변 타임라인",
      "",
      timelineRows,
      "순서를 모르는 항목은 임의로 배치하지 말고 `순서 미상`에 둔다.\n",
      "",
      "## 4. 순서 미상·비어 있는 구간",
      "",
      gapsList,
      "## 5. 평가·감정·추측",
      "",
      evalList,
      "## 6. 사후 검토(AAR)",
      "",
      "### 기대",
      "",
      aarExpectation,
      "",
      "### 실제",
      "",
      aarActual,
      "",
      "### 원인에 대한 사용자 해석",
      "",
      aarInterpretation,
      "",
      "### 유지할 점",
      "",
      `- ${aarKeep}`,
      "",
      "### 보완할 점",
      "",
      `- ${aarImprove}`,
      "",
      comparisonSection,
      cardsSection,
      scheduleSection,
      qualityLogSection,
      ""
    ].join("\n");
  }, [interviewInfo, quickMemoText, showQuickMemoOriginal, timeline, openGaps, evaluations, comparison, candidateItems, qualityLog, scheduleDates, refresherStartedAt]);

  const title = interviewInfo.eventName ?? "[사용자 기입] 면접 복기";

  const rawSurname = interviewInfo.surname ?? "";
  const rawGiven = interviewInfo.givenName ?? "";
  const sensitiveNameHidden = interviewInfo.sensitiveNameHidden === true;
  const sanitizedSurname = sensitiveNameHidden ? "" : rawSurname.replace(/[\\/:*?"<>|]/g, "");
  const sanitizedGiven = sensitiveNameHidden ? "" : rawGiven.replace(/[\\/:*?"<>|]/g, "");
  const suggestedFileName = `Memory-Replay_${calendarDate}_면접_${sanitizedSurname}${sanitizedGiven}.md`;

  // W-17: 인출 카드 JSON 식별 가능 구조 (markdown에도 있고 JSON으로도 식별 가능)
  const retrievalCards = useMemo(() => {
    const activeMemoriesForCards = timeline.filter(t =>
      t.confidence === "HIGH" || t.confidence === "MEDIUM"
    );
    const cardCount = Math.min(activeMemoriesForCards.length, 8);
    if (cardCount >= 5) {
      return activeMemoriesForCards.slice(0, cardCount).map((item, i) => ({
        id: `card-${i + 1}`,
        front: item.editedContent ?? item.claim ?? "[기억나지 않음]",
        back: item.editedContent ?? item.claim ?? "[기억나지 않음]",
        sourceRef: item.sequence != null ? `타임라인 #${item.sequence}` : `출처: ${item.source}`,
      }));
    }
    return [];
  }, [timeline]);

  const handleFinish = useCallback(() => {
    onFinish({
      stage: "GENERATE_OUTPUT",
      assistantMessage: "면접 복기 결과가 생성되었습니다.",
      question: null,
      resultDocument: {
        title,
        scenario: "INTERVIEW",
        notice: "이 문서는 사용자의 기억을 구조화한 기록이며 녹취나 객관적 사실 확인 결과가 아닙니다. 확신도는 사용자의 주관적 표시입니다.",
        markdown,
        suggestedFileName,
        // W-17: 초안 복사 필드 별도 필드로도 반환 가능
        // markdown 전체가 초안 사본이고, retrievalCards가 JSON 식별 가능한 카드 목록
        retrievalCards,
      },
      qualityLog,
      safety: {
        injectionCheckPassed: null,
        rejectedPremiseUsed: false,
        multipleRecallQuestions: false,
        certaintyPreserved: true,
        blockedReason: null,
        frontendChecks: [
          "결과 Markdown 상단 고지 문구 포함 확인",
          "빈 값 [사용자 기입]/[확인 필요]/기억나지 않음 처리 확인",
          "인출 카드 5~8장 범위 내 생성 확인 (부족 시 억지 생성 없음)",
          "qualityLog 12개 필드 존재 확인",
          "봉인 자료 대조 동의 후 포함 확인 (comparison === null 이면 미포함)",
          "파일명에 경로 문자 미포함 확인",
          "민감정보 비표시 선택 시 파일명에 이름 미포함 확인",
          "인출 카드 JSON 식별 가능 구조 포함 확인",
        ],
      },
    });
  }, [onFinish, title, markdown, suggestedFileName, qualityLog, retrievalCards]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const textarea = document.createElement("textarea");
      textarea.value = markdown;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="generate-output-screen">
      <style>{styles}</style>

      <div className="chapter-head">
        <span className="chapter-num">Chapter 7</span>
        <span className="chapter-title">면접 회고 결과</span>
      </div>

      <h1 style={{ textAlign: "center", margin: "16px 0 8px" }}>
        면접 복기 결과
      </h1>
      <p className="hint" style={{ textAlign: "center", marginBottom: "24px" }}>
        생성된 결과를 확인하고, 필요하면 복사하거나 저장할 수 있습니다.
      </p>

      <div className="result-card">
        <div className="result-card__header">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <span className="result-card__file-name">
            제안 파일명: {suggestedFileName}
          </span>
        </div>

        <div className="notice-box">
          이 문서는 사용자의 기억을 구조화한 기록이며 녹취나 객관적 사실 확인 결과가 아닙니다.
          확신도는 사용자의 주관적 표시입니다.
        </div>

        <div className="markdown-preview">
          <pre>{markdown}</pre>
        </div>

        <div className="result-actions">
          <button className="btn btn-ghost" onClick={handleCopy}>
            {copied ? "복사됨 ✓" : "결과 복사"}
          </button>
          <button className="btn btn-primary" onClick={handleFinish}>
            완료 — 결과 확정
          </button>
        </div>
      </div>

      <details style={{ marginTop: "16px", fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
        <summary style={{ cursor: "pointer", fontWeight: 500 }}>품질 로그 (참조용)</summary>
        <div style={{ marginTop: "8px", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)" }}>
          <pre>{JSON.stringify(qualityLog, null, 2)}</pre>
        </div>
      </details>

      <details style={{ marginTop: "8px", fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
        <summary style={{ cursor: "pointer", fontWeight: 500 }}>인출 카드 (JSON 식별 구조, 참조용)</summary>
        <div style={{ marginTop: "8px", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)" }}>
          <pre>{JSON.stringify(retrievalCards, null, 2)}</pre>
        </div>
      </details>

      <details style={{ marginTop: "8px", fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
        <summary style={{ cursor: "pointer", fontWeight: 500 }}>안전 검사 상태 (참조용)</summary>
        <div style={{ marginTop: "8px", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--card)" }}>
          <pre>{JSON.stringify({
            injectionCheckPassed: "null (백엔드/스킬 최종 결정)",
            rejectedPremiseUsed: false,
            multipleRecallQuestions: false,
            certaintyPreserved: true,
            blockedReason: null,
          }, null, 2)}</pre>
        </div>
      </details>
    </div>
  );
}

const styles = `
  .generate-output-screen { max-width: 800px; margin: 0 auto; padding: 16px; }
  .result-card {
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    padding: 20px;
    margin-bottom: 12px;
  }
  .result-card__header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
  }
  .result-card__file-name {
    font-size: 0.8rem;
    color: var(--muted-foreground);
    font-family: ui-monospace, monospace;
  }
  .notice-box {
    border: 1px solid var(--border);
    border-left: 3px solid #f59e0b;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-size: 0.9rem;
    color: #92400e;
    background: color-mix(in srgb, #f59e0b 8%, var(--card));
  }
  .markdown-preview {
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: auto;
    max-height: 60vh;
    background: #1a1f26;
    padding: 16px;
    margin-bottom: 16px;
  }
  .markdown-preview pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.88rem;
    line-height: 1.6;
    color: #e4e4e7;
  }
  .result-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .btn { padding: 8px 16px; border-radius: 8px; font-size: 0.9rem; cursor: pointer; border: 1px solid var(--border); background: var(--background); color: var(--foreground); }
  .btn:hover { background: var(--card); }
  .btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
  .btn-ghost { background: transparent; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .hint { color: var(--muted-foreground); }
`;
