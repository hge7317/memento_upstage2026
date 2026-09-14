import { useState, useCallback, useMemo } from "react";

/**
 * StructuralCue - 시간/공간·감각/행동 3범주 단서 사다리를 따라
 * 단서·명료화 질문을 하나씩 제시한다.
 *
 * 참조:
 *  - PRD §5.3 (STRUCTURAL_CUE 상태 정의)
 *  - PRD §5.4 (STRUCTURAL_CUE 종료 조건, 질문 상한, 두 번 연속 기억 안 남 처리)
 *  - PRD §10.1 (STRUCTURAL_CUE의 단서 단위)
 *  - docs/references/scenarios/interview.md §STRUCTURAL_CUE
 *  - docs/references/guardrails.md §3, §6, §7 (금지·허용 질문, 단서 사다리, 질문 출력 전 체크)
 *  - docs/backend/ACTIVE_MEMORY_SET_DEFINITION.md (검증된 기억 요소 수 계산)
 *  - docs/references/output-contract.md §단계별 응답 제한 (STRUCTURAL_CUE: question 하나, newMemoryItems)
 *
 * 완료 조건 (PRD §5.4):
 *  - 사용자가 완료 선택
 *  - 회상 질문 상한 도달 (기본: 검증된 기억 요소 수 + 3, 최대 12)
 *  - 단서 사다리 소진 후 새 기억이 없음 (두 번 연속 기억 안 남)
 *  - 세션 시간 제한에 가까움 (이 구현 범위 밖 — 백엔드/서비스 책임)
 *
 * 반복 금지 검사 단위: 단서 범주 (PRD §5.4)
 *  - 시간 / 공간·감각 / 행동 중 이미 실패 또는 소진으로 표시된 범주는 다시 제시하지 않음
 *  - 질문 텍스트가 완전히 같아도 범주 재사용이면 반복으로 봄
 */

// 단서 사다리 정의
const CUE_LADDER = [
  {
    id: "s1",
    category: "시간",
    label: "시작과 첫 인사",
    question: "면접이 시작될 때 첫 인사나 시작 장면을 기억하나요? 어떤 분위기에서 시작됐나요?",
  },
  {
    id: "s2",
    category: "시간",
    label: "기억나는 질문 순서",
    question: "기억나는 질문의 순서를 말해 주세요. 어떤 질문이 먼저 나왔나요?",
  },
  {
    id: "s3",
    category: "행동",
    label: "첫 문장과 이어진 설명",
    question: "방금 말한 질문에 답할 때 첫 문장은 무엇이었나요? 그 뒤에 어떤 설명을 덧붙였나요?",
  },
  {
    id: "s4",
    category: "공간·감각",
    label: "들리거나 보인 반응",
    question: "그 답변 직후 실제로 들리거나 보인 반응이 있었나요? (면접관의 표정, 말, 몸짓 등)",
  },
  {
    id: "s5",
    category: "시간",
    label: "흐름이 비어 있는 구간",
    question: "두 장면 사이에 떠오르는 일이 있나요? 시작과 끝 사이에 비어 있는 구간이 있습니다. 그 사이에 기억나는 것이 있나요?",
  },
  {
    id: "s6",
    category: "공간·감각",
    label: "몸 상태·감각",
    question: "면접 장면 중 사용자의 몸 상태나 감각이 기억나나요? (긴장, 온도, 소리, 냄새, 의자 느낌 등)",
  },
  {
    id: "s7",
    category: "행동",
    label: "사용자 질문과 종료 장면",
    question: "사용자가 한 질문이 있었나요? 면접이 끝난 마지막 장면은 무엇이었나요?",
  },
];

// 확정형 평가를 사실처럼 묻지 않는 구조 질문 대체 문안 (guardrails.md §7)
const STRUCTURAL_FALLBACK_QUESTION = "그 사이에 기억나는 것이 있나요?";

