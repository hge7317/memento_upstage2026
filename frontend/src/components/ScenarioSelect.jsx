export function ScenarioSelect({ onSelect }) {
  const scenarios = [
    { value: "interview", label: "면접 복기", note: "정식" },
    { value: "lost-item", label: "분실물 찾기", note: "베타" },
    { value: "meeting", label: "미팅 복기", note: "베타" },
  ];

  return (
    <section className="screen scenario">
      <h1>어떤 일을 복기할까요?</h1>
      <p>상황에 따라 질문과 결과 형식이 달라집니다.</p>
      <ul className="scenario-list">
        {scenarios.map((s) => (
          <li key={s.value}>
            <button type="button" className="scenario-card" onClick={() => onSelect(s.value)}>
              <strong>{s.label}</strong>
              <small>{s.note}</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
