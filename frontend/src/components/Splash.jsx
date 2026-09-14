"use client";

import { useEffect, useRef } from "react";

export function Splash({ onNext }) {
  const sectionRef = useRef(null);

  // 뷰포트 진입 시 fade-in (prefers-reduced-motion 존중)
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    function onScroll() {
      if (el.classList.contains("in-view")) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85) {
        el.classList.add("in-view");
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section className="splash" ref={sectionRef}>
      <div className="splash-inner">
        {/* 브랜드 */}
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">M</div>
          <span className="brand-name">Memory Replay</span>
        </div>

        {/* 눈썹 */}
        <p className="eyebrow">사건 직후 기억을 복기하는 서비스</p>

        {/* 헤드라인 */}
        <h1 className="title">
          기억이 흐려지기 전에,<br />
          먼저 적어 두세요
        </h1>

        {/* 리드 */}
        <p className="lead">
          AI가 내용을 대신 만들지 않습니다.{" "}
          당신이 확인한 기억을 바탕으로,{" "}
          더 잘 떠오르도록 하나씩 질문합니다.
        </p>

        {/* 면접 전용 안내 */}
        <div className="scenario-banner" role="note">
          <span className="scenario-badge">면접 복기 · 정식</span>
          <p>종료된 면접을 바로 적어 두면, 면접 기본 정보와 함께 회상 질문을 시작합니다.</p>
        </div>

        {/* CTA — 집·중되게 */}
        <div className="cta">
          <button type="button" className="primary" onClick={onNext}>
            복기 시작하기
          </button>
        </div>

        {/* 안심 문구 */}
        <p className="note">
          정리하지 않아도 됩니다. 단어만 적어도 시작할 수 있습니다.
        </p>
      </div>
    </section>
  );
}
