import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";

const RESULT_FALLBACK = {
  company: "Memento Labs",
  role: "Product Designer",
  date: "2026.09.15",
  type: "대면",
  round: "1차 면접",
  timeline: [
    { id: "t1", time: "14:00", tag: "FACT", tagBg: "#DDF1EC", tagColor: "#0F766E", content: "자기소개 후 최근 프로젝트에 대해 질문받음" },
    { id: "t2", time: "14:18", tag: "UNCERTAIN", tagBg: "#FFF4D9", tagColor: "#B7791F", content: "코딩 경험 질문이 먼저였는지는 확실하지 않음" },
    { id: "t3", time: "14:35", tag: "EVALUATION", tagBg: "#E8EDFF", tagColor: "#5164B0", content: "면접관의 반응이 긍정적이었던 것 같음" },
  ],
  answers: {
    "free-recall": "자기소개 다음에 최근 프로젝트를 설명했고, 보드에 코드가 있었어요.",
    "structural-cue": "면접관 두 명의 맞은편에 앉았고, 가운데 보드를 보며 답했던 것 같아요.",
    "reverse-recall": "면접관이 추가로 궁금한 점이 있는지 물었고, 제가 질문 하나를 했어요.",
  },
  quickMemo: "면접 직후의 인상만 짧게 남김",
};

const RESULT_SUMMARY_ITEMS = [
  "자기소개 후 최근 프로젝트와 기술 선택 기준을 질문받음",
  "보드에 적은 코드를 보며 코딩 경험을 설명함",
  "답변 순서와 면접관 반응은 일부 불확실함",
];

const ResultDoc = ({ result, onResultUpdate, onDeleteRecord }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("summary");
  const [timeline, setTimeline] = useState(() =>
    (result?.timeline && result.timeline.length ? result.timeline : RESULT_FALLBACK.timeline).map((t) => ({
      ...t,
      tagBg: t.tagBg || (t.tag === "FACT" ? "#DDF1EC" : t.tag === "UNCERTAIN" ? "#FFF4D9" : "#E8EDFF"),
      tagColor: t.tagColor || (t.tag === "FACT" ? "#0F766E" : t.tag === "UNCERTAIN" ? "#B7791F" : "#5164B0"),
    }))
  );
  const [answers, setAnswers] = useState(() => result?.answers || {});

  const company = result?.company || RESULT_FALLBACK.company;
  const role = result?.role || RESULT_FALLBACK.role;
  const date = result?.date || RESULT_FALLBACK.date;
  const type = result?.type || RESULT_FALLBACK.type;
  const round = result?.round || RESULT_FALLBACK.round;
  const quickMemo = result?.quickMemo || "";

  const confirmedCount = timeline.filter((t) => t.tag === "FACT").length;
  const editedCount = timeline.filter((t) => t.tag === "UNCERTAIN").length;
  const uncertainCount = timeline.filter((t) => t.tag === "EVALUATION").length;

  const handleEditTimeline = (item) => {
    setTimeline((prev) =>
      prev.map((t) =>
        t.id === item.id ? { ...t, content: prompt("내용을 수정하세요:", t.content) ?? t.content } : t
      )
    );
  };

  const saveTimeline = () => {
    setTimeline((prev) => prev.map((t) => ({ ...t, content: t.content.trim() || t.content })));
  };

  return (
    <div className="screen">
      <Header />
      <div className="result-doc">
        <div className="result-doc__header">
          <div className="result-doc__title">{company} · {role} 면접</div>
          <div className="result-doc__meta">{date} 14:00 · {type} · {round}</div>
        </div>
        <div className="result-doc__notice">
          이 문서는 기억을 구조화한 기록입니다. 녹취나 객관적 사실 확인 결과가 아닙니다.
        </div>

        <div className="result-doc__tabs">
          {[
            { key: "summary", label: "요약" },
            { key: "timeline", label: "타임라인" },
            { key: "qa", label: "질문·답변" },
            { key: "eval", label: "평가·불확실" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`result-doc__tab${activeTab === tab.key ? " result-doc__tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="result-doc__body">
          <div className="result-doc__main">
            {activeTab === "summary" && (
              <div>
                <div className="result-doc__section-title">핵심 요약</div>
                <div className="result-doc__list">
                  {RESULT_SUMMARY_ITEMS.map((item, idx) => (
                    <div key={idx} className="result-doc__list-item">
                      • {item}
                    </div>
                  ))}
                </div>
                {quickMemo && (
                  <div style={{ marginTop: "18px" }}>
                    <div className="result-doc__section-title">빠른 메모</div>
                    <p className="result-doc__quickmemo">{quickMemo}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "timeline" && (
              <div>
                <div className="result-doc__section-title">타임라인</div>
                <div className="result-doc__timeline-list">
                  {timeline.map((item) => (
                    <div key={item.id} className="result-doc__timeline-item">
                      <div className="result-doc__timeline-time">{item.time}</div>
                      <div
                        className="result-doc__timeline-tag"
                        style={{ backgroundColor: item.tagBg, color: item.tagColor }}
                      >
                        {item.tag}
                      </div>
                      <div className="result-doc__timeline-content">{item.content}</div>
                      <button className="result-doc__edit-btn" onClick={() => handleEditTimeline(item)}>
                        수정
                      </button>
                    </div>
                  ))}
                </div>
                <button className="btn btn--inline" onClick={saveTimeline}>
                  저장
                </button>
              </div>
            )}

            {activeTab === "qa" && (
              <div>
                <div className="result-doc__section-title">질문·답변</div>
                <div className="result-doc__empty">질문·답변은 아직 채워지지 않았습니다.</div>
              </div>
            )}

            {activeTab === "eval" && (
              <div>
                <div className="result-doc__section-title">평가·불확실</div>
                <div className="result-doc__empty">평가·불확실은 아직 채워지지 않았습니다.</div>
              </div>
            )}
          </div>

          <div className="result-doc__sidebar">
            <div className="result-doc__sidebar-title">기록 정보</div>
            <div className="result-doc__info-row">
              <span>확인</span>
              <span className="result-doc__info-value">{confirmedCount}건</span>
            </div>
            <div className="result-doc__info-row">
              <span>수정</span>
              <span className="result-doc__info-value">{editedCount}건</span>
            </div>
            <div className="result-doc__info-row">
              <span>불확실</span>
              <span className="result-doc__info-value">{uncertainCount}건</span>
            </div>
          </div>
        </div>

        <div className="result-doc__footer">
          <button
            className="result-doc__btn result-doc__btn--danger-outline"
            onClick={() => {
              if (onDeleteRecord) onDeleteRecord(result?.id);
              navigate("/archive");
            }}
          >
            삭제
          </button>
          <button
            className="result-doc__btn result-doc__btn--secondary"
            onClick={() => navigate(`/timeline-review/${result?.id || "new"}`)}
          >
            수정
          </button>
          <button
            className="result-doc__btn result-doc__btn--primary"
            onClick={() => {
              const outgoing = {
                ...(result || {}),
                id: result?.id || `rec-${Date.now()}`,
                company,
                role,
                date,
                type,
                round,
                timeline: [...timeline],
                answers: { ...answers },
                quickMemo,
              };
              if (onResultUpdate) onResultUpdate(outgoing);
              navigate(`/result/${outgoing.id}`);
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultDoc;
