import { useState } from "react";

/**
 * JobPostingOptional - 잡포스팅 URL 선택적 입력을 받는다.
 *
 * 참조:
 *  - PRD §6.1, §5.5 (잡포스팅은 선택적 배경 자료)
 *  - docs/references/output-contract.md §단계별 응답 제한 (JOB_POSTING_OPTIONAL)
 *  - docs/references/guardrails.md §1 (사용 가능한 정보 집합)
 */
export function JobPostingOptional({ onNext, onBack, defaultValue = "" }) {
  const [url, setUrl] = useState(defaultValue);

  const handleSkip = () => {
    onNext(null);
  };

  const handleSubmit = () => {
    const trimmed = url.trim();
    // URL 형식 검사 없이 텍스트로受け取る (백엔드/스킬에서 처리)
    onNext(trimmed || null);
  };

  const isValidUrl = (v) => {
    if (!v) return false;
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <section className="screen job-posting-optional">
      <div className="chapter-head">
        <span className="chapter-num">Chapter 3-2</span>
        <span className="chapter-title">채용공고 (선택)</span>
      </div>

      <h1 style={{ textAlign: "center", margin: "24px 0 8px" }}>
        지원한 채용공고가 있다면
      </h1>
      <p className="hint" style={{ textAlign: "center", marginBottom: "24px" }}>
        없어도 괜찮습니다. 건너뛰어도 복기 진행에 지장이 없습니다.
      </p>

      <div className="job-posting-card">
        <label className="job-posting-label">
          채용공고 URL
          <span className="job-posting-label__desc">
            지원한 채용공고 URL을 넣어주세요. 회사와 직무의 배경을 이해하는 데 참고합니다.
          </span>
        </label>

        <div className="job-posting-input-row">
          <input
            type="url"
            className="job-posting-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/jobs/12345"
          />
          <button
            className="btn btn-ghost"
            onClick={handleSkip}
            disabled={!url.trim()}
            title="건너뛰기"
          >
            건너뛰기
          </button>
        </div>

        {url.trim() && !isValidUrl(url) && (
          <p className="job-posting-note job-posting-note--warn">
            URL 형식이 올바르지 않습니다. 그래도 배경 정보로 사용할 수 있습니다.
          </p>
        )}

        <div className="job-posting-rules">
          <p className="job-posting-rules__title">잡포스팅 사용 규칙</p>
          <ul className="job-posting-rules__list">
            <li>채용공고는 배경 맥락으로만 사용합니다.</li>
            <li>공고 내용이 실제 면접 질문·사건이었다고 전제하지 않습니다.</li>
            <li>공고에서 나온 표현을 실제 사건 전제에 사용하지 않습니다.</li>
            <li>공고만을 근거로 기억 후보를 만들지 않습니다.</li>
          </ul>
        </div>
      </div>

      <div className="job-posting-actions">
        <button
          className="btn btn-ghost"
          onClick={handleSkip}
        >
          URL 없이 다음
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!url.trim()}
        >
          URL 저장 후 다음
        </button>
      </div>

      <style>{`
        .job-posting-optional { max-width: 640px; margin: 0 auto; }
        .job-posting-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
          padding: 20px;
          margin-bottom: 20px;
        }
        .job-posting-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 6px;
          color: var(--foreground);
        }
        .job-posting-label__desc {
          display: block;
          font-size: 13px;
          color: var(--muted-foreground);
          font-weight: 400;
          margin-top: 2px;
        }
        .job-posting-input-row {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
        .job-posting-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--background);
          color: var(--foreground);
          font-size: 14px;
          font-family: inherit;
        }
        .job-posting-input::placeholder {
          color: var(--muted-foreground);
        }
        .job-posting-note {
          margin-top: 8px;
          font-size: 13px;
        }
        .job-posting-note--warn {
          color: #fbbf24;
        }
        .job-posting-rules {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
        }
        .job-posting-rules__title {
          font-size: 13px;
          font-weight: 600;
          color: var(--foreground);
          margin-bottom: 8px;
        }
        .job-posting-rules__list {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: var(--muted-foreground);
        }
        .job-posting-rules__list li {
          margin-bottom: 4px;
        }
        .job-posting-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        .btn-disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </section>
  );
}
