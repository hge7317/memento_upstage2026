import { useState } from "react";
import { extractCandidates } from "../lib/extractCandidates.js";
import { VERIFICATION_STATES } from "./UserVerifyStates.js";

/**
 * UserVerify - 빠른 메모 원문에서 추출한 후보(candidateItems)를
 * O / X / ? / 수정 / 이런 내용 없음 으로 검증한다.
 *
 * 참조:
 *  - PRD §8 (사용자 검증 반영)
 *  - docs/references/candidate-extraction.md (카드 스키마)
 *  - docs/references/guardrails.md §4 (검증 규칙)
 *  - docs/references/output-contract.md §단계별 응답 제한 (USER_VERIFY)
 */
export function UserVerify({ original, onVerifyComplete, candidates: externalCandidates }) {
  // extractCandidates가 이미 호출된 결과물을 받든, 원문을 직접 받든 처리
  const [candidates, setCandidates] = useState(() => {
    if (externalCandidates && externalCandidates.length) return externalCandidates;
    const result = extractCandidates({ original });
    return result.candidateItems;
  });

  // 후보별 검증 상태 저장: id -> VERIFICATION_STATES.xxx
  const [verifications, setVerifications] = useState(() => {
    const map = {};
    for (const c of candidates) {
      map[c.id] = VERIFICATION_STATES.PENDING;
    }
    return map;
  });

  // 수정 중 후보 id / 편집 텍스트
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  // "이런 내용 없음" 선택 후 삭제/수정 버튼을 노출할 때 썼던 후보를 추적
  const [rejectedIdsWithActions, setRejectedIdsWithActions] = useState(new Set());

  // ----------------------
  // 검증 선택지 처리
  // ----------------------
  const handleSelect = (candidateId, choice) => {
    if (choice === "REJECTED" || choice === "DELETE_REQUEST") {
      // "이런 내용 없음" = REJECTED와 동일하게 취급 (PRD §8)
      setVerifications(prev => ({
        ...prev,
        [candidateId]: VERIFICATION_STATES.REJECTED,
      }));
      setRejectedIdsWithActions(prev => new Set(prev).add(candidateId));
      return;
    }

    if (choice === "EDIT_REQUEST") {
      // 수정 요청: 편집 모드 진입
      setEditingId(candidateId);
      const current = candidates.find(c => c.id === candidateId);
      setEditText(current ? current.claim : "");
      return;
    }

    // CONFIRMED / UNKNOWN
    setVerifications(prev => ({
      ...prev,
      [candidateId]: choice === "CONFIRMED" ? VERIFICATION_STATES.CONFIRMED
                                          : VERIFICATION_STATES.UNKNOWN,
    }));
  };

  // ----------------------
  // 수정 확인 처리
  // ----------------------
  const handleEditConfirm = () => {
    if (!editingId || !editText.trim()) return;
    setVerifications(prev => ({
      ...prev,
      [editingId]: VERIFICATION_STATES.EDITED,
    }));
    setEditingId(null);
    setEditText("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleDeleteConfirmed = (id) => {
    // "삭제" 요청: 해당 후보를 REJECTED로 처리 + 후보 목록에서 제거 표시
    // PRD §8: X 이후 삭제는 해당 후보 자체만 대상.
    // UI에서는 REJECTED로 표시하고 이후 렌더링에서 제외할 수 있음.
    setVerifications(prev => ({
      ...prev,
      [id]: VERIFICATION_STATES.REJECTED,
    }));
    setRejectedIdsWithActions(prev => new Set(prev).add(id));
  };

  // ----------------------
  // 완료 조건 검사
  // ----------------------
  const allResolved = candidates.every(c => {
    const st = verifications[c.id];
    return st !== VERIFICATION_STATES.PENDING;
  });

  const handleNext = () => {
    if (!allResolved) return;
    // PRD §8: 모든 후보가 PENDING 아님이 되면 다음 단계(잡포스팅 선택)로 진행
    onVerifyComplete({
      candidateItems: candidates,
      verifications,
      rejectedIds: [...rejectedIdsWithActions],
    });
  };

  // ----------------------
  // 렌더링 헬퍼
  // ----------------------
  const pendingCount = candidates.filter(c => verifications[c.id] === VERIFICATION_STATES.PENDING).length;

  return (
    <section className="screen user-verify">
      <div className="chapter-head">
        <span className="chapter-num">Chapter 3</span>
        <span className="chapter-title">내용 확인하기</span>
      </div>

      <h1 style={{ textAlign: "center", margin: "24px 0 8px" }}>
        적어 주신 내용, 하나씩 확인해 주세요
      </h1>
      <p className="hint" style={{ textAlign: "center", marginBottom: "24px" }}>
        각 항목이 맞으면 O, 틀리면 X, 애매하면 ?를 선택해 주세요.
      </p>

      {/* 진행 표시 */}
      <div className="verify-progress">
        <span className="verify-progress__label">진행</span>
        <div className="verify-progress__bar">
          <div
            className="verify-progress__fill"
            style={{ width: `${(1 - pendingCount / candidates.length) * 100}%` }}
          />
        </div>
        <span className="verify-progress__count">{candidates.length - pendingCount} / {candidates.length}</span>
      </div>

      {/* 검증 카드 목록 */}
      <div className="verify-cards">
        {candidates.map(c => {
          const state = verifications[c.id];
          const isRejected = state === VERIFICATION_STATES.REJECTED;
          const isEdited = state === VERIFICATION_STATES.EDITED;
          const isConfirmed = state === VERIFICATION_STATES.CONFIRMED;
          const isUnknown = state === VERIFICATION_STATES.UNKNOWN;
          const isPending = state === VERIFICATION_STATES.PENDING;

          // "이런 내용 없음" 선택 + 삭제/수정 버튼 노출 상태
          const showDeleteEditActions = rejectedIdsWithActions.has(c.id);

          return (
            <div key={c.id} className={`verify-card verify-card--${state.toLowerCase()}`}>
              <div className="verify-card__header">
                <span className="verify-card__id">{c.id}</span>
                <span className="verify-card__meta">[{c.category}]</span>
              </div>

              <div className="verify-card__claim">
                <p>{c.claim}</p>
                {c.sourceQuote ? (
                  <p className="verify-card__source">근거: "{c.sourceQuote}"</p>
                ) : null}
              </div>

              <div className="verify-card__actions">
                {isPending && (
                  <div className="verify-card__choices">
                    <button
                      className="verify-choice verify-choice--confirm"
                      onClick={() => handleSelect(c.id, "CONFIRMED")}
                    >
                      <span className="verify-choice__mark">O</span> 맞음
                    </button>
                    <button
                      className="verify-choice verify-choice--reject"
                      onClick={() => handleSelect(c.id, "REJECTED")}
                    >
                      <span className="verify-choice__mark">X</span> 아님
                    </button>
                    <button
                      className="verify-choice verify-choice--unknown"
                      onClick={() => handleSelect(c.id, "UNKNOWN")}
                    >
                      <span className="verify-choice__mark">?</span> 모름
                    </button>
                    <button
                      className="verify-choice verify-choice--edit"
                      onClick={() => handleSelect(c.id, "EDIT_REQUEST")}
                    >
                      <span className="verify-choice__mark">수정</span> 수정
                    </button>
                  </div>
                )}

                {isRejected && !showDeleteEditActions && (
                  <div className="verify-card__rejected">
                    <span className="verify-card__rejected-label">이런 내용 없음</span>
                    <p className="verify-card__rejected-note">실제 없었던 내용으로 표시했습니다. 이후 질문·결과에서 사용하지 않습니다.</p>
                    {/* 삭제/수정 버튼 노출 트리거: "이런 내용 없음" 선택 직후에는 X 버튼과 나란히 삭제/수정 버튼을 보여준다 */}
                    {!showDeleteEditActions && (
                      <div className="verify-card__delete-edit-actions">
                        <button
                          className="verify-delete-edit-btn"
                          onClick={() => setRejectedIdsWithActions(prev => new Set(prev).add(c.id))}
                        >
                          삭제 · 수정 버튼 보기
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {showDeleteEditActions && isRejected && (
                  <div className="verify-card__delete-edit-actions">
                    <button
                      className="verify-delete-edit-btn verify-delete-edit-btn--danger"
                      onClick={() => handleDeleteConfirmed(c.id)}
                    >
                      삭제
                    </button>
                    <button
                      className="verify-delete-edit-btn"
                      onClick={() => {
                        setEditingId(c.id);
                        const current = candidates.find(x => x.id === c.id);
                        setEditText(current ? current.claim : "");
                      }}
                    >
                      수정
                    </button>
                  </div>
                )}

                {isEdited && (
                  <div className="verify-card__edited">
                    <span className="verify-card__edited-label">수정됨</span>
                    <p>{editText || c.claim}</p>
                    <p className="verify-card__edited-note">AI 원문(참조용): "{c.claim}"</p>
                  </div>
                )}

                {isUnknown && (
                  <div className="verify-card__unknown">
                    <span className="verify-card__unknown-label">모름 (?)</span>
                    <p>기억이 불확실합니다. 이후 질문에서 가능성을 유지한 채 확인할 수 있습니다.</p>
                  </div>
                )}

                {isConfirmed && (
                  <div className="verify-card__confirmed">
                    <span className="verify-card__confirmed-label">확인됨 (O)</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 수정 인라인 폼 */}
      {editingId && (
        <div className="verify-edit-modal">
          <div className="verify-edit-modal__inner">
            <h3>후보 수정</h3>
            <p>아래에 실제 내용으로 고쳐 주세요. 수정 후 확인하면 AI 원문 대신 수정본이 사용됩니다.</p>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={4}
              className="verify-edit-modal__textarea"
            />
            <div className="verify-edit-modal__actions">
              <button className="btn btn-primary" onClick={handleEditConfirm}>
                확인
              </button>
              <button className="btn btn-ghost" onClick={handleEditCancel}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단: 완료/다음 */}
      <div className="verify-footer">
        <button
          className="btn btn-ghost"
          onClick={() => onVerifyComplete({ cancelled: true })}
        >
          다시 시작
        </button>
        <button
          className={`btn btn-primary ${pendingCount > 0 ? "btn-disabled" : ""}`}
          onClick={handleNext}
          disabled={pendingCount > 0}
        >
          {pendingCount > 0 ? `아직 ${pendingCount}개 남음` : "다음"}
        </button>
      </div>

      <style>{`
        .user-verify { max-width: 720px; margin: 0 auto; }
        .verify-progress { margin: 16px 0 24px; }
        .verify-progress__label { font-size: 13px; color: var(--muted-foreground); }
        .verify-progress__bar {
          height: 6px; background: #27272a; border-radius: 4px; overflow: hidden; margin: 6px 0;
        }
        .verify-progress__fill {
          height: 100%; background: var(--accent); transition: width 0.2s;
        }
        .verify-progress__count { font-size: 13px; color: var(--muted-foreground); }
        .verify-cards { display: flex; flex-direction: column; gap: 14px; margin: 16px 0 20px; }
        .verify-card {
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--card);
          padding: 16px;
        }
        .verify-card--rejected { border-left: 4px solid #f87171; }
        .verify-card--edited   { border-left: 4px solid #fbbf24; }
        .verify-card--confirmed { border-left: 4px solid #4ade80; }
        .verify-card--unknown  { border-left: 4px solid #94a3b8; }
        .verify-card--pending  { border-left: 4px solid var(--border); }
        .verify-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .verify-card__id { font-size: 12px; color: var(--muted-foreground); font-family: ui-monospace, monospace; }
        .verify-card__meta { font-size: 12px; color: var(--muted-foreground); }
        .verify-card__claim { margin-bottom: 10px; }
        .verify-card__claim p { margin: 0; font-size: 15px; }
        .verify-card__source {
          margin-top: 6px; font-size: 13px; color: var(--muted-foreground);
          font-style: italic;
        }
        .verify-card__actions { margin-top: 12px; }
        .verify-card__choices { display: flex; gap: 8px; flex-wrap: wrap; }
        .verify-choice {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border);
          background: transparent; color: var(--foreground); font-size: 14px; cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .verify-choice:hover { background: #27272a; }
        .verify-choice__mark {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 50%; font-size: 13px; font-weight: 600;
        }
        .verify-choice--confirm .verify-choice__mark { background: #4ade80; color: #0b1c10; }
        .verify-choice--reject  .verify-choice__mark { background: #f87171; color: #2a0b0b; }
        .verify-choice--unknown  .verify-choice__mark { background: #94a3b8; color: #1a1f26; }
        .verify-choice--edit     .verify-choice__mark { background: #fbbf24; color: #2a1f00; }

        .verify-card__rejected { margin-top: 8px; }
        .verify-card__rejected-label {
          display: inline-block; font-size: 13px; font-weight: 600; color: #f87171;
          background: #2a0b0b; padding: 2px 8px; border-radius: 6px; margin-bottom: 6px;
        }
        .verify-card__rejected-note { margin: 6px 0 10px; font-size: 13px; color: var(--muted-foreground); }
        .verify-card__delete-edit-actions { margin-top: 8px; }
        .verify-delete-edit-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border);
          background: transparent; color: var(--foreground); font-size: 13px; cursor: pointer;
        }
        .verify-delete-edit-btn--danger { border-color: #f87171; color: #f87171; }
        .verify-card__edited { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border); }
        .verify-card__edited-label {
          display: inline-block; font-size: 12px; font-weight: 600; color: #fbbf24;
          background: #2a1f00; padding: 2px 8px; border-radius: 6px; margin-bottom: 4px;
        }
        .verify-card__edited-note { margin-top: 6px; font-size: 12px; color: var(--muted-foreground); font-style: italic; }
        .verify-card__unknown { margin-top: 8px; }
        .verify-card__unknown-label {
          display: inline-block; font-size: 12px; font-weight: 600; color: #94a3b8;
          background: #1a1f26; padding: 2px 8px; border-radius: 6px; margin-bottom: 4px;
        }
        .verify-card__confirmed { margin-top: 8px; }
        .verify-card__confirmed-label {
          display: inline-block; font-size: 12px; font-weight: 600; color: #4ade80;
          background: #0b1c10; padding: 2px 8px; border-radius: 6px;
        }
        .verify-edit-modal {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex;
          align-items: center; justify-content: center; z-index: 50;
        }
        .verify-edit-modal__inner {
          background: var(--card); border: 1px solid var(--border); border-radius: 12px;
          padding: 20px; width: 480px; max-width: 92vw;
        }
        .verify-edit-modal__inner h3 { margin: 0 0 8px; }
        .verify-edit-modal__inner p { margin: 0 0 12px; font-size: 14px; color: var(--muted-foreground); }
        .verify-edit-modal__textarea {
          width: 100%; border: 1px solid var(--border); border-radius: 8px;
          padding: 10px; background: var(--background); color: var(--foreground); font-size: 14px;
          resize: vertical;
        }
        .verify-edit-modal__actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
        .verify-footer {
          display: flex; justify-content: space-between; padding: 16px 0; border-top: 1px solid var(--border);
          margin-top: 16px;
        }
        .btn-disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </section>
  );
}
