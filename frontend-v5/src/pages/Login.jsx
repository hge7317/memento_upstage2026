import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      if (onLogin) onLogin();
      else navigate("/interview-initial-info", { replace: true });
    } catch {
      setError("로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
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

      <div className="login__card">
        <div className="login__badge">
          <span className="header__dot header__dot--orange" />
          <span className="header__dot header__dot--teal" />
        </div>
        <div className="login__brand">MEMENTO</div>

        <h2 className="t-title">면접 기록을 이어서 정리하세요</h2>
        <p className="t-sub">
          로그인하면 여러 면접의 사전 정보와 복기 기록을 안전하게 구분해 저장합니다.
        </p>

        <div className="field">
          <span className="t-chip">이메일</span>
          <input
            className="field__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소를 입력하세요"
            autoComplete="email"
          />
        </div>

        <div className="field">
          <span className="t-chip">비밀번호</span>
          <input
            className="field__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
          />
        </div>

        {error && <p className="login__error">{error}</p>}

        <button
          className="btn btn--primary login__submit"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "로그인 중…" : "로그인"}
        </button>

        <div className="login__links">
          <button className="btn btn--ghost login__link">회원가입</button>
          <span className="login__dot">·</span>
          <button className="btn btn--ghost login__link">비밀번호 찾기</button>
        </div>
      </div>
    </div>
  );
};

export default Login;
