import { OrientationRow, OrientationValue } from "../../types/property-domain";
import { PropertyViewDetails } from "../../view/types";
import { mapBadgeToPinKind } from "../badge";

/** 서버 핀 상세 타입 */
export type ApiPin = {
  id: string | number;
  lat: number;
  lng: number;
  name?: string | null;
  badge?: string | null;
  addressLine?: string | null;
  completionDate?: string | null;

  ageType?: "NEW" | "OLD" | null;

  buildingType?: "APT" | "OP" | "주택" | "근생" | string | null;
  /** ✅ 건물유형 배열 (등기 표시용) */
  buildingTypes?: string[] | null;

  /** ✅ 숫자 필드들 */
  totalBuildings?: number | null;
  totalFloors?: number | null;
  totalHouseholds?: number | null;
  totalParkingSlots?: number | null;
  remainingHouseholds?: number | null;

  /** ✅ 주차유형: 서버에서 문자열로 받기 */
  parkingType?: string | null;

  slopeGrade?: string | null;
  structureGrade?: string | null;

  /** ✅ 매물평점 (서버 문자열 "1"~"5" 또는 null) */
  parkingGrade?: string | null;
  hasElevator?: boolean | null;

  /** ✅ 연락처(서버 → 뷰) */
  contactMainLabel?: string | null;
  contactMainPhone?: string | null;
  contactSubLabel?: string | null;
  contactSubPhone?: string | null;

  /** ✅ 금액(서버 → 뷰) */
  minRealMoveInCost?: number | null; // 최저 실입(정수)

  /** ✅ 메모(서버 → 뷰) */
  publicMemo?: string | null;
  privateMemo?: string | null;

  options?: {
    hasAircon?: boolean | null;
    hasFridge?: boolean | null;
    hasWasher?: boolean | null;
    hasDryer?: boolean | null;
    hasBidet?: boolean | null;
    hasAirPurifier?: boolean | null;
    isDirectLease?: boolean | null;
    extraOptionsText?: string | null;

    // Nullable Enum 필드
    kitchenLayout?: "G" | "D" | "LINE" | null;
    fridgeSlot?: "1" | "2" | "3" | null;
    sofaSize?: "SEAT_2" | "SEAT_3" | "SEAT_4" | null;
    livingRoomView?: "OPEN" | "NORMAL" | "BLOCKED" | null;

    // Boolean 필드
    hasIslandTable?: boolean | null;
    hasKitchenWindow?: boolean | null;
    hasCityGas?: boolean | null;
    hasInduction?: boolean | null;
  } | null;

  /** 서버 directions 그대로 수용 */
  directions?: Array<{ direction?: string | null }> | null;

  areaGroups?: Array<{
    title?: string | null;
    exclusiveMinM2?: number | null;
    exclusiveMaxM2?: number | null;
    actualMinM2?: number | null;
    actualMaxM2?: number | null;
    sortOrder?: number | null;
  }> | null;

  /** ✅ 구조별 입력(노트는 서버만 보유, 뷰로는 미노출) */
  units?: Array<{
    rooms?: number | null;
    baths?: number | null;
    hasLoft?: boolean | null;
    hasTerrace?: boolean | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    note?: string | null;
  }> | null;

  /** 🔹 리베이트 텍스트(있다면) */
  rebateText?: string | null;
};

/* ───────────── 유틸 ───────────── */
const toStr = (v: unknown) =>
  typeof v === "string" ? v : v == null ? "" : String(v);

const toYmd = (s?: string | null) =>
  typeof s === "string" && s.length >= 10 ? s.slice(0, 10) : undefined;

function toOrientationRows(
  dirs?: ApiPin["directions"]
): OrientationRow[] | undefined {
  if (!Array.isArray(dirs) || dirs.length === 0) return undefined;
  // ✅ 중복/순서 보존
  const raw = dirs.map((d) => toStr(d?.direction).trim()).filter(Boolean);
  return raw.map((dir, i) => ({
    ho: i + 1,
    value: dir as unknown as OrientationValue,
  }));
}

function boolToOX(b?: boolean | null): "O" | "X" | undefined {
  if (b === true) return "O";
  if (b === false) return "X";
  return undefined;
}

/** buildingType → 라벨 (표시용) */
const BUILDING_TYPE_LABEL: Record<string, string> = {
  APT: "아파트",
  OP: "오피스텔",
  주택: "주택",
  근생: "근생",
};

/** "상/중/하" → Grade 유니온 */
function toGrade(g?: string | null) {
  const v = (g ?? "").trim();
  return v === "상" || v === "중" || v === "하" ? (v as any) : undefined;
}

