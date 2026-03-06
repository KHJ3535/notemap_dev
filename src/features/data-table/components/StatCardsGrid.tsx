"use client";

/**
 * StatCardsGrid - 통계 카드 그리드 섹션
 * 제목 + 반응형 그리드(1~4컬럼)
 */

import { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StatCardsGridProps {
  title?: string;
  children: ReactNode;
  /** 그리드 컬럼: 1~4 기본 lg:4 */
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

const gridCols = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

export function StatCardsGrid({
  title,
  children,
  columns = 4,
  className,
}: StatCardsGridProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      )}
      <div className={cn("grid gap-6", gridCols[columns])}>
        {children}
      </div>
    </div>
  );
}
