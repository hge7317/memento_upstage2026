/**
 * sessionStore - 익명 세션 상태를 localStorage에 보관한다.
 * 민감한 원문/중간 결과/결과의 도메인은 세션별 키로 분리한다.
 */

const NS = "memory-replay";

export function getSessionId() {
  let id = localStorage.getItem(`${NS}:sessionId`);
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(`${NS}:sessionId`, id);
  }
  return id;
}

export function loadState(key, fallback = null) {
  try {
    const raw = localStorage.getItem(`${NS}:${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveState(key, value) {
  try {
    localStorage.setItem(`${NS}:${key}`, JSON.stringify(value));
  } catch (e) {
    console.error("session store write failed", e);
  }
}

export function clearSession() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(`${NS}:`));
  keys.forEach((k) => localStorage.removeItem(k));
}
