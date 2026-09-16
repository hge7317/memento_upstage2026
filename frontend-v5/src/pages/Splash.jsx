import React, { useState, useEffect, useRef } from "react";
import Header from "../components/Header";
import "../App.css";

/* ---------- 뉴런 애니메이션: 일시정지/재생 토글 ---------- */
const NEURON_KEYFRAMES = `
  @keyframes neuron-pulse {
    0%, 100% { transform: scale(1); opacity: 0.95; }
    50%      { transform: scale(1.08); opacity: 1; }
  }
  @keyframes neuron-orbit {
    0%   { transform: rotate(0deg)   translateX(22px)  rotate(0deg); }
    100% { transform: rotate(360deg) translateX(22px) rotate(-360deg); }
  }
  @keyframes ring-expand {
    0%   { transform: scale(0.6); opacity: 0.55; }
    50%  { transform: scale(1.0); opacity: 0.12; }
    100% { transform: scale(1.6); opacity: 0; }
  }
`;

const useNeuronAnimation = (paused) => {
  const containerRef = useRef(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (paused) {
      el.style.animationPlayState = "paused";
      el.querySelectorAll(".splash__dot, .splash__ring-outer, .splash__ring-mid, .splash__line")
        .forEach((n) => (n.style.animationPlayState = "paused"));
    } else {
      el.style.animationPlayState = "running";
      el.querySelectorAll(".splash__dot, .splash__ring-outer, .splash__ring-mid, .splash__line")
        .forEach((n) => (n.style.animationPlayState = "running"));
    }
  }, [paused]);
  return containerRef;
};

const Splash = ({ onStart }) => {
  const [paused, setPaused] = useState(false);
  const neuronRef = useNeuronAnimation(paused);

  const handlePress = (dest) => onStart(dest);
  const togglePause = () => setPaused((p) => !p);
  const replay = () => {
    setPaused(false);
  };

  return (
    <div className="screen screen--dark" style={{ background: "var(--landing-navy-1)" }}>
      <style>{NEURON_KEYFRAMES}</style>

      {/* ---- 상단 헤더 (트리: id51 패널 + id56 MEMENTO + id63 텍스트 + id57 칩) ---- */}
      <Header dark />

      {/* ---- 중앙 뉴런 디커 + 대형 memento 타이포 ---- */}
      <div className="splash__center" ref={neuronRef}>
        {/* 뉴런 왼쪽 클러스터 */}
        <div className="splash__neuron splash__neuron--left">
          <span className="splash__neuron-dot splash__neuron-dot--coral" />
          <span className="splash__neuron-line splash__neuron-line--midpoint" />
          <span className="splash__neuron-dot splash__neuron-dot--cyan" />
        </div>

        {/* 뉴런 오른쪽 클러스터 */}
        <div className="splash__neuron splash__neuron--right">
          <span className="splash__neuron-dot splash__neuron-dot--coral" />
          <span className="splash__neuron-line splash__neuron-line--right" />
          <span className="splash__neuron-dot splash__neuron-dot--cyan" />
        </div>

        {/* 대형 타이포 — 조지아 이펙트 */}
        <h1 className="splash__display">memento</h1>

        {/* 우측 하단 뉴런 클러스터 */}
        <div className="splash__neuron splash__neuron--right-bottom">
          <span className="splash__neuron-bubble splash__neuron-bubble--outer-cyan" />
          <span className="splash__neuron-bubble splash__neuron-bubble--mid-cyan" />
          <span className="splash__neuron-bubble splash__neuron-bubble--inner-cyan-light" />
          <span className="splash__neuron-line splash__neuron-line--right-bottom" />
        </div>

        {/* 좌측 하단 뉴런 클러스터 */}
        <div className="splash__neuron splash__neuron--left-bottom">
          <span className="splash__neuron-bubble splash__neuron-bubble--outer-coral" />
          <span className="splash__neuron-bubble splash__neuron-bubble--mid-coral" />
          <span className="splash__neuron-bubble splash__neuron-bubble--inner-amber" />
          <span className="splash__neuron-line splash__neuron-line--left-bottom" />
        </div>

        {/* 중앙 하단 라임 점 */}
        <span className="splash__neuron-dot splash__neuron-dot--lime" />

        {/* ---- 액션 버튼 ---- */}
        <div className="splash__actions">
          <button
            className="splash__btn splash__btn--coral"
            onClick={() => handlePress("prepared")}
          >
            면접 복기
          </button>
          <button
            className="splash__btn splash__btn--navy"
            onClick={() => handlePress("archive")}
          >
            내 기록 보기
          </button>
        </div>
      </div>

      {/* ---- 하단 footer (태그 + 설명 + Ⅱ / ↻) ---- */}
      <footer className="splash__footer">
        <div className="splash__footer-text">
          <span className="splash__footer-tag">AI 면접 복기 서비스</span>
          <div className="splash__footer-sub">
            면접이 끝난 직후, 질문과 답변을
            <br />
            오염 없이 되짚어 보세요.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Splash;
