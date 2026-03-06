/**
 * periodUtils - 기간 필터용 유틸
 * generateYearOptions: 연도 옵션 생성
 * getPeriodLabel: 선택 기간 라벨 문자열 반환 (예: "2025년 2월")
 */

export function generateYearOptions(currentYear: number): string[] {
  return Array.from({ length: 6 }, (_, i) => {
    const year = currentYear - 5 + i;
    return year.toString();
  });
}

export function getPeriodLabel(
  period: string,
  year: string,
  quarter?: string,
  month?: string
): string {
  const now = new Date();
  const y = parseInt(year, 10);

  switch (period) {
    case "month":
      return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    case "monthly":
      return `${y}년 ${month || "1"}월`;
    case "quarter":
      return `${y}년 ${quarter || "1"}분기`;
    case "yearly":
      return `${y}년`;
    default:
      return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  }
}
