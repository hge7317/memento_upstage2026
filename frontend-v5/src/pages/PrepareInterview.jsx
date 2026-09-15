import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const [creating, setCreating] = useState(false);

  const filtered = (tab === "upcoming" ? mockUpcoming : mockPast).filter((it) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      it.company.toLowerCase().includes(q) ||
      it.role.toLowerCase().includes(q)
    );
  });

  const handleStart = (it) => {
    onStartInterview?.({
      company: it.company,
      role: it.role,
      date: it.date,
      type: it.type,
      round: it.round,
    });
    navigate("/interview-initial-info", { replace: true });
  };

  return (
    <div className="screen">
      <header className="header">
        <div className="header__dots">
          <span className="header__dot header__dot--orange" />
          <span className="header__dot header__dot--teal" />
        </div>
        <div className="header__logo">MEMENTO</div>
        <span className="save-chip">저장 완료</span>
      </header>

      <div className="prepare__body">
        <div className="prepare__head">
          <h2 className="t-title">준비 중인 면접</h2>
          <p className="t-sub">
            면접을 선택하면 끝난 직후 바로 빠른 메모를 시작할 수 있어요.
          </p>
        </div>

        <button className="btn btn--teal prepare__new" onClick={() => setCreating(true)}>
          + 새 면접
        </button>

        <div className="prepare__tabs">
          <button
            className={`prepare__tab ${tab === "upcoming" ? "prepare__tab--active" : ""}`}
            onClick={() => setTab("upcoming")}
          >
            예정 {mockUpcoming.length}
          </button>
          <button
            className={`prepare__tab ${tab === "past" ? "prepare__tab--active" : ""}`}
            onClick={() => setTab("past")}
          >
            지난 면접
          </button>
        </div>

        <div className="prepare__search">
          <input
            className="prepare__search-input"
            placeholder="회사명, 직무로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="prepare__list">
          {filtered.map((it) => (
            <div key={it.id} className="prepare__item">
              <div className="prepare__item-body">
                <div className="prepare__item-title">{it.company}</div>
                <div className="prepare__item-role">{it.role}</div>
                <div className="prepare__item-meta">
                  {it.date} · {it.type} · {it.round}
                </div>
              </div>
              <div className="prepare__item-actions">
                {it.status === "예정" ? (
                  <button className="btn btn--teal prepare__start" onClick={() => onStart?.(it.id)}>
                    시작
                  </button>
                ) : (
                  <button className="btn btn--teal prepare__open" onClick={() => navigate("/archive")}>
                    열기
                  </button>
                )}
                <button className="btn btn--inline prepare__delete">삭제</button>
              </div>
            </div>
          ))}
        </div>

        {creating && (
          <PrepareNewInterview onClose={() => setCreating(false)} />
        )}
      </div>
    </div>
  );
};

const PrepareNewInterview = ({ onClose }) => {
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("대면");
  const [round, setRound] = useState("1차 면접");

  const handleCreate = () => {
    const id = `up-new-${Date.now()}`;
    mockUpcoming.push({
      id,
      company,
      role,
      date,
      type,
      round,
      status: "예정",
    } || []);
    onClose();
    navigate("/interview-initial-info", { replace: true });
  };

  return (
    <div className="prepare__modal-back" onClick={onClose}>
      <div className="prepare__modal" onClick={(e) => e.stopPropagation()}>
        <div className="prepare__modal-title">새 면접</div>
        <div className="prepare__modal-sub">면접 기본 정보를 입력하세요.</div>

        <div className="field">
          <span className="t-chip">회사명</span>
          <input
            className="field__input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="회사명"
          />
        </div>

        <div className="field">
          <span className="t-chip">직무</span>
          <input
            className="field__input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="직무"
          />
        </div>

        <div className="field">
          <span className="t-chip">면접일</span>
          <input
            className="field__input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="prepare__modal-row">
          <div className="field">
            <span className="t-chip">방식</span>
            <select className="field__select" value={type} onChange={(e) => setType(e.target.value)}>
              <option>대면</option>
              <option>화상</option>
              <option>전화</option>
            </select>
          </div>
          <div className="field">
            <span className="t-chip">회차</span>
            <select className="field__select" value={round} onChange={(e) => setRound(e.target.value)}>
              <option>1차 면접</option>
              <option>2차 면접</option>
              <option>3차 면접</option>
            </select>
          </div>
        </div>

        <div className="prepare__modal-actions">
          <button className="btn btn--ghost" onClick={onClose}>취소</button>
          <button className="btn btn--teal" onClick={handleCreate}>저장</button>
        </div>
      </div>
    </div>
  );
};

export default PrepareInterview;
