import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const GenerateOutput = ({ session, setSession }) => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (progress < 30) {
      const t1 = setTimeout(() => setProgress(30), 500);
      return () => clearTimeout(t1);
    }
    if (progress >= 30 && progress < 65) {
      const t2 = setTimeout(() => setProgress(65), 1400);
      return () => clearTimeout(t2);
    }
    if (progress >= 65 && progress < 100) {
      const t3 = setTimeout(() => setProgress(100), 2500);
      return () => clearTimeout(t3);
    }
    if (progress === 100) {
      const t4 = setTimeout(() => {
        setSession((s) => ({ ...s, stage: "result" }));
        navigate(
          session?.recordId ? `/result/${session.recordId}` : "/result",
          { replace: true }
        );
      }, 800);
      return () => clearTimeout(t4);
    }
  }, [progress, session, setSession, navigate]);

  return (
    <div className="screen screen--white generate">
      <Header onLogoClick={() => navigate("/")} />
      <div className="generate__body">
        <div className="generate__card">
          <div className="generate__icon">DOC</div>
          <h2 className="generate__title">면접 복기 결과를 만들고 있어요</h2>
          <p className="generate__sub">
            확인한 내용만 사용해 타임라인과 요약을 정리하는 중입니다.
          </p>
          <div className="generate__bar">
            <div
              className="generate__bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="generate__status">문서 생성 중</div>
        </div>
      </div>
    </div>
  );
};

export default GenerateOutput;
