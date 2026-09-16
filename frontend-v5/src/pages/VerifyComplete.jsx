import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

function countStatus(candidates, status) {
  if (!Array.isArray(candidates)) return 0;
  return candidates.filter((c) => c && c.status === status).length;
}

function detailItems(candidates) {
  if (!Array.isArray(candidates)) return [];
  return candidates
    .filter((c) => c && (c.status === "CONFIRMED" || c.status === "EDITED" || c.status === "UNKNOWN"))
    .map((c) => ({
      category: c.category,
      text: c.status === "EDITED" && c.editedClaim ? c.editedClaim : c.claim,
    }));
}

function Badge({ category }) {
  if (category === "FACT") {
    return (
      <span className="done__badge done__badge--fact">사실</span>
    );
  }
  if (category === "UNCERTAIN") {
    return (
      <span className="done__badge done__badge--uncertain">불확실</span>
    );
  }
  return (
    <span className="done__badge done__badge--eval">평가</span>
  );
}

export default function VerifyComplete({ session, setSession }) {
  const navigate = useNavigate();
  const candidates = Array.isArray(session?.candidates) ? session.candidates : [];
  const confirmed = countStatus(candidates, "CONFIRMED");
  const edited = countStatus(candidates, "EDITED");
  const unknown = countStatus(candidates, "UNKNOWN");
  const rejected = countStatus(candidates, "REJECTED");
  const details = detailItems(candidates);

  const company = session?.company || "이 면접";
  const role = session?.role || "Product Designer";
  const date = session?.date || "2026.09.15 14:00";
  const type = session?.type || "대면";
  const round = session?.round || "1차 면접";

  const handlePosting = () => {
    if (session?.url) {
      window.open(session.url, "_blank");
    }
  };

  return (
    <div className="screen screen--white">
      <Header title="후보 검증 완료" onLogoClick={() => navigate("/")} />
      <div className="done__page">
        <div className="done__inner">
          <h2 className="done__title">기억 후보를 모두 확인했어요</h2>
          <p className="done__sub">사전 정보와 확인한 메모만 다음 회상 단계에서 사용할게요.</p>

          <div className="done__info">
            <div className="done__info-left">
              <div className="done__company">{company}</div>
              <div className="done__info-meta">
                {role} · {date} · {type} · {round}
              </div>
            </div>
            <button className="done__posting" onClick={handlePosting}>
              공고 연결
            </button>
          </div>

          <div className="done__cards">
            <div className="done__card" style={{ background: "var(--verify-fact-bg)" }}>
              <div style={{ color: "var(--accent-teal)" }}>
                <div className="done__card-label">확인</div>
                <div className="done__card-num">{confirmed}</div>
              </div>
            </div>
            <div className="done__card" style={{ background: "var(--done-edit-bg)" }}>
              <div style={{ color: "var(--done-edit-ink)" }}>
                <div className="done__card-label">수정</div>
                <div className="done__card-num">{edited}</div>
              </div>
            </div>
            <div className="done__card" style={{ background: "var(--bg-warm)" }}>
              <div style={{ color: "var(--accent-warm)" }}>
                <div className="done__card-label">불확실</div>
                <div className="done__card-num">{unknown}</div>
              </div>
            </div>
            <div className="done__card" style={{ background: "var(--done-exclude-bg)" }}>
              <div style={{ color: "var(--done-exclude-ink)" }}>
                <div className="done__card-label">제외</div>
                <div className="done__card-num">{rejected}</div>
              </div>
            </div>
          </div>

          <div className="done__detail">
            <div className="done__detail-title">사전 정보와 함께 사용할 확인 내용</div>
            <div className="done__detail-list">
              {details.length === 0 ? (
                <div className="done__detail-empty">표시할 항목이 없습니다</div>
              ) : (
                details.map((d, i) => (
                  <div key={i} className="done__detail-row">
                    <div className="done__detail-badge">
                      <Badge category={d.category} />
                    </div>
                    <div className="done__detail-text">{d.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="done__actions">
            <button
              className="done__btn done__btn--ghost"
              onClick={() => navigate("/user-verify", { replace: true })}
            >
              후보 다시 확인
            </button>
            <button
              className="done__btn done__btn--primary"
              onClick={() => {
                setSession((s) => ({ ...s, stage: "recall" }));
                navigate("/recall", { replace: true });
              }}
            >
              AI 복기 계속
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
