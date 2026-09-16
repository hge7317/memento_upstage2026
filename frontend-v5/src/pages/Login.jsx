import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

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
      const dest = sessionStorage.getItem("memento.dest");
      if (dest === "archive") {
        navigate("/archive", { replace: true });
      } else {
        navigate("/prepared", { replace: true });
      }
      sessionStorage.removeItem("memento.dest");
    } catch {
      setError("로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handBack = () => navigate("/", { replace: true });

  return (
    <div className="screen screen--dark">
      <Header onBack={handBack} onLogoClick={() => navigate("/")} />

      <div className="login__card">
        <div className="login__neuron" aria-hidden="true">
          <span className="login__neuron-dot login__neuron-dot--coral" />
          <span className="login__neuron-line" />
          <span className="login__neuron-dot login__neuron-dot--cyan" />
        </div>

        <div className="login__brand">MEMENTO</div>

        <h2 className="login__title">면접 기록을 이어서 정리하세요</h2>
        <p className="login__sub">
          로그인하면 여러 면접의 사전 정보와 복기 기록을 안전하게 구분해 저장합니다.
        </p>
        <p className="login__sub login__sub--hint">
          임의 비밀번호로 로그인 가능
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
          <a className="login__link" href="#" onClick={(e) => e.preventDefault()}>
            회원가입
          </a>
          <span className="login__dot">·</span>
          <a className="login__link" href="#" onClick={(e) => e.preventDefault()}>
            비밀번호 찾기
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