/** 옵션 → 라벨 배열 */
function toOptionLabels(o?: ApiPin["options"]): string[] | undefined {
  if (!o) return undefined;
  const labels: string[] = [];
  if (o.hasAircon) labels.push("에어컨");
  if (o.hasFridge) labels.push("냉장고");
  if (o.hasWasher) labels.push("세탁기");
  if (o.hasDryer) labels.push("건조기");
  if (o.hasBidet) labels.push("비데");
  if (o.hasAirPurifier) labels.push("공기순환기");
  if (o.hasIslandTable) labels.push("아일랜드 식탁");
  if (o.hasKitchenWindow) labels.push("주방창");
  if (o.hasCityGas) labels.push("도시가스");
  if (o.hasInduction) labels.push("인덕션");

  // ✅ Enum 필드들도 뱃지로 추가
  if (o.kitchenLayout === "G") labels.push("주방구조 ㄱ");
  if (o.kitchenLayout === "D") labels.push("주방구조 ㄷ");
  if (o.kitchenLayout === "LINE") labels.push("주방구조 일자");
  if (o.fridgeSlot === "1") labels.push("냉장고자리 1");
  if (o.fridgeSlot === "2") labels.push("냉장고자리 2");
  if (o.fridgeSlot === "3") labels.push("냉장고자리 3");
  if (o.sofaSize === "SEAT_2") labels.push("쇼파 2인");
  if (o.sofaSize === "SEAT_3") labels.push("쇼파 3인");
  if (o.sofaSize === "SEAT_4") labels.push("쇼파 4인");
  if (o.livingRoomView === "OPEN") labels.push("뻥뷰");
  if (o.livingRoomView === "NORMAL") labels.push("평범");
  if (o.livingRoomView === "BLOCKED") labels.push("막힘");

  return labels.length ? labels : undefined;
}

/** 숫자 범위 → 'a ~ b' */
function fmtRange(
  min?: number | null,
  max?: number | null
): string | undefined {
  const a = typeof min === "number" && Number.isFinite(min) ? min : undefined;
  const b = typeof max === "number" && Number.isFinite(max) ? max : undefined;
  if (a == null && b == null) return undefined;
  if (a != null && b != null) return `${a} ~ ${b}`;
  return `${a ?? b}`;
}

