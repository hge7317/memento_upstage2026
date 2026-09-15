import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const STEPS = [
  {
    id: "context-reinstatement",
    step: "STEP 1 · 직전 맥락 회상",
    count: "회상 1 / 4",
    question: "면접이 시작되기 직전, 있던 위치와 주변 모습에서 기억나는 것은 무엇인가요?",
    hint: "직전 상황과 주변을 떠올려보세요.",
    example: "면접 장소 도착 직전, 엘리베이터 앞에서 대기하던 장면이 떠올라요.",
  },
  {
    id: "free-recall",
    step: "STEP 2 · 사실/평가/불확실 분리",
    count: "회상 2 / 4",
    question: "면접이 시작되고 가장 먼저 기억나는 장면은 무엇인가요?",
    hint: "순서를 맞추려고 하지 말고, 지금 떠오르는 질문이나 장면을 자유롭게 말해주세요.",
    example: "자기소개 다음에 최근 프로젝트를 설명했고, 보드에 코드가 있었어요.",
  },
  {
    id: "structural-cue",
    step: "STEP 3 · 시간·공간·감각·행동 단서",
    count: "회상 3 / 4",
    question: "코드 질문을 받을 때, 어디에 앉아 있었고 시선은 어디를 향했나요?",
    hint: "단서를 따라 떠오르는 내용을 입력하세요",
    example: "면접관 두 명의 맞은편에 앉았고, 가운데 보드를 보며 답했던 것 같아요.",
  },
  {
    id: "reverse-recall",
    step: "STEP 4 · 마지막 순간부터 역순 회상",
    count: "회상 4 / 4",
    question: "면접이 끝나기 직전의 마지막 장면부터 거꾸로 떠올려볼게요. 가장 마지막에 누가 무엇을 했나요?",
    hint: "마지막에서 앞으로 거꾸로 떠올려보세요",
    example: "면접관이 추가로 궁금한 점이 있는지 물었고, 제가 질문 하나를 했어요.",
  },
];

const RecallSteps = ({ session, setSession }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState(STEPS[0].question);

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  useEffect(() => {
    let cancelled = false;

    async function fetchQuestion() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const confirmedItems = [];
        const rejectedItems = [];
        if (session?.candidates) {
          for (const c of session.candidates) {
            if (c.status === "CONFIRMED" || c.status === "EDITED" || c.status === "UNKNOWN") {
              if (c.claim) confirmedItems.push(c.claim);
            } else if (c.status === "REJECTED") {
              if (c.claim) rejectedItems.push(c.claim);
            }
          }
        }

        const interviewInfo = session?.interviewInfo ?? {};
        const previousAnswer = answers[current.id] ?? "";

        const res = await fetch("http://localhost:3001/api/recall", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session?.id,
            contextType: current.id,
            context: {
              confirmedItems,
              rejectedItems,
              interviewInfo,
              previousAnswer,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled && data.question) {
          setQuestion(data.question);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("recall fallback");
          setQuestion(current.question);
        }
      }
    }

    fetchQuestion();
    return () => {
      cancelled = true;
    };
  }, [step, current.id, session?.id]);

  const handleSubmit = async () => {
    setLoading(true);
    setAnswers((a) => ({ ...a, [current.id]: "" }));
    setLoading(false);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setSession((s) => ({
        ...s,
        stage: "timeline-review",
        answers,
      }));
      navigate("/timeline-review", { replace: true });
    }
  };

  const handleSkip = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setSession((s) => ({ ...s, stage: "timeline-review", answers }));
      navigate("/timeline-review", { replace: true });
    }
  };

  const handleChange = (text) => {
    setAnswers((a) => ({ ...a, [current.id]: text }));
  };

  return (
    <div className="slide">
      <Header />

      <div className="recall__header">
        <div className="recall__step-tag">{current.step}</div>
        <div className="recall__count">{current.count}</div>
      </div>

      <div className="recall__bar">
        <div className="recall__bar-full" />
        <div className="recall__bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="recall__block">
        <div className="recall__q">
          <div className="recall__q-m">M</div>
          <div className="recall__q-text">{question}</div>
        </div>

        <div className="recall__a">
          <div className="recall__a-m">M</div>
          <div className="recall__a-card">
            <textarea
              className="recall__a-input"
              value={answers[current.id] || ""}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={current.example}
              rows={4}
            />
          </div>
        </div>

        <div className="recall__next">
          <div className="recall__next-m">M</div>
          <div className="recall__next-card">
            <textarea
              className="recall__next-input"
              value=""
              readOnly
              placeholder={current.hint}
              rows={3}
            />
          </div>
        </div>

        <div className="recall__scroll">
          <div className="recall__scroll-line">⋮</div>
        </div>
      </div>

      <div className="recall__input-area">
        <span className="recall__input-hint">순서와 관계없이 떠오르는 내용을 적어주세요</span>
        <textarea
          className="recall__input-field"
          value={answers[current.id] || ""}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={current.example}
          rows={4}
        />
        <button className="recall__input-up">↑</button>
      </div>

      <div className="recall__actions">
        <button className="btn btn--soft" onClick={handleSkip}>
          건너뛰기
        </button>
        <button className="btn btn--soft" onClick={handleSubmit} disabled={loading}>
          {loading ? "저장 중…" : "단계 완료"}
        </button>
      </div>
    </div>
  );
};

export default RecallSteps;
