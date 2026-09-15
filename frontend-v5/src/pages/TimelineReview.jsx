import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";

const TimelineReview = ({ record, session, onSave }) => {
  const navigate = useNavigate();
  const { recordId } = useParams();
  const isNew = recordId === "new";

  const initialTimeline =
    (record?.timeline && record.timeline.length ? record.timeline : []).length ||
    session?.timeline?.length
      ? (record?.timeline || session?.timeline || []).map((t) => ({
          id: t.id || `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          time: t.time || "",
          tag: t.tag || "FACT",
          tagColor: t.tagColor || (t.tag === "FACT" ? "#ddf1ec" : t.tag === "UNCERTAIN" ? "#fff4d9" : "#e8edff"),
          tagTextColor: t.tagTextColor || (t.tag === "FACT" ? "#0f766e" : t.tag === "UNCERTAIN" ? "#b7791f" : "#5164b0"),
          content: t.content || "",
        }))
      : [
          { id: "t1", time: "14:00", tag: "FACT", tagColor: "#ddf1ec", tagTextColor: "#0f766e", content: "자기소개 후 최근 프로젝트에 대해 질문받음" },
          { id: "t2", time: "14:18", tag: "UNCERTAIN", tagColor: "#fff4d9", tagTextColor: "#b7791f", content: "코딩 경험 질문이 먼저였는지는 확실하지 않음" },
          { id: "t3", time: "14:35", tag: "EVALUATION", tagColor: "#e8edff", tagTextColor: "#5164b0", content: "면접관의 반응이 긍정적이었던 것 같음" },
        ];

  const [items, setItems] = useState(initialTimeline);
  const [unsorted, setUnsorted] = useState(2);

  const handleEdit = (id) => {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    const newContent = prompt("내용을 수정하세요:", item.content);
    if (newContent === null) return;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, content: newContent } : it)));
  };

  const addItem = () => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [
      ...prev,
      { id, time: "", tag: "FACT", tagColor: "#ddf1ec", tagTextColor: "#0f766e", content: "" },
    ]);
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSave = () => {
    const cleaned = items.map((it) => ({ ...it }));
    if (onSave) {
      onSave(cleaned, {
        company: record?.company || session?.company || "Memento Labs",
        role: record?.role || session?.role || "Product Designer",
        date: record?.date || session?.date || "2026.09.15",
        type: record?.type || session?.type || "대면",
        round: record?.round || session?.round || "1차 면접",
        quickMemo: record?.quickMemo || session?.quickMemo || "",
        answers: record?.answers || session?.answers || {},
      });
    } else {
      navigate(`/result/${recordId === "new" ? "new" : recordId}`);
    }
  };

  return (
    <div className="slide">
      <Header />
      <div className="timeline__body">
        <div className="timeline__head">
          <h2 className="t-title">면접 타임라인을 확인해주세요</h2>
          <p className="t-sub">순서가 틀리거나 분류가 다르면 수정할 수 있어요.</p>
        </div>

        <div className="timeline__list">
          {items.map((it) => (
            <div key={it.id} className="timeline__item">
              <div className="timeline__bullet" style={{ background: "#0f766e" }} />
              <div className="timeline__time">{it.time}</div>
              <div className="timeline__card">
                <div className="timeline__tag" style={{ background: it.tagColor, color: it.tagTextColor }}>
                  {it.tag}
                </div>
                <div className="timeline__content">{it.content}</div>
              </div>
              <div className="timeline__item-actions">
                <button className="btn btn--inline" onClick={() => handleEdit(it.id)}>
                  수정
                </button>
                <button className="btn btn--inline btn--danger-outline" onClick={() => removeItem(it.id)}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="timeline__unsorted">
          <span className="timeline__unsorted-label">순서 미상 {unsorted}건</span>
          <span className="timeline__unsorted-hint">· 클릭하여 확인</span>
        </div>

        <div className="timeline__actions">
          <button className="btn btn--inline" onClick={addItem}>
            항목 추가
          </button>
          <button className="btn btn--teal" onClick={handleSave}>
            저장 후 결과 보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimelineReview;
