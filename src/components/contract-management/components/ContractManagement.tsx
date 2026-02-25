"use client";

import React, { useCallback } from "react";
import { ContractList } from "@/features/contract-list";
import type { ContractData } from "@/components/contract-management/types";
import { getContracts } from "@/features/contract-records/api/contracts";
import { transformContractListItemToContractData } from "@/features/contract-records/utils/contractTransformers";
import { paginationConfig } from "../utils/tableConfig";

export function ContractManagement() {
  const loadContracts = useCallback(async (page: number): Promise<{
    items: ContractData[];
    total: number;
  }> => {
    const contractData = await getContracts({
      page,
      size: paginationConfig.listsPerPage,
    });

    return {
      items: contractData.items.map(transformContractListItemToContractData),
      total: contractData.total,
    };
  }, []);

  return (
    <ContractList
      title="계약 관리"
      salaryColumnLabel="회사 입금액"
      loadContracts={loadContracts}
      initialLoading={true}
    />
  );
}
