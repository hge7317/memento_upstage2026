import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { MOCK_CANDIDATES, CATEGORY_LABELS, CATEGORY_COLORS } from "../lib/data";

const ExtractCandidates = ({ session, setSession, onCandidatesReady }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"preparing" | "done">("preparing");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (phase === "preparing") {
      const timer = setTimeout(() => setProgress(35), 400);
      const timer2 = setTimeout(() => setProgress(70), 900);
      const timer3 = setTimeout(() => {
        setProgress(100);
        setPhase("done");
      }, 1500);
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [phase]);

  if (phase === "done") {
    return (
      <div className="slide">
        <Header />
        <div className="extractdone__body">
          <div className="extractdone__card">
            <div className="extractdone__icon">M</div>
            <h2 className="t-title">메모를 차분히 정리하고 있어요</h2>
            <p className="t-sub">
              미리 저장한 면접 정보와 방금 남긴 메모를 연결해 확인할 기억 후보로 나누는 중입니다.
            </p>
            <div className="extractdone__step">
              <span className="extractdone__step-num">01</span>
            </div>
            <div className="extractdone__ready">
              <span className="extractdone__ready-dot" />
              <span className="extractdone__ready-text">이제 후보를 확인해주세요</span>
            </div>
            <button
              className="btn btn--teal"
              onClick={() => {
                onCandidatesReady?.({ stage: "user-verify" });
                navigate("/user-verify", { state: { session } });
              }}
            >
              확인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="slide">
      <Header />
      <div className="extract__body">
        <div className="extract__card">
          <div className="extract__badge">
            <span className="header__dot header__dot--orange" />
            <span className="header__dot header__dot--teal" />
          </div>
          <div className="extract__brand">MEMENTO</div>

          <h2 className="t-title">메모를 차분히 정리하고 있어요</h2>
          <p className="t-sub">
            미리 저장한 면접 정보와 방금 남긴 메모를 연결해 확인할 기억 후보로 나누는 중입니다.
          </p>

          <div className="extract__step">
            <span className="extract__step-num">01</span>
          </div>

          <div className="extract__status">
            <span className="extract__status-label">정리 진행</span>
            <div className="extract__bar">
              <div className="extract__bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="extract__status-num">{progress}%</span>
          </div>

          <p className="t-hint">
            확인한 내용만 다음 회상 단계에서 사용합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExtractCandidates;
