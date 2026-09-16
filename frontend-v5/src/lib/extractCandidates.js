/**
 * extractCandidates - 빠른 메모 원문(+선택적 사진/파스 텍스트)를 받아
 * EXTRACT_CANDIDATES 단계의 candidateItems를 반환한다.
 *
 * 참조: docs/references/candidate-extraction.md
 *        docs/references/guardrails.md (사용 가능한 정보 범위)
 */

/** 후보 카드 한 장 */
export class Candidate {
  /**
   * @param {object} params
   * @param {string}  params.id
   * @param {string}  params.claim
   * @param {string}  params.sourceQuote
   * @param {'FACT'|'UNCERTAIN'|'EVALUATION'} params.category
   * @param {number|null} params.sequenceHint
   * @param {'PENDING'} params.verification
   * @param {'HIGH'|'MEDIUM'|'UNKNOWN'} params.confidence
   * @param {'QUICK_MEMO'} params.source
   * @param {'TEXT'|'PHOTO'|'DOCUMENT_PARSE'} params.sourceInputType
   * @param {string} params.sourceInputId
   */
  constructor({
    id, claim, sourceQuote, category, sequenceHint,
    verification = 'PENDING', confidence = 'MEDIUM',
    source = 'QUICK_MEMO', sourceInputType = 'TEXT',
    sourceInputId,
  }) {
    this.id = id;
    this.claim = claim;
    this.sourceQuote = sourceQuote;
    this.category = category;
    this.sequenceHint = sequenceHint;
    this.verification = verification;
    this.confidence = confidence;
    this.source = source;
    this.sourceInputType = sourceInputType;
    this.sourceInputId = sourceInputId ?? null;
  }

  toJSON() {
    return {
      id: this.id,
      claim: this.claim,
      sourceQuote: this.sourceQuote,
      category: this.category,
      sequenceHint: this.sequenceHint,
      verification: this.verification,
      confidence: this.confidence,
      source: this.source,
      sourceInputType: this.sourceInputType,
      sourceInputId: this.sourceInputId,
    };
  }
}

/**
 * 원문을 의미 단위(문장/절)로 나누고, 한 카드 한 주장으로 분리한다.
 * 금지 변환 규칙을 적용한다.
 */
export function extractCandidates({
  original,
  photoText = null,
  docParseText = null,
} = {}) {
  const texts = [];
  if (original && original.trim()) texts.push({ text: original, type: 'TEXT' });
  if (photoText && photoText.trim()) texts.push({ text: photoText, type: 'PHOTO' });
  if (docParseText && docParseText.trim()) texts.push({ text: docParseText, type: 'DOCUMENT_PARSE' });

  if (texts.length === 0) {
    return { candidateItems: [], categorySummary: { FACT: 0, UNCERTAIN: 0, EVALUATION: 0 }, emptyReason: 'no-input' };
  }

  const candidates = [];
  let idCounter = 1;

  for (const { text, type } of texts) {
    const units = splitMeaningUnits(text);
    for (const unit of units) {
      const trimmed = unit.trim();
      if (!trimmed) continue;
      const cat = classifyClaim(trimmed);
      // 모름/복수 가능성 표현이면 UNKNOWN으로 내림
      const confidence = containsUnknownExpression(trimmed) ? 'UNKNOWN' : 'MEDIUM';
      const seq = extractSequenceHint(trimmed);
      const sourceQuote = trimmed;
      candidates.push(new Candidate({
        id: `candidate-${String(idCounter).padStart(3, '0')}`,
        claim: trimmed,
        sourceQuote,
        category: cat,
        sequenceHint: seq,
        verification: 'PENDING',
        confidence,
        source: 'QUICK_MEMO',
        sourceInputType: type,
        sourceInputId: `input-${type === 'TEXT' ? 'quickMemo' : type === 'PHOTO' ? 'photo' : 'docParse'}`,
      }));
      idCounter += 1;
    }
  }

  // 충돌 표현 처리: 동일한 주제를 상반되게 말하는 2개는 각각 UNCERTAIN 유지
  // (여기서는 단순 문법 기준이라 심층 의미 충돌 분석은 제외, 규칙 명세 준수)
  const summary = { FACT: 0, UNCERTAIN: 0, EVALUATION: 0 };
  for (const c of candidates) summary[c.category] += 1;

  // 쓸 만한 후보가 하나도 없으면 빈 배열 + 원문 유지 (삭제하지 않음)
  if (candidates.length === 0) {
    return { candidateItems: [], categorySummary: summary, emptyReason: 'no-meaningful-claim' };
  }

  return {
    candidateItems: candidates.map(c => c.toJSON()),
    categorySummary: summary,
    openGaps: candidates.filter(c => c.category === 'UNCERTAIN')
      .some(c => /중간에|하나 더|뭐가|무엇이|있었던 것 같다/.test(c.claim))
      ? [{ type: 'UNKNOWN_EVENT', detail: '원문에 구체적 사건 명사가 없어 구조적 빈 구간으로 기록' }]
      : [],
    emptyReason: null,
  };
}

