export const toNum = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  if (s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

export const toIntOrNullLocal = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

/** 소수 유지 (구조별 입력 금액). null/빈값 → null */
export const toNumOrNullLocal = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const toInt = (v: unknown) => {
  const n = toNum(v);
  return n === undefined ? undefined : Math.trunc(n);
};

export const s = (v: unknown) => String(v ?? "").trim();
