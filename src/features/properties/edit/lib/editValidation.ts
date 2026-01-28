/* ───────── 전화번호(KR) ───────── */

const normalizePhone = (v: string) => v.replace(/[^\d]/g, "");

/** 한국 전화번호 검증. 휴대/지역/대표번호(1577, 1588, 1544, 1644 등) 지원 */
export const isValidPhoneKR = (raw?: string | null) => {
  const s = (raw ?? "").trim();
  if (!s) return false;
  const v = normalizePhone(s);

  // 대표번호 15xx/16xx/18xx 8자리 또는 10자리
  if (/^1[5-9]\d{2}(\d{4}|\d{6})$/.test(v)) return true;

  if (!/^0\d{9,10}$/.test(v)) return false;
  if (v.startsWith("02")) return v.length === 9 || v.length === 10;
  return v.length === 10 || v.length === 11;
};

/* ───────── 날짜 유틸 ───────── */

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/** 8자리 숫자(YYYYMMDD)는 YYYY-MM-DD로 포맷, 그 외는 트림만 */
export const normalizeDateInput = (raw?: string | null): string => {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^\d{8}$/.test(s)) {
    const y = Number(s.slice(0, 4));
    const m = Number(s.slice(4, 6));
    const d = Number(s.slice(6, 8));
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }
  return s;
};

/** 정확히 YYYY-MM-DD 형식 + 실제 존재하는 날짜만 true */
export const isValidIsoDateStrict = (s?: string | null): boolean => {
  const v = String(s ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
};

/* ───────── 유닛 매매가 범위 ───────── */

const priceOrNull = (v: any): number | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** 배열을 훑어보고, 위반 있으면 에러 메시지 반환(없으면 null)
 * 최소값=최대값 허용 */
export const validateUnitPriceRanges = (
  units?: any[],
  remainingHouseholds?: number | string | null
): string | null => {
  if (!Array.isArray(units)) return null;

  for (let i = 0; i < units.length; i++) {
    const u = units[i] ?? {};
    const label = (u?.label ?? u?.name ?? `${i + 1}번째 구조`)
      .toString()
      .trim();
    const min = priceOrNull(u?.minPrice ?? u?.primary);
    const max = priceOrNull(u?.maxPrice ?? u?.secondary);

    if (min === 0 || max === 0) {
      return `${label}: 0원은 입력할 수 없습니다.`;
    }
    if (min != null && max != null) {
      // 최대값이 최소값보다 작은 경우만 에러 (같은 값 허용)
      if (max < min) {
        return `${label}: 최대매매가는 최소매매가보다 크거나 같아야 합니다.`;
      }
    }
  }
  return null;
};

/* ───────── 면적 범위 ───────── */

const numOrNull = (v: any): number | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

type RangeCheckResult = { ok: true } | { ok: false; msg: string };

const checkRange = (
  minRaw: any,
  maxRaw: any,
  label: string,
  allowEqual: boolean = false
): RangeCheckResult => {
  const min = numOrNull(minRaw);
  const max = numOrNull(maxRaw);

  if (min === 0 || max === 0) {
    return { ok: false, msg: `${label}: 0은 입력할 수 없습니다.` };
  }
  if (min == null || max == null) return { ok: true };

  // 최대값이 최소값보다 작은 경우만 에러 (같은 값 허용)
  if (max < min) {
    return {
      ok: false,
      msg: `${label}: 최대는 최소보다 크거나 같아야 합니다.`,
    };
  }
  return { ok: true };
};

/** baseAreaSet + extraAreaSets 전체 검사. 문제가 없으면 null
 * 최소값=최대값 허용 */
export const validateAreaRanges = (
  base?: any,
  extras?: any[],
  remainingHouseholds?: number | string | null
): string | null => {
  const checks = (g: any, prefix = ""): string | null => {
    {
      const r = checkRange(
        g?.exMinM2 ?? g?.exclusiveMin,
        g?.exMaxM2 ?? g?.exclusiveMax,
        `${prefix}전용 m²`,
        true
      );
      if (!r.ok) return r.msg;
    }
    {
      const r = checkRange(
        g?.exMinPy ?? g?.exclusiveMinPy,
        g?.exMaxPy ?? g?.exclusiveMaxPy,
        `${prefix}전용 평`,
        true
      );
      if (!r.ok) return r.msg;
    }
    {
      const r = checkRange(
        g?.realMinM2 ?? g?.realMin,
        g?.realMaxM2 ?? g?.realMax,
        `${prefix}실평 m²`,
        true
      );
      if (!r.ok) return r.msg;
    }
    {
      const r = checkRange(
        g?.realMinPy,
        g?.realMaxPy,
        `${prefix}실평 평`,
        true
      );
      if (!r.ok) return r.msg;
    }
    return null;
  };

  if (base) {
    const msg = checks(base);
    if (msg) return msg;
  }
  if (Array.isArray(extras)) {
    for (let i = 0; i < extras.length; i++) {
      const title = String(extras[i]?.title ?? "").trim();
      const prefix = title ? `면적세트 "${title}" - ` : `면적세트 ${i + 1} - `;
      const msg = checks(extras[i], prefix);
      if (msg) return msg;
    }
  }
  return null;
};
