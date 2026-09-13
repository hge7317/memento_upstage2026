import { useState, useEffect } from "react";

/**
 * useStage - PRD v0.2 상태 모델을 프론트 상태 훅으로 표현한다.
 * 실제 Solar/백엔드 연동 전에는 목업 단계로 진행한다.
 */
const STAGE_ORDER = [
  "splash",
  "scenario",
  "quick-memo",
  "extract-candidates",
  "user-verify",
  "objective-frame",
  "context-reinstatement",
  "free-recall",
  "structural-cue",
  "reverse-recall",
  "timeline-review",
  "generate-output",
  "complete",
];

export function useStage(initial = "splash") {
  const [stage, setStage] = useState(initial);
  const [scenario, setScenario] = useState(null);
  const [quickMemo, setQuickMemo] = useState("");
  const [loading, setLoading] = useState(false);

  const canGoBack = STAGE_ORDER.indexOf(stage) > 0;

  const next = (target) => {
    const idx = STAGE_ORDER.indexOf(stage);
    const nextIdx = target ? STAGE_ORDER.indexOf(target) : idx + 1;
    if (nextIdx > idx && nextIdx < STAGE_ORDER.length) {
      setStage(STAGE_ORDER[nextIdx]);
    }
  };

  const goTo = (target) => {
    const idx = STAGE_ORDER.indexOf(target);
    if (idx >= 0) setStage(STAGE_ORDER[idx]);
  };

  const back = () => {
    const idx = STAGE_ORDER.indexOf(stage);
    if (idx > 0) setStage(STAGE_ORDER[idx - 1]);
  };

  return {
    stage,
    scenario,
    quickMemo,
    loading,
    setScenario,
    setQuickMemo,
    setLoading,
    next,
    goTo,
    back,
    canGoBack,
  };
}
