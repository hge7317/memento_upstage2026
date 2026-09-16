import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const STEPS = [
  {
    id: "context-reinstatement",
    tag: "STEP 1 · 사건 직전 맥락",
    count: "회상 1 / 4",
    question: "면접이 시작되기 직전, 어떤 상황이었는지 떠오르는 대로 말해주세요.",
    placeholder: "기억나는 내용을 자유롭게 입력하세요",
    fallback: "면접이 시작되기 직전, 어떤 상황이었는지 떠오르는 대로 말해주세요.",
  },
  {
    id: "free-recall",
    tag: "STEP 2 · 자유 서술",
    count: "회상 2 / 4",
    question: "순서를 맞추려고 하지 말고, 지금 떠오르는 질문이나 장면을 자유롭게 말해주세요.",
    placeholder: "순서와 관계없이 떠오르는 내용을 적어주세요",
    fallback: "순서를 맞추려고 하지 말고, 지금 떠오르는 질문이나 장면을 자유롭게 말해주세요.",
  },
  {
    id: "structural-cue",
    tag: "STEP 3 · 시간·공간·감각·행동 단서",
    count: "회상 3 / 4",
    question: "코드 질문을 받을 때, 어디에 앉아 있었고 시선은 어디를 향했나요?",
    placeholder: "단서를 따라 떠오르는 내용을 입력하세요",
    fallback: "코드 질문을 받을 때, 어디에 앉아 있었고 시선은 어디를 향했나요?",
  },
  {
    id: "reverse-recall",
    tag: "STEP 4 · 마지막 순간부터 역순 회상",
    count: "회상 4 / 4",
    question: "면접이 끝나기 직전의 마지막 장면부터 거꾸로 떠올려볼게요. 가장 마지막에 누가 무엇을 했나요?",
    placeholder: "마지막에서 앞으로 거꾸로 떠올려보세요",
    fallback: "면접이 끝나기 직전의 마지막 장면부터 거꾸로 떠올려볼게요. 가장 마지막에 누가 무엇을 했나요?",
  },
];

function confirmedItems(session) {
  if (!Array.isArray(session?.candidates)) return [];
  return session.candidates
    .filter((c) => c && (c.status === "CONFIRMED" || c.status === "EDITED" || c.status === "UNKNOWN"))
    .map((c) => (c.status === "EDITED" && c.editedClaim ? c.editedClaim : c.claim))
    .filter(Boolean);
}

function rejectedItems(session) {
  if (!Array.isArray(session?.candidates)) return [];
  return session.candidates
    .filter((c) => c && c.status === "REJECTED" && c.claim)
    .map((c) => c.claim);
}

function previousUserMessage(messages, stepId) {
  const stepMessages = messages[stepId] || [];
  const userMessages = stepMessages.filter((m) => m && m.role === "user");
  if (userMessages.length === 0) return "";
  return userMessages[userMessages.length - 1].text;
}

function totalUserMessages(messages, stepId) {
  const stepMessages = messages[stepId] || [];
  return stepMessages.filter((m) => m && m.role === "user").length;
}

export default function RecallSteps({ session, setSession }) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  useEffect(() => {
    const stepMessages = messages[current.id];
    const alreadyHasAi = Array.isArray(stepMessages) && stepMessages.some((m) => m && m.role === "ai");
    if (alreadyHasAi) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const body = JSON.stringify({
          sessionId: session?.sessionId,
          contextType: current.id,
          context: {
            confirmedItems: confirmedItems(session),
            rejectedItems: rejectedItems(session),
            interviewInfo: {
              company: session?.company,
              role: session?.role,
              date: session?.date,
              type: session?.type,
              round: session?.round,
              url: session?.url,
            },
            previousAnswer: previousUserMessage(messages, current.id),
          },
        });

        const res = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:3001"}/api/recall`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled && typeof data.question === "string" && data.question.trim()) {
          addAiMessage(data.question.trim());
        } else if (!cancelled) {
          addAiMessage(current.fallback);
        }
      } catch (e) {
        if (!cancelled) {
          addAiMessage(current.fallback);
        }
      }
    })();

    function addAiMessage(text) {
      if (cancelled) return;
      setMessages((prev) => ({
        ...prev,
        [current.id]: [...(prev[current.id] || []), { role: "ai", text }],
      }));
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [step, current.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, step]);

  function appendMessage(role, text) {
    if (!text || !text.trim()) return;
    setMessages((prev) => ({
      ...prev,
      [current.id]: [...(prev[current.id] || []), { role, text: text.trim() }],
    }));
  }

  function clearInput() {
    setInput("");
  }

  async function fetchNext(questionText) {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const body = JSON.stringify({
        sessionId: session?.sessionId,
        contextType: current.id,
        context: {
          confirmedItems: confirmedItems(session),
          rejectedItems: rejectedItems(session),
          interviewInfo: {
            company: session?.company,
            role: session?.role,
            date: session?.date,
            type: session?.type,
            round: session?.round,
            url: session?.url,
          },
          previousAnswer: questionText,
        },
      });

      const res = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:3001"}/api/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (typeof data.question === "string" && data.question.trim()) {
        appendMessage("ai", data.question.trim());
      } else {
        appendMessage("ai", current.fallback);
      }
    } catch (e) {
      appendMessage("ai", current.fallback);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!input || !input.trim()) return;
    appendMessage("user", input);
    const myAnswer = input.trim();
    clearInput();
    await fetchNext(myAnswer);
  }

  function handleSkip() {
    appendMessage("user", "");
    fetchNext("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleStepComplete() {
    const userTexts = (messages[current.id] || [])
      .filter((m) => m && m.role === "user" && m.text)
      .map((m) => m.text);
    const answerText = userTexts.join("\n");

    const nextAnswers = { ...answers, [current.id]: answerText };
    setAnswers(nextAnswers);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setSession((s) => ({
        ...s,
        stage: "timeline-review",
        answers: nextAnswers,
        recallMessages: messages,
      }));
      navigate("/timeline-review/new", { replace: true });
    }
  }

  const answersRef = { current: {} };

  return (
    <div className="screen screen--white recall">
      <Header onLogoClick={() => navigate("/")} />
      <div className="recall__header">
        <div className="recall__step-tag">{current.tag}</div>
        <div className="recall__count">{current.count}</div>
      </div>

      <div className="recall__bar">
        <div className="recall__bar-full" />
        <div className="recall__bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="recall__dialog" ref={scrollRef}>
        {(messages[current.id] || []).map((m, idx) => {
          if (m.role === "ai") {
            return (
              <div key={`ai-${idx}`} className="recall__ai-bubble">
                <div className="recall__avatar">M</div>
                <div className="recall__speech">{m.text}</div>
              </div>
            );
          }
          return (
            <div key={`user-${idx}`} className="recall__user-bubble">
              <div className="recall__user-card">{m.text}</div>
            </div>
          );
        })}
        <div className="recall__scroll">⋮</div>
      </div>

      <div className="recall__input-card">
        <textarea
          className="recall__input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={current.placeholder}
          rows={4}
          disabled={loading}
        />
        <button className="recall__attach" onClick={handleSubmit} disabled={loading}>
          ↑
        </button>
      </div>

      <div className="recall__actions">
        <button className="btn btn--soft" onClick={handleSkip} disabled={loading}>
          건너뛰기
        </button>
        <button className="btn btn--soft" onClick={handleStepComplete} disabled={loading}>
          {loading ? "전송 중…" : "단계 완료"}
        </button>
      </div>
    </div>
  );
}
