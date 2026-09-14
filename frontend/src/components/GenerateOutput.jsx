import { useCallback, useMemo } from "react";

/**
 * GenerateOutput - TIMELINE_REVIEW 확정 결과를 Markdown 10절 구조로 조합해 표시한다.
 *
 * 참조:
 *  - PRD §16 (GENERATE_OUTPUT), §12 (면접 결과 생성)
 *  - PRD §13 (출력 계약 — resultDocument / qualityLog)
 *  - output-contract.md §GENERATE_OUTPUT / §최종 결과 객체 / §파일명
 *  - assets/interview-result-template.md (10절 템플릿)
 *  - docs/references/guardrails.md §8 (확신도 표시)
 *  - docs/references/scenarios/interview.md §결과 필수 섹션
 *
 * 완료 기준(체크 가능):
 *  - candidateItems + interviewInfo + 검증 결과 기반 Markdown 생성
 *  - 10절 구조 충족 (기본 정보/빠른 메모/타임라인/순서 미상 및 빈 구간/
 *    평가·감정·추측/AAR/준비자료 대조/인출 카드/재확인 일정/품질 로그)
 *  - 고지 문구 포함 ("사용자의 기억을 구조화한 기록이며 녹취나 객관적 사실 확인 결과가 아닙니다")
 *  - 빈 값 처리 3종 포함 ([사용자 기입], [확인 필요], [기억나지 않음])
 *  - suggestedFileName 형식 준수 (Memory-Replay_YYYY-MM-DD_면접_{이름}.md)
 *  - retrievalCards JSON 구조 포함 (메타 태그로 직렬화하여 서비스 카드 UI에서 읽도록 보존)
 *  - sensitiveNameHidden prop 처리 (true면 회사명/이름 등 민감 정보 비표시)
 *  - 빌드 성공
 *
 * 범위 바깥:
 *  - PDF 생성 (W-18 — 서비스 책임, PDF_SERVICE_RESPONSIBILITY.md 참조)
 *  - Solar 연동 (이미 완료)
 *  - 컴포넌트 내부 회상 로직 변경
 */

function confidenceLabel(conf) {
  if (conf === "HIGH") return "◎ 높음";
  if (conf === "MEDIUM") return "△ 보통";
  if (conf === "UNKNOWN") return "? 모름";
  return conf ?? "미정";
}

function sequenceStatusLabel(status) {
  if (status === "KNOWN") return "확인";
  if (status === "APPROXIMATE") return "대략";
  if (status === "UNKNOWN") return "미상";
  return status ?? "미상";
}

/** React key로 사용할 안전 식별자. id가 없으면 claim 기반 해시 fallback. */
function itemKey(item) {
  if (item && typeof item.id === "string" && item.id) return item.id;
  const claim = item?.claim ?? "";
  let hash = 0;
  for (let i = 0; i < claim.length; i++) {
    hash = (hash * 31 + claim.charCodeAt(i)) | 0;
  }
  return `fallback-${hash}-${claim.slice(0, 20)}`;
}

/** 민감 정보 비표시 처리 */
function sanitizeForName(value) {
  if (!value) return "";
  // 경로 문자 제거 (output-contract.md 파일명 규칙)
  return value.replace(/[/\\:*?"<>|]/g, "").trim();
}

/**
 * 면접 템플릿 8절(인출 카드)의 카드 배열.
 * 데이터는 timeline에서 충분한 항목이 있을 때만 생성한다.
 * 카드 앞면·뒷면·근거는 markdown 안에 두되, JSON용 구조로도 남겨 서비스 카드 UI에서 읽을 수 있게 한다.
 */
function buildRetrievalCards(timeline) {
  const cards = [];
  // 확정된 순서로 정렬된 활성 항목만 사용
  const ordered = timeline
    .filter((t) => t != null && t.source != null)
    .slice(0, 8);

  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i];
    const seq = item.sequence != null ? `#${item.sequence}` : "순서 미상";
    cards.push({
      cardNumber: i + 1,
      front: `면접 중 ${seq} 장면/질문에서 기억나는 내용은?`,
      back: item.claim ?? "[기억나지 않음]",
      evidence: `${seq} (${item.source}${item.sourceQuote ? `, 근거: "${item.sourceQuote}"` : ""})`,
    });
  }

  // 데이터가 1개 미만이면 빈 배열로 두고, 화면에는 "데이터 부족" 메시지를 표시한다.
  return cards;
}

