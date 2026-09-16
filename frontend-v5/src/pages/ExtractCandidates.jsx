import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { extractCandidates } from "../lib/extractCandidates";

const ExtractCandidates = ({ session, setSession }) => {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    const memoText = session?.quickMemo ?? "";
    const result = extractCandidates({ original: memoText });
    const items = Array.isArray(result) ? result : (result?.candidateItems ?? []);

    setSession((s) => ({
      ...s,
      candidates: items.map((c) => ({ ...c, status: "PENDING" })),
      stage: "user-verify",
    }));

    timerRef.current = setTimeout(() => {
      navigate("/user-verify", { replace: true });
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const company = session?.company ?? "Memento Labs";
  const role = session?.role ?? "Product Designer";
  const round = session?.round ?? "1차 면접";

  return (
    <div className="screen screen--white">
      <Header onLogoClick={() => navigate("/")} />

      <div className="extract__body">
        <div className="extract__sheet-header">
          <div className="extract__neuron-row">
            <span className="extract__dot extract__dot--coral" />
            <span className="extract__line" />
            <span className="extract__dot extract__dot--cyan" />
          </div>
          <span className="extract__brand">MEMENTO</span>
        </div>

        <h2 className="extract__title">메모를 차분히 정리하고 있어요</h2>
        <p className="extract__sub">
          미리 저장한 면접 정보와 방금 남긴 메모를 연결해 확인할 기억 후보로 나누는 중입니다.
        </p>

        <div className="extract__progress-dots">
          <span className="extract__dot extract__dot--coral" />
          <span className="extract__connector" />
          <span className="extract__dot extract__dot--cyan" />
        </div>

        <div className="extract__steps">
          <div className="extract__step">
            <span className="extract__step-num extract__step-num--done">01</span>
            <span className="extract__step-title">사전 정보 불러오기</span>
            <span className="extract__step-desc">
              {company} · {role} · {round} 정보를 확인했어요
            </span>
            <span className="extract__chip extract__chip--done">완료</span>
          </div>

          <div className="extract__step">
            <span className="extract__step-num extract__step-num--done">02</span>
            <span className="extract__step-title">빠른 메모와 면접 정보 연결</span>
            <span className="extract__step-desc">
              입력한 텍스트·사진 메모를 같은 면접 기록으로 묶었어요
            </span>
            <span className="extract__chip extract__chip--done">완료</span>
          </div>

          <div className="extract__step">
            <span className="extract__step-num extract__step-num--idle">03</span>
            <span className="extract__step-title">기억 후보로 나누기</span>
            <span className="extract__step-desc">
              사실·불확실·평가를 구분하되 새 사건은 만들지 않아요
            </span>
            <span className="extract__chip extract__chip--progress">진행 중</span>
          </div>
        </div>

        <div className="extract__progress">
          <div className="extract__progress-bg">
            <div className="extract__progress-fill" />
          </div>
          <p className="extract__notice">정리가 끝나면 검증 화면으로 이동합니다</p>
        </div>
      </div>
    </div>
  );
};

export default ExtractCandidates;
