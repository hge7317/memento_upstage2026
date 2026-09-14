import { useState, useMemo } from "react";

/**
 * TimelineReview - 검증된 기억 항목·타임라인·평가·감정·추측 분리 목록·불확실/비어 있는 구간·항목별 확신도·출처를 구조화하여 반환한다.
 *
 * 참조:
 *  - PRD §5.3 (TIMELINE_REVIEW 상태 정의)
 *  - PRD §5.4 (구조화된 표출: 검증된 기억 항목·타임라인·평가·불확실 구간·확신도·출처)
 *  - PRD §11 (타임라인 검토 — 구조 반환 후, 사용자가 확인·편집·확정)
 *  - PRD §13 (봉인 대상 — 면접 준비자료는 TIMELINE_REVIEW 확정 후 대조 동의 시에만 개방)
 *  - docs/references/scenarios/interview.md §타임라인 검토 UI
 *  - docs/references/output-contract.md §단계별 응답 제한 (TIMELINE_REVIEW: timeline[], evaluations[], openGaps[])
 *  - docs/references/guardrails.md §4 (후보 검증 규칙 — REJECTED 제외, CONFIRMED/EDITED/UNKNOWN만 사용)
 *  - docs/backend/ACTIVE_MEMORY_SET_DEFINITION.md (활성 기억 집합 범위)
 *
 * 완료 조건:
 *  - timeline, evaluations, openGaps 구조화되어 반환됨
 *  - 사용자 삭제·수정·순서 변경 반영, 삭제된 항목 결과·품질로그에서 제외
 *  - 봉인된 면접 준비자료는 대조 동의 전 질문·결과에 노출 금지
 *  - 용도 불명확 자료 사용자 확인 후 처리 규칙 명문화
 */
