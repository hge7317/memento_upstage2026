import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const InterviewInitialInfo = ({ session, setSession }) => {
  const navigate = useNavigate();
  const [company, setCompany] = useState(session?.company || "");
  const [role, setRole] = useState(session?.role || "");
  const [date, setDate] = useState(session?.date || "");
  const [type, setType] = useState(session?.type || "대면");
  const [round, setRound] = useState(session?.round || "1차 면접");
  const [url, setUrl] = useState(session?.url || "");
  const [next, setNext] = useState(false);

  const handleNext = () => {
    setSession((s) => ({
      ...s,
      company,
      role,
      date,
      type,
      round,
      url,
      stage: "quick-memo",
    }));
    setNext(true);
  };

  if (next) {
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

        <div className="initial__card">
          <div className="initial__badge">
            <span className="header__dot header__dot--orange" />
            <span className="header__dot header__dot--teal" />
          </div>
          <div className="initial__brand">MEMENTO</div>

          <h2 className="t-title">면접 전, 기억의 기준점을 준비해두세요</h2>
          <p className="t-sub">
            면접이 끝나면 이 정보와 빠른 메모를 함께 보며 더 정확하게 정리합니다.
          </p>

          <div className="initial__step">
            <span className="initial__step-num">01</span>
            <span className="initial__step-label">채용 공고 정보 입력</span>
          </div>

          <div className="field">
            <span className="t-chip">채용 공고 URL</span>
            <input
              className="field__input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="채용 공고 URL을 붙여넣으세요"
            />
          </div>

          <div className="initial__done">
            <span className="initial__done-dot" />
            <span className="initial__done-text">기본 정보가 저장됐습니다.</span>
          </div>

          <button className="btn btn--teal initial__next" onClick={() => navigate("/quick-memo")}>
            다음
          </button>
        </div>
      </div>
    );
  }

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

      <div className="initial__card">
        <div className="initial__badge">
          <span className="header__dot header__dot--orange" />
          <span className="header__dot header__dot--teal" />
        </div>
        <div className="initial__brand">MEMENTO</div>

        <h2 className="t-title">면접 전, 기억의 기준점을 준비해두세요</h2>
        <p className="t-sub">
          면접이 끝나면 이 정보와 빠른 메모를 함께 보며 더 정확하게 정리합니다.
        </p>

        <div className="field">
          <span className="t-chip">회사명</span>
          <input
            className="field__input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="회사명을 입력하세요"
          />
        </div>

        <div className="field">
          <span className="t-chip">직무</span>
          <input
            className="field__input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="직무를 입력하세요"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <span className="t-chip">면접일</span>
            <input
              className="field__input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="field">
            <span className="t-chip">방식</span>
            <select className="field__select" value={type} onChange={(e) => setType(e.target.value)}>
              <option>대면</option>
              <option>화상</option>
              <option>전화</option>
            </select>
          </div>
        </div>

        <div className="field">
          <span className="t-chip">회차</span>
          <select className="field__select" value={round} onChange={(e) => setRound(e.target.value)}>
            <option>1차 면접</option>
            <option>2차 면접</option>
            <option>3차 면접</option>
          </select>
        </div>

        <div className="field">
          <span className="t-chip">채용 공고 URL</span>
          <input
            className="field__input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="채용 공고 URL을 붙여넣으세요"
          />
        </div>

        <div className="initial__actions">
          <button className="btn btn--ghost" onClick={() => navigate("/")}>
            취소
          </button>
          <button className="btn btn--teal" onClick={handleNext}>
            저장 후 다음
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewInitialInfo;