/**
 * 제안된 파일명.
 * 형식: Memory-Replay_YYYY-MM-DD_면접_{이름}.md
 * sensitiveNameHidden이 true면 이름 부분에 민감 정보가 들어가지 않도록 한다.
 */
function buildSuggestedFileName(interviewInfo, sensitiveNameHidden) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const name = sanitizeForName(interviewInfo?.companyName ?? "");
  const safeName = sensitiveNameHidden && name ? "[회사명 비공개]" : name;
  const base = safeName ? `면접_${safeName}` : "면접";
  return `Memory-Replay_${today}_${base}.md`;
}

/**
 * Markdown 본문 생성.
 * 고지 문구 → 10절 순서.
 */
function buildMarkdown({
  interviewInfo,
  quickMemoText,
  timeline,
  evaluations,
  openGaps,
  comparison,
  retrievalCards,
  qualityLog,
  sensitiveNameHidden,
}) {
  const lines = [];

  // 고지 문구 (PRD §12: 모든 결과 상단에 포함)
  lines.push(
    "# 면접 복기",
    "",
    "> 이 문서는 사용자의 기억을 구조화한 기록이며 녹취나 객관적 사실 확인 결과가 아닙니다. 확신도는 사용자의 주관적 표시입니다.",
    ""
  );

  // 1. 기본 정보
  lines.push("## 1. 기본 정보", "");
  const companyName = sensitiveNameHidden ? "[회사명 비공개]" : (interviewInfo?.companyName ?? "[사용자 기입]");
  const roleOrDepartment = interviewInfo?.roleOrDepartment ?? "[사용자 기입]";
  const eventDateTime = interviewInfo?.eventDateTime ?? "[확인 필요]";
  const interviewMode = interviewInfo?.interviewMode ?? "[사용자 기입]";
  const interviewStage = interviewInfo?.interviewStage ?? "[사용자 기입]";
  const interviewerCount = interviewInfo?.interviewerCount ?? "[사용자 기입]";
  const recallStartedAt = new Date().toISOString().replace("T", " ").slice(0, 19);
  lines.push(
    "| 항목 | 내용 |",
    "|---|---|",
    `| 회사 | ${companyName} |`,
    `| 직무·부서 | ${roleOrDepartment} |`,
    `| 일시 | ${eventDateTime} |`,
    `| 방식·단계 | ${interviewMode} / ${interviewStage} |`,
    `| 면접관 수 | ${interviewerCount} |`,
    `| 복기 시점 | ${recallStartedAt} |`,
    ""
  );

  // 2. 빠른 메모
  lines.push("## 2. 빠른 메모", "");
  if (quickMemoText && quickMemoText.trim()) {
    lines.push(quickMemoText, "");
  } else {
    lines.push("[기억나지 않음]", "");
  }

  // 3. 질문·답변 타임라인
  lines.push("## 3. 질문·답변 타임라인", "");
  lines.push(
    "| # | 기억나는 질문·장면 | 사용자의 답변·행동 | 관찰된 반응 | 확신도 | 출처 |",
    "|---|---|---|---|---|---|"
  );
  if (timeline && timeline.length > 0) {
    for (const item of timeline) {
      const seq = item.sequence != null ? String(item.sequence) : "순서 미상";
      const claim = item.claim ?? "[기억나지 않음]";
      const response = item.userResponse ?? "[사용자 기입]";
      const observed = item.observedResponse ?? "[사용자 기입]";
      const conf = confidenceLabel(item.confidence);
      const source = item.source ?? "UNKNOWN";
      lines.push(`| ${seq} | ${claim} | ${response} | ${observed} | ${conf} | ${source} |`);
    }
  } else {
    lines.push("| 순서 미상 | [기억나지 않음] | [사용자 기입] | [사용자 기입] | ? 모름 | UNKNOWN |");
  }
  lines.push(
    "",
    "순서를 모르는 항목은 임의로 배치하지 말고 `순서 미상`에 둔다.",
    ""
  );

  // 4. 순서 미상·비어 있는 구간
  lines.push("## 4. 순서 미상·비어 있는 구간", "");
  if (openGaps && openGaps.length > 0) {
    for (const g of openGaps) {
      const claim = g.claim ?? "[기억나지 않음]";
      const status = g.sequenceStatus != null ? sequenceStatusLabel(g.sequenceStatus) : "미상";
      lines.push(`- ${claim} (${status})`);
    }
  } else {
    lines.push("- [기억나지 않음]");
  }
  lines.push("");

  // 5. 평가·감정·추측
  lines.push("## 5. 평가·감정·추측", "");
  if (evaluations && evaluations.length > 0) {
    for (const e of evaluations) {
      const claim = e.claim ?? "[기억나지 않음]";
      const conf = confidenceLabel(e.confidence);
      const source = e.source ?? "UNKNOWN";
      lines.push(`- ${claim} (확신도: ${conf}, 출처: ${source})`);
    }
  } else {
    lines.push("- [기억나지 않음]");
  }
  lines.push("");

  // 6. 사후 검토(AAR)
  lines.push("## 6. 사후 검토(AAR)", "");
  const expectation = "[사용자 기입]";
  lines.push("### 기대", "");
  lines.push(expectation, "");
  lines.push("### 실제", "");
  if (timeline && timeline.length > 0) {
    // 타임라인 번호를 인용한 관찰 내용 — 근거는 템플릿 지시(§6. 실제)에 따른다.
    const cited = timeline
      .filter((t) => t != null)
      .map((t) => {
        const seq = t.sequence != null ? `#${t.sequence}` : "[순서 미상]";
        return `${seq}: ${t.claim ?? "[기억나지 않음]"}`;
      })
      .join("\n");
    lines.push(cited || "[사용자 기입]");
  } else {
    lines.push("[사용자 기입]");
  }
  lines.push("");
  lines.push("### 원인에 대한 사용자 해석", "");
  lines.push("[사용자 기입]", "");
  lines.push("");
  lines.push("### 유지할 점", "");
  lines.push("- [근거가 있을 때만 작성]", "");
  lines.push("### 보완할 점", "");
  lines.push("- [근거가 있을 때만 작성]", "");

  // 7. 준비자료 대조
  lines.push("");
  lines.push("## 7. 준비자료 대조", "");
  if (comparison) {
    // 대조 결과는 TIMELINE_REVIEW 확정 + 대조 동의 후에만 포함된다.
    if (Array.isArray(comparison?.preparedAndOccurred)) {
      lines.push("- ✅ 준비했고 실제로 나왔다고 기억함: " + comparison.preparedAndOccurred.join(", "));
    } else {
      lines.push("- ✅ 준비했고 실제로 나왔다고 기억함: [사용자 기입]");
    }
    if (Array.isArray(comparison?.occurredNotPrepared)) {
      lines.push("- ⬜ 나왔지만 준비 기록에 없음: " + comparison.occurredNotPrepared.join(", "));
    } else {
      lines.push("- ⬜ 나왔지만 준비 기록에 없음: [사용자 기입]");
    }
    if (Array.isArray(comparison?.preparedNotRecalled)) {
      lines.push("- ○ 준비했지만 실제로 나왔다는 기억 없음: " + comparison.preparedNotRecalled.join(", "));
    } else {
      lines.push("- ○ 준비했지만 실제로 나왔다는 기억 없음: [사용자 기입]");
    }
  } else {
    lines.push("{봉인 해제 동의와 자료가 있을 때만 포함 — 현재 대조 미진행}", "");
  }

  // 8. 다음 연습용 인출 카드
  lines.push("");
  lines.push("## 8. 다음 연습용 인출 카드", "");
  if (retrievalCards && retrievalCards.length > 0) {
    lines.push("데이터가 충분할 때만 5~8장 작성한다. 부족하면 억지로 채우지 않는다.", "");
    for (const card of retrievalCards) {
      lines.push(`### 카드 ${card.cardNumber}`, "");
      lines.push(`- 앞면: ${card.front}`, "");
      lines.push(`- 뒷면: ${card.back}`, "");
      lines.push(`- 근거: ${card.evidence}`, "");
      lines.push("");
    }
  } else {
    lines.push("데이터 부족 — 인출 카드 없음 (충분한 타임라인 항목이 없습니다).", "");
  }

  // 9. 재확인 일정
  lines.push("");
  lines.push("## 9. 재확인 일정", "");
  lines.push(
    "다음 실전 연습 일정은 `scripts/schedule_calc.py`의 계산값을 그대로 옮긴다. 계산 실패 시 수기로 대체한다.",
    ""
  );
  // 수기 대체: 복기일 기준 D+1, D+3, D+7을 표시한다.
  const today = new Date();
  const addDays = (d, n) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r.toISOString().slice(0, 10);
  };
  lines.push(`- D+1 추가 회상: ${addDays(today, 1)}`);
  lines.push(`- D+3 카드 연습: ${addDays(today, 3)}`);
  lines.push(`- D+7 카드 연습: ${addDays(today, 7)}`);
  lines.push(`- 다음 실전 전 최종 연습: [확인 필요]`);
  lines.push("");
  lines.push(
    "> 복기일보다 다음 실전이 앞이면 최종 연습일은 복기일 당일이 될 수 있다. 이는 복기 당일 연습 허용 여부에 대한 서비스 의도 확인 후 유지한다.",
    ""
  );

  // 10. 회상 품질 로그
  lines.push("## 10. 회상 품질 로그", "");
  if (qualityLog) {
    const {
      candidateCount = 0,
      confirmedCount = 0,
      rejectedCount = 0,
      editedCount = 0,
      unknownCount = 0,
      freeRecallCount = 0,
      structuralCueCount = 0,
      reverseRecallCount = 0,
      evaluationCount = 0,
      injectionViolationCount = 0,
      rejectedPremiseUseCount = 0,
      attachmentsUnsealedAt = null,
    } = qualityLog;
    lines.push(`- 후보 검증: O ${confirmedCount} / X ${rejectedCount} / 수정 ${editedCount} / ? ${unknownCount}`);
    lines.push(
      `- 기억 출처: 빠른 메모 ${candidateCount} / 자유 회상 ${freeRecallCount} / 구조 단서 ${structuralCueCount} / 역순 ${reverseRecallCount}`
    );
    lines.push(`- 평가·추측 분리: ${evaluationCount}개`);
    lines.push(`- 질문 주입 위반: ${injectionViolationCount}개`);
    lines.push(`- 거절 전제 사용: ${rejectedPremiseUseCount}개`);
    if (attachmentsUnsealedAt) {
      lines.push(`- 준비자료 봉인 해제: ${attachmentsUnsealedAt}`);
    } else {
      lines.push("- 준비자료 봉인 해제: 미사용 (대조 미동의)");
    }
  } else {
    lines.push("- 후보 검증: [확인 필요]");
    lines.push("- 기억 출처: [확인 필요]");
    lines.push("- 평가·추측 분리: [확인 필요]");
    lines.push("- 질문 주입 위반: [확인 필요]");
    lines.push("- 거절 전제 사용: [확인 필요]");
    lines.push("- 준비자료 봉인 해제: [확인 필요]");
  }

  return lines.join("\n");
}

