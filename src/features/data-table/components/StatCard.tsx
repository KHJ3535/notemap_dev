"use client";

/**
 * StatCard - 통계 한 칸 카드 (라벨, 값, 아이콘)
 * blue/green/purple/orange/gray/red
 */

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/atoms/Card/Card";
import { cn } from "@/lib/cn";

export type StatCardVariant =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "gray"
  | "red";

const variantStyles: Record<StatCardVariant, { bg: string; icon: string }> = {
  blue: { bg: "bg-blue-100", icon: "text-blue-600" },
  green: { bg: "bg-green-100", icon: "text-green-600" },
  purple: { bg: "bg-purple-100", icon: "text-purple-600" },
  orange: { bg: "bg-orange-100", icon: "text-orange-600" },
  gray: { bg: "bg-gray-100", icon: "text-gray-600" },
  red: { bg: "bg-red-100", icon: "text-red-600" },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Lucide 아이콘 등 */
  icon?: ReactNode;
  variant?: StatCardVariant;
  /** 값 강조 색 (기본 gray-900, green-600 등 지정 가능) */
  valueClassName?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  variant = "gray",
  valueClassName,
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];
  return (
    <Card className={cn("border-gray-200", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <div
              className={cn("text-2xl font-bold text-gray-900", valueClassName)}
            >
              {value}
            </div>
          </div>
          {icon && (
            <div
              className={cn(
                "h-12 w-12 rounded-lg flex items-center justify-center",
                styles.bg,
                styles.icon,
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
