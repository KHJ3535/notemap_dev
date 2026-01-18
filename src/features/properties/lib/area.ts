/** 1평 = 3.305785㎡ */
export const PYEONG_TO_M2 = 3.305785 as const;

/** 내부 유틸: 숫자/문자 입력을 안전하게 숫자로 정규화 */
function sanitizeNum(input: unknown): number | null {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }
  if (typeof input === "string") {
    // 공백/콤마 제거 → 끝의 단위 토큰 제거(대소문자 무시)
    const cleaned = input
      .trim()
      .replace(/[, ]+/g, "") // "1,234.5 m²" -> "1234.5m²"
      .replace(/(?:㎡|m2|m²|평|py)+$/i, ""); // "1234.5m²" -> "1234.5"
    const n = parseFloat(cleaned.replace(/^\+/, "")); // +부호 허용
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** 소수 자릿수 정규화 (기본 2, 음수/NaN 방지) */
function normDecimals(d?: number): number {
  const n = Number.isFinite(d as number) ? Math.floor(d as number) : 2;
  return n >= 0 ? n : 2;
}

/** ㎡ → 평 (소수 n자리, 기본 2자리) */
export const toPy = (m2?: string | number, decimals = 2): string => {
  const n = sanitizeNum(m2);
  if (n == null) return "";
  return (n / PYEONG_TO_M2).toFixed(normDecimals(decimals));
};

/** 평 → ㎡ (소수 n자리, 기본 2자리) */
export const toM2 = (py?: string | number, decimals = 2): string => {
  const n = sanitizeNum(py);
  if (n == null) return "";
  return (n * PYEONG_TO_M2).toFixed(normDecimals(decimals));
};

/** "a~b" 포맷으로 합치기 (a/b 빈칸 허용) */
export const packRange = (a: string, b: string): string => {
  const A = (a ?? "").trim();
  const B = (b ?? "").trim();
  if (A && B) return `${A}~${B}`;
  if (A) return `${A}~`;
  if (B) return `~${B}`;
  return "";
};

/** "a~b" → { min, max } 로 풀기 (없으면 빈문자열) */
const unpackRange = (range?: string | null): { min: string; max: string } => {
  const raw = String(range ?? "").trim();
  if (!raw) return { min: "", max: "" };
  const [min, max] = raw.split("~", 2);
  return { min: (min ?? "").trim(), max: (max ?? "").trim() };
};

/** "m2Min~m2Max|pyMin~pyMax" 또는 "m2Min~m2Max" 또는 "pyMin~pyMax" 지원
 *  - m² 파트가 있으면 그대로 사용
 *  - 평 파트만 있으면 평→m² 변환해서 반환
 */
export const parsePackedRangeToM2 = (
  packed?: string | null
): { minM2: string; maxM2: string } => {
  const s = String(packed ?? "").trim();
  if (!s) return { minM2: "", maxM2: "" };

  const [m2Part = "", pyPart = ""] = s
    .split("|", 2)
    .map((x) => (x ?? "").trim());

  if (m2Part) {
    const { min, max } = unpackRange(m2Part);
    return { minM2: min, maxM2: max };
  }
  if (pyPart) {
    const { min, max } = unpackRange(pyPart);
    return {
      minM2: min ? toM2(min) : "",
      maxM2: max ? toM2(max) : "",
    };
  }
  return { minM2: "", maxM2: "" };
};

/** "R/B" 문자열을 { rooms, baths } 로 파싱 (여백/이상치 허용) */
export const parsePreset = (s: string) => {
  const [r, b] = String(s)
    .replace(/\s/g, "")
    .split("/", 2)
    .map((n) => parseInt(n, 10));
  return {
    rooms: Number.isFinite(r) ? r : 0,
    baths: Number.isFinite(b) ? b : 0,
  };
};

/* ────────────────────────────────────────────────────────────────────
   ▼ areaGroups 생성 유틸 (신규)
   - UI AreaSet(string 기반) → API DTO(number 기반) 변환
   - 정렬 sortOrder 1부터 자동 부여
   - 스펙: 전용/실평 모두 필수 (㎡)
   ──────────────────────────────────────────────────────────────────── */

import type { CreatePinAreaGroupDto } from "@/features/properties/types/area-group-dto";
import { AreaSet } from "../components/sections/AreaSetsSection/types";

/** "", null, undefined → undefined / 숫자 문자열 → number */
const toNum = (v: unknown): number | undefined => {
  const n = sanitizeNum(v);
  return n == null ? undefined : n;
};

/** m² 우선, 없으면 평→m² 변환 */
const chooseM2 = (m2: unknown, py: unknown): number | undefined => {
  const m = toNum(m2);
  if (m !== undefined) return m;
  const p = toNum(py);
  return p !== undefined ? p * PYEONG_TO_M2 : undefined;
};

/** 단일 AreaSet → CreatePinAreaGroupDto (빈행/필수값 검증 포함) */
function normalizeAreaGroup(s?: AreaSet): CreatePinAreaGroupDto | null {
  if (!s) return null;

  const title = String(s.title ?? "").trim();

  const exMin = chooseM2(s.exMinM2, s.exMinPy);
  const exMax = chooseM2(s.exMaxM2, s.exMaxPy);

  const realMin = chooseM2(s.realMinM2, s.realMinPy);
  const realMax = chooseM2(s.realMaxM2, s.realMaxPy);

  // 완전 빈 행(제목/숫자 모두 없음) 제거
  const hasAny =
    !!title ||
    exMin !== undefined ||
    exMax !== undefined ||
    realMin !== undefined ||
    realMax !== undefined;
  if (!hasAny) return null;

  // 전용/실평 최소·최대 모두 필수 (스펙 반영)
  if (exMin === undefined || exMax === undefined) return null;
  if (realMin === undefined || realMax === undefined) return null;

  const exLo = Math.min(exMin, exMax);
  const exHi = Math.max(exMin, exMax);
  const acLo = Math.min(realMin, realMax);
  const acHi = Math.max(realMin, realMax);

  // 개별 평수 정규화 (units 필드가 있는 경우)
  const units: Array<{ exclusiveM2?: number | null; realM2?: number | null }> | null =
    Array.isArray((s as any).units) && (s as any).units.length > 0
      ? (s as any).units
          .map((u: any) => {
            const exM2 = toNum(u?.exclusiveM2);
            const reM2 = toNum(u?.realM2);
            // 둘 다 없으면 제외
            if (exM2 === undefined && reM2 === undefined) return null;
            return {
              exclusiveM2: exM2 ?? null,
              realM2: reM2 ?? null,
            };
          })
          .filter((u: any): u is { exclusiveM2?: number | null; realM2?: number | null } => u !== null)
      : null;

  return {
    title,
    exclusiveMinM2: Math.max(0, exLo),
    exclusiveMaxM2: Math.max(0, exHi),
    actualMinM2: Math.max(0, acLo),
    actualMaxM2: Math.max(0, acHi),
    ...(units && units.length > 0 ? { units } : {}),
  };
}

/** base + extras → API용 areaGroups (sortOrder 1부터 연속) */
export function buildAreaGroups(
  base: AreaSet,
  extras: AreaSet[]
): CreatePinAreaGroupDto[] {
  const out: CreatePinAreaGroupDto[] = [];
  const first = normalizeAreaGroup(base);
  if (first) out.push(first);

  for (const s of extras ?? []) {
    const n = normalizeAreaGroup(s);
    if (n) out.push(n);
  }

  return out.map((g, i) => ({ ...g, sortOrder: i + 1 }));
}
