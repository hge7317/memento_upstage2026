export function QuickMemo() {
  const [text, setText] = useState("");

  return (
    <section className="screen quick-memo">
      <h1>지금 바로 떠오르는 것부터</h1>
      <p>정리하지 말고 그대로 적어 주세요. 단어만 써도 됩니다.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="순서가 뒤죽박죽이어도 괜찮습니다. 지금 떠오르는 말, 장면, 숫자, 장소를 그대로 적어 주세요."
        rows={8}
      />
      <div className="quick-memo-actions">
        <button type="button" className="secondary">기억이 잘 안 남</button>
        <button type="button" disabled={!text.trim()}>다음</button>
      </div>
    </section>
  );
}
