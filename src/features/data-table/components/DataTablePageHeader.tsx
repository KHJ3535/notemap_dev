"use client";

/**
 * DataTablePageHeader - 데이터 페이지 상단 영역
 * 타이틀 + 부제/기간 라벨 + 오른쪽 액션(필터, 버튼 등)
 */

import { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DataTablePageHeaderProps {
  title: string;
  description?: string;
  /** 기간 등 부가 라벨 (작은 글씨) */
  periodLabel?: string;
  /** 오른쪽 액션 (필터, 버튼 등) */
  actions?: ReactNode;
  className?: string;
}

export function DataTablePageHeader({
  title,
  description,
  periodLabel,
  actions,
  className,
}: DataTablePageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between flex-wrap gap-4",
        className
      )}
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="text-gray-600 mt-1">{description}</p>
        )}
        {periodLabel && (
          <p className="text-sm text-gray-500 mt-1">기간: {periodLabel}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-4">{actions}</div>}
    </div>
  );
}
