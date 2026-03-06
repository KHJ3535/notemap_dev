import type { ExpenseFilterQuery } from "../utils/expenseUtils";

export interface ExpenseSummary {
  previousMonthAmount: number; // 전월 지출액
  currentMonthAmount: number; // 당월 지출액
}

export interface ExpenseItem {
  id: string;
  date: string; // YYYY-MM-DD
  itemName: string;
  amount: number;
  memo: string;
}

/**
 * 지출 요약 조회 (전월/당월 지출액)
 * TODO: 백엔드 API 연동 시 filterQuery 사용
 */
export async function getExpenseSummary(
  _filterQuery: ExpenseFilterQuery
): Promise<ExpenseSummary> {
  // TODO: 실제 API 연동
  return {
    previousMonthAmount: 0,
    currentMonthAmount: 0,
  };
}

/**
 * 지출 목록 조회
 * TODO: 백엔드 API 연동 시 filterQuery로 서버 필터링
 */
export async function getExpenseList(
  _filterQuery: ExpenseFilterQuery
): Promise<ExpenseItem[]> {
  // TODO: 실제 API 연동
  return [];
}
