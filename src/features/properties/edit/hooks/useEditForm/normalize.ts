import { PinKind } from "@/features/pins/types";
import { toPy } from "@/features/properties/lib/area";

import {
  type BuildingType,
  normalizeBuildingTypeLabelToEnum,
  BUILDING_TYPES,
  OrientationValue,
  Registry,
  Grade,
  UnitLine,
} from "@/features/properties/types/property-domain";
import { AreaSet, AspectRowLite } from "../../types/editForm.types";
import { StarStr } from "@/features/properties/types/property-dto";

/* ───────────── 유틸 ───────────── */

const asStr = (v: unknown) => (v == null ? "" : String(v));

const asYMD = (v: unknown) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = asStr(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
};

const asNum = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const asOptionalNum = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const unpackRange = (s: unknown): { min: string; max: string } => {
  const raw = asStr(s).trim();
  if (!raw) return { min: "", max: "" };
  const [min, max] = raw.split("~", 2);
  return { min: (min ?? "").trim(), max: (max ?? "").trim() };
};

const pickOrientation = (o: unknown): OrientationValue | "" =>
  ((o as any)?.dir ?? (o as any)?.direction ?? (o as any)?.value ?? "") as
    | OrientationValue
    | "";

/* ───────── Registry 정규화 ───────── */
function normalizeRegistry(v: unknown): Registry | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = s
    .replace(/\s+/g, "") // "확인 필요" -> "확인필요"
    .replace(/등기완료?$/g, "완료") // "등기완료" -> "완료"
    .replace(/^미등기$/g, "미완료"); // "미등기" -> "미완료"

  return (["확인필요", "완료", "미완료"] as const).includes(n as any)
    ? (n as Registry)
    : undefined;
}

/* ───────── buildingType 정규화 ───────── */
function normalizeBuildingType(input: unknown): BuildingType | null {
  if (typeof input === "number") {
    switch (input) {
      case 1:
        return "주택";
      case 2:
        return "APT";
      case 3:
        return "OP";
      case 4:
        return "도생";
      case 5:
        return "근생";
      default:
        return null;
    }
  }

  const raw = asStr(input).trim();
  if (!raw) return null;

  if ((BUILDING_TYPES as readonly string[]).includes(raw)) {
    return raw as BuildingType;
  }
  return normalizeBuildingTypeLabelToEnum(raw);
}

/* ───────── Normalized 타입 ───────── */
type Normalized = {
  pinKind: PinKind;
  title: string;
  address: string;
  officePhone: string;
  officePhone2: string;
  officeName: string;
  moveIn: string;
  floor: string;
  roomNo: string;
  structure: string;

  listingStars: number;
  parkingGrade: StarStr;
  /** 주차 유형 (문자열) */
  parkingType: string | null;
  /** 주차 유형 다중 선택 */
  parkingTypes: string[];
  totalParkingSlots: string;
  completionDate: string;
  salePrice: string;

  baseArea: AreaSet;
  extraAreas: AreaSet[];

  elevator: "O" | "X";
  registryOne: Registry | undefined;
  slopeGrade: Grade | undefined;
  structureGrade: Grade | undefined;

  totalBuildings: string;
  totalFloors: string;
  totalHouseholds: string;
  remainingHouseholds: string;

  options: string[];
  optionEtc: string;
  etcChecked: boolean;
  publicMemo: string;
  secretMemo: string;
  unitLines: UnitLine[];

  aspects: AspectRowLite[];
  buildingType: BuildingType | null;
  /** 건물유형 다중 선택 */
  buildingTypes: string[];

  /** 리베이트(만원 단위 텍스트) */
  rebateText: string;
};

