import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { MOCK_CANDIDATES, CATEGORY_LABELS, CATEGORY_COLORS } from "../lib/data";

const UserVerify = ({ session, setSession, onVerifyComplete }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState(() =>
    MOCK_CANDIDATES.map((c) => ({
      ...c,
      status: "unknown",
    }))
  );
  const [verified, setVerified] = useState(0);
  const [total] = useState(items.length);
  const [done, setDone] = useState(false);

  const toggle = (id) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: it.status === "confirmed" ? "unknown" : "confirmed" } : it))
    );
    setVerified((prev) =>
      items.find((it) => it.id === id)?.status === "confirmed"
        ? prev - 1
        : prev + 1
    );
  };

  const allConfirmed = items.every((it) => it.status === "confirmed");
  const handleDone = () => {
    setDone(true);
    onVerifyComplete?.({ stage: "free-recall" });
    navigate("/recall", { state: { session, items } });
  };

  if (done) {
    return (
      <div className="slide">
        <Header />
        <div className="verifydone__body">
          <div className="verifydone__card">
            <div className="verifydone__icon">M</div>
            <h2 className="t-title">기억 후보를 모두 확인했어요</h2>
            <p className="t-sub">
              사전 정보와 확인한 메모만 다음 회상 단계에서 사용할게요.
            </p>
            <div className="verifydone__step">
              <span className="verifydone__step-num">03</span>
            </div>
            <div className="verifydone__ready">
              <span className="verifydone__ready-dot" />
              <span className="verifydone__ready-text">회상을 시작할 수 있어요</span>
            </div>
            <button
              className="btn btn--teal"
              onClick={() => navigate("/recall", { state: { session, items } })}
            >
              회상 시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="slide">
      <Header />
      <div className="verify__body">
        <div className="verify__header">
          <h2 className="t-title">{session?.company || "Memento Labs"} 면접에서 찾은 기억을 확인해주세요</h2>
          <div className="verify__progress">
            <span className="verify__progress-label">{verified} / {total} 확인</span>
            <div className="verify__progress-bar">
              <div className="verify__progress-fill" style={{ width: `${(verified / total) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="verify__categories">
          {["fact", "uncertain", "evaluation"].map((cat) => (
            <div key={cat} className="verify__category">
              <div className="verify__category-label" style={{ background: CATEGORY_COLORS[cat].bg, color: CATEGORY_COLORS[cat].text }}>
                {CATEGORY_LABELS[cat]} · {cat === "fact" ? "사실 후보" : cat === "uncertain" ? "불확실 후보" : "평가 후보"}
              </div>
              <div className="verify__list">
                {items
                  .filter((it) => it.category === cat)
                  .map((it) => (
                    <div key={it.id} className="verify__item">
                      <button
                        className={`verify__checkbox${it.status === "confirmed" ? " verify__checkbox--checked" : ""}`}
                        onClick={() => toggle(it.id)}
                        aria-label={it.status === "confirmed" ? "확인됨" : "확인"}
                      >
                        {it.status === "confirmed" ? (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7l3 3 5-6" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </button>
                      <div className="verify__item-content">
                        <div className="verify__item-claim">{it.claim}</div>
                        <div className="verify__item-source">"{it.sourceQuote}"</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="verify__actions">
          <button className="btn btn--teal" onClick={handleDone} disabled={!allConfirmed}>
            {allConfirmed ? "검토 완료" : `아직 ${total - verified}건 검토가 남아있어요`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserVerify;
