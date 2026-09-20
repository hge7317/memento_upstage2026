import { useState, useCallback } from "react";
import { createRecord, Stage, upsertRecord, setRecordDeleted } from "../lib/records.js";

export function useMemorySession() {
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
    setRecords((prev) => upsertRecord(prev, record));
  }, []);

  const deleteRecord = useCallback((id) => {
    setRecords((prev) => setRecordDeleted(prev, id, true));
  }, []);

  const restoreRecord = useCallback((id) => {
    setRecords((prev) => setRecordDeleted(prev, id, false));
  }, []);

  const getRecord = useCallback(
    (id) => records.find((r) => r.id === id),
    [records]
  );

  return { session, setSession, records, startSession, updateSession,
    persistSessionAsRecord, deleteRecord, restoreRecord, getRecord };
}
