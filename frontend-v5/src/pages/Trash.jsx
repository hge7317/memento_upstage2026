import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const Trash = ({ records = [], restoreRecord, onViewArchive }) => {
  const navigate = useNavigate();

  const items = useMemo(() => {
    return records
      .filter((r) => r.isDeleted)
      .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
  }, [records]);

  const daysLeft = (deletedAt) => {
    if (!deletedAt) return 30;
    const diff =
      new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  };

  const handleRestore = (id) => {
    restoreRecord?.(id);
  };

  const handleBack = () => {
    onViewArchive?.();
    navigate("/archive");
  };

  return (
    <div className="screen screen--white bin">
      <Header onLogoClick={() => navigate("/")} />
      <div className="bin__body">
        <h2 className="bin__title">휴지통</h2>
        <p className="bin__sub">삭제한 기록은 30일 동안 복구할 수 있어요.</p>

        <div className="bin__list">
          {items.length === 0 ? (
            <div className="bin__empty">휴지통이 비어 있어요</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="bin__card">
                <div className="bin__card-main">
                  <div className="bin__company">{item.company}</div>
                  <div className="bin__role">{item.role}</div>
                </div>
                <span className="bin__days">{daysLeft(item.deletedAt)}일 남음</span>
                <div className="bin__date">{item.date}</div>
                <button className="bin__restore" onClick={() => handleRestore(item.id)}>
                  복구
                </button>
              </div>
            ))
          )}
        </div>

        <div className="bin__actions">
          <button className="bin__back" onClick={handleBack}>
            아카이브로
          </button>
        </div>
      </div>
    </div>
  );
};

export default Trash;
