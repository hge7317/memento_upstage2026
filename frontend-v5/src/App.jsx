import React, { useState, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import PrepareInterview from "./pages/PrepareInterview";
import InterviewInitialInfo from "./pages/InterviewInitialInfo";
import QuickMemo from "./pages/QuickMemo";
import ExtractCandidates from "./pages/ExtractCandidates";
import UserVerify from "./pages/UserVerify";
import VerifyComplete from "./pages/VerifyComplete";
import RecallSteps from "./pages/RecallSteps";
import TimelineReview from "./pages/TimelineReview";
import GenerateOutput from "./pages/GenerateOutput";
import ResultDoc from "./pages/ResultDoc";
import Archive from "./pages/Archive";
import Trash from "./pages/Trash";

export const Stage = {
  INTERVIEW_INITIAL_INFO: "interview-initial-info",
  QUICK_MEMO: "quick-memo",
  EXTRACT_CANDIDATES: "extract-candidates",
  USER_VERIFY: "user-verify",
  FREE_RECALL: "free-recall",
  STRUCTURAL_CUE: "structural-cue",
  REVERSE_RECALL: "reverse-recall",
  TIMELINE_REVIEW: "timeline-review",
  GENERATE_OUTPUT: "generate-output",
  RESULT: "result",
};

export const Category = {
  FACT: "fact",
  UNCERTAIN: "uncertain",
  EVALUATION: "evaluation",
};

export const CATEGORY_LABEL = {
  fact: "FACT",
  uncertain: "UNCERTAIN",
  evaluation: "EVALUATION",
};

export const CATEGORY_COLOR = {
  fact: { bg: "#ddf1ec", text: "#0f766e" },
  uncertain: { bg: "#fff4d9", text: "#b7791f" },
  evaluation: { bg: "#e8edff", text: "#5164b0" },
};

export const createRecord = ({
  company,
  role,
  date,
  type,
  round,
  url,
  quickMemo,
  answers,
  timeline,
}) => ({
  id: `rec-${Date.now()}`,
  company,
  role,
  date,
  type,
  round,
  url: url || "",
  quickMemo: quickMemo || "",
  answers: answers || {},
  timeline: timeline || [],
  stage: Stage.RESULT,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDeleted: false,
  deletedAt: null,
});

function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState(() => [
    createRecord({
      company: "Memento Labs",
      role: "Product Designer",
      date: "2026.09.15",
      type: "대면",
      round: "1차 면접",
      quickMemo: "면접 직후의 인상만 짧게 남김",
      answers: {
        "free-recall": "자기소개 다음에 최근 프로젝트를 설명했고, 보드에 코드가 있었어요.",
        "structural-cue": "면접관 두 명의 맞은편에 앉았고, 가운데 보드를 보며 답했던 것 같아요.",
        "reverse-recall": "면접관이 추가로 궁금한 점이 있는지 물었고, 제가 질문 하나를 했어요.",
        "timeline-after": "건물에 도착해서 엘리베이터를 타고 올라갔고, 대기실에서 잠시 기다렸어요.",
      },
      timeline: [
        { id: "t1", time: "14:00", tag: "fact", content: "자기소개 후 최근 프로젝트에 대해 질문받음" },
        { id: "t2", time: "14:18", tag: "uncertain", content: "코딩 경험 질문이 먼저였는지는 확실하지 않음" },
        { id: "t3", time: "14:35", tag: "evaluation", content: "면접관의 반응이 긍정적이었던 것 같음" },
      ],
    }),
  ]);

  const startSession = useCallback(() => {
    setSession({
      sessionId: `session-${Date.now()}`,
      scenario: "interview",
      stage: Stage.INTERVIEW_INITIAL_INFO,
      createdAt: new Date().toISOString(),
    });
  }, []);

  const updateSession = useCallback((partial) => {
    setSession((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const persistSessionAsRecord = useCallback((record) => {
    setRecords((prev) => {
      const exists = prev.find((r) => r.id === record.id);
      if (exists) {
        return prev.map((r) => (r.id === record.id ? { ...record, updatedAt: new Date().toISOString() } : r));
      }
      return [record, ...prev];
    });
  }, []);

  const deleteRecord = useCallback((id) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : r
      )
    );
  }, []);

  const restoreRecord = useCallback((id) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, isDeleted: false, deletedAt: null, updatedAt: new Date().toISOString() } : r
      )
    );
  }, []);

  const archiveRecords = useCallback(
    (query = "", tab = "all") => {
      let list = records.filter((r) => !r.isDeleted);
      if (tab === "deleted") list = records.filter((r) => r.isDeleted);
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        list = list.filter((r) => r.company.toLowerCase().includes(q) || r.role.toLowerCase().includes(q));
      }
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    [records]
  );

  const getRecord = useCallback(
    (id) => records.find((r) => r.id === id),
    [records]
  );

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Splash
            onStart={(dest) => {
              sessionStorage.setItem("memento.dest", dest);
              navigate("/login");
            }}
          />
        }
      />
      <Route
        path="/login"
        element={
          session ? (
            <Navigate to={sessionStorage.getItem("memento.dest") === "archive" ? "/archive" : "/prepared"} replace />
          ) : (
            <Login onLogin={startSession} />
          )
        }
      />
      <Route
        path="/prepared"
        element={
          session ? (
            <PrepareInterview session={session} setSession={setSession} onStartInterview={updateSession} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/interview-initial-info"
        element={
          session ? (
            <InterviewInitialInfo session={session} setSession={setSession} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/quick-memo"
        element={
          session ? <QuickMemo session={session} setSession={setSession} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/extract-candidates"
        element={
          session ? (
            <ExtractCandidates session={session} setSession={setSession} onCandidatesReady={updateSession} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/user-verify"
        element={
          session ? (
            <UserVerify session={session} setSession={setSession} onVerifyComplete={updateSession} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/verify-complete"
        element={
          session ? <VerifyComplete session={session} setSession={setSession} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/recall"
        element={
          session ? <RecallSteps session={session} setSession={setSession} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/timeline-review/:recordId"
        element={
          session ? (
            <TimelineReview
              record={session?.recordId ? getRecord(session.recordId) : null}
              session={session}
              onSave={(timeline, meta) => {
                const rec = session?.recordId ? getRecord(session.recordId) : null;
                const recId = rec?.id || `rec-${Date.now()}`;
                persistSessionAsRecord({
                  ...(rec || { id: recId }),
                  timeline,
                  company: meta.company,
                  role: meta.role,
                  date: meta.date,
                  type: meta.type,
                  round: meta.round,
                  quickMemo: meta.quickMemo,
                  answers: meta.answers,
                  candidates: session?.candidates || [],
                });
                setSession((s) =>
                  s
                    ? {
                        ...s,
                        recordId: recId,
                        company: meta.company,
                        role: meta.role,
                        date: meta.date,
                        type: meta.type,
                        round: meta.round,
                        quickMemo: meta.quickMemo,
                        answers: meta.answers,
                        timeline,
                      }
                    : s
                );
                navigate("/generate-output", { replace: true });
              }}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/generate-output"
        element={
          session ? (
            <GenerateOutput session={session} setSession={setSession} onOutputReady={updateSession} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/result/:recordId?"
        element={
          session ? (
            <ResultDoc
              result={session?.recordId ? getRecord(session.recordId) : null}
              onResultUpdate={(updated) => {
                if (updated?.id) {
                  persistSessionAsRecord(updated);
                  setSession((s) =>
                    s
                      ? {
                          ...s,
                          recordId: updated.id,
                          company: updated.company,
                          role: updated.role,
                          date: updated.date,
                          type: updated.type,
                          round: updated.round,
                          quickMemo: updated.quickMemo,
                          answers: updated.answers,
                          timeline: updated.timeline,
                        }
                      : s
                  );
                }
              }}
              onDeleteRecord={(id) => {
                if (id) deleteRecord(id);
              }}
              onBackToArchive={() => {
                setSession(null);
              }}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/archive"
        element={
          <Archive
            records={records}
            archiveRecords={archiveRecords}
            deleteRecord={deleteRecord}
            restoreRecord={restoreRecord}
            onOpenRecord={(id) => {
              const r = getRecord(id);
              if (r) {
                setSession({
                  sessionId: `session-${Date.now()}`,
                  scenario: "interview",
                  stage: Stage.RESULT,
                  recordId: r.id,
                  company: r.company,
                  role: r.role,
                  date: r.date,
                  type: r.type,
                  round: r.round,
                  url: r.url,
                  quickMemo: r.quickMemo,
                  answers: r.answers,
                  timeline: r.timeline,
                  createdAt: r.createdAt,
                });
              }
            }}
            onViewTrash={() => {
              setSession(null);
            }}
          />
        }
      />
      <Route
        path="/trash"
        element={
          <Trash
            records={records}
            archiveRecords={archiveRecords}
            restoreRecord={restoreRecord}
            deleteRecord={deleteRecord}
            onViewArchive={() => {
              setSession(null);
            }}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