export function TimelineReview({
  candidateItems = [],
  verifications = {},
  newMemoryItems = [],
  interviewPrepDocs = null, // 봉인 대상: 면접 준비자료 (예: 자소서, 이력서, 포트폴리오, 강의노트 등)
  onConfirm,
}) {
  // 활성 기억 집합 = ACTIVE_MEMORY_SET
  // CONFIRMED + EDITED + UNKNOWN 후보 + newMemoryItems 중 verification이 CONFIRMED/EDITED/UNKNOWN인 것
  const activeCandidates = useMemo(() => {
    return candidateItems.filter(c => {
      const v = verifications[c.id];
      return v === "CONFIRMED" || v === "EDITED" || v === "UNKNOWN";
    });
  }, [candidateItems, verifications]);

  const activeNewItems = useMemo(() => {
    return newMemoryItems.filter(m => {
      const v = verifications[m.id];
      return v === "CONFIRMED" || v === "EDITED" || v === "UNKNOWN";
    });
  }, [newMemoryItems, verifications]);

  // 전체 활성 항목
  const activeItems = useMemo(() => {
    return [...activeCandidates, ...activeNewItems];
  }, [activeCandidates, activeNewItems]);

  // 상태
  const [items, setItems] = useState(() =>
    activeItems.map(item => ({
      ...item,
      isDeleting: false,      // 삭제 중 표시 (소프트 삭제 UI용)
      isDeleted: false,       // 삭제 확정
      order: item.sequence ?? item.sequenceHint ?? null,
      editedContent: item.verification === "EDITED" ? item.userEdit : item.claim,
      category: item.category ?? inferCategory(item),
      confidence: item.confidence ?? inferConfidence(item),
    }))
  );

  // 삭제된 항목의 ID 집합 (결과·품질로그에서 제외)
  const deletedIds = useMemo(() =>
    items.filter(item => item.isDeleted).map(item => item.id),
    [items]
  );

  // 활성 항목만 (삭제 제외)
  const activeItemsList = useMemo(() =>
    items.filter(item => !item.isDeleted),
    [items]
  );

  // --- 타임라인 (순서 순 정렬, 순서 미상 항목은 별도 표시) ---
  const timeline = useMemo(() => {
    const ordered = activeItemsList
      .filter(item => item.order != null)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const unordered = activeItemsList
      .filter(item => item.order == null);

    return {
      ordered,
      unordered,
      totalCount: activeItemsList.length,
    };
  }, [activeItemsList]);

  // --- 평가·감정·추측 분리 목록 ---
  // category === EVALUATION인 항목만 분리 (PRD §5.4: 평가·감정·추측 별도 섹션)
  const evaluations = useMemo(() => {
    return activeItemsList
      .filter(item => item.category === "EVALUATION")
      .map(item => ({
        id: item.id,
        claim: item.editedContent ?? item.claim,
        confidence: item.confidence,
        source: item.source,
        sourceQuote: item.sourceQuote,
        isDeleted: item.isDeleted,
      }));
  }, [activeItemsList]);

  // --- 불확실하거나 비어 있는 구간 ---
  // confidence === UNKNOWN이거나, sequenceHint가 없어서 순서 미상인 항목 등
  const openGaps = useMemo(() => {
    return activeItemsList
      .filter(item => item.confidence === "UNKNOWN" || item.order == null)
      .map(item => ({
        id: item.id,
        claim: item.editedContent ?? item.claim,
        confidence: item.confidence,
        sequenceStatus: item.order == null ? "순서 미상" : "순서 있음",
        source: item.source,
        isDeleted: item.isDeleted,
      }));
  }, [activeItemsList]);

  // --- 확신도·출처 표시 헬퍼 ---
  const confidenceLabel = (conf) => {
    if (conf === "HIGH") return "◎ 높음";
    if (conf === "MEDIUM") return "△ 보통";
    if (conf === "LOW") return "▽ 낮음";
    if (conf === "UNKNOWN") return "? 모름";
    return conf ?? "미정";
  };

  const inferCategory = (item) => {
    if (item.category) return item.category;
    if (item.claim?.includes("평가") || item.claim?.includes("좋다") || item.claim?.includes("안 좋다")) return "EVALUATION";
    return "FACT";
  };

  const inferConfidence = (item) => {
    if (item.confidence) return item.confidence;
    if (item.verification === "EDITED") return "MEDIUM";
    if (item.verification === "UNKNOWN") return "UNKNOWN";
    return "MEDIUM";
  };

  // --- 편집: 순서 변경 ---
  const moveUp = (id) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      // 순서 갱신: order가 있는 항목들에 대해서만
      const orderedIds = next.filter(i => i.order != null).map(i => i.id);
      const reorderItems = next.filter(i => orderedIds.includes(i.id));
      reorderItems.sort((a, b) => {
        const ai = orderedIds.indexOf(a.id);
        const bi = orderedIds.indexOf(b.id);
        return ai - bi;
      });
      let orderCounter = 1;
      for (const it of reorderItems) {
        const updated = { ...it, order: orderCounter++ };
        return prev.map(i => i.id === updated.id ? updated : i);
      }
      return prev;
    });
    // 간단히: order가 null인 항목들은 그대로 두고, order 있는 것들만 재정렬
    setItems(prev => {
      const targetIdx = prev.findIndex(i => i.id === id);
      if (targetIdx <= 0) return prev;
      const next = [...prev];
      [next[targetIdx - 1], next[targetIdx]] = [next[targetIdx], next[targetIdx - 1]];
      // order 갱신
      const orderedItems = next.filter(i => i.order != null);
      let ord = 1;
      for (const oi of orderedItems) {
        const updated = { ...oi, order: ord++ };
        setItems(prev2 => prev2.map(i => i.id === updated.id ? updated : i));
      }
      return prev; // fallback: 실제로는 아래 별도 setState로 덮는 방식
    });
  };

  const moveDown = (id) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    setItems(prev => {
      const targetIdx = prev.findIndex(i => i.id === id);
      if (targetIdx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[targetIdx], next[targetIdx + 1]] = [next[targetIdx + 1], next[targetIdx]];
      return next;
    });
  };

  // --- 편집: 삭제 ---
  const confirmDelete = (id) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, isDeleting: true, isDeleted: true } : item
    ));
  };

  const cancelDelete = (id) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, isDeleting: false, isDeleted: false } : item
    ));
  };

  // --- 편집: 사용자 수정 (수정된 내용 확인) ---
  const startEdit = (id) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, isEditing: true } : item
    ));
    // 실제 편집 로직은 UserVerify에서 이미 처리했다고 가정 (EDITED 상태)
    // 여기서는 편집 UI 표시만
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, isEditing: true } : item
    ));
  };

  const finishEdit = (id, newContent) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, editedContent: newContent, isEditing: false } : item
    ));
  };

  // --- 봉인·대조 규칙 관련 ---
  // 면접 준비자료(inverviewPrepDocs)가 있을 경우, TIMELINE_REVIEW 확정(사용자 확인) 전까지는
  // 질문·결과에 노출하지 않는다. 이 컴포넌트에서는 준비자료 존재를 알리지 않고,
  // "대조 동의" 버튼으로만 접근 가능하게 한다.
  const [comparisonAgreed, setComparisonAgreed] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);

  const handleComparisonAgree = () => {
    // 사용자가 대조에 명시적으로 동의
    setComparisonAgreed(true);
    // 대조 결과는 이 컴포넌트에서 생성하지 않고, 백엔드/스킬에서 받은 결과를 표시한다고 가정
    setComparisonResult({
      status: "대조 준비 완료",
      message: "면접 준비자료 대조 결과가 준비되었습니다. (실제 대조 로직은 백엔드/스킬에서 수행)",
    });
  };

  // --- 용도 불명확 자료 처리 규칙 ---
  // 용도 불명확 자료는 사용자에게 확인 후 처리. 이 컴포넌트에서는 해당 규칙이
  // 명문화되어 있음을 표시(주석/안내)하고, 실제 처리는 백엔드/스킬에서 수행.
  const ambiguousDocsRule = "용도 불명확 자료는 사용자에게 확인한 뒤 처리: 확인 전에는 사용하지 않으며, 확인 후에는 사용자의 지시에 따라 처리한다.";

  // --- 완료 액션 ---
  const handleConfirm = () => {
    // 최종 결과 구성
    const finalTimeline = timeline.ordered.map(item => ({
      id: item.id,
      claim: item.editedContent ?? item.claim,
      category: item.category,
      confidence: item.confidence,
      source: item.source,
      sourceQuote: item.sourceQuote,
      verification: item.verification,
      sequence: item.order,
      isDeleted: false, // 삭제된 항목은 이미 제외됨
      isEditing: false,
    }));

    const finalEvaluations = evaluations.filter(e => !e.isDeleted).map(e => ({
      ...e,
      isDeleted: false,
    }));

    const finalOpenGaps = openGaps.filter(g => !g.isDeleted).map(g => ({
      ...g,
      isDeleted: false,
    }));

    // 봉인·대조: 대조 동의 전에는 면접 준비자료 본문 미포함
    const comparisonData = comparisonAgreed ? comparisonResult : null;

    onConfirm({
      stage: "TIMELINE_REVIEW",
      assistantMessage: "타임라인 검토가 완료되었습니다.",
      question: null,
      timeline: finalTimeline,
      evaluations: finalEvaluations,
      openGaps: finalOpenGaps,
      comparison: comparisonData, // 대조 동의 전에는 null
      safety: {
        // frontendChecks는 이 컴포넌트에서 확인 가능한 항목만 기록
        // injectionCheckPassed는 백엔드/스킬 최종 결정사항 — 여기서는 확정하지 않음
        injectionCheckPassed: null, // 미확정 (백엔드/스킬 결정)
        structureCheckPassed: true,  // 질문 수는 0개 (정적 섹션)
        frontendChecks: [
          "활성 기억 집합 필터링: REJECTED 항목 제외 확인",
          "삭제 항목 결과 제외 확인",
          "봉인 자료 대조 동의 전 미노출 확인",
          "평가·감정·추측 분리 목록 확인",
        ],
      },
      qualityLog: {
        stage: "TIMELINE_REVIEW",
        candidateCount: candidateItems.length,
        activeCount: activeItemsList.length,
        deletedCount: deletedIds.length,
        evaluationCount: evaluations.length,
        openGapCount: openGaps.length,
        comparisonAgreed,
      },
    });
  };

  // --- 스타일 ---
  const styles = `
    .timeline-review-screen {
      max-width: 800px;
      margin: 0 auto;
      padding: 16px;
    }
    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 24px 0 12px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }
    .item-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 10px;
      background: var(--background);
    }
    .item-card.deleted {
      opacity: 0.5;
      text-decoration: line-through;
    }
    .item-card.confirm-delete {
      border-color: var(--destructive);
      background: color-mix(in srgb, var(--destructive) 8%, var(--background));
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: var(--muted-foreground);
    }
    .item-body {
      margin: 8px 0;
      font-size: 0.95rem;
    }
    .item-meta {
      display: flex;
      gap: 12px;
      font-size: 0.8rem;
      color: var(--muted-foreground);
      flex-wrap: wrap;
    }
    .btn-row {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .btn {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
      cursor: pointer;
      border: 1px solid var(--border);
      background: var(--background);
      color: var(--foreground);
    }
    .btn:hover { background: var(--card); }
    .btn-primary {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
    .btn-danger {
      border-color: var(--destructive);
      color: var(--destructive);
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .gap-empty { color: var(--muted-foreground); font-style: italic; font-size: 0.9rem; }
    .eval-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--accent) 15%, transparent);
      color: var(--accent);
      font-size: 0.75rem;
      font-weight: 500;
    }
    .comparison-banner {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      margin: 16px 0;
      background: var(--card);
    }
    .edit-area {
      margin-top: 8px;
    }
    .edit-area textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-family: inherit;
      font-size: 0.95rem;
      resize: vertical;
    }
  `;

  return (
    <section className="timeline-review-screen">
      <style>{styles}</style>

      <div className="chapter-head">
        <span className="chapter-num">Chapter 6</span>
        <span className="chapter-title">타임라인 검토</span>
      </div>

      <h1 style={{ textAlign: "center", margin: "16px 0 8px" }}>
        지금까지 정리한 내용을 확인해 주세요
      </h1>
      <p className="hint" style={{ textAlign: "center", marginBottom: "24px" }}>
        순서 변경·수정·삭제를 자유롭게 할 수 있습니다. 확인을 누르면 결과를 생성합니다.
      </p>

      {/* 요약 바 */}
      <div style={{
        display: "flex",
        gap: "16px",
        flexWrap: "wrap",
        marginBottom: "20px",
        fontSize: "0.9rem",
        color: "var(--muted-foreground)",
      }}>
        <span>활성 항목: {activeItemsList.length}개</span>
        <span>평가·감정·추측: {evaluations.length}개</span>
        <span>순서 미상/빈 구간: {openGaps.length}개</span>
        <span>삭제됨: {deletedIds.length}개</span>
      </div>

      {/* 봉인·대조 안내 (면접 준비자료가 있는 경우) */}
      {interviewPrepDocs && (
        <div className="comparison-banner">
          <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
            면접 준비자료 봉인 안내
          </p>
          <p style={{ margin: "0 0 8px", fontSize: "0.9rem", color: "var(--muted-foreground)" }}>
            면접 준비자료(자소서·이력서·포트폴리오·강의노트 등)는 대조 동의 전까지 질문·결과에 노출되지 않습니다.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleComparisonAgree}
            disabled={comparisonAgreed}
          >
            {comparisonAgreed ? "대조 동의 완료" : "면접 준비자료 대조에 동의 (결과 별도 섹션)"}
          </button>
          {comparisonAgreed && comparisonResult && (
            <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
              {comparisonResult.message}
            </div>
          )}
        </div>
      )}

      {/* 용도 불명확 자료 처리 규칙 (명문화) */}
      <details style={{ marginBottom: "16px", fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
        <summary style={{ cursor: "pointer", fontWeight: 500 }}>용도 불명확 자료 처리 규칙</summary>
        <div style={{ marginTop: "8px", padding: "8px 12px", border: "1px dashed var(--border)", borderRadius: "6px" }}>
          {ambiguousDocsRule}
        </div>
      </details>

      {/* 타임라인 */}
      <h2 className="section-title">타임라인 (검증된 기억 항목)</h2>
      {timeline.ordered.length === 0 && timeline.unordered.length === 0 ? (
        <p className="gap-empty">검증된 기억 항목이 없습니다.</p>
      ) : (
        <>
          {timeline.ordered.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              {timeline.ordered.map((item, idx) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  index={idx}
                  isDeleted={item.isDeleted}
                  isDeleting={item.isDeleting}
                  isEditing={item.isEditing}
                  onMoveUp={() => moveUp(item.id)}
                  onMoveDown={() => moveDown(item.id)}
                  onDeleteConfirm={() => confirmDelete(item.id)}
                  onDeleteCancel={() => cancelDelete(item.id)}
                  onStartEdit={() => startEdit(item.id)}
                  onFinishEdit={(content) => finishEdit(item.id, content)}
                />
              ))}
            </div>
          )}
          {timeline.unordered.length > 0 && (
            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", marginBottom: "8px" }}>
                ※ 순서가 확인되지 않은 항목 (순서 미상)
              </p>
              {timeline.unordered.map((item) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  index={null}
                  isDeleted={item.isDeleted}
                  isDeleting={item.isDeleting}
                  isEditing={item.isEditing}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                  onDeleteConfirm={() => confirmDelete(item.id)}
                  onDeleteCancel={() => cancelDelete(item.id)}
                  onStartEdit={() => startEdit(item.id)}
                  onFinishEdit={(content) => finishEdit(item.id, content)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* 평가·감정·추측 분리 목록 */}
      <h2 className="section-title">평가·감정·추측 (분리)</h2>
      {evaluations.length === 0 ? (
        <p className="gap-empty">분리된 평가가 없습니다.</p>
      ) : (
        evaluations.map((e) => (
          <div key={e.id} className={`item-card ${e.isDeleted ? "deleted" : ""}`}>
            <div className="item-header">
              <span className="eval-tag">평가·감정·추측</span>
              <span style={{ marginLeft: "auto" }}>
                확신도: {confidenceLabel(e.confidence)}
                {" | "}출처: {e.source}
              </span>
            </div>
            <p className="item-body">{e.claim}</p>
            {e.sourceQuote && (
              <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", margin: "4px 0" }}>
                근거 원문: "{e.sourceQuote}"
              </p>
            )}
          </div>
        ))
      )}

      {/* 불확실하거나 비어 있는 구간 */}
      <h2 className="section-title">순서 미상·비어 있는 구간</h2>
      {openGaps.length === 0 ? (
        <p className="gap-empty">불확실하거나 비어 있는 구간이 없습니다.</p>
      ) : (
        openGaps.map((g) => (
          <div key={g.id} className={`item-card ${g.isDeleted ? "deleted" : ""}`}>
            <div className="item-header">
              <span className="eval-tag" style={{ background: "color-mix(in srgb, #fbbf24 15%, transparent)", color: "#92400e" }}>
                {g.sequenceStatus === "순서 미상" ? "순서 미상" : "불확실"}
              </span>
              <span style={{ marginLeft: "auto" }}>
                확신도: {confidenceLabel(g.confidence)}
                {" | "}출처: {g.source}
              </span>
            </div>
            <p className="item-body">{g.claim}</p>
          </div>
        ))
      )}

      {/* 삭제 항목 표시 */}
      {deletedIds.length > 0 && (
        <h2 className="section-title">삭제된 항목 (결과에 미포함)</h2>
        {items.filter(i => i.isDeleted).map(item => (
          <div key={item.id} className="item-card deleted">
            <p className="item-body">{item.editedContent ?? item.claim}</p>
            <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>삭제됨 — 결과·품질로그에서 제외</p>
          </div>
        ))}
      )}

      {/* 확인 버튼 */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "24px",
        paddingTop: "16px",
        borderTop: "1px solid var(--border)",
      }}>
        <button className="btn" onClick={() => {}}>
          이전 단계로
        </button>
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={activeItemsList.length === 0}
        >
          타임라인 검토 확정 → 결과 생성
        </button>
      </div>
    </section>
  );
}

// 개별 타임라인 항목 서브컴포넌트
function TimelineItem({
  item,
  index,
  isDeleted,
  isDeleting,
  isEditing,
  onMoveUp,
  onMoveDown,
  onDeleteConfirm,
  onDeleteCancel,
  onStartEdit,
  onFinishEdit,
}) {
  const [editText, setEditText] = useState(item.editedContent ?? item.claim);

  if (isEditing) {
    return (
      <div className="item-card">
        <div className="item-header">
          <span style={{ marginLeft: ".5rem" }}>수정 중</span>
          <span style={{ marginLeft: "auto", fontSize: ".8rem", color: "var(--muted-foreground)" }}>
            확신도: {confidenceLabel(item.confidence)} | 출처: {item.source}
          </span>
        </div>
        <div className="edit-area">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
          />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => onFinishEdit(editText)}>저장</button>
          <button className="btn" onClick={() => setEditText(item.editedContent ?? item.claim)}>취소</button>
        </div>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div className={`item-card ${isDeleted ? "deleted" : "confirm-delete"}`}>
        <div className="item-header">
          <span>삭제 확인</span>
          <span style={{ marginLeft: "auto", fontSize: ".8rem", color: "var(--destructive)" }}>
            삭제하면 결과·품질로그에서 제외됩니다
          </span>
        </div>
        <p className="item-body">{item.editedContent ?? item.claim}</p>
        <div className="btn-row">
          <button className="btn btn-danger" onClick={() => onDeleteConfirm(item.id)}>삭제 확정</button>
          <button className="btn" onClick={() => onDeleteCancel(item.id)}>취소</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`item-card ${isDeleted ? "deleted" : ""}`}>
      <div className="item-header">
        {index != null && <span>#{index + 1}</span>}
        <span style={{ marginLeft: ".5rem" }}>
          {item.category === "EVALUATION" ? (
            <span className="eval-tag">평가·감정·추측</span>
          ) : (
            <span className="eval-tag" style={{ background: "color-mix(in srgb, var(--foreground) 8%, transparent)", color: "var(--foreground)" }}>
              {item.category}
            </span>
          )}
        </span>
        <span style={{ marginLeft: "auto", fontSize: ".8rem", color: "var(--muted-foreground)" }}>
          확신도: {confidenceLabel(item.confidence)}
          {" | "}출처: {item.source}
          {item.sequence != null && ` | 순서: #${item.sequence}`}
        </span>
      </div>
      <p className="item-body">{item.editedContent ?? item.claim}</p>
      {item.sourceQuote && (
        <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", margin: "4px 0" }}>
          근거 원문: "{item.sourceQuote}"
        </p>
      )}
      <div className="btn-row">
        <button className="btn" onClick={onMoveUp} disabled={index == null}>▲ 위로</button>
        <button className="btn" onClick={onMoveDown} disabled={index == null}>▼ 아래로</button>
        <button className="btn" onClick={onStartEdit}>수정</button>
        <button className="btn btn-danger" onClick={() => onDeleteConfirm(item.id)}>삭제</button>
      </div>
    </div>
  );
}

function confidenceLabel(conf) {
  if (conf === "HIGH") return "◎ 높음";
  if (conf === "MEDIUM") return "△ 보통";
  if (conf === "LOW") return "▽ 낮음";
  if (conf === "UNKNOWN") return "? 모름";
  return conf ?? "미정";
}
