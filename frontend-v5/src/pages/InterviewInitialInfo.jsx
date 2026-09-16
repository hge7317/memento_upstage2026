import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";

const InterviewInitialInfo = ({ session, setSession }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.edit;
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

  const [company, setCompany] = useState(editData?.company || session?.company || "");
  const [role, setRole] = useState(editData?.role || session?.role || "");
  const [date, setDate] = useState(editData?.date || session?.date || "");
  const [type, setType] = useState(editData?.type || session?.type || "대면");
  const [round, setRound] = useState(editData?.round || session?.round || "1차 면접");
  const [url, setUrl] = useState(editData?.url || session?.url || "");
  const [memo, setMemo] = useState(editData?.memo || session?.memo || "");
  const [urlChecked, setUrlChecked] = useState(false);
  const [loadingPosting, setLoadingPosting] = useState(false);
  const [postingError, setPostingError] = useState(false);

  const handleLoadPosting = async () => {
    if (!url) return;
    setLoadingPosting(true);
    setPostingError(false);
    try {
      const res = await fetch(`${API_BASE}/api/job-posting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      let data = null;
      if (res.ok) {
        try { data = await res.json(); } catch { data = null; }
      }
      if (res.ok && data && data.ok === true) {
        if (!company) setCompany(data.company || "");
        if (!role) setRole(data.role || "");
        setSession((s) => ({ ...s, jobPosting: data }));
        setUrlChecked(true);
      } else {
        setPostingError(true);
      }
    } catch {
      setPostingError(true);
    } finally {
      setLoadingPosting(false);
    }
  };

  const handleSave = () => {
    setSession((s) => ({
      ...s,
      company,
      role,
      date,
      type,
      round,
      url,
      memo,
    }));
    navigate("/prepared", { replace: true });
  };

  const handleCancel = () => {
    navigate("/prepared");
  };

  return (
    <div className="screen screen--white">
      <Header onBack={() => navigate("/prepared")} onLogoClick={() => navigate("/")} />

      <div className="pi02__body">
        <div className="pi02__head">
          <div className="pi02__logo">
            <div className="pi02__neuron-row">
              <span className="pi02__dot pi02__dot--coral" />
              <span className="pi02__line" />
              <span className="pi02__dot pi02__dot--cyan" />
            </div>
            <span className="pi02__brand" onClick={() => navigate("/")}>MEMENTO</span>
          </div>
        </div>

        <h2 className="pi02__title">면접 전, 기억의 기준점을 준비해두세요</h2>
        <p className="pi02__sub">
          면접이 끝나면 이 정보와 빠른 메모를 함께 보며 더 정확하게 정리합니다.
        </p>

        <div className="pi02__url">
          <div className="pi02__label">채용 공고 URL</div>
          <div className="pi02__url-row">
            <div className="pi02__card pi02__input">
              <input
                className="pi02__input-el"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="채용 공고 URL을 붙여넣으세요"
              />
            </div>
            <button
              className={`pi02__load-btn ${urlChecked ? "pi02__load-btn--checked" : ""}`}
              onClick={handleLoadPosting}
              disabled={loadingPosting}
            >
              {loadingPosting ? "불러오는 중…" : postingError ? "읽을 수 없어요 · 직접 입력" : urlChecked ? "확인됨" : "공고 불러오기"}
            </button>
          </div>
        </div>

        <div className="pi02__grid">
          <div className="pi02__col">
            <div className="pi02__field">
              <div className="pi02__label">회사</div>
              <div className="pi02__card pi02__input">
                <input
                  className="pi02__input-el"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Memento Labs"
                />
              </div>
            </div>

            <div className="pi02__field">
              <div className="pi02__label">면접 일시</div>
              <div className="pi02__card pi02__input">
                <input
                  className="pi02__input-el"
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="2026. 09. 15. 14:00"
                />
              </div>
            </div>

            <div className="pi02__field">
              <div className="pi02__label">면접 단계</div>
              <div className="pi02__card pi02__select">
                <select
                  className="pi02__input-el"
                  value={round}
                  onChange={(e) => setRound(e.target.value)}
                >
                  <option>1차 / 2차 / 최종 / 기타</option>
                  <option>1차 면접</option>
                  <option>2차 면접</option>
                  <option>최종 면접</option>
                  <option>기타</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pi02__col">
            <div className="pi02__field">
              <div className="pi02__label">직무</div>
              <div className="pi02__card pi02__input">
                <input
                  className="pi02__input-el"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Product Designer"
                />
              </div>
            </div>

            <div className="pi02__field">
              <div className="pi02__label">면접 방식</div>
              <div className="pi02__card pi02__select">
                <select
                  className="pi02__input-el"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option>대면 / 화상 / 전화 선택</option>
                  <option>대면</option>
                  <option>화상</option>
                  <option>전화</option>
                </select>
              </div>
            </div>

            <div className="pi02__field">
              <div className="pi02__label">공고 메모</div>
              <div className="pi02__card pi02__input">
                <input
                  className="pi02__input-el"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="지원 포지션 관련 메모를 입력하세요"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pi02__notice">
          사전 정보는 면접별 기록을 구분하고 빠른 메모의 맥락을 연결하는 데 사용합니다.
        </div>

        <div className="pi02__actions">
          <button className="pi02__cancel" onClick={handleCancel}>
            취소
          </button>
          <button className="pi02__save" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewInitialInfo;
