import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

import { STEPS, confirmedItems, rejectedItems, previousUserMessage } from "../lib/recall.js";
import { postJson } from "../lib/api.js";

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
        const body = {
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

           recentMessages: (messages[current.id] || [])
            .filter((m) => m && (m.role === "user" || m.role === "ai"))
            .slice(-8)
            .map((m) => ({
              role: m.role,
              text: m.text,
            })),
          },
        };

        const data = await postJson("/api/recall", body);
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
      const body = {
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
          recentMessages: [
            ...(messages[current.id] || [])
            .filter((m) => m && (m.role === "user" || m.role === "ai"))
            .map((m) => ({
              role: m.role,
              text: m.text,
            })),
          ...(questionText
            ? [{ role: "user", text: questionText }]
            : []),
          ].slice(-8),
        },
      };

      const data = await postJson("/api/recall", body);
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
