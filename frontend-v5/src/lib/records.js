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


export function upsertRecord(records, record, now = new Date().toISOString()) {
  return records.some((item) => item.id === record.id)
    ? records.map((item) => item.id === record.id ? { ...record, updatedAt: now } : item)
    : [record, ...records];
}

export function setRecordDeleted(records, id, isDeleted, now = new Date().toISOString()) {
  return records.map((record) => record.id === id
    ? { ...record, isDeleted, deletedAt: isDeleted ? now : null, updatedAt: now }
    : record);
}
