import { useState } from "react";

/**
 * FreeRecall - "시작부터 끝까지 떠오르는 순서대로" 자유 서술 질문 하나를 제시한다.
 *
 * 참조:
 *  - PRD §5.3 (FREE_RECALL 상태 정의)
 *  - PRD §10 (기억 복기 순서, FREE_RECALL)
 *  - docs/references/scenarios/interview.md §FREE_RECALL
 *  - docs/references/output-contract.md §단계별 응답 제한 (FREE_RECALL: question 하나 또는 기억 구조화)
 *  - docs/references/guardrails.md §7 (질문 출력 전 체크: 질문은 정확히 하나)
 *
 * 완료 조건:
 *  - 사용자 서술 완료 표시 → STRUCTURAL_CUE로 진행
 *  - 서술 중에는 추가 질문 개입 없음
 */
export function FreeRecall({
  onComplete,
  onSkip,
  initialAnswer = "",
}) {
  const [answer, setAnswer] = useState(initialAnswer);
  const [submitted, setSubmitted] = useState(false);

  const question = "시작부터 끝까지 떠오르는 순서대로 말씀해 주세요. 정확하지 않은 부분은 그대로 표시해도 됩니다.";

  const handleSubmit = () => {
    if (answer.trim()) {
      setSubmitted(true);
      onComplete(answer.trim());
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <section className="screen free-recall">
      <div className="chapter-head">
        <span className="chapter-num">Chapter 5-2</span>
        <span className="chapter-title">자유 회상</span>
      </div>

      <h1 style={{ textAlign: "center", margin: "16px 0 8px" }}>
        처음부터 끝까지, 떠오르는 대로
      </h1>
      <p className="hint" style={{ textAlign: "center", marginBottom: "24px" }}>
        순서가 뒤죽박죽이어도 괜찮습니다. 정확하지 않은 부분은 그대로 두세요.
      </p>

      {/* 질문 카드 */}
      <div className="free-recall-question-card">
        <div className="free-recall-question-card__label">질문 1/1</div>
        <h2>{question}</h2>
      </div>

      {/* 답변 영역 */}
      <div className="free-recall-answer-area">
        <textarea
          className="free-recall-textarea"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="면접이 시작된 순간부터 끝까지, 떠오르는 장면·질문·답변·분위기·행동을 순서대로 적어 주세요."
          rows={10}
          disabled={submitted}
        />

        {!submitted && (
          <div className="free-recall-actions">
            <button
              className="btn btn-ghost"
              onClick={handleSkip}
            >
              지금 건너뛰기
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!answer.trim()}
            >
              서술 완료
            </button>
          </div>
        )}

        {submitted && (
          <div className="free-recall-submitted">
            <p className="free-recall-submitted__label">서술이 저장되었습니다</p>
            <p className="free-recall-submitted__hint">
              다음은 구조 단서 단계로 넘어갑니다.
            </p>
          </div>
        )}
      </div>

      {/* 진행 표시 */}
      <div className="free-recall-progress">
        <span className="free-recall-progress__prev">맥락 되살리기</span>
        <span className="free-recall-progress__arrow">→</span>
        <span className="free-recall-progress__current">자유 회상</span>
        <span className="free-recall-progress__arrow">→</span>
        <span className="free-recall-progress__next">구조 단서</span>
      </div>

      <style>{`
        .free-recall { max-width: 680px; margin: 0 auto; }
        .free-recall-question-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
          padding: 20px;
          margin-bottom: 20px;
        }
        .free-recall-question-card__label {
          font-size: 12px;
          color: var(--muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }
        .free-recall-question-card h2 {
          margin: 0;
          font-size: 18px;
          line-height: 1.5;
        }
        .free-recall-answer-area { margin-bottom: 16px; }
        .free-recall-textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--background);
          color: var(--foreground);
          font-size: 15px;
          font-family: inherit;
          resize: vertical;
        }
        .free-recall-textarea::placeholder { color: var(--muted-foreground); }
        .free-recall-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          justify-content: flex-end;
        }
        .free-recall-submitted {
          margin-top: 14px;
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--card);
          text-align: center;
        }
        .free-recall-submitted__label {
          font-weight: 600;
          color: var(--foreground);
          margin-bottom: 4px;
        }
        .free-recall-submitted__hint {
          font-size: 13px;
          color: var(--muted-foreground);
          margin: 0;
        }
        .free-recall-progress {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--muted-foreground);
          margin-top: 8px;
        }
        .free-recall-progress__current { color: var(--foreground); font-weight: 500; }
        .btn-disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </section>
  );
}
