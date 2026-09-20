export function createJobPostingHandler(callSolar) {
// POST /api/job-posting — 채용 공고 URL에서 배경 정보를 추출( Solar Pro 4 사용 )
  return async function jobPosting(req, res) {
    const url = req.body?.url;
    if (!url || typeof url !== "string" || url.trim() === "") {
      return res.json({ ok: false, reason: "url_required" });
    }

    try {
      // 1) 페이지 fetch (타임아웃 10초, 브라우저 UA)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let response;
      try {
        response = await fetch(url.trim(), {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
        });
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          return res.json({ ok: false, reason: "timeout" });
        }
        return res.json({ ok: false, reason: "fetch_failed" });
      } finally {
        clearTimeout(timeout);
      }

      if (response.status === 403) {
        return res.json({ ok: false, reason: "forbidden" });
      }

      const html = await response.text();
      if (typeof html !== "string") {
        return res.json({ ok: false, reason: "fetch_failed" });
      }

      // 2) 렌더링 무관 태그 제거 후 텍스트화
      const cleaned = extractReadableText(html);
      if (cleaned.length < 200) {
        return res.json({ ok: false, reason: "body_too_short" });
      }
      const trimmed = cleaned.slice(0, 8000);

      // 3) Solar Pro 4로 구조화 JSON 추출
      const systemPrompt = `당신은 채용 공고 페이지에서 배경 정보를 추출하는 추출기입니다.
  사용자가 제공한 공고 본문 텍스트를 읽고, 아래 스키마 JSON만 응답합니다.
  Markdown 코드 펜스(\`\`\`)를 붙이지 말고, 유효한 JSON 객체만 출력합니다.

  출력 스키마:
  {
    "company": "채용 회사 이름 (문자열, 없으면 빈 문자열)",
    "role": "모집 직무/포지션 이름 (문자열, 없으면 빈 문자열)",
    "location": "근무지/위치 정보 (문자열, 없으면 빈 문자열)",
    "employmentType": "인턴/신입/경력/프리랜서 등 고용 형태 (문자열, 없으면 빈 문자열)",
    "deadline": "지원 마감일·마감 시점 정보 (문자열, 없으면 빈 문자열)",
    "requirements": ["주요 요구 사항 최대 3개 (문자열 배열, 3개 초과 시 자름)"],
    "summary": "공고 내용을 짧게 요약한 문장 (문자열)"
  }

  규칙:
  - 공고 내용은 배경 참고용이며, 실제 면접에서 발생한 질문·사건·기억으로 전제하지 않습니다.
  - 본문에 없는 정보는 만들지 말고, 없으면 빈 문자열 또는 빈 배열로 둡니다.
  - company와 role은 반드시 채우려 시도하되, 정말 없으면 빈 문자열로 둡니다.
  - requirements는 본문에서 확인되는 요구 사항만 최대 3개로 추립니다.
  - 응답은 항상 위 키들을 가진 단일 JSON 객체여야 합니다.`;

      const userPrompt = `다음 채용 공고 본문에서 위 스키마 JSON을 추출해 주세요.

  [채용 공고 본문]
  ${trimmed}

  위 본문에서만 정보를 뽑아 JSON으로 응답하세요. 마크다운 코드 펜스 없이 JSON만 출력합니다.`;

      const solarContent = await callSolar(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        1024
      );

      // 4) JSON 파싱 및 검증
      let parsed = null;
      try {
        const jsonMatch = solarContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error("Job posting Solar JSON 파싱 실패:", parseError.message);
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return res.json({ ok: false, reason: "parse_failed" });
      }

      const company = typeof parsed.company === "string" ? parsed.company : "";
      const role = typeof parsed.role === "string" ? parsed.role : "";
      const location = typeof parsed.location === "string" ? parsed.location : "";
      const employmentType = typeof parsed.employmentType === "string" ? parsed.employmentType : "";
      const deadline = typeof parsed.deadline === "string" ? parsed.deadline : "";
      const summary = typeof parsed.summary === "string" ? parsed.summary : "";

      let requirements = Array.isArray(parsed.requirements)
        ? parsed.requirements.filter((r) => typeof r === "string").slice(0, 3)
        : [];

      // 주요 필드(회사/직무)가 없으면 파싱 실패로 본다
      if (!company || !role) {
        return res.json({ ok: false, reason: "parse_failed" });
      }

      return res.json({
        ok: true,
        company,
        role,
        location,
        employmentType,
        deadline,
        requirements,
        summary,
      });
    } catch (error) {
      console.error("/api/job-posting 처리 중 오류:", error.message);
      return res.json({ ok: false, reason: "server_error" });
    }
  };
}

// 텍스트 추출 헬퍼: 렌더링 무관 태그 제거 후 가독성 있는 텍스트만 남김
function extractReadableText(html) {
  if (typeof html !== "string") return "";
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "");

  // 태그를 공백으로 치환
  s = s.replace(/<[\s\S]*?>/g, " ");
  // HTML 엔티티 기본 복원
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  // 공백 정규화
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
