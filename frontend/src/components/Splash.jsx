export function Splash({ onNext }) {
  return (
    <section className="screen splash">
      <h1>기억이 흐려지기 전에, 먼저 적어 두세요</h1>
      <p>AI가 내용을 대신 만들지 않습니다. 당신이 확인한 기억을 바탕으로 더 잘 떠올리도록 질문합니다.</p>
      <button type="button" onClick={onNext}>시작하기</button>
    </section>
  );
}
