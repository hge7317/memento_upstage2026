import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const CATEGORIES = ["FACT", "UNCERTAIN", "EVALUATION"];
const CATEGORY_LABELS = { FACT: "사실", UNCERTAIN: "불확실", EVALUATION: "수정" };

const TimelineReview = ({ record, session, onSave }) => {
  const navigate = useNavigate();

  const deriveItems = () => {
    if (record?.timeline && record.timeline.length) {
      return record.timeline.map((t) => ({
        id: t.id,
        tag: t.tag,
        content: t.content,
        time: t.time,
        seq: null,
      }));
    }

    const cands = session?.candidates || [];
    const filtered = cands
      .filter((c) => ["CONFIRMED", "EDITED", "UNKNOWN"].includes(c.status))
      .map((c) => ({
        id: c.id,
        tag: c.category,
        content: c.status === "EDITED" ? (c.editedClaim || c.claim) : c.claim,
        seq: c.sequenceHint,
      }));

    const withSeq = filtered.filter((it) => it.seq !== null).sort((a, b) => a.seq - b.seq);
    const withoutSeq = filtered.filter((it) => it.seq === null);
    const sorted = [...withSeq, ...withoutSeq];

    return sorted.map((it, i) => {
      if (it.time) return it;
      const totalMin = 14 * 60 + i * 18;
      const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
      const mm = String(totalMin % 60).padStart(2, "0");
      return { ...it, time: `${hh}:${mm}` };
    });
  };

  const [items, setItems] = useState(deriveItems);
  const [highlight, setHighlight] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editTag, setEditTag] = useState("FACT");

  const unsortedCount = items.filter((it) => it.seq === null).length;

  const enterEdit = (id) => {
    if (editingId && editingId !== id) {
      commitEdit(editingId, true);
    }
    const item = items.find((it) => it.id === id);
    if (!item) return;
    setEditingId(id);
    setEditContent(item.content);
    setEditTag(item.tag);
  };

  const commitEdit = (id, silent = false) => {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    const newContent = editContent.trim();
    if (!silent && newContent === item.content && editTag === item.tag) {
      setEditingId(null);
      return;
    }
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, content: newContent || item.content, tag: editTag } : it
      )
    );
    if (!silent) setEditingId(null);
  };

  const handleDelete = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setEditingId(null);
  };

  const handleConfirm = (id) => commitEdit(id, false);

  const handleSave = () => {
    const payload = items.map(({ id, time, tag, content }) => ({
      id,
      time,
      tag,
      content,
    }));
    const meta =
      record != null
        ? {
            company: record.company,
            role: record.role,
            date: record.date,
            type: record.type,
            round: record.round,
            quickMemo: record.quickMemo,
            answers: record.answers,
          }
        : {
            company: session?.company,
            role: session?.role,
            date: session?.date,
            type: session?.type,
            round: session?.round,
            quickMemo: session?.quickMemo,
            answers: session?.answers,
          };
    if (onSave) {
      onSave(payload, meta);
    } else {
      navigate("/generate-output", { replace: true });
    }
  };

  const tagClass = (tag) => {
    if (tag === "FACT") return "timeline__tag--fact";
    if (tag === "UNCERTAIN") return "timeline__tag--uncertain";
    return "timeline__tag--evaluation";
  };

  return (
    <div className="screen screen--white timeline">
      <Header onLogoClick={() => navigate("/")} />
      <div className="timeline__body">
        <div className="timeline__head">
          <h2 className="timeline__title">면접 타임라인을 확인해주세요</h2>
          <p className="timeline__sub">순서가 틀리거나 분류가 다르면 수정할 수 있어요.</p>
        </div>

        <div className="timeline__list">
          {items.length === 0 ? (
            <div className="timeline__empty">표시할 항목이 없어요.</div>
          ) : (
            items.map((it) => {
              const isHighlighted = highlight && it.seq === null;
              return (
                <div
                  key={it.id}
                  className={`timeline__item ${isHighlighted ? "timeline__item--highlight" : ""}`}
                >
                  <div className="timeline__bullet-col">
                    <span className="timeline__bullet" />
                  </div>
                  <span className="timeline__time">{it.time}</span>
                  <div className="timeline__card">
                    {editingId === it.id ? (
                      <div className="timeline__edit">
                        <textarea
                          className="timeline__edit-textarea"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                        />
                        <select
                          className="timeline__edit-select"
                          value={editTag}
                          onChange={(e) => setEditTag(e.target.value)}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {CATEGORY_LABELS[c] || c}
                            </option>
                          ))}
                        </select>
                        <div className="timeline__edit-actions">
                          <button
                            type="button"
                            className="timeline__edit-delete"
                            onClick={() => handleDelete(it.id)}
                          >
                            삭제
                          </button>
                          <button
                            type="button"
                            className="timeline__edit-confirm"
                            onClick={() => handleConfirm(it.id)}
                          >
                            확인
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className={`timeline__tag ${tagClass(it.tag)}`}>{CATEGORY_LABELS[it.tag] || it.tag}</span>
                        <span className="timeline__content">{it.content}</span>
                        <button
                          type="button"
                          className="timeline__action-btn"
                          onClick={() => enterEdit(it.id)}
                        >
                          수정
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          className={`timeline__unsorted ${highlight ? "timeline__unsorted--active" : ""}`}
          onClick={() => setHighlight((h) => !h)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setHighlight((h) => !h);
            }
          }}
        >
          <span className="timeline__unsorted-label">순서 미상 {unsortedCount}건</span>
          <span className="timeline__unsorted-hint">· 클릭하여 확인</span>
        </div>

        <div className="timeline__actions">
          <button
            type="button"
            className="timeline__generate-btn"
            disabled={items.length === 0}
            onClick={handleSave}
          >
            결과 생성
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimelineReview;
