"use client";

import { AreaSet } from "../../types/editForm.types";
import { toNumericStringOrUndefined } from "./utils";

/* ───────── areaGroups 정규화/비교 ───────── */
type AreaUnitPayload = {
  exclusiveM2?: number | null;
  realM2?: number | null;
};

type AreaGroupPayload = {
  title: string;
  exclusiveMinM2: number | null;
  exclusiveMaxM2: number | null;
  actualMinM2: number | null;
  actualMaxM2: number | null;
  sortOrder: number;
  units?: AreaUnitPayload[] | null;
};

const toNumOrNullFromAny = (v: any): number | null => {
  const s = toNumericStringOrUndefined(v as any);
  if (s === undefined) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** UI AreaSet → 서버 areaGroups payload */
export const areaSetsToGroups = (
  base?: AreaSet,
  extras?: AreaSet[],
  baseTitleOut?: string,
  extraTitlesOut?: string[]
): AreaGroupPayload[] => {
  const items: { set: any; title?: string | null }[] = [];

  if (base) {
    items.push({
      set: base,
      title: baseTitleOut ?? (base as any).title ?? null,
    });
  }

  (extras ?? []).forEach((s, idx) => {
    items.push({
      set: s,
      title: extraTitlesOut?.[idx] ?? (s as any).title ?? null,
    });
  });

  const groups: AreaGroupPayload[] = [];

  items.forEach(({ set, title }, idx) => {
    const exMin = toNumOrNullFromAny(
      set?.exclusiveMinM2 ?? set?.exclusiveMin ?? set?.m2Min
    );
    const exMax = toNumOrNullFromAny(
      set?.exclusiveMaxM2 ?? set?.exclusiveMax ?? set?.m2Max
    );
    const acMin = toNumOrNullFromAny(
      set?.actualMinM2 ?? set?.realMinM2 ?? set?.realMin
    );
    const acMax = toNumOrNullFromAny(
      set?.actualMaxM2 ?? set?.realMaxM2 ?? set?.realMax
    );

    const rawTitle = (title ?? "").toString().trim();
    const finalTitle = rawTitle || String(idx + 1);

    const isEmpty =
      !rawTitle &&
      exMin == null &&
      exMax == null &&
      acMin == null &&
      acMax == null;
    if (isEmpty) return;

    // 개별 평수 정규화 (units 필드가 있는 경우)
    const units: AreaUnitPayload[] | null =
      Array.isArray(set?.units) && set.units.length > 0
        ? set.units
            .map((u: any) => {
              const exM2 = toNumOrNullFromAny(u?.exclusiveM2);
              const reM2 = toNumOrNullFromAny(u?.realM2);
              // 둘 다 null이면 제외
              if (exM2 === null && reM2 === null) return null;
              return {
                exclusiveM2: exM2,
                realM2: reM2,
              };
            })
            .filter((u: any): u is AreaUnitPayload => u !== null)
        : null;

    groups.push({
      title: finalTitle,
      exclusiveMinM2: exMin,
      exclusiveMaxM2: exMax,
      actualMinM2: acMin,
      actualMaxM2: acMax,
      sortOrder: idx,
      ...(units && units.length > 0 ? { units } : {}),
    });
  });

  return groups;
};

/** areaGroups 비교용: sortOrder는 무시하고 값만 비교 */
export const normalizeAreaGroupsForCompare = (groups: any[] | undefined) => {
  if (!Array.isArray(groups)) return [] as AreaGroupPayload[];
  return groups.map((g: any, idx: number) => ({
    title: (g.title ?? "").toString().trim() || String(idx + 1),
    exclusiveMinM2: toNumOrNullFromAny(
      g.exclusiveMinM2 ?? g.exclusiveMin ?? g.exMinM2
    ),
    exclusiveMaxM2: toNumOrNullFromAny(
      g.exclusiveMaxM2 ?? g.exclusiveMax ?? g.exMaxM2
    ),
    actualMinM2: toNumOrNullFromAny(g.actualMinM2 ?? g.realMinM2 ?? g.realMin),
    actualMaxM2: toNumOrNullFromAny(g.actualMaxM2 ?? g.realMaxM2 ?? g.realMax),
    sortOrder: 0, // 비교에서는 무시
  }));
};
