import { useState, useEffect } from "react";
import "./App.css";
import { Splash } from "./components/Splash";
import { QuickMemo } from "./components/QuickMemo";
import { JobPostingOptional } from "./components/JobPostingOptional";
import { InterviewInitialInfo } from "./components/InterviewInitialInfo";
import { ContextReinstatement } from "./components/ContextReinstatement";
import { FreeRecall } from "./components/FreeRecall";
import { StructuralCue } from "./components/StructuralCue";
import { ReverseRecall } from "./components/ReverseRecall";
import { TimelineReview } from "./components/TimelineReview";
import { GenerateOutput } from "./components/GenerateOutput";
import { useStage } from "./lib/useStage";
import { extractCandidates } from "./lib/extractCandidates";

export default function App() {
  const { stage, setStage, scenario, setScenario, next, goTo, back, canGoBack } = useStage("splash");
  // useStage 초기 scenario는 null — 면접 전용(v0.4)이므로 "interview"로 설정
  useEffect(() => { setScenario("interview"); }, []);
  const [quickMemoText, setQuickMemoText] = useState("");
  const [quickMemoEmpty, setQuickMemoEmpty] = useState(false);
  // 세션 ID — 브라우저 환경에서만 생성 (Next.js SSR 빌드 시 crypto.randomUUID() 미지원)
  const [sessionId] = useState(() => typeof window !== "undefined" ? crypto.randomUUID() : "");
  // 백엔드 API 베이스 URL (개발 환경: 로컬 백엔드 서버)
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  // --- QuickMemo 제출 처리 (extractCandidates 호출) ---

  // 검증 상태
  const [candidateItems, setCandidateItems] = useState([]);
  const [verifications, setVerifications] = useState({});
  const [verifiedCandidates, setVerifiedCandidates] = useState({});

  // 잡포스팅 URL
  const [jobPostingUrl, setJobPostingUrl] = useState("");

  // 면접 기본 정보
  const [interviewInfo, setInterviewInfo] = useState({});

  // CONTEXT_REINSTATEMENT 답변
  const [contextReinstatementAnswer, setContextReinstatementAnswer] = useState("");

  // FREE_RECALL 답변
  const [freeRecallAnswer, setFreeRecallAnswer] = useState("");

  // STRUCTURAL_CUE에서 추가된 새 기억
  const [newMemoryItems, setNewMemoryItems] = useState([]);

  // STRUCTURAL_CUE 재시작 횟수
  const [structuralCueRestartCount, setStructuralCueRestartCount] = useState(0);

  // STRUCTURAL_CUE 종료 후 넘어갈 단계 (TIMELINE_REVIEW 또는 조기종료 제안)
  const [afterStructuralCueStage, setAfterStructuralCueStage] = useState("timeline-review");

  // GENERATE_OUTPUT 핸들러
  const handleCopyMarkdown = (markdown) => {
    setCopyMarkdown(markdown);
  };
  const handleDownloadMarkdown = (markdown, fileName) => {
    setDownloadMarkdown({ markdown, fileName });
  };
  const handleGenerateOutputComplete = () => {
    setStage("complete");
  };

  const activeId = (stage, idx) => {
    if (stage === "user-verify") return `uv-${idx}`;
    if (stage === "structural-cue") return `sc-${idx}`;
    return `memo-${stage}-${idx}-${Date.now()}`;
  };

  const handleQuickMemoSubmit = (text) => {
    // 1. 원문 저장
    setQuickMemoText(text || "");
    setQuickMemoEmpty(false);
    // 2. 후보 추출 — 프론트 순수 함수 호출 (백엔드/Solar 연동과 무관)
    const result = extractCandidates({ original: text });
    setCandidateItems(result.candidateItems || []);
    // 3. 사용자 검증 단계로 진행
    setStage("user-verify");
  };

  const advanceStage = () => {
    if (stage === "splash") setStage("quick-memo");
    else if (stage === "quick-memo") setStage("user-verify");
    else if (stage === "user-verify") {
      const allResolved = Object.values(verifications).every(v => v !== "PENDING");
      if (allResolved) setStage("job-posting-optional");
    } else if (stage === "job-posting-optional") setStage("interview-initial-info");
    else if (stage === "interview-initial-info") {
      // 검증 완료, 잡포스팅 URL, 면접 기본 정보 수집 완료 → CONTEXT_REINSTATEMENT 제안
      if (candidateItems.length > 0 && Object.values(verifications).every(v => v !== "PENDING")) {
        setStage("proposed-context-reinstatement");
      }
    }
  };

  const handleSplashNext = () => {
    handleEarlyFinish?.();
  };

  const handleContextReinstatementSubmit = (answer) => {
    setContextReinstatementAnswer(answer);
    setStage("free-recall");
  };

  const handleContextReinstatementSkip = () => {
    setContextReinstatementAnswer("(기억나지 않음)");
    setStage("free-recall");
  };

  const handleContextReinstatementEarlyFinish = () => {
    setStage("proposed-timeline-review");
  };

  const handleFreeRecallSubmit = (answer) => {
    setFreeRecallAnswer(answer);
    setStage("structural-cue");
  };

  const handleFreeRecallSkip = () => {
    setFreeRecallAnswer("(자유 회상 넘김)");
    setStage("structural-cue");
  };

  const handleStructuralCueComplete = (result) => {
    if (result.shouldProposeTimelineReview) {
      setAfterStructuralCueStage("timeline-review");
      setStage("proposed-timeline-review");
    } else {
      setStage("proposed-context-reinstatement");
    }
  };

  const handleStructuralCueSaveNewItems = (newItems) => {
    setNewMemoryItems(prev => [...prev, ...newItems]);
  };

  const handleReverseRecallSubmit = (answer) => {
    setStage("proposed-timeline-review");
  };

  const handleReverseRecallSkip = () => {
    setStage("proposed-timeline-review");
  };

  // --- 타임라인 검토 확정 결과 저장 (GENERATE_OUTPUT에서 사용) ---

  const [timelineData, setTimelineData] = useState(null);
  const [suggestedFileName, setSuggestedFileName] = useState("");
  const [copyMarkdown, setCopyMarkdown] = useState("");
  const [downloadMarkdown, setDownloadMarkdown] = useState({ markdown: "", fileName: "" });

  // --- Solar Pro 연동: 백엔드 /api/recall 호출 ---

  const [recallQuestion, setRecallQuestion] = useState("");
  const [recallQuestionLoading, setRecallQuestionLoading] = useState(false);

  // 단계 진입 시 백엔드에서 회상 질문 fetch
  useEffect(() => {
    if (!sessionId) return;
    const target = stage;
    if (target !== "proposed-context-reinstatement" &&
        target !== "free-recall" &&
        target !== "reverse-recall") {
      return;
    }
    setRecallQuestionLoading(true);
    const contextType =
      target === "proposed-context-reinstatement" ? "context-reinstatement"
      : target === "free-recall" ? "free-recall"
      : "reverse-recall";
    fetchRecallQuestion(contextType).finally(() => {
      setRecallQuestionLoading(false);
    });
  }, [stage, sessionId]);

  const fetchRecallQuestion = async (contextType) => {
    try {
      const res = await fetch(`${API_BASE}/api/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          contextType,
          context: contextType === "context-reinstatement"
            ? "면접 직전 맥락 회상 질문 생성"
            : contextType === "free-recall"
            ? "자유 회상 질문 생성"
            : contextType === "reverse-recall"
            ? "역순 회상 질문 생성"
            : "회상 질문 생성",
        }),
      });
      const data = await res.json();
      const question = data.question || null;
      setRecallQuestion(question || "");
      return question;
    } catch (e) {
      console.error("recall question fetch failed:", e);
      setRecallQuestion("");
      return null;
    }
  };

  return (
    <main className="app">
      {/* 1. 스플래시 */}
      {stage === "splash" && <Splash onNext={handleSplashNext} />}

      {/* 2. 빠른 메모 */}
      {stage === "quick-memo" && (
        <QuickMemo
          onNext={handleQuickMemoSubmit}
          onBack={handleBack}
          initialText={quickMemoText}
          emptyChoice={quickMemoEmpty}
        />
      )}

      {/* 3. 사용자 검증 (후보 추출 결과) */}
      {stage === "user-verify" && (
        <UserVerify
          candidates={candidateItems}
          verifications={verifications}
          onVerify={(id, verification) => {
            setVerifications(prev => ({ ...prev, [id]: verification }));
            if (["REJECTED", "CONFIRMED"].includes(verification)) {
              setVerifiedCandidates(prev => ({
                ...prev,
                [id]: { verification, time: Date.now() },
              }));
            }
          }}
          onEdit={(id, userEdit) => {
            setVerifiedCandidates(prev => ({
              ...prev,
              [id]: { verification: "EDITED", userEdit, time: Date.now() },
            }));
          }}
          allResolved={Object.values(verifications).every(v => v !== "PENDING")}
        />
      )}

      {/* 4. 잡포스팅 선택적 URL */}
      {stage === "job-posting-optional" && (
        <JobPostingOptional
          onUrlSubmit={(url) => {
            setJobPostingUrl(url || "");
            setStage("interview-initial-info");
          }}
          onSkip={() => {
            setJobPostingUrl("");
            setStage("interview-initial-info");
          }}
        />
      )}

      {/* 5. 면접 기본 정보 */}
      {stage === "interview-initial-info" && (
        <InterviewInitialInfo
          onSubmit={(info) => {
            setInterviewInfo(info);
            setStage("proposed-context-reinstatement");
          }}
        />
      )}

      {/* 6. CONTEXT_REINSTATEMENT (제안) */}
      {stage === "proposed-context-reinstatement" && (
        <ContextReinstatement
          onAnswer={handleContextReinstatementSubmit}
          onSkip={handleContextReinstatementSkip}
          onEarlyFinish={handleContextReinstatementEarlyFinish}
          initialAnswer={contextReinstatementAnswer}
          question={recallQuestion}
          loading={recallQuestionLoading}
        />
      )}

      {/* 7. FREE_RECALL */}
      {stage === "free-recall" && (
        <FreeRecall
          onComplete={handleFreeRecallSubmit}
          onSkip={handleFreeRecallSkip}
          initialAnswer={freeRecallAnswer}
          question={recallQuestion}
          loading={recallQuestionLoading}
        />
      )}

      {/* 8. STRUCTURAL_CUE */}
      {stage === "structural-cue" && (
        <StructuralCue
          activeMemoryItems={candidateItems.filter(c =>
            ["CONFIRMED", "EDITED", "UNKNOWN"].includes(verifications[c.id])
          )}
          activeMemoryCount={candidateItems.filter(c =>
            ["CONFIRMED", "EDITED", "UNKNOWN"].includes(verifications[c.id])
          ).length}
          newMemoryItems={newMemoryItems}
          onComplete={handleStructuralCueComplete}
          onNewItems={handleStructuralCueSaveNewItems}
          onRestart={() => setStructuralCueRestartCount(x => x + 1)}
        />
      )}

      {/* 9. REVERSE_RECALL */}
      {stage === "reverse-recall" && (
        <ReverseRecall
          onAnswer={handleReverseRecallSubmit}
          onSkip={handleReverseRecallSkip}
          initialAnswer=""
          question={recallQuestion}
          loading={recallQuestionLoading}
        />
      )}

      {/* 10. TIMELINE_REVIEW */}
      {stage === "proposed-timeline-review" && (
        <TimelineReview
          candidateItems={candidateItems}
          verifications={verifications}
          newMemoryItems={newMemoryItems}
          onFinish={(result) => {
            setTimelineData(result);
            setStage("generate-output");
          }}
          onBack={() => setStage("proposed-context-reinstatement")}
        />
      )}

      {/* 11. GENERATE_OUTPUT */}
      {stage === "generate-output" && (
        <GenerateOutput
          timelineData={timelineData}
          interviewInfo={interviewInfo}
          quickMemoText={quickMemoText}
          candidateItems={candidateItems}
          verifications={verifications}
          newMemoryItems={newMemoryItems}
          comparisonData={timelineData?.comparison ?? null}
          suggestedFileName={suggestedFileName}
          onCopyMarkdown={handleCopyMarkdown}
          onDownloadMarkdown={handleDownloadMarkdown}
          onFinish={handleGenerateOutputComplete}
        />
      )}
    </main>
  );
}