/** 문장을 의미 단위로 나눈다. 줄바꿈이 있으면 그 줄을 우선 분리 단서로 쓴다. */
function splitMeaningUnits(text) {
  const raw = text;
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const out = [];
  for (const line of lines) {
    if (!line) continue;
    const normalized = line.replace(/\n+/g, ' ').trim();
    if (!normalized) continue;

    let parts = normalized.split(/(?<=[.?!])\s+/).filter(Boolean);
    if (parts.length === 0) parts = [normalized];

    for (const part of parts) {
      const clauses = part.split(/(?<=[았었였겠]고)\s+/).filter(Boolean);
      for (const c of clauses) {
        const cleaned = cleanClauseEnding(c.trim());
        if (cleaned) out.push(cleaned);
      }
    }
  }
  return out;
}

/** 접속 connective로 끝난 절의 끝맺음을 정리한다 (고→다, 았고→았다 등).
 *  분리 예시처럼 "세 명이 있었고" → "세 명이 있었다" 형태로 정리한다. */
function cleanClauseEnding(clause) {
  if (!clause || clause.length < 2) return '';
  if (clause.endsWith('았고')) return clause.slice(0, -2) + '았다';
  if (clause.endsWith('었고')) return clause.slice(0, -2) + '었다';
  if (clause.endsWith('였고의')) return clause.slice(0, -2) + '였다'; // 거의 안 쓰임
  if (clause.endsWith('겠고')) return clause.slice(0, -2) + '겠다';
  if (clause.endsWith('고')) {
    // 단순 "고" 종결: 앞의 문자가 한글이면 connective로 보고 "다"로 바꾼다
    const prev = clause[clause.length - 2];
    if (prev && /[가-힣]/.test(prev)) {
      return clause.slice(0, -1) + '다';
    }
    return clause;
  }
  return clause;
}

/** 후보 분류: FACT / UNCERTAIN / EVALUATION */
function classifyClaim(claim) {
  const lower = claim.toLowerCase();

  // 평가·감정·추측 명시적 표현이 있으면 EVALUATION
  const evalMarkers = [
    '망했다', '망한 것 같다', '좋았다', '나빴다', '싫어한 것 같다',
    '좋아한 것 같다', '잘했다', '틀렸다', '분위기가', '긴장했다',
    '긴장돼 보였다', '화난 것 같다', '어렵다', '쉬웠다',
    '아쉽다', '아쉬웠던 것 같다', '만족', '별로',
    '결과', '합격', '불합격', '될 것 같다', '안 될 것 같다',
    '분위기', '느낌',
  ];
  for (const m of evalMarkers) {
    if (lower.includes(m)) return 'EVALUATION';
  }

  // 불확실성 표현이 있으면 UNCERTAIN (단, 평가 표현과 겹치면 EVALUATION 우선)
  if (containsUnknownExpression(claim)) return 'UNCERTAIN';

  return 'FACT';
}

/** 모름/불확실 표현 포함 여부 */
function containsUnknownExpression(claim) {
  const lower = claim.toLowerCase();
  const markers = [
    '모르겠다', '모르겠는데', '잘 모르겠다', '모름',
    '기억 안 남', '기억나지 않음', '기억나지 않는다',
    '아마', '것 같다', '같았다', '같아 보였다',
    '정확하지 않다', '정확하지 않음', '정확하지 않아',
    '잘 모름', '명확하지 않다', '확실하지 않다',
    '였나', '였는지', '했었나', '했는지',
    '인지', '아닌지', '는지',
    '무슨', '뭐였', '뭐가',
  ];
  return markers.some(m => lower.includes(m));
}

/** 순서 힌트 추출 (원문에 순서 표현이 있을 때만) */
function extractSequenceHint(claim) {
  // 간단한 순서 마커가 있으면 1/2/3 등 추정 — 원문 근거가 없으면 null
  const firstMarkers = ['처음', '첫', '첫번째', '먼저', '시작', '시작할 때', '들어가기', '들어갈 때', '시작 직전'];
  const lastMarkers  = ['마지막', '끝', '끝날 때', '종료', '나올 때', '끝난 뒤', '끝나고', '마지막으로'];
  const secondMarkers = ['그다음', '다음에', '다음', '이어서', '이어', '중간에', '이후', '뒤에'];
  if (firstMarkers.some(m => claim.includes(m))) return 1;
  if (lastMarkers.some(m => claim.includes(m))) return 999; // 끝 순서
  if (secondMarkers.some(m => claim.includes(m))) return 2;
  return null;
}
