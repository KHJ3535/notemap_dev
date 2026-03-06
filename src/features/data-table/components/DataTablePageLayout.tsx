"use client";

/**
 * DataTablePageLayout - 데이터테이블 중심 페이지 공통 레이아웃 (실적확인, 가계부)
 */

import { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DataTablePageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function DataTablePageLayout({
  children,
  className,
}: DataTablePageLayoutProps) {
  return (
    <div
      className={cn("mx-auto max-w-7xl p-6 space-y-6 bg-gray-50", className)}
    >
      {children}
    </div>
  );
}
