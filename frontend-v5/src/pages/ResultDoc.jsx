import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";

const TABS = [
  { key: "summary", label: "요약" },
  { key: "timeline", label: "타임라인" },
  { key: "qa", label: "질문·답변" },
  { key: "eval", label: "평가·불확실" },
];

const QA_STEPS = [
  { stepId: "context-reinstatement", label: "1. 사건 직전 맥락" },
  { stepId: "free-recall", label: "2. 자유 서술" },
  { stepId: "structural-cue", label: "3. 시간·공간·감각·행동 단서" },
  { stepId: "reverse-recall", label: "4. 역순 회상" },
];

const ResultDoc = ({ result, onResultUpdate, onDeleteRecord }) => {
  const navigate = useNavigate();
  const { recordId } = useParams();
  const [activeTab, setActiveTab] = useState("summary");

  if (!result) {
    return (
      <div className="screen screen--white result">
        <Header onLogoClick={() => navigate("/")} />
        <div className="result__body">
          <h2 className="result__title">기록을 찾을 수 없어요</h2>
        </div>
      </div>
    );
  }

  const { id, company, role, date, type, round, timeline, answers, candidates = [] } = result;

  const confirmedCount = candidates.filter((c) => c.status === "CONFIRMED").length;
  const editedCount = candidates.filter((c) => c.status === "EDITED").length;
  const uncertainCount = candidates.filter((c) => c.status === "UNKNOWN").length;

  const handleDelete = () => {
    onDeleteRecord?.(id);
    navigate("/trash");
  };

  const handleEdit = () => {
    navigate(`/timeline-review/${id}`);
  };

  const handleSave = () => {
    onResultUpdate?.({ ...result });
    navigate("/archive");
  };

  const renderSummary = () => (
    <>
      <h3 className="result__panel-title">핵심 요약</h3>
      {timeline && timeline.length > 0 ? (
        <ul className="result__bullets">
          {timeline.map((item) => (
            <li key={item.id}>{item.content}</li>
          ))}
        </ul>
      ) : (
        <li>정리된 항목이 없어요</li>
      )}
    </>
  );

  const renderTimeline = () => (
    <>
      <h3 className="result__panel-title">타임라인</h3>
      <ul className="result__list">
        {timeline && timeline.length > 0 ? (
          timeline.map((item) => (
            <li key={item.id} className="result__list-item">
              <span className="result__time">{item.time}</span>
              <span className={`result__tag result__tag--${item.tag.toLowerCase()}`}>{item.tag}</span>
              <span className="result__text">{item.content}</span>
            </li>
          ))
        ) : (
          <li>해당 항목이 없어요</li>
        )}
      </ul>
    </>
  );

  const renderQa = () => (
    <>
      <h3 className="result__panel-title">질문·답변</h3>
      <div className="result__qa">
        {QA_STEPS.map((step) => (
          <div key={step.stepId} className="result__qa-step-block">
            <div className="result__qa-step">{step.label}</div>
            <div className="result__qa-answer">{answers?.[step.stepId] || "답변 없음"}</div>
          </div>
        ))}
      </div>
    </>
  );

  const renderEval = () => {
    const evalTimeline = timeline?.filter((item) => item.tag === "EVALUATION" || item.tag === "UNCERTAIN") || [];
    return (
      <>
        <h3 className="result__panel-title">평가·불확실</h3>
        {evalTimeline.length > 0 ? (
          <ul className="result__list">
            {evalTimeline.map((item) => (
              <li key={item.id} className="result__list-item">
                <span className="result__time">{item.time}</span>
                <span className={`result__tag result__tag--${item.tag.toLowerCase()}`}>{item.tag}</span>
                <span className="result__text">{item.content}</span>
              </li>
            ))}
          </ul>
        ) : (
          <li>해당 항목이 없어요</li>
        )}
      </>
    );
  };

  const renderPanel = () => {
    switch (activeTab) {
      case "summary":
        return renderSummary();
      case "timeline":
        return renderTimeline();
      case "qa":
        return renderQa();
      case "eval":
        return renderEval();
      default:
        return null;
    }
  };

  return (
    <div className="screen screen--white result">
      <Header onLogoClick={() => navigate("/")} />
      <div className="result__body">
        <h2 className="result__title">{company} · {role} 면접</h2>
        <p className="result__meta">{date} · {type} · {round}</p>
        <div className="result__notice">이 문서는 기억을 구조화한 기록입니다. 녹취나 객관적 사실 확인 결과가 아닙니다.</div>

        <div className="result__tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`result__tab${activeTab === tab.key ? " result__tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="result__grid">
          <section className="result__panel">{renderPanel()}</section>
          <aside className="result__info">
            <h3 className="result__info-title">기록 정보</h3>
            <div className="result__info-row">
              <span className="result__info-label">확인</span>
              <span className="result__info-value">{confirmedCount}건</span>
            </div>
            <div className="result__info-row">
              <span className="result__info-label">수정</span>
              <span className="result__info-value">{editedCount}건</span>
            </div>
            <div className="result__info-row">
              <span className="result__info-label">불확실</span>
              <span className="result__info-value">{uncertainCount}건</span>
            </div>
          </aside>
        </div>

        <div className="result__actions">
          <button className="result__btn result__btn--delete" onClick={handleDelete}>
            삭제
          </button>
          <button className="result__btn result__btn--edit" onClick={handleEdit}>
            수정
          </button>
          <button className="result__btn result__btn--save" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultDoc;
