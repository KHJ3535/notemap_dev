/** 🔍 키워드가 너무 광범위(울산, 포항, 서울 강서구 발산동 등)한지 판별 */
export const BROAD_REGIONS = new Set([
  // 광역시
  "서울",
  "서울특별시",
  "부산",
  "부산광역시",
  "대구",
  "대구광역시",
  "인천",
  "인천광역시",
  "광주",
  "광주광역시",
  "대전",
  "대전광역시",
  "울산",
  "울산광역시",
  "세종",
  "세종특별자치시",

  // 도
  "경기",
  "경기도",
  "강원",
  "강원도",
  "충북",
  "충청북도",
  "충남",
  "충청남도",
  "전북",
  "전라북도",
  "전남",
  "전라남도",
  "경북",
  "경상북도",
  "경남",
  "경상남도",
  "제주",
  "제주특별자치도",

  // 국가 단위
  "대한민국",
  "한국",
  "코리아",
]);

// 정규식 상수화 (컴파일 성능 최적화)
// "정확한 주소"가 아닌 경우에도 허용할 시설/기관/교통 키워드
const FACILITY_TOKEN_REGEX =
  /(역|병원|의원|약국|마트|백화점|타워|센터|아파트|빌라|오피스텔|대학|대학교|고등학교|중학교|초등학교|시청|구청|군청|청사|카페|편의점|호텔|모텔)/;

const CITY_GU_GUN_REGEX = /시|구|군/;
const DONG_ENDING_REGEX = /(동|읍|면|리)(\s|$)/;
const HAS_NUMBER_REGEX = /\d/;

// "동 주소" 패턴: 시/구/군 + 동/읍/면/리로 끝나는 주소(숫자/시설토큰 없이)
function looksLikeDongLevelAddress(keyword: string): boolean {
  return CITY_GU_GUN_REGEX.test(keyword) && DONG_ENDING_REGEX.test(keyword);
}

export function isTooBroadKeyword(raw: string): boolean {
  const keyword = raw.trim();
  if (!keyword) return true;

  // 공백 제거 (예: '울산 광역시' → '울산광역시')
  const normalized = keyword.replace(/\s+/g, "");

  // 1 & 2) 도/시/국가 단위 이름과 완전 일치 혹은 뒤에 '시'만 붙은 케이스 광역 처리
  const stripped = normalized.replace(/시$/, "");
  if (BROAD_REGIONS.has(normalized) || BROAD_REGIONS.has(stripped)) {
    return true;
  }

  // 3) 숫자(번지/건물 번호)가 있으면 "정확한 주소 후보"로 보고 허용
  //    예: "서울 강서구 발산동 123-45", "목동 123"
  if (HAS_NUMBER_REGEX.test(keyword)) return false;

  // 4) 시/구/군 + 동/읍/면/리까지만 있는 "동 주소"면 광역으로 간주하고 막기
  //    예: "서울 강서구 발산동", "수원 장안구 율전동"
  //    (시설 토큰 검증보다 먼저 실행하여 '강남구 역삼동'에서 '역'이 매칭되어 허용되는 버그 방지)
  if (looksLikeDongLevelAddress(keyword)) return true;

  // 5) 시설/기관/교통 키워드가 있으면 키워드 검색 허용
  //    예: "울산시청", "강남병원", "강남역", "목동자이아파트", "약국", "카페"
  if (FACILITY_TOKEN_REGEX.test(keyword)) return false;

  // 6) 한 글자/두 글자 짧은 검색어는 5번 조건(약국 등)에 해당하지 않으면 대부분 모호하니 컷
  //    예: "울산", "포항", "강남", "당진" 등
  if (keyword.length <= 2) return true;

  // 7) 그 외는 키워드(단지명/건물이름 등)로 보고 허용
  //    예: "래미안강남힐즈", "목동자이", "해운대두산위브더제니스"
  return false;
}

/** 
 * 광역 키워드로 판단되었을 때, 어떤 줌 레벨로 보여줄지 결정 
 * (시/도 단위는 더 넓게, 구/군/동 단위는 덜 넓게)
 */
export function getBroadKeywordZoomLevel(raw: string): number {
  const keyword = raw.trim();
  const normalized = keyword.replace(/\s+/g, "");
  const stripped = normalized.replace(/시$/, "");

  // 1) "서울", "경기도" 같은 1-depth 도/시/국가 단위면 적당히 넒게 (레벨 8)
  // 이전: 10 (너무 작아 한눈에 다 보임)
  if (BROAD_REGIONS.has(normalized) || BROAD_REGIONS.has(stripped)) {
    return 8;
  }

  // 2) 길이 단위별 "동 주소" 패턴이나 구체적 뎁스면 조금 더 확대 (레벨 6)
  // 이전: 8
  return 6;
}
