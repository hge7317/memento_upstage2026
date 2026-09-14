/**
 * objectiveFieldSchema - INTERVIEW_INITIAL_INFO 단계에서 요청할
 * 객관 정보 필드 정의.
 *
 * 참조:
 *  - PRD §6.1 (면접 기본 정보 필드)
 *  - docs/references/output-contract.md §객관 정보 필드 요청
 *  - docs/references/scenarios/interview.md §면접 기본 정보
 */

/**
 * 폼 스키마로 반환할 필드 목록.
 *
 * 각 필드:
 *  - key: 머신 리더블 키
 *  - label: 사용자에게 표시할 라벨
 *  - required: 필수 여부
 *  - allowUnknown: 모름/비공개 허용 여부
 *  - valueType: 입력 타입
 *  - options: 선택지(있을 때만)
 */
export const objectiveFieldRequest = [
  // 필수 필드 6개
  {
    key: "companyName",
    label: "회사명",
    required: true,
    allowUnknown: true,
    valueType: "TEXT_WITH_UNKNOWN",
    options: [],
    placeholder: "회사명 입력 (또는 '모름' / '비공개')",
  },
  {
    key: "roleOrDepartment",
    label: "지원 직무·부서",
    required: true,
    allowUnknown: true,
    valueType: "TEXT_WITH_UNKNOWN",
    options: [],
    placeholder: "예: 프론트엔드 개발자, 마케팅팀 (또는 '모름' / '비공개')",
  },
  {
    key: "eventDateTime",
    label: "면접 일시",
    required: true,
    allowUnknown: true,
    valueType: "DATETIME_OR_RANGE",
    options: [],
    placeholder: "예: 9월 12일 오후 3시, 또는 '9월 초순', '모름'",
  },
  {
    key: "interviewMode",
    label: "면접 방식",
    required: true,
    allowUnknown: true,
    valueType: "SINGLE_OPTION",
    options: [
      { value: "대면", label: "대면" },
      { value: "화상", label: "화상" },
      { value: "전화", label: "전화" },
      { value: "기타", label: "기타" },
      { value: "모름", label: "모름" },
    ],
  },
  {
    key: "interviewStage",
    label: "면접 단계",
    required: true,
    allowUnknown: true,
    valueType: "SINGLE_OPTION",
    options: [
      { value: "1차", label: "1차" },
      { value: "2차", label: "2차" },
      { value: "최종", label: "최종" },
      { value: "기타", label: "기타" },
      { value: "모름", label: "모름" },
    ],
  },
  {
    key: "interviewerCount",
    label: "면접관 수",
    required: true,
    allowUnknown: true,
    valueType: "NUMBER_OR_RANGE_OR_UNKNOWN",
    options: [],
    placeholder: "예: 2명, 3~4명, '여러 명', '모름'",
  },
];

/**
 * 선택 필드 (받으면 richer context, 없어도 진행 가능)
 */
export const optionalFieldRequest = [
  {
    key: "interviewLanguage",
    label: "면접 언어",
    required: false,
    allowUnknown: false,
    valueType: "SINGLE_OPTION",
    options: [
      { value: "한국어", label: "한국어" },
      { value: "영어", label: "영어" },
      { value: "혼합", label: "한국어+영어 혼합" },
      { value: "기타", label: "기타" },
    ],
  },
  {
    key: "durationActualOrPerceived",
    label: "실제 또는 체감 시간",
    required: false,
    allowUnknown: false,
    valueType: "TEXT",
    options: [],
    placeholder: "예: 40분, 1시간 정도, '생각보다 길었다' 등",
  },
  {
    key: "nextRoundOrResultDate",
    label: "다음 전형·결과 예정일",
    required: false,
    allowUnknown: false,
    valueType: "TEXT",
    options: [],
    placeholder: "예: 9월 말, 2주 내, '아직 미정'",
  },
  {
    key: "hasPreparedMaterial",
    label: "준비자료 존재 여부",
    required: false,
    allowUnknown: false,
    valueType: "SINGLE_OPTION",
    options: [
      { value: "있음", label: "있음 (준비자료 있음)" },
      { value: "없음", label: "없음" },
      { value: "모름", label: "모름" },
    ],
  },
];

/**
 * 자연어 질문과 섞지 않기 위한 식별자.
 * objectiveFieldRequest는 폼 스키마로 반환하며, 질문 문자열과 별도 객체로 다룬다.
 */
export const FIELD_REQUEST_TYPE = "OBJECTIVE_FIELD_REQUEST";
