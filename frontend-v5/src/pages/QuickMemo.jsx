import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const QuickMemo = ({ session, setSession }) => {
  const navigate = useNavigate();
  const [text, setText] = useState("");

  const handleSkip = () => {
    setSession((s) => ({ ...s, stage: "extract-candidates" }));
    navigate("/extract-candidates", { replace: true });
  };

  const handleComplete = () => {
    setSession((s) => ({ ...s, quickMemo: text, stage: "extract-candidates" }));
    navigate("/extract-candidates", { replace: true });
  };

  return (
    <div className="screen">
      <header className="header">
        <div className="header__dots">
          <span className="header__dot header__dot--orange" />
          <span className="header__dot header__dot--teal" />
        </div>
        <div className="header__logo">MEMENTO</div>
        <span className="save-chip">저장 완료</span>
      </header>

      <div className="quickmemo__body">
        <div className="quickmemo__header">
          <span className="t-step">면접 전, 기억의 기준점을 준비해두세요</span>
        </div>

        <p className="t-sub">
          면접이 끝나면 이 정보와 빠른 메모를 함께 보며 더 정확하게 정리합니다.
        </p>

        <div className="quickmemo__step">
          <span className="quickmemo__step-num">01</span>
        </div>

        <div className="field">
          <span className="t-chip">빠른 메모</span>
          <textarea
            className="field__textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="무엇이 있었는지 짧게 적어주세요"
            rows={8}
          />
        </div>

        <div className="quickmemo__actions">
          <button className="btn btn--soft" onClick={handleSkip}>
            건너뛰기
          </button>
          <button className="btn btn--soft" onClick={handleComplete}>
            단계 완료
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickMemo;
