"use client";

/**
 * CardWithTable - 카드 + 헤더(제목 + 액션) + 본문
 * TableScrollWrapper - 테이블 가로 스크롤 래퍼
 */

import { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/Card/Card";
import { cn } from "@/lib/cn";

interface CardWithTableProps {
  title: string;
  /** 헤더 오른쪽 액션 (필터, 버튼 등) */
  headerActions?: ReactNode;
  /** 카드 본문 상단 (차트 등) */
  children: ReactNode;
  className?: string;
}

export function CardWithTable({
  title,
  headerActions,
  children,
  className,
}: CardWithTableProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
            {headerActions && (
              <div className="flex items-center gap-2">{headerActions}</div>
            )}
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

interface TableScrollWrapperProps {
  /** 테이블 위 소제목 (선택) */
  sectionTitle?: string;
  children: ReactNode;
  className?: string;
}

export function TableScrollWrapper({
  sectionTitle,
  children,
  className,
}: TableScrollWrapperProps) {
  return (
    <div className={cn("mt-6", className)}>
      {sectionTitle && (
        <h4 className="text-lg font-semibold mb-4">{sectionTitle}</h4>
      )}
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {children}
      </div>
    </div>
  );
}