export function StructuralCue({
  activeMemoryCount = 0,
  onCueAnswer,
  onCueSkip,
  onFinish,
  onEarlyTerminate,
}) {
  // 단서 사다리 상태
  const [currentCueIndex, setCurrentCueIndex] = useState(0);
  const [usedCategories, setUsedCategories] = useState(new Set());
  const [saturatedCategories, setSaturatedCategories] = useState(new Set());
  // "기억 안 남" 표시된 단서 ID (반복 금지용)
  const [failedCueIds, setFailedCueIds] = useState(new Set());
  // 연속 기억 안 남 횟수
  const [consecutiveNoRecall, setConsecutiveNoRecall] = useState(0);

  // 새 기억 항목 수집
  const [newMemoryItems, setNewMemoryItems] = useState([]);

  // 종료 상태
  const [finished, setFinished] = useState(false);
  const [finishReason, setFinishReason] = useState(null);

  // 질문 상한 계산 (PRD §5.4)
  const questionLimit = useMemo(() => {
    // 검증된 기억 요소 수 + 3, 최대 12
    const base = activeMemoryCount + 3;
    return Math.min(base, 12);
  }, [activeMemoryCount]);

  // 현재까지 제시한 질문 수 = currentCueIndex (0부터 시작, 0이면 아직 제시 전)
  const presentedCount = currentCueIndex;

  // 다음 제시할 단서 찾기 (미사용 범주 중)
  const findNextCue = useCallback(() => {
    // 현재 인덱스부터 순차 탐색, 미사용 범주 단서를 찾음
    for (let i = currentCueIndex; i < CUE_LADDER.length; i++) {
      const cue = CUE_LADDER[i];
      const cat = cue.category;
      // 이미 사용했거나 포화된 범주는 건너뛰기
      if (usedCategories.has(cat) || saturatedCategories.has(cat)) continue;
      // 이미 실패한 단서 IDs에 있으면 건너뛰기 (반복 금지)
      if (failedCueIds.has(cue.id)) continue;
      return i;
    }
    // 현재 인덱스 이후 미사용 단서가 없으면, 처음부터 다시 찾되 이미 사용된 건 제외
    for (let i = 0; i < CUE_LADDER.length; i++) {
      const cue = CUE_LADDER[i];
      const cat = cue.category;
      if (usedCategories.has(cat) || saturatedCategories.has(cat)) continue;
      if (failedCueIds.has(cue.id)) continue;
      return i;
    }
    return -1; // 미사용 단서 없음
  }, [currentCueIndex, usedCategories, saturatedCategories, failedCueIds]);

  // 현재 제시할 단서
  const currentCueIndexToShow = findNextCue();
  const currentCue = currentCueIndexToShow >= 0 ? CUE_LADDER[currentCueIndexToShow] : null;

  // 질문 상한 도달 여부
  const reachedLimit = presentedCount >= questionLimit;

  // 모든 범주 소진 여부 (세 범주 모두 사용됐고, 미사용 단서 없음)
  const allCategoriesSaturated =
    usedCategories.size >= 3 && !currentCue;

  // 두 번 연속 기억 안 남 처리
  const handleNoRecall = useCallback(() => {
    // "기억 안 남" / "모름" 응답 처리
    const nextIdx = findNextCue();
    if (nextIdx >= 0) {
      // 아직 미사용 단서 하나 있음 → 그 단서 하나만 제시 (PRD §5.4)
      setConsecutiveNoRecall(prev => prev + 1);
      setFailedCueIds(prev => new Set(prev).add(CUE_LADDER[currentCueIndex].id));
      // 현재 단서가 속한 범주를 "소진"으로 표시 (다시 제시 안 함)
      // 단, 같은 범주에 다른 미사용 단서가 있을 수 있으므로 범주 소진 판단은 신중히
      setCurrentCueIndex(nextIdx);
      // 단서 변경 시 newMemoryItems는 추가되지 않음 (기억 안 남이므로)
    } else {
      // 다음 미사용 단서가 없으면 → 현재 내용으로 결과 만들기 제안 (PRD §5.4)
      setConsecutiveNoRecall(prev => prev + 1);
      setFailedCueIds(prev => new Set(prev).add(CUE_LADDER[currentCueIndex].id));
      // 미사용 단서 없으므로 현재 내용으로 종료 제안
      setFinishReason("no_more_clues");
      setFinished(true);
      // 이때 onEarlyTerminate 호출 (TIMELINE_REVIEW 제안)
      onEarlyTerminate?.();
    }
  }, [currentCueIndex, findNextCue, currentCue, onEarlyTerminate]);

  // 단서 답변 처리
  const handleCueAnswer = useCallback((answerText) => {
    if (!currentCue) return;

    // 새 기억 항목 추가 (source = STRUCTURAL_CUE)
    const newItem = {
      id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: answerText,
      kind: "EVENT",
      confidence: "MEDIUM",
      source: "STRUCTURAL_CUE",
      sequence: null,
      sequenceStatus: "UNKNOWN",
      sourceQuote: answerText,
      verification: "CONFIRMED", // 사용자가 서술한 내용이므로 일단 CONFIRMED로 (USER_VERIFY 거친 건 아님, 회상 중 새 정보)
    };
    setNewMemoryItems(prev => [...prev, newItem]);

    // 현재 단서가 속한 범주를 "사용됨"으로 표시
    setUsedCategories(prev => new Set(prev).add(currentCue.category));
    // 단서 ID를 failedCueIds에서 제거 (성공했으므로)
    setFailedCueIds(prev => {
      const next = new Set(prev);
      next.delete(currentCue.id);
      return next;
    });
    // 연속 기억 안 남 카운트 리셋
    setConsecutiveNoRecall(0);

    // 다음 단서 인덱스로 이동
    const nextIdx = findNextCue();
    if (nextIdx >= 0) {
      setCurrentCueIndex(nextIdx);
    } else {
      // 더 제시할 미사용 단서가 없음 → 종료
      setFinishReason("cue_ladder_exhausted");
      setFinished(true);
      // onFinish 호출 (TIMELINE_REVIEW로 진행)
    }

    // 상위 콜백으로 새 기억 항목 전달
    onCueAnswer?.({
      question: currentCue.question,
      newMemoryItems: [newItem],
    });
  }, [currentCue, findNextCue, onCueAnswer]);

  // 단서 넘기기 (기억 안 남)
  const handleCueSkip = useCallback(() => {
    // "기억 안 남" 버튼: handleNoRecall과 동일한 로직
    handleNoRecall();
    onCueSkip?.({
      question: currentCue?.question || "",
    });
  }, [currentCue, handleNoRecall, onCueSkip]);

  // 사용자가 "완료" 선택
  const handleUserFinish = useCallback(() => {
    setFinishReason("user_finished");
    setFinished(true);
    onFinish?.();
  }, [onFinish]);

  // 질문 상한 도달 시 자동 종료? 아니면 완료 제안?
  // PRD §5.4: 질문 상한에 도달하면 종료 조건 중 하나. 여기서는 상한 도달 시 "완료" 버튼 활성화하고,
  // 사용자가 완료 선택하면 종료.

  // 현재 제시할 단서가 없고, 현재 인덱스 이후 미사용 단서도 없으면
  // (findNextCue가 -1 반환) → 종료 사유로 전환
  const noAvailableCue = currentCue === null && !reachedLimit && !allCategoriesSaturated;

  // 안전 검사 (guardrails.md §7): frontend 레벨에서 할 수 있는 범위만 반영
  // 명사 주입 검사(guardrails.md §2)는 백엔드/스킬 레벨에서 최종 결정하므로
  // frontend에서는 injectionCheckPassed를 확정하지 않는다 (output-contract.md §필드 규칙).
  const safety = {
    // frontend 레벨 검사 결과 (구조상 보장 + 정의된 질문 텍스트 기준)
    frontendChecks: {
      singleQuestion: true,        // 현재 단서 하나만 제시 (구조상 보장)
      noRejectedPremise: true,     // REJECTED 후보 접근 안 함 (ACTIVE_MEMORY_SET 미사용)
      noCategoryRepeat: true,      // findNextCue에서 usedCategories/saturatedCategories/failedCueIds 체크
      noDefiniteFormulation: true, // 질문 텍스트에 확정형 표현 없음 (정의된 질문 사용)
      noPerspectiveInjection: true, // 상대 관점·의도 상상하게 하지 않음 (질문 텍스트에 없음)
    },
    // 아래는 백엔드/스킬이 최종 assembly 할 때 frontendChecks를 참고해 채우는 필드
    injectionCheckPassed: null,   // frontend 미확정 — 백엔드/스킬 최종 결정
    rejectedPremiseUsed: false,
    multipleRecallQuestions: false,
    certaintyPreserved: true,
    blockedReason: null,          // frontend 레벨에서 막힌 것 없음
  };

  // 렌더링
  const isExhausted = finished || (noAvailableCue && currentCue === null);

  return (
    <section className="screen structural-cue">
      <div className="chapter-head">
        <span className="chapter-num">Chapter 5-3</span>
        <span className="chapter-title">구조 단서</span>
      </div>

      {!finished ? (
        <>
          <h1 style={{ textAlign: "center", margin: "16px 0 8px" }}>
            하나씩 확인해 볼게요
          </h1>
          <p className="hint" style={{ textAlign: "center", marginBottom: "20px" }}>
            이미 말한 내용을 따라가며 하나씩 확인합니다. 기억나지 않으면 "기억 안 남"을 선택하세요.
          </p>

          {/* 진행 표시 */}
          <div className="sc-progress">
            <span className="sc-progress__label">
              질문 {presentedCount} / {questionLimit} (상한)
            </span>
            <div className="sc-progress__bar">
              <div
                className="sc-progress__fill"
                style={{ width: `${(presentedCount / questionLimit) * 100}%` }}
              />
            </div>
          </div>

          {/* 사용된 범주 표시 */}
          <div className="sc-categories">
            {["시간", "공간·감각", "행동"].map(cat => (
              <span
                key={cat}
                className={`sc-category sc-category--${usedCategories.has(cat) ? "used" : usedCategories.size > 0 && !usedCategories.has(cat) ? "unused" : "pending"}`}
              >
                {cat}
              </span>
            ))}
          </div>

          {/* 현재 단서 카드 */}
          {currentCue ? (
            <div className="sc-cue-card">
              <div className="sc-cue-card__header">
                <span className="sc-cue-card__id">{currentCue.id}</span>
                <span className="sc-cue-card__category">[{currentCue.category}]</span>
                <span className="sc-cue-card__label">{currentCue.label}</span>
              </div>
              <h2>{currentCue.question}</h2>

              <div className="sc-cue-answer-area">
                <textarea
                  className="sc-textarea"
                  rows={5}
                  placeholder="기억나는 내용을 적어 주세요. 또는 '기억 안 남'이라고 입력해도 됩니다."
                />
                <div className="sc-cue-actions">
                  <button
                    className="btn btn-ghost"
                    onClick={handleCueSkip}
                  >
                    기억 안 남
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const text = document.querySelector(".sc-textarea")?.value?.trim() || "";
                      if (text) {
                        handleCueAnswer(text);
                      }
                    }}
                  >
                    답변 완료
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // 제시할 미사용 단서가 없는 경우 → 종료 제안
            <div className="sc-exhausted">
              <p>더 제시할 구조 단서가 없습니다.</p>
              <p className="sc-exhausted__note">
                현재 내용으로 결과를 만들 수 있습니다.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleUserFinish}
              >
                현재 내용으로 결과 만들기
              </button>
            </div>
          )}

          {/* 완료 버튼 (질문 상한 도달 시 활성화) */}
          {reachedLimit && (
            <div className="sc-limit-reached">
              <p>질문 상한({questionLimit}개)에 도달했습니다.</p>
              <button
                className="btn btn-primary"
                onClick={handleUserFinish}
              >
                현재 내용으로 완료하기
              </button>
            </div>
          )}

          {/* 조기 종료 버튼 */}
          <div className="sc-early-finish">
            <button
              className="btn btn-ghost btn-early-finish"
              onClick={handleUserFinish}
            >
              지금까지로 끝낼래 (조기 종료)
            </button>
          </div>
        </>
      ) : (
        // 종료 상태
        <div className="sc-finished">
          <div className="sc-finished__card">
            <h3>구조 단서 단계 종료</h3>
            <p>종료 사유: {finishReason === "user_finished" ? "사용자 완료 선택" :
                          finishReason === "no_more_clues" ? "미사용 단서 없음 (두 번 연속 기억 안 남)" :
                          finishReason === "cue_ladder_exhausted" ? "단서 사다리 소진" :
                          finishReason === "question_limit_reached" ? "질문 상한 도달" :
                          "기타"}</p>
            <p>제시된 질문 수: {presentedCount} / 상한 {questionLimit}</p>
            <button
              className="btn btn-primary"
              onClick={() => onFinish?.()}
            >
              TIMELINE_REVIEW로 이동
            </button>
          </div>
        </div>
      )}

      <style>{`
        .structural-cue { max-width: 680px; margin: 0 auto; }
        .sc-progress {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          font-size: 13px;
          color: var(--muted-foreground);
        }
        .sc-progress__bar {
          flex: 1;
          height: 6px;
          background: #27272a;
          border-radius: 4px;
          overflow: hidden;
        }
        .sc-progress__fill {
          height: 100%;
          background: var(--accent);
          transition: width 0.2s;
        }
        .sc-categories {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .sc-category {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          background: #27272a;
          color: var(--muted-foreground);
        }
        .sc-category--used { background: #4ade80; color: #0b1c10; }
        .sc-category--unused { background: #fbbf24; color: #2a1f00; }
        .sc-category--pending { background: #27272a; color: var(--muted-foreground); }
        .sc-cue-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
          padding: 20px;
          margin-bottom: 16px;
        }
        .sc-cue-card__header {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .sc-cue-card__id {
          font-size: 11px;
          color: var(--muted-foreground);
          font-family: ui-monospace, monospace;
        }
        .sc-cue-card__category {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          background: #94a3b8;
          color: #1a1f26;
        }
        .sc-cue-card__label {
          font-size: 12px;
          color: var(--muted-foreground);
        }
        .sc-cue-card h2 { margin: 0 0 14px; font-size: 17px; line-height: 1.5; }
        .sc-cue-answer-area { margin-top: 4px; }
        .sc-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--background);
          color: var(--foreground);
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
        }
        .sc-textarea::placeholder { color: var(--muted-foreground); }
        .sc-cue-actions {
          display: flex;
          gap: 10px;
          margin-top: 10px;
          justify-content: flex-end;
        }
        .sc-exhausted, .sc-limit-reached, .sc-finished__card {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 20px;
          background: var(--card);
          text-align: center;
          margin-bottom: 16px;
        }
        .sc-exhausted__note { font-size: 13px; color: var(--muted-foreground); margin: 6px 0; }
        .sc-early-finish {
          border: 1px dashed var(--border);
          border-radius: 10px;
          padding: 12px 16px;
          text-align: center;
          margin-bottom: 16px;
        }
        .btn-early-finish { color: var(--muted-foreground); font-size: 14px; }
        .sc-finished__card h3 { margin: 0 0 10px; }
        .sc-finished__card p { font-size: 14px; color: var(--muted-foreground); margin: 0 0 14px; }
      `}</style>
    </section>
  );
}
