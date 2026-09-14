import { useState } from "react";

/**
 * ContextReinstatement - 사건 직전 구조적 맥락 질문 하나를 제시한다.
 *
 * 참조:
 *  - PRD §5.3 (CONTEXT_REINSTATEMENT 상태 정의)
 *  - PRD §10 (기억 복기 순서, CONTEXT_REINSTATEMENT)
 *  - docs/references/scenarios/interview.md §CONTEXT_REINSTATEMENT
 *  - docs/references/output-contract.md §단계별 응답 제한 (CONTEXT_REINSTATEMENT: question 하나)
 *  - docs/references/guardrails.md §3 (금지·허용 질문)
 *
 * 완료 조건:
 *  - 응답(서술 완료) 또는 넘기기 → FREE_RECALL로 진행
 *  - 조기 종료 의사표시 → TIMELINE_REVIEW 제안 (PRD §5.4 조기 완료)
 */
export function ContextReinstatement({
  onAnswer,
  onSkip,
  onEarlyFinish,
  interviewMode = "대면",
  question: propQuestion,
  loading = false,
}) {
  // 백엔드 /api/recall에서 받은 question이 있으면 우선 사용, 없으면 하드코딩 fallback
  const question = propQuestion ?? "면접이 시작되기 직전, 사용자가 있던 위치와 주변 모습에서 기억나는 것은 무엇인가요?";

  const [answer, setAnswer] = useState("");

  const handleSubmit = () => {
    if (answer.trim()) {
      onAnswer(answer.trim());
    }
  };

  const handleSkip = () => {
    // 넘기기: 답변 없이 다음 단계(FREE_RECALL)로
    onSkip();
  };

  const handleEarlyFinish = () => {
    // 조기 종료 의사표시 → TIMELINE_REVIEW 제안
    onEarlyFinish();
  };

  return (
    <section className="screen context-reinstatement">
      <div className="chapter-head">
        <span className="chapter-num">Chapter 5</span>
        <span className="chapter-title">맥락 되살리기</span>
      </div>

      <h1 style={{ textAlign: "center", margin: "20px 0 8px" }}>
        시작하기 직전, 그 순간을 떠올려 보세요
      </h1>
      <p className="hint" style={{ textAlign: "center", marginBottom: "24px" }}>
        면접이 시작되기 직전,사용자가 있던 위치와 주변 모습에서 기억나는 것을 적어 주세요.
      </p>

      {/* 질문 카드 */}
      <div className="context-question-card">
        <div className="context-question-card__label">질문 1/1</div>
        {loading ? (
          <div className="context-question-card__loading">
            <span className="context-question-card__loading-label">질문을 가져오는 중...</span>
          </div>
        ) : (
          <>
            <h2>{question}</h2>
            <p className="context-question-card__note">
              대면/비대면 모두 해당합니다. 들어가기 직전의 위치, 자리, 주변, 몸 상태를 떠올려 보세요.
            </p>
          </>
        )}
      </div>

      {/* 답변 입력 */}
      <div className="context-answer-area">
        <textarea
          className="context-textarea"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="예: 건물 로비에 도착해서 의자에 앉아 있었다. 바깥이 추웠고 손에 커피를 들고 있었다. 등"
          rows={6}
        />
        <div className="context-answer-actions">
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
      </div>

      {/* 조기 종료 */}
      <div className="context-early-finish">
        <button
          className="btn btn-ghost btn-early-finish"
          onClick={handleEarlyFinish}
        >
          지금까지로 끝낼래 (조기 종료)
        </button>
        <p className="context-early-finish__note">
          더 이상 떠올리지 않고 지금까지 내용으로 결과를 만들 수 있습니다.
        </p>
      </div>

      {/* 진행 표시 */}
      <div className="context-progress">
        <span className="context-progress__step">맥락 되살리기</span>
        <span className="context-progress__arrow">→</span>
        <span className="context-progress__next">자유 회상</span>
      </div>

      <style>{`
        .context-reinstatement { max-width: 680px; margin: 0 auto; }
        .context-question-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
          padding: 20px;
          margin-bottom: 20px;
        }
        .context-question-card__label {
          font-size: 12px;
          color: var(--muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }
        .context-question-card h2 {
          margin: 0 0 10px;
          font-size: 18px;
          line-height: 1.5;
        }
        .context-question-card__note {
          font-size: 13px;
          color: var(--muted-foreground);
          margin: 0;
        }
        .context-answer-area {
          margin-bottom: 16px;
        }
        .context-textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--background);
          color: var(--foreground);
          font-size: 15px;
          font-family: inherit;
          resize: vertical;
          min-height: 120px;
        }
        .context-textarea::placeholder { color: var(--muted-foreground); }
        .context-answer-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          justify-content: flex-end;
        }
        .context-early-finish {
          border: 1px dashed var(--border);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 20px;
          text-align: center;
          background: var(--card);
        }
        .btn-early-finish {
          color: var(--muted-foreground);
          font-size: 14px;
        }
        .context-early-finish__note {
          font-size: 12px;
          color: var(--muted-foreground);
          margin: 6px 0 0;
        }
        .context-progress {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--muted-foreground);
        }
        .context-progress__step { color: var(--foreground); font-weight: 500; }
        .context-progress__next { color: var(--muted-foreground); }
        .btn-disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </section>
  );
}
