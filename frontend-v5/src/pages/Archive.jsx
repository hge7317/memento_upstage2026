import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const Archive = ({ records, deleteRecord, onOpenRecord, onViewTrash }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");

  const list = useMemo(() => {
    let items = tab === "trash" ? records.filter((r) => r.isDeleted) : records.filter((r) => !r.isDeleted);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter(
        (r) => r.company.toLowerCase().includes(q) || r.role.toLowerCase().includes(q)
      );
    }
    return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [records, query, tab]);

  const handleOpen = (id) => {
    onOpenRecord?.(id);
  };

  const handleDelete = (id) => {
    if (window.confirm("이 기록을 휴지통으로 이동하시겠습니까?")) {
      deleteRecord?.(id);
    }
  };

  return (
    <div className="screen">
      <Header />
      <div className="archive">
        <div className="archive__header">
          <div className="archive__title">아카이브</div>
          <div className="archive__sub">지금껏 정리한 면접 복기 기록입니다.</div>
        </div>

        <div className="archive__search">
          <input
            className="archive__search-input"
            placeholder="회사명, 직무로 검색"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="archive__search-btn" onClick={() => setQuery("")}>
            검색
          </button>
        </div>

        <div className="archive__toolbar">
          <button
            className={`archive__toolbar-btn${tab === "all" ? " archive__toolbar-btn--active" : ""}`}
            onClick={() => setTab("all")}
          >
            전체
          </button>
          <button
            className={`archive__toolbar-btn${tab === "trash" ? " archive__toolbar-btn--active" : ""}`}
            onClick={() => {
              setTab("trash");
              onViewTrash?.();
            }}
          >
            휴지통
          </button>
        </div>

        <div className="archive__list">
          {list.length === 0 ? (
            <div className="archive__empty">기록된 면접 복기가 없습니다.</div>
          ) : (
            list.map((record) => (
              <div key={record.id} className="archive__item">
                <div className="archive__item-info">
                  <div className="archive__item-company">{record.company}</div>
                  <div className="archive__item-role">{record.role}</div>
                  <div className="archive__item-date">{record.date}</div>
                </div>
                <div className="archive__item-actions">
                  <button
                    className="archive__action-btn archive__action-btn--open"
                    onClick={() => handleOpen(record.id)}
                  >
                    열기
                  </button>
                  <button
                    className="archive__action-btn archive__action-btn--delete"
                    onClick={() => handleDelete(record.id)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Archive;
