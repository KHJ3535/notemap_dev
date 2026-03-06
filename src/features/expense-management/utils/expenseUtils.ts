export interface ExpenseFilterQuery {
  period: string;
  year?: number;
  quarter?: number;
  month?: number;
}

export function buildExpenseFilterQuery(
  period: string,
  year: string,
  quarter?: string,
  month?: string
): ExpenseFilterQuery {
  const query: ExpenseFilterQuery = { period };

  if (period === "monthly" || period === "quarter" || period === "yearly") {
    query.year = parseInt(year, 10);
  }
  if (period === "monthly" && month) {
    query.month = parseInt(month, 10);
  }
  if (period === "quarter" && quarter) {
    query.quarter = parseInt(quarter, 10);
  }

  return query;
}

export function filterExpenseByPeriod<T extends { date: string }>(
  items: T[],
  filterQuery: ExpenseFilterQuery
): T[] {
  return items.filter((item) => {
    const d = new Date(item.date);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const q = Math.floor((m - 1) / 3) + 1;

    switch (filterQuery.period) {
      case "month": {
        const now = new Date();
        return y === now.getFullYear() && m === now.getMonth() + 1;
      }
      case "monthly":
        return y === filterQuery.year && m === (filterQuery.month ?? 1);
      case "quarter":
        return y === filterQuery.year && q === (filterQuery.quarter ?? 1);
      case "yearly":
        return y === filterQuery.year;
      default:
        return true;
    }
  });
}
