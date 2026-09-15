import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

function useVerifiedCount(candidates) {
  if (!Array.isArray(candidates)) return 0;
  return candidates.filter(
    (c) => c && c.status && c.status !== "PENDING"
  ).length;
}

export default function UserVerify({ session, setSession }) {
  const navigate = useNavigate();
  const candidatesRef = useRef(session?.candidates);
  const [editId, setEditId] = useState(null);
  const [editedClaim, setEditedClaim] = useState("");

  useEffect(() => {
    candidatesRef.current = session?.candidates;
    if (editId && session?.candidates) {
      const c = session.candidates.find((x) => x.id === editId);
      if (c && c.editedClaim !== undefined) {
        setEditedClaim(c.editedClaim);
      }
    }
  }, [session?.candidates, editId]);

  const candidates = session?.candidates || [];
  const verifiedCount = useVerifiedCount(candidates);
  const total = candidates.length;
  const pendingCount = candidates.length - verifiedCount;
  const isAllDone = total > 0 && pendingCount === 0;

  const findCandidate = (id) => candidates.find((c) => c.id === id);

  const setCandidate = (id, patch) => {
    setSession((s) => {
      const list = Array.isArray(s?.candidates) ? [...s.candidates] : [];
      const idx = list.findIndex((c) => c.id === id);
      if (idx === -1) return s;
      const prev = list[idx];
      const next = {
        ...prev,
        ...patch,
        status: prev.status === "REJECTED" ? "REJECTED" : patch.status,
      };
      if (patch.status === "EDITED") {
        next.editedClaim = patch.editedClaim ?? prev.claim;
      }
      list[idx] = next;
      return { ...s, candidates: list };
    });
  };

  const dismiss = (id) => {
    setCandidate(id, { status: "REJECTED" });
  };

  const confirmOrToggle = (id) => {
    const c = findCandidate(id);
    if (!c) return;
    if (c.status === "CONFIRMED") {
      setCandidate(id, { status: "PENDING" });
    } else if (c.status === "EDITED") {
      setCandidate(id, { status: "CONFIRMED", editedClaim: c.editedClaim });
    } else {
      setCandidate(id, { status: "CONFIRMED" });
    }
  };

  const markUnknown = (id) => {
    setCandidate(id, { status: "UNKNOWN" });
  };

  const markEdited = (id) => {
    setCandidate(id, { status: "EDITED", editedClaim: editedClaim || candidates.find((c) => c.id === id)?.claim });
    setEditId(null);
    setEditedClaim("");
  };

  const handleDone = () => {
    if (!isAllDone) return;
    setSession((s) => ({ ...s, stage: "recall" }));
    navigate("/verify-complete", { replace: true });
  };

  const renderCandidate = (c) => {
    const isEdited = c.status === "EDITED";
    const isEditing = editId === c.id;
    const isDismissed = c.status === "REJECTED";
    const showMain = true;

    const chipBg =
      c.category === "FACT"
        ? "var(--verify-fact-bg)"
        : c.category === "EVALUATION"
        ? "var(--verify-eval-bg)"
        : "var(--bg-warm)";
    const chipColor =
      c.category === "FACT"
        ? "var(--accent-teal)"
        : c.category === "EVALUATION"
        ? "var(--verify-eval-ink)"
        : "var(--accent-warm)";

    const ChipLabel =
      c.category === "FACT"
        ? "FACT · 사실 후보"
        : c.category === "UNCERTAIN"
        ? "UNCERTAIN · 불확실"
        : c.category === "EVALUATION"
        ? "EVALUATION · 평가"
        : "UNKNOWN";

    return (
      <div
        key={c.id}
        className={`verify__card ${isDismissed ? "verify__card--dismissed" : ""} ${isEdited ? "verify__card--edited" : ""}`}
      >
        <div className="verify__chip" style={{ background: chipBg, color: chipColor }}>
          {labelForChip(c)}
        </div>
        <button
          className="verify__cross"
          aria-label="제외"
          onClick={() => dismiss(c.id)}
        >
          ×
        </button>

        <div className="verify__card-body">
          {isEditing ? (
            <div className="verify__edit-block">
              <textarea
                className="verify__edit-textarea"
                value={editedClaim}
                onChange={(e) => setEditedClaim(e.target.value)}
                placeholder={c.claim}
                autoFocus
              />
              <button
                className="verify__edit-confirm"
                onClick={() => markEdited(c.id)}
              >
                확인
              </button>
            </div>
          ) : (
            <>
              <p className="verify__claim">{isEdited ? c.editedClaim : c.claim}</p>
              <p className="verify__source">원문: {c.sourceQuote}</p>

              {showMain && !isDismissed && (
                <div className="verify__actions">
                  <button
                    className={`verify__btn verify__btn--confirm ${c.status === "CONFIRMED" ? "verify__btn--active" : ""}`}
                    onClick={() => confirmOrToggle(c.id)}
                    style={
                      c.status === "CONFIRMED"
                        ? { background: "var(--accent-teal)", color: "var(--page-bg)" }
                        : { background: "var(--bg-chip)", color: "var(--accent-teal)" }
                    }
                  >
                    맞아요
                  </button>
                  <button
                    className={`verify__btn verify__btn--unknown ${c.status === "UNKNOWN" ? "verify__btn--active" : ""}`}
                    onClick={() => markUnknown(c.id)}
                    style={
                      c.status === "UNKNOWN"
                        ? { background: "var(--bg-warm)", color: "var(--accent-warm)" }
                        : { background: "var(--bg-warm)", color: "var(--accent-warm)" }
                    }
                  >
                    확실하지 않아요
                  </button>
                  <button
                    className={`verify__btn verify__btn--edit ${c.status === "EDITED" ? "verify__btn--active" : ""}`}
                    onClick={() => {
                      setEditId(c.id);
                      setEditedClaim(c.claim || "");
                    }}
                    style={
                      c.status === "EDITED"
                        ? { background: "var(--page-bg)", color: "var(--muted)", borderColor: "var(--line)" }
                        : { background: "var(--page-bg)", color: "var(--muted)", borderColor: "var(--line)" }
                    }
                  >
                    수정
                  </button>
                  <button
                    className={`verify__btn verify__btn--dismiss ${c.status === "REJECTED" ? "verify__btn--active" : ""}`}
                    onClick={() => dismiss(c.id)}
                    style={
                      c.status === "REJECTED"
                        ? { background: "var(--page-bg)", color: "var(--muted)", borderColor: "var(--line)" }
                        : { background: "var(--page-bg)", color: "var(--muted)", borderColor: "var(--line)" }
                    }
                  >
                    내용 없음
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const emptyHtml = candidates.length === 0;
  const isEmpty = emptyHtml;

  return (
    <div className="screen screen--white">
      <Header
        onBack={() => navigate("/quick-memo")}
        title="후보 검증"
      />
      <div className="verify__body">
        <div className="verify__top">
          <h2 className="verify__title">
            {session?.company ? `${session.company} 면접` : "이 면접"}에서 찾은 기억을 확인해주세요
          </h2>
          <div className="verify__counter-progress">
            <span className="verify__counter">
              {verifiedCount} / {total} 확인
            </span>
            <div className="verify__progress-track">
              <div
                className="verify__progress-fill"
                style={{ width: total === 0 ? 0 : `${(verifiedCount / total) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {isEmpty ? (
          <div className="verify__empty">
            <p>확인할 후보가 없습니다</p>
          </div>
        ) : (
          <div className="verify__scroll">
            <div className="verify__list">
              {candidates.map((c) => (
                <div
                  key={c.id}
                  className="verify__row"
                  style={{ borderLeftColor: "var(--verify-progress-bg)" }}
                >
                  {renderCandidate(c)}
                </div>
              ))}
            </div>
            <div className="verify__scroll-thumb" />
          </div>
        )}

        <div className="verify__footer">
          <p className="verify__footer-text">
            모든 후보를 확인하면 다음으로 갈 수 있어요
          </p>
          <button
            className="verify__finish"
            disabled={!isAllDone}
            onClick={handleDone}
            style={isAllDone ? { background: "var(--accent-teal)", color: "var(--page-bg)" } : { background: "var(--bg-soft)", color: "var(--muted)", border: "1px solid var(--line)" }}
          >
            검증 완료
          </button>
        </div>
      </div>
    </div>
  );
}

function labelForChip(c) {
  if (c.category === "FACT") return "FACT · 사실 후보";
  if (c.category === "UNCERTAIN") return "UNCERTAIN · 불확실";
  if (c.category === "EVALUATION") return "EVALUATION · 평가";
  return "UNKNOWN";
}

function chipLabelForCategory(c) {
  if (c.category === "FACT") return "FACT · 사실 후보";
  if (c.category === "UNCERTAIN") return "UNCERTAIN · 불확실";
  if (c.category === "EVALUATION") return "EVALUATION · 평가";
  return "UNKNOWN";
}
