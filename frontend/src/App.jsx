import { useState } from "react";
import { Splash } from "./components/Splash";
import { ScenarioSelect } from "./components/ScenarioSelect";
import { QuickMemo } from "./components/QuickMemo";

export default function App() {
  const [stage, setStage] = useState("splash");

  const renderStage = () => {
    if (stage === "splash") return <Splash onNext={() => setStage("scenario")} />;
    if (stage === "scenario") return <ScenarioSelect onSelect={(s) => setStage("quick-memo")} />;
    if (stage === "quick-memo") return <QuickMemo />;
    return <div>아직 구현되지 않은 단계입니다.</div>;
  };

  return <main className="app">{renderStage()}</main>;
}
