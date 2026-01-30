"use client";

import { buildOrientationFields } from "@/features/properties/lib/orientation";
import { setPack } from "@/features/properties/lib/validators";
import type {
  CreatePayload,
  StarStr,
} from "@/features/properties/types/property-dto";
import { todayYmdKST } from "@/shared/date/todayYmdKST";
import { buildAreaGroups } from "@/features/properties/lib/area";
import type { CreatePinAreaGroupDto } from "@/features/properties/types/area-group-dto";
import { PinKind } from "@/features/pins/types";

import { toNum, toIntOrNullLocal, toNumOrNullLocal, s } from "./numeric";
import { normalizeUnits } from "./normalizeUnits";
import { buildOptionsForServer } from "./options";
import { buildImages } from "./images";
import type { BuildArgs } from "./types";
import { toStrictAreaSet } from "./types";

/* 로컬 타입: 향/방향 배열 요소 */
type OrientationOut = { ho: number; value: string };

export function buildCreatePayload(args: BuildArgs) {
  console.log(
    "[buildCreatePayload] args.isNew/isOld =",
    args.isNew,
    args.isOld
  );

  const {
    title,
    address,
    officeName,
    officePhone,
    officePhone2,
    moveIn,
    floor,
    roomNo,
    structure,

    badge,

    parkingGrade,
    parkingType,
    totalParkingSlots,
    completionDate,

    minRealMoveInCost,
    rebateText,

    baseAreaSet: baseAreaSetRaw,
    extraAreaSets: extraAreaSetsRaw,

    elevator,
    isNew,
    isOld,
    registryOne,
    slopeGrade,
    structureGrade,

    totalBuildings,
    totalFloors,
    totalHouseholds,
    remainingHouseholds,

    buildingType,
    registrationTypeId,

    options,
    publicMemo,
    secretMemo,
    kitchenLayout,
    fridgeSlot,
    sofaSize,
    livingRoomView,
    aspects,
    unitLines,

    imageFolders,
    fileItems,

    lat,
    lng,

    pinKind,
    pinDraftId,
  } = args;

  /* 1) 면적 정규화 */
  const baseAreaSet = toStrictAreaSet(baseAreaSetRaw);
  const extraAreaSets = (
    Array.isArray(extraAreaSetsRaw) ? extraAreaSetsRaw : []
  ).map(toStrictAreaSet);

  const effectiveCompletionDate = s(completionDate) || todayYmdKST();

  /* 2) 향/방향 필드 */
  const { orientations, aspect, aspectNo, aspect1, aspect2, aspect3 } =
    buildOrientationFields(aspects);

  const directions =
    Array.isArray(orientations) && orientations.length > 0
      ? orientations
          .map((o) => String(o?.value ?? "").trim())
          .filter((v) => v.length > 0)
          .map((direction) => ({ direction }))
      : undefined;

  /* 3) 면적 패킹 (레거시 호환) */
  const exclusiveArea = setPack(
    baseAreaSet.exMinM2,
    baseAreaSet.exMaxM2,
    baseAreaSet.exMinPy,
    baseAreaSet.exMaxPy
  );
  const realArea = setPack(
    baseAreaSet.realMinM2,
    baseAreaSet.realMaxM2,
    baseAreaSet.realMinPy,
    baseAreaSet.realMaxPy
  );
  const extraExclusiveAreas = extraAreaSets.map((s0) =>
    setPack(s0.exMinM2, s0.exMaxM2, s0.exMinPy, s0.exMaxPy)
  );
  const extraRealAreas = extraAreaSets.map((s0) =>
    setPack(s0.realMinM2, s0.realMaxM2, s0.realMinPy, s0.realMaxPy)
  );

  const baseAreaTitle = (baseAreaSet.title ?? "").trim();
  const extraAreaTitles = extraAreaSets.map((s0) => (s0.title ?? "").trim());

  // 신규 면적 그룹
  const areaGroups: CreatePinAreaGroupDto[] = buildAreaGroups(
    baseAreaSet,
    extraAreaSets
  );

  /* 4) 이미지/파일 정규화 */
  const {
    imageFoldersStored,
    imageCardsUI,
    imageCardCounts,
    verticalImagesStored,
    verticalImagesUI,
    imageFoldersRaw,
    imageFolderTitles,
    fileItemsRaw,
    imagesFlatStrings,
  } = buildImages(imageFolders, fileItems);

  /* 5) 기타 정규화 */
  const hasElevator =
    elevator === "O" ? true : elevator === "X" ? false : undefined;

  const safeBadge = s(badge);
  const normalizedTotalParkingSlots = toIntOrNullLocal(totalParkingSlots);
  const minRealMoveInCostValue = toIntOrNullLocal(minRealMoveInCost);
  const rebateTextSafe = s(rebateText);

  // ─────────────────────────────────────────────
  // 서버 전송용 units: 구조별 최소/최대 매매가 + 복층/테라스 반영
  // ─────────────────────────────────────────────
  const unitsBase = normalizeUnits(unitLines);
  const unitsForServer = unitsBase.map((u: any, idx: number) => {
    const src =
      Array.isArray(unitLines) && unitLines[idx] ? unitLines[idx] : ({} as any);

    const rawMin =
      (src as any).primary ?? (src as any).minPrice ?? (src as any).min ?? null;
    const rawMax =
      (src as any).secondary ??
      (src as any).maxPrice ??
      (src as any).max ??
      null;
    /** 구조별 입력(백만원) → sanitizeUnits에서 무조건 × 1000000 적용 */
    const minPrice = toNumOrNullLocal(rawMin);
    const maxPrice = toNumOrNullLocal(rawMax);

    // 복층/테라스 → hasLoft/hasTerrace로 강제 매핑
    const rawLoft =
      (src as any).duplex ?? (src as any).hasLoft ?? (src as any).loft ?? false;
    const rawTerrace = (src as any).terrace ?? (src as any).hasTerrace ?? false;

    const hasLoft = !!rawLoft;
    const hasTerrace = !!rawTerrace;

    return {
      ...u,
      hasLoft,
      hasTerrace,
      minPrice,
      maxPrice,
    };
  });

  // 옵션: 배열만 받아서 서버 DTO(CreatePinOptionsDto)에 맞게 변환
  //    - buildOptionsForServer 내부에서 extraOptionsText까지 구성
  const optionsForServerBase = buildOptionsForServer(options ?? []);
  
  const optionsForServer: any = {
    ...optionsForServerBase,
    // Nullable Enum 4개 (별도 관리)
    kitchenLayout: kitchenLayout ?? null,
    fridgeSlot: fridgeSlot ?? null,
    sofaSize: sofaSize ?? null,
    livingRoomView: livingRoomView ?? null,
  };

  /* 6) 최종 payload 조립 */
  const payload: CreatePayload & {
    imageFolders: typeof imageFoldersStored;
    imageCards: typeof imageCardsUI;
    imageCardCounts: number[];
    verticalImages: typeof verticalImagesStored;
    imagesVertical?: typeof verticalImagesStored;
    images: string[];
    fileItems?: typeof verticalImagesUI;
    extraExclusiveAreas: string[];
    extraRealAreas: string[];
    baseAreaTitle?: string;
    extraAreaTitles?: string[];
    areaSetTitle?: string;
    areaSetTitles?: string[];
    areaGroups?: CreatePinAreaGroupDto[];
    pinKind?: PinKind;

    imageFoldersRaw: typeof imageFoldersRaw;
    imageFolderTitles?: string[];
    fileItemsRaw: typeof fileItemsRaw;

    pinDraftId?: number | string | null;
    lat?: number;
    lng?: number;

    units: any[]; // 항상 존재
    unitLines?: typeof unitLines;

    orientations?: OrientationOut[];
    aspect?: string;
    aspectNo?: string;
    aspect1?: string;
    aspect2?: string;
    aspect3?: string;
    directions?: { direction: string }[];
  } = {
    /* 기본 */
    title,

    address,
    officeName,
    officePhone,
    officePhone2,
    moveIn,
    floor,
    roomNo,
    structure,

    // 연락처 통일 키
    contactMainLabel: officeName?.trim() || "문의",
    contactMainPhone: officePhone,
    ...(officePhone2 && officePhone2.trim() !== ""
      ? {
          contactSubLabel: officeName?.trim() || "사무실",
          contactSubPhone: officePhone2,
        }
      : {}),

    ...(safeBadge ? { badge: safeBadge.slice(0, 30) } : {}),

    /* 향/방향 */
    aspect,
    aspectNo,
    ...(aspect1 ? { aspect1 } : {}),
    ...(aspect2 ? { aspect2 } : {}),
    ...(aspect3 ? { aspect3 } : {}),
    orientations,
    ...(directions ? { directions } : {}),

    // 주차 유형: 값 있을 때만 전송 (trim 후)
    ...(s(parkingType) ? { parkingType: s(parkingType) } : {}),

    // 총 주차 대수: null 제외(0 허용)
    ...(normalizedTotalParkingSlots === null
      ? {}
      : { totalParkingSlots: normalizedTotalParkingSlots }),

    // 날짜는 빈값이면 오늘(KST)
    completionDate: effectiveCompletionDate,

    /* 면적 (레거시 호환) */
    exclusiveArea,
    realArea,
    extraExclusiveAreas,
    extraRealAreas,

    /* 신규: 면적 그룹 */
    ...(areaGroups.length ? { areaGroups } : {}),

    // 매물평점 — '1'~'5' 문자열 그대로 전송(빈값은 제외)
    ...(String(parkingGrade || "").trim()
      ? { parkingGrade: parkingGrade as StarStr }
      : {}),

    ...(minRealMoveInCostValue === null
      ? {}
      : { minRealMoveInCost: minRealMoveInCostValue }),

    // 리베이트 텍스트: 문자열 있으면 전송
    ...(rebateTextSafe ? { rebateText: rebateTextSafe } : {}),

    // 엘리베이터: 선택한 경우에만 전송 → hasElevator(boolean)
    ...(hasElevator !== undefined ? { hasElevator } : {}),

    // 신축/구옥 여부: boolean 인 경우만 전송
    ...(typeof isNew === "boolean" ? { isNew } : {}),
    ...(typeof isOld === "boolean" ? { isOld } : {}),

    // 단지 숫자들
    ...(toNum(totalBuildings) !== undefined
      ? { totalBuildings: toNum(totalBuildings)! }
      : {}),
    ...(toNum(totalFloors) !== undefined
      ? { totalFloors: toNum(totalFloors)! }
      : {}),
    ...(toNum(totalHouseholds) !== undefined
      ? { totalHouseholds: toNum(totalHouseholds)! }
      : {}),
    ...(toNum(remainingHouseholds) !== undefined
      ? { remainingHouseholds: toNum(remainingHouseholds)! }
      : {}),

    slopeGrade,
    structureGrade,

    // 서버용 옵션 DTO (hasAircon... + extraOptionsText 포함)
    options: optionsForServer,

    publicMemo,
    secretMemo,
    privateMemo: secretMemo,
    registry: registryOne,

    // UI 보존용
    unitLines,

    //  서버 전송용(항상 포함)
    units: unitsForServer,

    /* 이미지/파일 */
    imageFolders: imageFoldersStored,
    imageCards: imageCardsUI,
    imageCardCounts,
    verticalImages: verticalImagesStored,
    imagesVertical: verticalImagesStored,
    images: imagesFlatStrings,
    fileItems: verticalImagesUI,

    imageFoldersRaw,
    imageFolderTitles,
    fileItemsRaw,

    /* 분류/제목 레거시 */
    ...(pinKind ? { pinKind } : {}),
    baseAreaTitle,
    extraAreaTitles,
    areaSetTitle: baseAreaTitle,
    areaSetTitles: extraAreaTitles,

    /* 분류/ID */
    ...(s(buildingType) ? { buildingType: s(buildingType) } : {}),
    ...(toNum(registrationTypeId) !== undefined
      ? { registrationTypeId: toNum(registrationTypeId)! }
      : {}),

    /* 좌표 */
    ...(lat != null
      ? { lat: typeof lat === "number" ? lat : Number(String(lat).trim()) }
      : {}),
    ...(lng != null
      ? { lng: typeof lng === "number" ? lng : Number(String(lng).trim()) }
      : {}),

    pinDraftId: pinDraftId ?? null,
  };

  return payload;
}
