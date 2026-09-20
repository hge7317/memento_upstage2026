import React from "react";
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

import { Stage } from "./lib/records.js";
import { useMemorySession } from "./hooks/useMemorySession.js";

function App() {
  const navigate = useNavigate();
  const { session, setSession, records, startSession, updateSession,
    persistSessionAsRecord, deleteRecord, restoreRecord, getRecord } = useMemorySession();

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
            deleteRecord={deleteRecord}
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
            restoreRecord={restoreRecord}
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
