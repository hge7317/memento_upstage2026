import { useState, useCallback } from "react";
import { objectiveFieldRequest, optionalFieldRequest, FIELD_REQUEST_TYPE } from "../lib/objectiveFieldSchema.js";

/**
 * InterviewInitialInfo - 면접 기본 정보 6필드를 수집한다.
 *
 * 참조:
 *  - PRD §6.1, §9
 *  - docs/references/scenarios/interview.md §면접 기본 정보
 *  - docs/references/output-contract.md §객관 정보 필드 요청
 *
 * 주의:
 *  - 자연어 회상 질문과 혼합하지 않는다. (폼 스키마만 반환, 질문 문자열 별도)
 *  - "모름"/"비공개" 허용, 확정형으로 바꾸지 않음.
 */
export function InterviewInitialInfo({ onNext, onBack, initialValues = {} }) {
  const [values, setValues] = useState(() => ({
    companyName: initialValues.companyName ?? "",
    roleOrDepartment: initialValues.roleOrDepartment ?? "",
    eventDateTime: initialValues.eventDateTime ?? "",
    interviewMode: initialValues.interviewMode ?? "",
    interviewStage: initialValues.interviewStage ?? "",
    interviewerCount: initialValues.interviewerCount ?? "",
    interviewLanguage: initialValues.interviewLanguage ?? "",
    durationActualOrPerceived: initialValues.durationActualOrPerceived ?? "",
    nextRoundOrResultDate: initialValues.nextRoundOrResultDate ?? "",
    hasPreparedMaterial: initialValues.hasPreparedMaterial ?? "",
  }));

  const update = useCallback((key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  // 필수 6필드 각각이 채워졌는지 (빈 문자열이면 미입력)
  const 필수필드 = objectiveFieldRequest.filter(f => f.required);
  const 미입력필드 = 필수필드.filter(f => !values[f.key]);

  // 완료 가능하면 다음 단계로
  const canProceed = 미입력필드.length === 0;

  const handleNext = () => {
    if (!canProceed) return;
    // output-contract.md §객관 정보 필드 요청 형태로 반환
    const objectiveFieldRequestPayload = [
      ...objectiveFieldRequest.map(f => ({
        key: f.key,
        label: f.label,
        required: f.required,
        allowUnknown: f.allowUnknown,
        valueType: f.valueType,
        options: f.options,
        value: values[f.key] || (f.allowUnknown ? "모름" : ""),
      })),
      ...optionalFieldRequest.map(f => ({
        key: f.key,
        label: f.label,
        required: false,
        allowUnknown: false,
        valueType: f.valueType,
        options: f.options,
        value: values[f.key] || "",
      })),
    ];

    onNext({
      type: FIELD_REQUEST_TYPE,
      objectiveFieldRequest: objectiveFieldRequestPayload,
      // 자연어 질문과 섞지 않기 위해 별도 키로 분리
      question: null,
      assistantMessage: "면접 기본 정보를 제출했습니다. 이제 회상 단계를 시작합니다.",
      stage: "INTERVIEW_INITIAL_INFO",
      nextStage: "CONTEXT_REINSTATEMENT",
    });
  };

  const handleBack = () => onBack();

  // 드롭다운 필드 렌더링
  const renderField = (field, valueKey) => {
    const val = values[valueKey];
    if (field.valueType === "SINGLE_OPTION") {
      return (
        <div className="ii-field ii-field--select">
          <label className="ii-label">{field.label} {field.required ? <span className="ii-required">*</span> : ""}</label>
          <select
            className="ii-select"
            value={val}
            onChange={e => update(valueKey, e.target.value)}
          >
            <option value="">선택...</option>
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    }

    // 텍스트 입력 (TEXT_WITH_UNKNOWN, NUMBER_OR_RANGE_OR_UNKNOWN 등)
    const placeholder = field.placeholder || "입력...";
    return (
      <div className="ii-field">
        <label className="ii-label">{field.label} {field.required ? <span className="ii-required">*</span> : ""}</label>
        <input
          className="ii-input"
          type="text"
          value={val}
          onChange={e => update(valueKey, e.target.value)}
          placeholder={placeholder}
        />
        {field.allowUnknown && (
          <div className="ii-unknown-hint">
            <span className="ii-unknown-hint__label">허용:</span>
            <span className="ii-unknown-hint__value">모름 / 비공개</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="screen interview-initial-info">
      <div className="chapter-head">
        <span className="chapter-num">Chapter 4</span>
        <span className="chapter-title">면접 기본 정보</span>
      </div>

      <h1 style={{ textAlign: "center", margin: "20px 0 6px" }}>
        언제, 어디서, 어떤 면접이었는지 알려주세요
      </h1>
      <p className="hint" style={{ textAlign: "center", marginBottom: "24px" }}>
        정확한 값이 없으면 범위나 <span className="text-muted">모름</span> / <span className="text-muted">비공개</span>로 남겨도 됩니다.
        면접 기본 정보는 사건의 프레임이며, 실제 면접 내용에 대한 정답지가 아닙니다.
      </p>

      <div className="ii-form">
        {/* 필수 필드 */}
        <fieldset className="ii-fieldset">
          <legend className="ii-legend">필수 정보</legend>
          {필수필드.map(field => renderField(field, field.key))}
        </fieldset>

        {/* 선택 필드 */}
        <fieldset className="ii-fieldset ii-fieldset--optional">
          <legend className="ii-legend ii-legend--optional">선택 정보 (없어도 진행 가능)</legend>
          {optionalFieldRequest.map(field => renderField(field, field.key))}
        </fieldset>
      </div>

      <div className="ii-footer">
        <button className="btn btn-ghost" onClick={handleBack}>
          돌아가기
        </button>
        <button
          className={`btn btn-primary ${canProceed ? "" : "btn-disabled"}`}
          onClick={handleNext}
          disabled={!canProceed}
        >
          {canProceed ? "다음 (회상 시작)" : "필수 정보를 모두 입력해 주세요"}
        </button>
      </div>

      <style>{`
        .interview-initial-info { max-width: 680px; margin: 0 auto; }
        .ii-form { margin: 8px 0 16px; }
        .ii-fieldset {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 12px;
          background: var(--card);
        }
        .ii-fieldset--optional {
          border-style: dashed;
        }
        .ii-legend {
          font-size: 14px;
          font-weight: 600;
          padding: 0;
          margin-bottom: 12px;
          color: var(--foreground);
        }
        .ii-legend--optional {
          color: var(--muted-foreground);
          font-weight: 500;
        }
        .ii-field { margin-bottom: 14px; }
        .ii-field:last-child { margin-bottom: 0; }
        .ii-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
          color: var(--foreground);
        }
        .ii-required {
          color: #f87171;
          margin-left: 2px;
        }
        .ii-input, .ii-select {
          width: 100%;
          padding: 9px 11px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--background);
          color: var(--foreground);
          font-size: 14px;
          font-family: inherit;
        }
        .ii-input::placeholder { color: var(--muted-foreground); }
        .ii-select { cursor: pointer; }
        .ii-unknown-hint {
          display: inline-block;
          margin-top: 4px;
          font-size: 12px;
          color: var(--muted-foreground);
        }
        .ii-unknown-hint__label { margin-right: 4px; }
        .ii-unknown-hint__value {
          color: #94a3b8;
          font-style: italic;
        }
        .text-muted { color: var(--muted-foreground); font-style: italic; }
        .ii-footer {
          display: flex;
          justify-content: space-between;
          padding-top: 16px;
          border-top: 1px solid var(--border);
          margin-top: 8px;
        }
        .btn-disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </section>
  );
}
