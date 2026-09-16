import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";

const QuickMemo = ({ session, setSession }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.edit;

  const [text, setText] = useState(editData?.memo || session?.quickMemo || "");

  const handleSkip = () => {
    setSession((s) => ({ ...s, stage: "extract-candidates" }));
    navigate("/extract-candidates", { replace: true });
  };

  const handleSave = () => {
    setSession((s) => ({ ...s, quickMemo: text }));
    navigate("/prepared", { replace: true });
  };

  const handleComplete = () => {
    if (!text.trim()) return;
    setSession((s) => ({ ...s, quickMemo: text, stage: "extract-candidates" }));
    navigate("/extract-candidates", { replace: true });
  };

  const company = session?.company || "Memento Labs";
  const role = session?.role || "Product Designer";
  const date = session?.date || "2026.09.15 14:00";
  const type = session?.type || "대면";
  const round = session?.round || "1차 면접";
  const hasUrl = !!session?.url;

  return (
    <div className="screen screen--white">
      <Header onBack={() => navigate("/prepared")} onLogoClick={() => navigate("/")} />

      <div className="memo__body">
        <div className="memo__head">
          <span className="memo__title">지금 떠오르는 것부터 남겨보세요</span>
        </div>
        <p className="memo__sub">순서가 틀려도, 확실하지 않아도 괜찮아요.</p>

        <div className="memo__info-bar">
          <span className="memo__company">{company}</span>
          <span className="memo__context">
            {role} · {date} · {type} · {round}
          </span>
          {hasUrl && (
            <span className="memo__posting-chip">공고 연결됨</span>
          )}
        </div>

        <div className="memo__grid">
          <div className="memo__textarea-wrap">
            <textarea
              className="memo__textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`예) 처음에 자기소개를 했고, 보드에 적은 코드를 보며 질문했다.\n답변이 정확했는지는 잘 모르겠다. 면접관 표정이 나쁘진 않았던 것 같다.`}
              rows={8}
            />
            <span className="memo__count">{text.length} / 3,000</span>
          </div>

          <div className="memo__photo-panel">
            <span className="memo__photo-title">사진으로 메모했나요?</span>
            <span className="memo__photo-sub">사진에 남긴 메모도 함께 정리할 수 있어요</span>
            <span className="memo__photo-limit">JPG · PNG 최대 5장</span>
            <button className="memo__photo-btn" type="button">
              사진 추가
            </button>
          </div>
        </div>

        <div className="memo__notice">
          사전 정보와 메모를 함께 정리하되, 메모에 없는 사건은 추측하지 않습니다.
        </div>

        <div className="memo__actions">
          <button className="memo__save-btn" onClick={handleSave} type="button">
            임시저장
          </button>
          <button
            className="memo__complete-btn"
            onClick={handleComplete}
            type="button"
            disabled={!text.trim()}
          >
            기억 조각 정리하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickMemo;
