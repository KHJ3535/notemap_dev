"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DataTablePageLayout,
  DataTablePageHeader,
  StatCard,
  StatCardsGrid,
  CardWithTable,
  TableScrollWrapper,
  PeriodFilters,
  generateYearOptions,
  getPeriodLabel,
} from "@/features/data-table";
import { Table } from "@/features/table";
import { Button } from "@/components/atoms/Button/Button";
import { Wallet, Calendar, Plus } from "lucide-react";
import { formatCurrency } from "@/components/contract-management/utils/contractUtils";
import { getExpenseSummary, getExpenseList } from "../api/expense";
import { ExpenseAddModal, type ExpenseFormData } from "./ExpenseAddModal";
import {
  buildExpenseFilterQuery,
  filterExpenseByPeriod,
} from "../utils/expenseUtils";
import { useToast } from "@/hooks/use-toast";

export function Expense() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
  const currentMonth = new Date().getMonth() + 1;

  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedQuarter, setSelectedQuarter] = useState(
    currentQuarter.toString()
  );
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());

  const yearOptions = generateYearOptions(currentYear);
  const quarterOptions = ["1", "2", "3", "4"];
  const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1));

  const filterQuery = useMemo(
    () =>
      buildExpenseFilterQuery(
        selectedPeriod,
        selectedYear,
        selectedQuarter,
        selectedMonth
      ),
    [selectedPeriod, selectedYear, selectedQuarter, selectedMonth]
  );

  const periodLabel = useMemo(
    () =>
      getPeriodLabel(
        selectedPeriod,
        selectedYear,
        selectedQuarter,
        selectedMonth
      ),
    [selectedPeriod, selectedYear, selectedQuarter, selectedMonth]
  );

  const {
    data: expenseSummary,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["expense-summary", filterQuery],
    queryFn: () => getExpenseSummary(filterQuery),
  });

  const { data: expenseList = [], isLoading: isLoadingList } = useQuery({
    queryKey: ["expense-list"],
    queryFn: () => getExpenseList(filterQuery),
  });

  const filteredList = useMemo(
    () => filterExpenseByPeriod(expenseList, filterQuery),
    [expenseList, filterQuery]
  );

  const handleAddExpense = async (data: ExpenseFormData) => {
    const newItem = {
      id: `exp-${Date.now()}`,
      date: data.date,
      itemName: data.itemName,
      amount: data.amount,
      memo: data.memo ?? "",
    };
    queryClient.setQueryData(["expense-list"], (prev: typeof expenseList) => [
      ...(prev ?? []),
      newItem,
    ]);
    toast({
      title: "지출 등록 완료",
      description: `${data.itemName} ${formatCurrency(data.amount)}가 등록되었습니다.`,
    });
  };

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          지출 데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      </div>
    );
  }

  const previousMonthAmount = expenseSummary?.previousMonthAmount ?? 0;
  const currentMonthAmount = expenseSummary?.currentMonthAmount ?? 0;

  const tableData = filteredList.map((item) => ({
    ...item,
    id: item.id,
  }));

  return (
    <DataTablePageLayout>
      <DataTablePageHeader
        title="가계부"
        description="지출 내역 관리"
        periodLabel={periodLabel}
        actions={
          <PeriodFilters
            selectedPeriod={selectedPeriod}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
            selectedMonth={selectedMonth}
            yearOptions={yearOptions}
            quarterOptions={quarterOptions}
            monthOptions={monthOptions}
            onPeriodChange={setSelectedPeriod}
            onYearChange={setSelectedYear}
            onQuarterChange={setSelectedQuarter}
            onMonthChange={setSelectedMonth}
          />
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      ) : (
        <StatCardsGrid title="지출금액" columns={2}>
          <StatCard
            label="전월 지출액"
            value={formatCurrency(previousMonthAmount)}
            icon={<Calendar className="h-6 w-6" />}
            variant="blue"
          />
          <StatCard
            label="당월 지출액"
            value={formatCurrency(currentMonthAmount)}
            icon={<Wallet className="h-6 w-6" />}
            variant="green"
          />
        </StatCardsGrid>
      )}

      <CardWithTable
        title="지출 내역"
        headerActions={
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4" />
            새로 만들기
          </Button>
        }
      >
        <TableScrollWrapper>
          <Table
            data={tableData}
            columns={[
              { key: "date", label: "날짜", sortable: true, width: "20%" },
              {
                key: "itemName",
                label: "품목명",
                sortable: true,
                width: "20%",
              },
              {
                key: "amount",
                label: "금액",
                sortable: true,
                width: "20%",
                render: (value) => (
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(value)}
                  </span>
                ),
              },
              { key: "memo", label: "메모", sortable: false, width: "40%" },
            ]}
            loading={isLoadingList}
            emptyMessage="등록된 지출 내역이 없습니다."
          />
        </TableScrollWrapper>
      </CardWithTable>

      <ExpenseAddModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={handleAddExpense}
      />
    </DataTablePageLayout>
  );
}
