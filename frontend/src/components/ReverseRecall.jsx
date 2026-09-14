import { useState } from "react";

/**
 * ReverseRecall - "면접이 끝난 마지막 순간부터 거꾸로 떠올리면, 바로 앞 장면은 무엇인가요?" 질문 하나를 제시한다.
 *
 * 참조:
 *  - PRD §5.3 (REVERSE_RECALL 상태 정의)
 *  - PRD §10 (기억 복기 순서, REVERSE_RECALL)
 *  - docs/references/scenarios/interview.md §REVERSE_RECALL
 *  - docs/references/output-contract.md §단계별 응답 제한 (REVERSE_RECALL: question 하나, newMemoryItems)
 *  - docs/references/guardrails.md §7 (질문 출력 전 체크: 질문은 정확히 하나)
 *
 * 완료 조건:
 *  - 사용자 응답 또는 넘기기 → TIMELINE_REVIEW로 진행
 *  - 새 내용에는 REVERSE_RECALL 출처 부여
 */
export function ReverseRecall({
  onAnswer,
  onSkip,
  initialAnswer = "",
}) {
  const [answer, setAnswer] = useState(initialAnswer);
  const [submitted, setSubmitted] = useState(false);

  const question =
    "면접이 끝난 마지막 순간부터 거꾸로 떠올리면, 바로 앞 장면은 무엇인가요?";

  const handleSubmit = () => {
    if (answer.trim()) {
      setSubmitted(true);
      onAnswer(answer.trim());
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <section className="screen reverse-recall">
      <div className="chapter-head">
        <span className="chapter-num">Chapter 5-4</span>
        <span className="chapter-title">거꾸로 회상</span>
      </div>

      <h1 style={{ textAlign: "center", margin: "16px 0 8px" }}>
        끝에서 시작으로, 거꾸로
      </h1>
      <p className="hint" style={{ textAlign: "center", marginBottom: "24px" }}>
        면접이 끝난 마지막 순간부터 거꾸로 떠올려 보세요.
      </p>

      {/* 질문 카드 */}
      <div className="rr-question-card">
        <div className="rr-question-card__label">질문 1/1 (역순)</div>
        <h2>{question}</h2>
      </div>

      {/* 답변 영역 */}
      <div className="rr-answer-area">
        <textarea
          className="rr-textarea"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="예: 마지막으로 면접관과 악수하고 나왔다. 그 직전에는 감사합니다 하고 인사했다. 그 직전에는 마지막 질문을 받았다. 등"
          rows={6}
          disabled={submitted}
        />

        {!submitted && (
          <div className="rr-actions">
            <button
              className="btn btn-ghost"
              onClick={handleSkip}
            >
              기억 안 남 (넘기기)
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!answer.trim()}
            >
              답변 완료
            </button>
          </div>
        )}

        {submitted && (
          <div className="rr-submitted">
            <p className="rr-submitted__label">답변이 저장되었습니다</p>
            <p className="rr-submitted__hint">
              다음은 타임라인 검토 단계로 넘어갑니다.
            </p>
          </div>
        )}
      </div>

      {/* 진행 표시 */}
      <div className="rr-progress">
        <span className="rr-progress__prev">구조 단서</span>
        <span className="rr-progress__arrow">→</span>
        <span className="rr-progress__current">거꾸로 회상</span>
        <span className="rr-progress__arrow">→</span>
        <span className="rr-progress__next">타임라인 검토</span>
      </div>

      <style>{`
        .reverse-recall { max-width: 680px; margin: 0 auto; }
        .rr-question-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
          padding: 20px;
          margin-bottom: 20px;
        }
        .rr-question-card__label {
          font-size: 12px;
          color: var(--muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }
        .rr-question-card h2 {
          margin: 0;
          font-size: 18px;
          line-height: 1.5;
        }
        .rr-answer-area { margin-bottom: 16px; }
        .rr-textarea {
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
        .rr-textarea::placeholder { color: var(--muted-foreground); }
        .rr-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          justify-content: flex-end;
        }
        .rr-submitted {
          margin-top: 14px;
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--card);
          text-align: center;
        }
        .rr-submitted__label {
          font-weight: 600;
          color: var(--foreground);
          margin-bottom: 4px;
        }
        .rr-submitted__hint {
          font-size: 13px;
          color: var(--muted-foreground);
          margin: 0;
        }
        .rr-progress {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--muted-foreground);
          margin-top: 8px;
        }
        .rr-progress__current { color: var(--foreground); font-weight: 500; }
        .btn-disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </section>
  );
}
