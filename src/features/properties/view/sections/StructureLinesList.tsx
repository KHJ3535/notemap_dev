"use client";

import type { UnitLine } from "@/features/properties/types/property-domain";

type Props = {
  lines?: UnitLine[];
  showTitle?: boolean; // 컨테이너에서 제목 따로 그릴 때 false로 사용
};

/** any → number | undefined (문자열 숫자/쉼표 허용) */
const toNum = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

/** any → 정수 문자열 | "-" */
const toNumText = (v: unknown): string => {
  const n = toNum(v);
  return typeof n === "number" ? String(Math.trunc(n)) : "-";
};

/** 금액 표시: 천단위 콤마 구분, 없으면 "-" */
const formatAmount = (v: unknown): string => {
  const n = toNum(v);
  if (typeof n !== "number") return "-";
  return Math.trunc(n).toLocaleString("ko-KR");
};

/** any → 정수 (fallback 사용) */
const toInt = (v: unknown, fallback = 0) => {
  const n = toNum(v);
  return typeof n === "number" ? Math.trunc(n) : fallback;
};

/** any → boolean (Y/1/true 허용) */
const toBool = (v: unknown) =>
  v === true || v === "true" || v === 1 || v === "1" || v === "Y" || v === "y";

export default function StructureLinesList({
  lines = [],
  showTitle = true,
}: Props) {
  const hasLines = Array.isArray(lines) && lines.length > 0;

  if (!hasLines) {
    return (
      <div className="text-sm">
        {showTitle && <span className="font-medium">구조별 입력</span>}
        <div
          className={
            showTitle ? "mt-1 text-muted-foreground" : "text-muted-foreground"
          }
        >
          -
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showTitle && <div className="text-sm font-medium">구조별 입력</div>}

      <div className="space-y-2">
        {lines.map((l, idx) => {
          const rooms = toInt((l as any)?.rooms);
          const baths = toInt((l as any)?.baths);
          const rb = `${rooms}/${baths}`;

          // 복층/테라스는 boolean 혹은 "Y"/"1"/"true"도 허용
          const duplex = toBool((l as any)?.duplex);
          const terrace = toBool((l as any)?.terrace);

          const features =
            [duplex ? "복층" : null, terrace ? "테라스" : null]
              .filter(Boolean)
              .join(", ") || "-";

          // 최소/최대 금액: 천단위 구분
          const minText = formatAmount(
            (l as any)?.primary ?? (l as any)?.minPrice
          );
          const maxText = formatAmount(
            (l as any)?.secondary ?? (l as any)?.maxPrice
          );

          // 키: 서버 id가 있으면 우선 사용
          const key =
            (l as any)?.id ??
            `${idx}-${rooms}-${baths}-${duplex ? 1 : 0}-${terrace ? 1 : 0}`;

          return (
            <div
              key={key}
              className="min-w-0 rounded-md border bg-white px-2 py-2"
            >
              <div className="flex flex-col min-w-0">
                {/* ===== 헤더 라인 ===== */}
                <div className="flex items-center min-w-0 text-xs text-gray-500 mb-1">
                  <div className="flex-1 text-center">방/욕실</div>

                  <div className="w-px bg-gray-200 mx-2 h-4" />

                  <div className="flex-1 text-center">특징</div>

                  <div className="w-px bg-gray-200 mx-2 h-4" />

                  <div className="flex-[1.2] sm:flex-[2] text-center">금액</div>
                </div>

                {/* ===== 값 라인 ===== */}
                <div className="flex items-center min-w-0 text-sm">
                  <div className="flex-1 min-w-0 text-center truncate">
                    {rb}
                  </div>

                  <div className="w-px bg-gray-200 mx-2 h-5" />

                  <div className="flex-1 min-w-0 text-center truncate">
                    {features}
                  </div>

                  <div className="w-px bg-gray-200 mx-2 h-5" />

                  <div className="flex-[1.2] sm:flex-[2] min-w-0 flex items-center justify-center truncate">
                    <span>{minText}</span>
                    <span className="mx-2 text-gray-400">~</span>
                    <span>{maxText}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
