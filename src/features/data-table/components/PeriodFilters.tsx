/**
 * PeriodFilters - 기간 선택 필터
 * 이번 달 / 월별 선택 / 분기 선택 / 연도 선택, onClose 선택(팀 상세 등)
 */

import { Button } from "@/components/atoms/Button/Button";
import { Label } from "@/components/atoms/Label/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select/Select";

export interface PeriodFiltersProps {
  selectedPeriod: string;
  selectedYear: string;
  selectedQuarter?: string;
  selectedMonth?: string;
  yearOptions: string[];
  quarterOptions?: string[];
  monthOptions?: string[];
  onPeriodChange: (period: string) => void;
  onYearChange: (year: string) => void;
  onQuarterChange?: (quarter: string) => void;
  onMonthChange?: (month: string) => void;
  /** 팀 상세 등에서 닫기 버튼이 필요할 때 사용 */
  onClose?: () => void;
}

export function PeriodFilters({
  selectedPeriod,
  selectedYear,
  selectedQuarter,
  selectedMonth,
  yearOptions,
  quarterOptions = ["1", "2", "3", "4"],
  monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1)),
  onPeriodChange,
  onYearChange,
  onQuarterChange,
  onMonthChange,
  onClose,
}: PeriodFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Label className="text-sm">기간:</Label>
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">이번 달</SelectItem>
            <SelectItem value="monthly">월별 선택</SelectItem>
            <SelectItem value="quarter">분기 선택</SelectItem>
            <SelectItem value="yearly">연도 선택</SelectItem>
          </SelectContent>
        </Select>
        {selectedPeriod === "yearly" && (
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selectedPeriod === "quarter" && (
          <>
            <Select value={selectedYear} onValueChange={onYearChange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedQuarter || "1"}
              onValueChange={onQuarterChange || (() => {})}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quarterOptions.map((quarter) => (
                  <SelectItem key={quarter} value={quarter}>
                    {quarter}분기
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        {selectedPeriod === "monthly" && (
          <>
            <Select value={selectedYear} onValueChange={onYearChange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedMonth || "1"}
              onValueChange={onMonthChange || (() => {})}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}월
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
      {onClose && (
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
      )}
    </div>
  );
}
