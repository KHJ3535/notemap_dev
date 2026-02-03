"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Table, SearchBar, processTableData } from "@/features/table";
import type { ContractData } from "@/components/contract-management/types";
import {
  contractTableColumns,
  searchKeys,
  paginationConfig,
} from "@/components/contract-management/utils/tableConfig";
import { getContract } from "@/features/contract-records/api/contracts";
import { transformContractResponseToSalesContract } from "@/features/contract-records/utils/contractTransformers";
import { SalesContractRecordsModal } from "@/features/contract-records/components/SalesContractRecordsModal";
import type { SalesContractData } from "@/features/contract-records/types/contract-records";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select/Select"; // Corrected import path
import { Button } from "@/components/atoms/Button/Button"; // Import Button component

interface ContractListProps {
  title: string;
  loadContracts: (
    page: number
  ) =>
    | Promise<ContractData[]>
    | Promise<{ items: ContractData[]; total: number }>;
  initialLoading?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function ContractList({
  title,
  loadContracts: loadContractsFn,
  initialLoading = false,
  searchPlaceholder = "계약번호, 고객명, 담당자로 검색...",
  emptyMessage = "계약이 없습니다.",
}: ContractListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingContracts, setIsLoadingContracts] = useState(initialLoading);
  const [selectedContract, setSelectedContract] =
    useState<SalesContractData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // 필터나 검색어가 변경되면 1페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, selectedStatus, searchTerm]);

  // 필터 초기화 핸들러
  const handleResetFilters = () => {
    setSelectedYear("all");
    setSelectedMonth("all");
    setSelectedStatus("all");
    setSearchTerm("");
    // currentPage는 useEffect에 의해 자동으로 1로 재설정됩니다.
  };

  // 계약 목록 로드
  const loadContracts = React.useCallback(async () => {
    try {
      setIsLoadingContracts(true);
      const result = await loadContractsFn(currentPage);

      if (
        result &&
        typeof result === "object" &&
        "items" in result &&
        "total" in result
      ) {
        setContracts(result.items);
        setTotalCount(result.total);
      } else {
        setContracts(result as ContractData[]);
        setTotalCount((result as ContractData[]).length);
      }
    } catch (error: any) {
      console.error("계약 목록 로드 실패:", error);
      setContracts([]);
      setTotalCount(0);

      toast({
        title: "계약 목록 로드 실패",
        description: "백엔드 서버를 확인해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingContracts(false);
    }
  }, [loadContractsFn, currentPage, toast]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  // 계약 데이터에서 필터 옵션들을 동적으로 생성
  const filterOptions = useMemo(() => {
    const years = new Set<string>();
    const statuses = new Set<string>();
    contracts.forEach((contract) => {
      years.add(new Date(contract.contractDate).getFullYear().toString());
      statuses.add(contract.status);
    });
    return {
      years: [
        "all",
        ...Array.from(years).sort((a, b) => Number(b) - Number(a)),
      ],
      months: [
        "all",
        ...Array.from({ length: 12 }, (_, i) => (i + 1).toString()),
      ],
      statuses: ["all", ...Array.from(statuses)],
    };
  }, [contracts]);

  const { processedData, pagination } = useMemo(() => {
    const filteredContracts = contracts.filter((contract) => {
      const contractDate = new Date(contract.contractDate);
      const year = contractDate.getFullYear().toString();
      const month = (contractDate.getMonth() + 1).toString();

      const yearMatch = selectedYear === "all" || year === selectedYear;
      const monthMatch = selectedMonth === "all" || month === selectedMonth;
      const statusMatch =
        selectedStatus === "all" || contract.status === selectedStatus;
      return yearMatch && monthMatch && statusMatch;
    });

    if (totalCount > 0 && contracts.length <= paginationConfig.listsPerPage) {
      const filtered = searchTerm
        ? filteredContracts.filter((contract) =>
            searchKeys.some((key) => {
              const value = contract[key as keyof ContractData];
              return value
                ?.toString()
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
            })
          )
        : filteredContracts;

      const totalPages = Math.ceil(totalCount / paginationConfig.listsPerPage);
      return {
        processedData: filtered,
        pagination: {
          currentPage,
          totalPages,
          listsPerPage: paginationConfig.listsPerPage,
          totalLists: totalCount,
        },
      };
    }

    return processTableData(filteredContracts, {
      searchTerm,
      searchKeys: [...searchKeys],
      currentPage,
      listsPerPage: paginationConfig.listsPerPage,
    });
  }, [
    contracts,
    searchTerm,
    currentPage,
    totalCount,
    selectedYear,
    selectedMonth,
    selectedStatus,
  ]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowClick = async (row: ContractData) => {
    console.log("계약 클릭:", row);
    try {
      const id = Number(row.backendContractId ?? row.id);
      const contract = await getContract(id);
      const fullData = transformContractResponseToSalesContract(contract);
      setSelectedContract(fullData);
      setIsModalOpen(true);
    } catch (error) {
      console.error("계약 상세 조회 실패:", error);
      toast({
        title: "계약 상세 조회 실패",
        description: "계약 상세 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const statusMap: Record<string, string> = {
    rejected: "부결",
    ongoing: "계약중",
    completed: "계약완료",
    cancelled: "해약",
  };

  return (
    <>
      <div className="mx-auto max-w-7xl p-6 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="년도" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year === "all" ? "전체 년도" : `${year}년`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-[100px]">
                <SelectValue placeholder="월" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month === "all" ? "전체 월" : `${month}월`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="계약 상태" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all"
                      ? "전체 상태"
                      : statusMap[status] || status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-full sm:max-w-xs">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={searchPlaceholder}
              />
            </div>
            {/* 필터 초기화 버튼 */}
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="w-full sm:w-auto"
            >
              필터 초기화
            </Button>
          </div>
        </div>

        <Table
          data={processedData}
          columns={contractTableColumns}
          pagination={pagination}
          loading={isLoadingContracts}
          emptyMessage={emptyMessage}
          onPageChange={handlePageChange}
          onRowClick={handleRowClick}
        />
      </div>

      <SalesContractRecordsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedContract(null);
        }}
        data={selectedContract ?? undefined}
        onDataChange={() => {
          loadContracts();
        }}
      />
    </>
  );
}
