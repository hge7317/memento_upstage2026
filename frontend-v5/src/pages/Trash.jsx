import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const Trash = ({ records, restoreRecord, deleteRecord, onViewArchive }) => {
  const navigate = useNavigate();

  const items = useMemo(() => {
    return records
      .filter((r) => r.isDeleted)
      .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
  }, [records]);

  const daysLeft = (deletedAt) => {
    if (!deletedAt) return "30일 남음";
    const diff = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
    if (diff <= 0) return "만료됨";
    const d = Math.ceil(diff / (24 * 60 * 60 * 1000));
    return `${d}일 남음`;
  };

  const handleRestore = (id) => {
    if (window.confirm("이 기록을 아카이브로 복구하시겠습니까?")) {
      restoreRecord?.(id);
    }
  };

  const handlePurge = (id) => {
    if (window.confirm("이 기록을 완전히 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)")) {
      // 논리 삭제만 수행하는 현재 구현에서는 영구 삭제를 별도로 제공하지 않음
      // 요청 시 실제로는 삭제 상태를 유지하는 것으로 처리
      if (deleteRecord) deleteRecord(id);
    }
  };

  return (
    <div className="screen">
      <Header />
      <div className="trash">
        <div className="trash__header">
          <div className="trash__title">휴지통</div>
          <div className="trash__sub">삭제한 기록은 30일 동안 복구할 수 있어요.</div>
        </div>

        <div className="trash__list">
          {items.length === 0 ? (
            <div className="trash__empty">휴지통이 비어 있습니다.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="trash__item">
                <div className="trash__item-info">
                  <div className="trash__item-company">{item.company}</div>
                  <div className="trash__item-role">{item.role}</div>
                  <div className="trash__item-date">{item.date}</div>
                </div>
                <div className="trash__item-badge">{daysLeft(item.deletedAt)}</div>
                <button
                  className="trash__restore-btn"
                  onClick={() => handleRestore(item.id)}
                >
                  복구
                </button>
                <button
                  className="trash__purge-btn"
                  onClick={() => handlePurge(item.id)}
                >
                  영구 삭제
                </button>
              </div>
            ))
          )}
        </div>

        <div className="trash__footer">
          <button
            className="trash__footer-btn"
            onClick={() => {
              onViewArchive?.();
              navigate("/archive");
            }}
          >
            아카이브로
          </button>
        </div>
      </div>
    </div>
  );
};

export default Trash;
