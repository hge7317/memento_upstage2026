import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const mockUpcoming = [
  {
    id: "up-1",
    company: "Memento Labs",
    role: "Product Designer",
    date: "2026.09.16",
    type: "대면",
    round: "1차 면접",
    status: "예정",
  },
  {
    id: "up-2",
    company: "Nori Studio",
    role: "UX Researcher",
    date: "2026.09.18",
    type: "화상",
    round: "2차 면접",
    status: "예정",
  },
  {
    id: "up-3",
    company: "Pado Works",
    role: "Service Planner",
    date: "2026.09.20",
    type: "대면",
    round: "1차 면접",
    status: "예정",
  },
];

const mockPast = [
  {
    id: "past-1",
    company: "Memento Labs",
    role: "Product Designer",
    date: "2026.09.15",
    type: "대면",
    round: "1차 면접",
    status: "완료",
  },
];

const PrepareInterview = ({ onStartInterview }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [deletedIds, setDeletedIds] = useState(new Set());

  const filtered = (tab === "upcoming" ? mockUpcoming : mockPast)
    .filter((it) => !deletedIds.has(it.id))
    .filter((it) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      it.company.toLowerCase().includes(q) ||
      it.role.toLowerCase().includes(q)
    );
  });

  const handleQuickMemo = (it) => {
    onStartInterview?.({
      company: it.company,
      role: it.role,
      date: it.date,
      type: it.type,
      round: it.round,
    });
    navigate("/quick-memo", { replace: true });
  };

  const handleEdit = (it) => {
    navigate("/interview-initial-info", {
      state: { edit: it },
      replace: true,
    });
  };

  const handleStartReplay = (it) => {
    onStartInterview?.({
      company: it.company,
      role: it.role,
      date: it.date,
      type: it.type,
      round: it.round,
      stage: "recall",
    });
    navigate("/recall", { replace: true });
  };

  const handleDelete = (id) => {
    setDeletedIds((prev) => new Set([...prev, id]));
  };

  return (
    <div className="screen screen--white">
      <Header onBack={() => navigate("/", { replace: true })} onLogoClick={() => navigate("/")} />

      <div className="prep__body">
        <div className="prep__head">
          <h2 className="t-title">준비 중인 면접</h2>
          <p className="t-sub">
            면접을 누르면 정보를 수정할 수 있고, 끝난 직후엔 빠른 메모나 복기를 바로 시작할 수 있어요.
          </p>
        </div>

        <button className="btn btn--primary prep__new" onClick={() => navigate("/interview-initial-info", { replace: true })}>
          + 새 면접
        </button>

        <div className="prep__tabs">
          <button
            className={`prep__tab ${tab === "upcoming" ? "prep__tab--active" : ""}`}
            onClick={() => setTab("upcoming")}
          >
            예정 {mockUpcoming.length}
          </button>
          <button
            className={`prep__tab ${tab === "past" ? "prep__tab--active" : ""}`}
            onClick={() => setTab("past")}
          >
            지난 면접
          </button>
        </div>

        <div className="prep__search">
          <input
            className="prep__search-input"
            placeholder="회사명, 직무로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="prep__list">
          {filtered.map((it) => (
            <div
              key={it.id}
              className={`prep__item ${selectedId === it.id ? "prep__item--selected" : ""}`}
              onClick={() => handleEdit(it)}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
            >
              <div className="prep__item-chip">
                <span className="prep__chip">{it.status === "예정" ? `D-${mockUpcoming.indexOf(it) + 1}` : "완료"}</span>
              </div>
              <div className="prep__item-body">
                <div className="prep__item-title">{it.company}</div>
                <div className="prep__item-role">{it.role}</div>
                <div className="prep__item-meta">
                  {it.date} · {it.type} · {it.round}
                </div>
              </div>
              <div className="prep__item-actions">
                <button className="btn btn--primary prep__memo" onClick={(e) => { e.stopPropagation(); handleQuickMemo(it); }}>
                  빠른 메모
                </button>
                <button className="btn btn--ghost prep__replay" onClick={(e) => { e.stopPropagation(); handleStartReplay(it); }}>
                  복기 시작
                </button>
                <button className="btn btn--ghost" onClick={(e) => { e.stopPropagation(); handleDelete(it.id); }}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="prep__empty">검색된 면접이 없습니다.</p>
        )}

      </div>
    </div>
  );
};

export default PrepareInterview;