export function GenerateOutput({
  timelineData,
  interviewInfo = {},
  quickMemoText = "",
  candidateItems = [],
  verifications = {},
  newMemoryItems = [],
  comparisonData = null,
  suggestedFileName: propFileName,
  onCopyMarkdown,
  onDownloadMarkdown,
  onFinish,
  sensitiveNameHidden = false,
}) {
  // 타임라인 데이터 추출 (TIMELINE_REVIEW onConfirm 결과)
  // GenerateOutput은 Markdown 조합만 담당하므로, 원본 항목을 그대로 사용하고
  // 템플릿에서 필요한 필드는 렌더링 시점에 기본값으로 보완한다.
  const timeline = timelineData?.timeline ?? [];

  const evaluations = timelineData?.evaluations ?? [];
  const openGaps = timelineData?.openGaps ?? [];
  const qualityLog = timelineData?.qualityLog ?? null;

  // retrievalCards 생성
  const retrievalCards = useMemo(() => buildRetrievalCards(timeline), [timeline]);

  // suggestedFileName: props로 받은 것이 있으면 우선 사용, 없으면 계산
  const suggestedFileName = propFileName ?? buildSuggestedFileName(interviewInfo, sensitiveNameHidden);

  // Markdown 본문
  const markdown = useMemo(
    () =>
      buildMarkdown({
        interviewInfo,
        quickMemoText,
        timeline,
        evaluations,
        openGaps,
        comparison: comparisonData,
        retrievalCards,
        qualityLog,
        sensitiveNameHidden,
      }),
    [interviewInfo, quickMemoText, timeline, evaluations, openGaps, comparisonData, retrievalCards, qualityLog, sensitiveNameHidden]
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(markdown).then(() => {
      onCopyMarkdown?.(markdown);
    });
  }, [markdown, onCopyMarkdown]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onDownloadMarkdown?.(markdown, suggestedFileName);
  }, [markdown, suggestedFileName, onDownloadMarkdown]);

  const handleComplete = useCallback(() => {
    onFinish?.({ stage: "GENERATE_OUTPUT_COMPLETE", markdown, suggestedFileName });
  }, [markdown, suggestedFileName, onFinish]);

  // retrievalCards JSON — 서비스 카드 UI가 별도 화면에서 읽을 수 있도록 메타에 보존
  const retrievalCardsJson = useMemo(() => JSON.stringify(retrievalCards, null, 2), [retrievalCards]);

  return (
    <section className="screen generate-output">
      <div className="chapter-head">
        <span className="chapter-num">Chapter 7</span>
        <span className="chapter-title">면접 회고 결과</span>
      </div>

      <h1 style={{ textAlign: "center", margin: "16px 0 8px" }}>
        면접 회고 결과가 생성되었습니다
      </h1>
      <p className="hint" style={{ textAlign: "center", marginBottom: "24px" }}>
        아래 Markdown을 확인·복사·다운로드할 수 있습니다. 원본 기억을 대체하지 않으며, AI 정확성 보증이 아닙니다.
      </p>

      {/* 파일명 표시 */}
      <div className="result-meta">
        <div className="result-meta-row">
          <span className="result-meta-label">제안 파일명</span>
          <span className="result-meta-value">{suggestedFileName}</span>
        </div>
        {sensitiveNameHidden && (
          <div className="result-meta-row result-meta-note">
            <span className="result-meta-label">파일명 민감 정보</span>
            <span className="result-meta-value">비표시 선택 적용됨</span>
          </div>
        )}
      </div>

      {/* 카드 JSON (서비스 내부용, 접힘) */}
      <details className="result-card-json">
        <summary>인출 카드 JSON (서비스용)</summary>
        <pre className="card-json-pre">{retrievalCardsJson}</pre>
      </details>

      {/* Markdown 본문 */}
      <div className="markdown-body">
        <pre className="markdown-pre">{markdown}</pre>
      </div>

      {/* 액션 버튼 */}
      <div className="result-actions">
        <button className="btn btn-ghost" onClick={handleCopy}>
          Markdown 복사
        </button>
        <button className="btn btn-primary" onClick={handleDownload}>
          Markdown 다운로드
        </button>
        <button className="btn btn-primary" onClick={handleComplete}>
          완료
        </button>
      </div>

      <style>{`
        .generate-output { max-width: 900px; margin: 0 auto; padding: 16px; }
        .result-meta { display: flex; gap: 24px; flex-wrap: wrap; margin: 12px 0 16px; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--card); font-size: 0.9rem; }
        .result-meta-row { display: flex; gap: 8px; align-items: baseline; }
        .result-meta-label { color: var(--muted-foreground); font-size: 0.8rem; }
        .result-meta-value { font-family: ui-monospace, monospace; word-break: break-all; }
        .result-meta-note { color: var(--muted-foreground); font-style: italic; }
        .result-card-json { margin: 12px 0; border: 1px dashed var(--border); border-radius: 8px; padding: 8px 12px; background: var(--card); }
        .result-card-json summary { cursor: pointer; font-size: 0.85rem; color: var(--muted-foreground); }
        .card-json-pre { margin-top: 8px; background: var(--background); padding: 10px 12px; border-radius: 6px; font-size: 0.75rem; overflow: auto; max-height: 200px; border: 1px solid var(--border); }
        .markdown-body { margin: 12px 0; border: 1px solid var(--border); border-radius: 8px; background: var(--background); padding: 16px; max-height: 60vh; overflow: auto; }
        .markdown-pre { margin: 0; white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 0.95rem; line-height: 1.6; color: var(--foreground); }
        .result-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); }
      `}</style>
    </section>
  );
}
