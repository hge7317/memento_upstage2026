import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const Archive = ({ records = [], deleteRecord, onOpenRecord, onViewTrash }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const normalizedQuery = query.trim().toLowerCase();

  const list = useMemo(() => {
    const filtered = records.filter((r) => !r.isDeleted);
    const matched = normalizedQuery
      ? filtered.filter(
          (r) =>
            r.company.toLowerCase().includes(normalizedQuery) ||
            r.role.toLowerCase().includes(normalizedQuery)
        )
      : filtered;
    return matched.sort((a, b) => {
      const diff = new Date(b.createdAt) - new Date(a.createdAt);
      return sortDesc ? diff : -diff;
    });
  }, [records, normalizedQuery, sortDesc]);

  const handleOpen = (id) => {
    onOpenRecord?.(id);
    navigate(`/result/${id}`);
  };

  const handleDelete = (id) => {
    if (confirmId === id) {
      deleteRecord?.(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
    }
  };

  const handleTrash = () => {
    onViewTrash?.();
    navigate("/trash");
  };

  const toggleSort = () => {
    setSortDesc((prev) => !prev);
  };

  const sortLabel = sortDesc ? "최신순" : "오래된순";

  return (
    <div className="screen screen--white archive">
      <Header />
      <div className="archive__body">
        <div className="archive__head">
          <div className="archive__head-left">
            <h2 className="archive__title">아카이브</h2>
            <p className="archive__sub">지금껏 정리한 면접 복기 기록입니다.</p>
          </div>
          <input
            className="archive__search"
            type="text"
            placeholder="회사명, 직무로 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="archive__toolbar">
          <button className="archive__trash-btn" onClick={handleTrash}>
            휴지통
          </button>
          <button className="archive__sort-btn" onClick={toggleSort}>
            {sortLabel}
          </button>
        </div>

        <div className="archive__list">
          {list.length === 0 ? (
            <div className="archive__empty">저장된 기록이 없어요</div>
          ) : (
            list.map((record) => (
              <div key={record.id} className="archive__card">
                <div className="archive__card-main">
                  <div className="archive__company">{record.company}</div>
                  <div className="archive__role">{record.role}</div>
                </div>
                <div className="archive__date">{record.date}</div>
                <button className="archive__open" onClick={() => handleOpen(record.id)}>
                  열기
                </button>
                <button
                  className="archive__delete"
                  onClick={() => handleDelete(record.id)}
                >
                  {confirmId === record.id ? "정말 삭제" : "삭제"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Archive;