/* ───────── 메인 Normalizer ───────── */
export function normalizeInitialData(initialData: any | null): Normalized {
  const d = initialData ?? {};

  // ───────── 면적(기본) ─────────
  const ex = unpackRange(d.exclusiveArea);
  const re = unpackRange(d.realArea);
  const baseAreaTitle = asStr(
    d.baseAreaTitle ?? d.areaTitle ?? d.areaSetTitle ?? ""
  );

  const baseArea: AreaSet = {
    title: baseAreaTitle,
    exMinM2: ex.min,
    exMaxM2: ex.max,
    exMinPy: toPy(ex.min),
    exMaxPy: toPy(ex.max),
    realMinM2: re.min,
    realMaxM2: re.max,
    realMinPy: toPy(re.min),
    realMaxPy: toPy(re.max),
  };

  // ───────── 면적(추가) ─────────
  const extraExclusive = Array.isArray(d.extraExclusiveAreas)
    ? d.extraExclusiveAreas
    : [];
  const extraReal = Array.isArray(d.extraRealAreas) ? d.extraRealAreas : [];
  const extraTitles =
    (Array.isArray(d.extraAreaTitles) && d.extraAreaTitles.map(asStr)) ||
    (Array.isArray(d.areaSetTitles) && d.areaSetTitles.map(asStr)) ||
    [];
  const len = Math.max(
    extraExclusive.length,
    extraReal.length,
    extraTitles.length
  );

  const extraAreas: AreaSet[] = Array.from({ length: len }, (_, i) => {
    const exi = unpackRange(extraExclusive[i] ?? "");
    const rei = unpackRange(extraReal[i] ?? "");
    const title = asStr(extraTitles[i] ?? "");

    const hasAny = title || exi.min || exi.max || rei.min || rei.max;
    if (!hasAny) return null as any;

    return {
      title: title || `세트 ${i + 1}`,
      exMinM2: exi.min,
      exMaxM2: exi.max,
      exMinPy: toPy(exi.min),
      exMaxPy: toPy(exi.max),
      realMinM2: rei.min,
      realMaxM2: rei.max,
      realMinPy: toPy(rei.min),
      realMaxPy: toPy(rei.max),
    };
  }).filter((v): v is AreaSet => Boolean(v));

  // ───────── 향/aspects ─────────
  const aspects: AspectRowLite[] =
    Array.isArray(d.orientations) && d.orientations.length
      ? (d.orientations as unknown[]).map((o, idx) => ({
          no: idx + 1,
          dir: pickOrientation(o),
        }))
      : ([d.aspect1, d.aspect2, d.aspect3].filter(Boolean).map((dir, i) => ({
          no: i + 1,
          dir: (dir as OrientationValue) ?? "",
        })) as AspectRowLite[]);

  // ───────── 주차 ─────────
  const rawParkingType = asStr(
    d.parkingType ?? d.parkingTypeName ?? d.parkingTypeLabel ?? d.parking?.type
  ).trim();
  const parkingType: string | null = rawParkingType ? rawParkingType : null;

  const parkingTypes: string[] = Array.isArray(d.parkingTypes)
    ? (d.parkingTypes as string[])
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
    : parkingType
    ? [parkingType]
    : [];

  const totalParkingSlots = asStr(
    d.totalParkingSlots ?? d.parking?.totalSlots ?? ""
  );

  // 평점
  const rawPg = asStr(d.parkingGrade).trim();
  const listingStars = asNum(d.listingStars, 0);
  const parkingGrade: StarStr = (["1", "2", "3", "4", "5"] as const).includes(
    rawPg as any
  )
    ? (rawPg as StarStr)
    : ((listingStars >= 1 && listingStars <= 5
        ? String(listingStars)
        : "") as StarStr);

  // ───────── units → unitLines (DB 값 ÷ 1000000 → 백만원 단위로 표시, 등록과 동일) ─────────
  const unitLines: UnitLine[] = Array.isArray(d.units)
    ? (d.units as any[]).map((u) => {
        const minVal = u?.minPrice;
        const maxVal = u?.maxPrice;
        const primary =
          minVal == null || minVal === ""
            ? ""
            : String(Number(minVal) / 1000000);
        const secondary =
          maxVal == null || maxVal === ""
            ? ""
            : String(Number(maxVal) / 1000000);
        return {
          rooms: asNum(u?.rooms ?? 0, 0),
          baths: asNum(u?.baths ?? 0, 0),
          duplex: !!u?.hasLoft,
          terrace: !!u?.hasTerrace,
          primary,
          secondary,
        };
      })
    : Array.isArray(d.unitLines)
    ? (d.unitLines as UnitLine[])
    : [];

  // 🔥 buildingType 정규화
  const buildingTypeSource = d.buildingType ?? d.propertyType ?? d.type ?? null;
  const buildingType: BuildingType | null =
    normalizeBuildingType(buildingTypeSource);

  // building_type 무시, building_types만 사용
  const buildingTypes: string[] = Array.isArray(d.buildingTypes)
    ? (d.buildingTypes as string[])
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
    : [];

  /* ───────── 옵션/직접입력/리베이트 ───────── */

  // 1) options: 서버 객체 → 라벨 배열
  const optionsFromServer = d.options;
  let options: string[] = [];

  if (Array.isArray(optionsFromServer)) {
    // 예전 형식이면 그대로 (뷰에서 Enum 필드가 포함될 수 있으므로 필터링)
    const enumLabels = new Set([
      "주방구조 ㄱ",
      "주방구조 ㄷ",
      "주방구조 일자",
      "냉장고자리 1",
      "냉장고자리 2",
      "냉장고자리 3",
      "쇼파 2인",
      "쇼파 3인",
      "쇼파 4인",
      "뻥뷰",
      "평범",
      "막힘",
    ]);
    options = optionsFromServer
      .map(asStr)
      .filter(Boolean)
      .filter((label) => !enumLabels.has(label));
  } else if (optionsFromServer && typeof optionsFromServer === "object") {
    const o = optionsFromServer as any;
    if (o.hasAircon) options.push("에어컨");
    if (o.hasFridge) options.push("냉장고");
    if (o.hasWasher) options.push("세탁기");
    if (o.hasDryer) options.push("건조기");
    if (o.hasBidet) options.push("비데");
    if (o.hasAirPurifier) options.push("공기순환기");
    if (o.hasIslandTable) options.push("아일랜드 식탁");
    if (o.hasKitchenWindow) options.push("주방창");
    if (o.hasCityGas) options.push("도시가스");
    if (o.hasInduction) options.push("인덕션");
  }

  // 2) 직접입력 텍스트: extraOptionsText + 여러 백필드에서 추출
  const optionEtc = asStr(
    d.extraOptionsText ??
      d.options?.extraOptionsText ??
      d.optionEtc ??
      d.optionsEtc ??
      d.option_etc ??
      d.optionEtcText ??
      ""
  );
  const etcChecked = optionEtc.trim().length > 0;

  // 3) 리베이트 텍스트
  const rebateText = asStr(
    d.rebateText ?? d.rebateMemo ?? d.rebate ?? ""
  ).trim();

  // 엘리베이터: 서버 값 -> "O" | "X"
  const elevator: "O" | "X" = (() => {
    const raw = d.elevator ?? d.hasElevator;
    if (raw === "O" || raw === "X") return raw;
    if (raw === true) return "O";
    if (raw === false) return "X";
    return "O";
  })();

  return {
    // 기본
    pinKind: (d.pinKind ?? d.kind ?? d.markerKind ?? "1room") as PinKind,
    title: asStr(d.title ?? d.name),
    address: asStr(d.address ?? d.addressLine),
    officePhone: asStr(d.contactMainPhone ?? d.officePhone),
    officePhone2: asStr(d.contactSubPhone ?? d.officePhone2),
    officeName: asStr(d.contactMainLabel ?? d.officeName),
    moveIn: asStr(d.moveIn),
    floor: asStr(d.floor),
    roomNo: asStr(d.roomNo),
    structure: asStr(d.structure || "3룸"),

    // 별점/주차/준공/매매
    listingStars,
    parkingGrade,
    parkingType,
    parkingTypes,
    totalParkingSlots,
    completionDate: asYMD(d.completionDate),
    salePrice: asStr(d.salePrice ?? d.minRealMoveInCost),

    // 면적
    baseArea,
    extraAreas,

    // 설비/등급/등기
    elevator,
    registryOne: normalizeRegistry(d.registry ?? d.registryOne),
    slopeGrade: d.slopeGrade as Grade | undefined,
    structureGrade: d.structureGrade as Grade | undefined,

    // 숫자
    totalBuildings: asStr(d.totalBuildings),
    totalFloors: asStr(d.totalFloors),
    totalHouseholds: asStr(d.totalHouseholds),
    remainingHouseholds: asStr(d.remainingHouseholds),

    // 옵션/메모/유닛
    options,
    optionEtc,
    etcChecked,
    publicMemo: asStr(d.publicMemo),
    secretMemo: asStr(d.secretMemo ?? d.privateMemo),
    unitLines,

    // 향
    aspects: aspects.length ? aspects : [{ no: 1, dir: "" }],

    // 빌딩 타입
    buildingType,
    buildingTypes,

    // 리베이트
    rebateText,
  };
}
