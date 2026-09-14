import { useRef, useEffect, useState } from "react";

export function QuickMemo({ onNext, onBack, initialText = "", emptyChoice: initialEmptyChoice = false }) {
  const [text, setText] = useState(initialText);
  const [emptyChoice, setEmptyChoice] = useState(initialEmptyChoice);
  const textRef = useRef(text);
  const emptyRef = useRef(emptyChoice);

  useEffect(() => {
    textRef.current = text;
    emptyRef.current = emptyChoice;
  }, [text, emptyChoice]);

  // 프롭이 외부에서 갱신되면 로컬 상태도 따라간다 (돌아오기 후 복원)
  useEffect(() => {
    if (initialText !== textRef.current) setText(initialText);
    if (initialEmptyChoice !== emptyRef.current) setEmptyChoice(initialEmptyChoice);
  }, [initialText, initialEmptyChoice]);

  const handleSubmit = () => {
    if (emptyChoice) {
      onNext && onNext("");
      return;
    }
    if (text.trim()) {
      onNext && onNext(text);
    }
  };

  return (
    <section className="screen quick-memo">
      <div className="chapter-head">
        <span className="chapter-num">Chapter 2</span>
        <span className="chapter-title">기억 꺼내 적기</span>
      </div>

      <h1>지금 바로 떠오르는 것부터</h1>
      <p className="hint">
        정리하지 말고 그대로 적어 주세요. 단어만 써도 됩니다.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="순서가 뒤죽박죽이어도 괜찮습니다. 지금 떠오르는 말, 장면, 숫자, 장소를 그대로 적어 주세요."
        rows={8}
      />
      <div className="quick-memo-opts">
        <label className="opt-row">
          <input
            type="checkbox"
            checked={emptyChoice}
            onChange={(e) => setEmptyChoice(e.target.checked)}
          />
          <span>기억이 잘 안 남</span>
        </label>
        <p className="opt-note">
          당시의 사진이나 문서를 나중에 올릴 수 있습니다. 지금은 기억나는 것부터 적어 주세요.
        </p>
      </div>
      <div className="quick-memo-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onBack}
        >
          돌아가기
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!text.trim() && !emptyChoice}
          onClick={handleSubmit}
        >
          다음
        </button>
      </div>

      <div className="page-foot">
        <span>복기 노트 · 2/4</span>
        <span>손으로 적는 느낌으로</span>
      </div>
    </section>
  );
}
