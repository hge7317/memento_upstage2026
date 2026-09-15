import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const GenerateOutput = ({ session, setSession, onOutputReady }) => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"generating" | "done">("generating");

  useEffect(() => {
    if (phase === "generating") {
      const t1 = setTimeout(() => setProgress(30), 500);
      const t2 = setTimeout(() => setProgress(65), 1400);
      const t3 = setTimeout(() => {
        setProgress(100);
        setPhase("done");
      }, 2500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [phase]);

  if (phase === "done") {
    return (
      <div className="slide">
        <Header />
        <div className="generate__body">
          <div className="generate__card">
            <div className="generate__icon">M</div>
            <h2 className="t-title">면접 복기 결과를 만들고 있어요</h2>
            <p className="t-sub">
              확인한 내용만 사용해 타임라인과 요약을 정리하는 중입니다.
            </p>
            <div className="generate__bar">
              <div className="generate__bar-track" />
              <div className="generate__bar-fill" style={{ width: "100%" }} />
            </div>
            <div className="generate__status">문서 생성 완료</div>
            <button
              className="btn btn--teal generate__next"
              onClick={() => {
                onOutputReady?.({
                  stage: "result",
                  timeline: session?.timeline ?? [],
                  company: session?.company ?? "Memento Labs",
                  role: session?.role ?? "Product Designer",
                  date: session?.date ?? "2026.09.15",
                });
                navigate("/result", { state: { session } });
              }}
            >
              결과 보기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="slide">
      <Header />
      <div className="generate__body">
        <div className="generate__card">
          <div className="generate__icon">DOC</div>
          <h2 className="t-title">면접 복기 결과를 만들고 있어요</h2>
          <p className="t-sub">
            확인한 내용만 사용해 타임라인과 요약을 정리하는 중입니다.
          </p>
          <div className="generate__bar">
            <div className="generate__bar-track" />
            <div className="generate__bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="generate__status">문서 생성 중</div>
        </div>
      </div>
    </div>
  );
};

export default GenerateOutput;