/** areaGroups → 뷰 요약 */
function mapAreaGroups(api: ApiPin) {
  const groups = Array.isArray(api.areaGroups) ? api.areaGroups.slice() : [];
  if (!groups.length) {
    return {
      baseAreaTitle: undefined as string | undefined,
      extraAreaTitles: undefined as string[] | undefined,
      exclusiveArea: undefined as string | undefined,
      realArea: undefined as string | undefined,
      extraExclusiveAreas: undefined as string[] | undefined,
      extraRealAreas: undefined as string[] | undefined,
    };
  }
  groups.sort(
    (a, b) =>
      (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
  );
  const first = groups[0];
  const rest = groups.slice(1);

  return {
    baseAreaTitle: (first.title ?? undefined) as string | undefined,
    extraAreaTitles:
      rest.map((g) => (g.title ?? "").trim()).filter((t) => t) || undefined,
    exclusiveArea: fmtRange(
      first.exclusiveMinM2 ?? null,
      first.exclusiveMaxM2 ?? null
    ),
    realArea: fmtRange(first.actualMinM2 ?? null, first.actualMaxM2 ?? null),
    extraExclusiveAreas: rest
      .map((g) => fmtRange(g.exclusiveMinM2 ?? null, g.exclusiveMaxM2 ?? null))
      .filter(Boolean) as string[] | undefined,
    extraRealAreas: rest
      .map((g) => fmtRange(g.actualMinM2 ?? null, g.actualMaxM2 ?? null))
      .filter(Boolean) as string[] | undefined,
  };
}

/** 서버 "parkingGrade" 문자열 정규화 → ""|"1"|"2"|"3"|"4"|"5"|undefined */
function normalizeParkingGrade(s?: string | null) {
  const v = (s ?? "").trim();
  return v === "1" || v === "2" || v === "3" || v === "4" || v === "5"
    ? v
    : v === ""
    ? ""
    : undefined;
}

/** ✅ units 정규화(숫자/불리언 캐스팅, note 제거) */
function mapUnits(apiUnits?: ApiPin["units"]):
  | Array<{
      rooms: number;
      baths: number;
      hasLoft: boolean;
      hasTerrace: boolean;
      minPrice?: number | null;
      maxPrice?: number | null;
    }>
  | undefined {
  if (!Array.isArray(apiUnits) || apiUnits.length === 0) return undefined;

  const toIntOrUndef = (x: any): number | undefined => {
    if (typeof x === "number" && Number.isFinite(x)) return Math.trunc(x);
    if (typeof x === "string") {
      const n = Number(x.replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? Math.trunc(n) : undefined;
    }
    return undefined;
  };

  const toBool = (x: any): boolean =>
    x === true ||
    x === "true" ||
    x === 1 ||
    x === "1" ||
    x === "Y" ||
    x === "y";

  return apiUnits.map((u) => ({
    rooms: toIntOrUndef(u?.rooms) ?? 0,
    baths: toIntOrUndef(u?.baths) ?? 0,
    hasLoft: toBool(u?.hasLoft),
    hasTerrace: toBool(u?.hasTerrace),
    minPrice:
      u?.minPrice == null ? undefined : toIntOrUndef(u?.minPrice) ?? null,
    maxPrice:
      u?.maxPrice == null ? undefined : toIntOrUndef(u?.maxPrice) ?? null,
    // note는 버림
  }));
}

/* ───────────── 메인 변환 함수 ───────────── */
export function toViewDetailsFromApi(
  api: ApiPin
): PropertyViewDetails & { lat: number; lng: number } {
  const orientations = toOrientationRows(api.directions);
  const area = mapAreaGroups(api);

  // 등기: buildingType(단일) 우선, 없으면 buildingTypes 배열에서 추출 (쉼표로 연결)
  const registryLabel =
    BUILDING_TYPE_LABEL[String(api.buildingType ?? "")] ??
    api.buildingType ??
    (Array.isArray(api.buildingTypes) && api.buildingTypes.length > 0
      ? api.buildingTypes
          .map((t) => BUILDING_TYPE_LABEL[String(t ?? "")] ?? t)
          .filter(Boolean)
          .join(", ")
      : undefined);

  // ⭐ parkingGrade/별점 변환
  const pg = normalizeParkingGrade(api.parkingGrade);
  const stars = pg ? Number(pg) : 0;

  // 주차 대수(표준/레거시 동시 세팅)
  const tps =
    typeof api.totalParkingSlots === "number" &&
    Number.isFinite(api.totalParkingSlots)
      ? api.totalParkingSlots
      : undefined;

  // ✅ 신규: units 맵핑(뷰로 그대로 넘김; note 제외)
  const units = mapUnits(api.units);

  const view = {
    id: String(api.id),

    /** ✅ 서버 badge → 핀 종류로 역매핑 (PinKind | undefined) */
    pinKind: mapBadgeToPinKind(api.badge),

    title: api.name ?? api.badge ?? undefined,
    address: api.addressLine ?? undefined,

    /** ✅ 연락처 매핑 */
    officePhone: api.contactMainPhone ?? undefined,
    officePhone2: api.contactSubPhone ?? undefined,

    /** ✅ 별점: 서버 문자열과 숫자 동시 보관 */
    parkingGrade: pg, // "1"~"5" | "" | undefined
    listingStars: stars,

    elevator: boolToOX(api.hasElevator),

    /** ✅ 연식 타입(백엔드 ageType 그대로) */
    ageType: api.ageType ?? null,

    /** 준공/등기 */
    completionDate: toYmd(api.completionDate),
    registry: registryLabel as any,

    /** 숫자/주차 */
    totalBuildings: api.totalBuildings ?? undefined,
    totalFloors: api.totalFloors ?? undefined,
    totalHouseholds: api.totalHouseholds ?? undefined,
    remainingHouseholds: api.remainingHouseholds ?? undefined,

    /** ✅ 표준 키 직접 세팅 + 레거시 키 병행 세팅 */
    totalParkingSlots: tps ?? null,
    parkingCount: tps ?? undefined,

    /** ✅ 주차유형은 서버에서 문자열로 바로 수용 */
    parkingType: api.parkingType ?? undefined,

    /** 등급 */
    slopeGrade: toGrade(api.slopeGrade),
    structureGrade: toGrade(api.structureGrade),

    /** 방향 (순서/중복 그대로) */
    orientations,
    aspect1: orientations?.[0]?.value as OrientationValue | undefined,
    aspect2: orientations?.[1]?.value as OrientationValue | undefined,
    aspect3: orientations?.[2]?.value as OrientationValue | undefined,

    /** 옵션 */
    options: toOptionLabels(api.options),
    optionEtc: api.options?.extraOptionsText ?? undefined,

    /** 면적 요약 */
    baseAreaTitle: area.baseAreaTitle,
    extraAreaTitles: area.extraAreaTitles,
    exclusiveArea: area.exclusiveArea,
    realArea: area.realArea,
    extraExclusiveAreas: area.extraExclusiveAreas,
    extraRealAreas: area.extraRealAreas,

    /** ✅ 메모 매핑 */
    publicMemo: api.publicMemo ?? undefined,
    secretMemo: api.privateMemo ?? undefined,

    /** ✅ 최저 실입(정수 금액) */
    minRealMoveInCost: api.minRealMoveInCost ?? undefined,

    /** 리베이트 텍스트 (있으면 뷰로 넘김) */
    rebateText: api.rebateText ?? "",

    /** 미디어/기타 초기화 */
    images: [],
    imageCards: [],
    fileItems: [],

    /** 레거시 라인은 그대로(없으면 undefined) */
    unitLines: undefined,

    /** ✅ 구조별 입력 */
    units,

    /** 레거시 금액은 뷰에 표시하지 않음 */
    salePrice: undefined,

    type: undefined,
    createdByName: undefined,
    createdAt: undefined,
    inspectedByName: undefined,
    inspectedAt: undefined,
    updatedByName: undefined,
    updatedAt: undefined,
  } as PropertyViewDetails;

  return { ...view, lat: api.lat, lng: api.lng };
}
