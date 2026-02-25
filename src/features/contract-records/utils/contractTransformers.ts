import { SalesContractData } from "../types/contract-records";
import {
  CreateContractRequest,
  UpdateContractRequest,
  ContractResponse,
  ContractListItemResponse,
  MyContractListItemResponse,
} from "../api/contracts";
import type { ContractAssigneeResponse } from "../api/assignees";
import type { ContractFileResponse } from "../api/files";
import type { ContractData } from "@/components/contract-management/types";

type ProfileData =
  | {
      account?: {
        id: string;
        name: string | null;
        phone: string | null;
      } | null;
    }
  | undefined;

// 프론트엔드 SalesContractData를 백엔드 CreateContractRequest로 변환
export function transformSalesContractToCreateRequest(
  data: SalesContractData,
  profile?: ProfileData
): CreateContractRequest {
  // 회사 비율 추출 (type === "company"인 항목의 percentage)
  const companyAllocation = data.staffAllocations.find(
    (a) => a.type === "company"
  );
  const companyPercent = companyAllocation?.percentage ?? 0;

  // 직원 담당자 분배 변환 (type === "employee"인 항목만)
  const employeeAllocations = data.staffAllocations.filter(
    (a) => a.type === "employee" && a.accountId
  );

  // 백엔드 규칙: companyPercent + sum(assignees.sharePercent) = 100
  // 프론트엔드에서는 전체가 100%이고, 회사와 담당자 비율이 나뉘어 있음
  // 백엔드로 보낼 때는 담당자 비율을 그대로 전송 (정규화하지 않음)
  let assignees:
    | Array<{ accountId: string; sharePercent: number; sortOrder: number }>
    | undefined;
  if (employeeAllocations.length > 0) {
    assignees = employeeAllocations.map((allocation, index) => ({
      accountId: allocation.accountId!,
      // 프론트엔드의 percentage를 그대로 sharePercent로 전송 (정규화 없이)
      sharePercent: allocation.percentage,
      sortOrder: index,
    }));
  }

  // 리베이트 units 변환 (원 단위 → units: 1 = 100만원)
  // 백엔드는 정수만 받으므로 반올림
  const totalRebate = Number(data.financialInfo.totalRebate) || 0;
  const rebateUnits = Math.round(totalRebate / 1000000);

  // 부가세 boolean 변환
  const vat = data.financialInfo.vatStatus === "vat-included";

  // 계약 이미지 URL (http/https 로 시작하는 실제 URL만 전송)
  const validUrls =
    data.contractImages
      ?.map((img) => img.preview)
      .filter((url) => typeof url === "string" && /^https?:\/\//.test(url)) ??
    [];

  // 상태 매핑 (프론트엔드 4가지 상태 -> 백엔드 4가지 상태)
  const status: "ongoing" | "done" | "canceled" | "rejected" | undefined =
    data.status === "completed"
      ? "done"
      : data.status === "cancelled"
      ? "canceled"
      : data.status === "rejected"
      ? "rejected"
      : "ongoing";

  const request: CreateContractRequest = {
    customerName: data.customerInfo.name || "",
    customerPhone: data.customerInfo.contact || "",
    brokerageFee: Number(data.financialInfo.brokerageFee) || 0,
    vat,
    rebate: rebateUnits,
    supportAmount: Number(data.financialInfo.totalSupportAmount) || 0,
    isTaxed: Boolean(data.financialInfo.taxStatus === "taxable"),
    calcMemo: data.financialInfo.supportContent || undefined,
    companyPercent,
    contractDate: data.contractDate || new Date().toISOString().split("T")[0],
    finalPaymentDate:
      data.balanceDate ||
      data.contractDate ||
      new Date().toISOString().split("T")[0],
    status,
    siteAddress: data.contractSite?.address || "",
    siteName: data.contractSite?.siteName || "",
    salesTeamPhone: data.contractSite?.teamContact || "",
    bank: data.financialInfo.customerBank || undefined,
    account: data.financialInfo.customerAccountNumber || undefined,
    assignees,
    urls: validUrls.length > 0 ? validUrls : undefined,
  };

  console.log("변환된 요청 데이터 상세:", request);
  console.log("변환된 요청 데이터 - companyPercent:", request.companyPercent);
  console.log("변환된 요청 데이터 - assignees:", request.assignees);
  if (request.assignees) {
    const assigneesSum = request.assignees.reduce(
      (sum, a) => sum + a.sharePercent,
      0
    );
    console.log(
      "변환된 요청 데이터 - assignees sharePercent 합계:",
      assigneesSum
    );
    console.log(
      "변환된 요청 데이터 - companyPercent + assigneesSum:",
      request.companyPercent + assigneesSum
    );
  }
  console.log("변환된 요청 데이터 - urls:", request.urls);
  console.log("변환된 요청 데이터 - validUrls:", validUrls);
  console.log("변환된 요청 데이터 - contractImages:", data.contractImages);
  return request;
}

// 프론트엔드 SalesContractData를 백엔드 UpdateContractRequest로 변환
// 수정 API는 Partial 업데이트를 지원하므로, 필요한 필드만 변환
export function transformSalesContractToUpdateRequest(
  data: SalesContractData,
  profile?: ProfileData
): UpdateContractRequest {
  // 회사 비율 추출 (type === "company"인 항목의 percentage)
  const companyAllocation = data.staffAllocations.find(
    (a) => a.type === "company"
  );
  const companyPercent = companyAllocation?.percentage ?? 0;

  // 직원 담당자 분배 변환 (type === "employee"인 항목만)
  // 백엔드 규칙: assignees 포함 시 전체 교체
  const employeeAllocations = data.staffAllocations.filter(
    (a) => a.type === "employee" && a.accountId
  );

  // 백엔드 규칙: companyPercent + sum(assignees.sharePercent) = 100
  let assignees:
    | Array<{ accountId: string; sharePercent: number; sortOrder?: number }>
    | undefined;
  if (employeeAllocations.length > 0) {
    assignees = employeeAllocations.map((allocation, index) => ({
      accountId: allocation.accountId!,
      sharePercent: allocation.percentage,
      sortOrder: index,
    }));
  }

  // 리베이트 units 변환 (원 단위 → units: 1 = 100만원)
  const totalRebate = Number(data.financialInfo.totalRebate) || 0;
  const rebateUnits = Math.round(totalRebate / 1000000);

  // 부가세 boolean 변환
  const vat = data.financialInfo.vatStatus === "vat-included";

  // 계약 이미지 URL (http/https 로 시작하는 실제 URL만 전송)
  // 백엔드 규칙: urls 포함 시 전체 교체
  const validUrls =
    data.contractImages
      ?.map((img) => img.preview)
      .filter((url) => typeof url === "string" && /^https?:\/\//.test(url)) ??
    [];

  // 상태 매핑 (프론트엔드 4가지 상태 -> 백엔드 4가지 상태)
  const status: "ongoing" | "done" | "canceled" | "rejected" | undefined =
    data.status === "completed"
      ? "done"
      : data.status === "cancelled"
      ? "canceled"
      : data.status === "rejected"
      ? "rejected"
      : "ongoing";

  const request: UpdateContractRequest = {
    customerName: data.customerInfo.name || undefined,
    customerPhone: data.customerInfo.contact || undefined,
    brokerageFee: Number(data.financialInfo.brokerageFee) || undefined,
    vat,
    rebate: rebateUnits,
    supportAmount: Number(data.financialInfo.totalSupportAmount) || undefined,
    isTaxed: Boolean(data.financialInfo.taxStatus === "taxable"),
    calcMemo: data.financialInfo.supportContent || undefined,
    companyPercent,
    contractDate: data.contractDate || undefined,
    finalPaymentDate: data.balanceDate || data.contractDate || undefined,
    status,
    siteAddress: data.contractSite?.address || undefined,
    siteName: data.contractSite?.siteName || undefined,
    salesTeamPhone: data.contractSite?.teamContact || undefined,
    bank: data.financialInfo.customerBank || undefined,
    account: data.financialInfo.customerAccountNumber || undefined,
    assignees, // 포함 시 전체 교체
    urls: validUrls.length > 0 ? validUrls : undefined, // 포함 시 전체 교체
  };

  // undefined 필드 제거 (Partial 업데이트이므로, undefined는 제외)
  const cleanedRequest: UpdateContractRequest = {};
  (Object.keys(request) as Array<keyof UpdateContractRequest>).forEach(
    (key) => {
      const value = request[key];
      if (value !== undefined) {
        (cleanedRequest as any)[key] = value;
      }
    }
  );

  console.log("변환된 수정 요청 데이터:", cleanedRequest);
  return cleanedRequest;
}

// 백엔드 ContractResponse를 프론트엔드 SalesContractData로 변환
export function transformContractResponseToSalesContract(
  contract: ContractResponse
): SalesContractData {
  // 회사 할당 추가 (companyPercent를 percentage로 변환)
  const companyAllocation = {
    id: "company",
    name: "회사",
    accountId: undefined,
    type: "company" as const,
    percentage: contract.companyPercent || 0,
    isDirectInput: false,
    rebateAllowance: 0,
    finalAllowance: 0,
  };

  // 직원 할당 변환 (백엔드에서 assignees 배열로 제공)
  const employeeAllocations =
    contract.assignees?.map((a, index) => ({
      id: String(index + 1),
      name: a.name || "",
      accountId: a.accountId || undefined,
      type: "employee" as const,
      percentage: Number(a.sharePercent) || 0,
      isDirectInput: false,
      rebateAllowance: 0,
      finalAllowance: 0,
    })) || [];

  const staffAllocations = [companyAllocation, ...employeeAllocations];

  // 접근 가능한 URL인지 확인 (s3:// 형태는 브라우저에서 접근 불가)
  const isAccessibleUrl = (url?: string | null): boolean => {
    if (!url) return false;
    return url.startsWith("http://") || url.startsWith("https://");
  };

  // URL을 접근 가능한 형태로 변환 (s3:// -> undefined)
  const getAccessibleUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    // s3:// 형태는 브라우저에서 접근 불가
    if (url.startsWith("s3://")) {
      console.warn(
        "⚠️ 계약 이미지 s3:// 형태의 URL은 브라우저에서 접근할 수 없습니다:",
        url
      );
      return undefined; // 프리사인 URL 생성 API 필요
    }
    return url;
  };

  // 계약 이미지 변환 (백엔드에서 urls 배열로 제공)
  const contractImages =
    contract.urls
      ?.map((url, index) => {
        const accessibleUrl = getAccessibleUrl(url);
        if (!accessibleUrl) {
          console.warn(
            "⚠️ 계약 이미지 URL이 접근 불가능합니다. index:",
            index,
            "url:",
            url
          );
          return null;
        }
        return {
          id: `img-${index}`,
          preview: accessibleUrl,
          file: new File([], `contract-image-${index}`),
        };
      })
      .filter((img): img is NonNullable<typeof img> => img !== null) || [];

  // 부가세 금액 계산
  const brokerageFee = Number(contract.brokerageFee) || 0;
  const vatAmount = contract.vat ? Math.round(brokerageFee * 0.1) : 0;
  const totalBrokerageFee = brokerageFee + vatAmount;

  // 리베이트 금액 계산 (units -> 원)
  const rebateAmount = (Number(contract.rebate) || 0) * 1000000;
  const totalRebate = rebateAmount;

  // 총 금액 계산 (프론트엔드 계산 로직)
  const supportAmount = Number(contract.supportAmount) || 0;
  const rebateMinusSupport = totalRebate - supportAmount;
  const multiplier = contract.isTaxed ? 0.967 : 1;
  const totalCalculation = totalBrokerageFee + rebateMinusSupport * multiplier;

  return {
    id: String(contract.id),
    contractNumber: contract.contractNo,
    customerInfo: {
      name: contract.customerName || "",
      contact: contract.customerPhone || "",
    },
    salesManager: undefined, // 백엔드에 없음
    salesPerson: {
      name: contract.createdBy?.name || "",
      contact: "", // 백엔드에 없음
    },
    contractSite: {
      address: contract.siteAddress || "",
      siteName: contract.siteName || "",
      teamContact: contract.salesTeamPhone || "",
    },
    financialInfo: {
      brokerageFee,
      vat: vatAmount,
      vatStatus: contract.vat ? "vat-included" : "vat-excluded",
      totalBrokerageFee,
      totalRebate,
      taxStatus: contract.isTaxed ? "taxable" : "tax-free",
      totalSupportAmount: supportAmount,
      customerAccountNumber: contract.account || "",
      customerBank: contract.bank || "",
      supportContent: contract.calcMemo || "",
    },
    staffAllocations,
    contractImages,
    totalCalculation,
    contractDate: contract.contractDate,
    balanceDate: contract.finalPaymentDate || undefined,
    status:
      contract.status === "done"
        ? "completed"
        : contract.status === "canceled"
        ? "cancelled"
        : contract.status === "rejected"
        ? "rejected"
        : "ongoing",
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt || contract.createdAt,
  };
}

// 프론트엔드 ContractData를 백엔드 ContractResponse로 변환 (계약 관리용)
export function transformContractResponseToContractData(
  contract: ContractResponse
): {
  id: string;
  contractNumber: string;
  customerName: string;
  customerContact: string;
  salesPerson: string;
  salesPersonSalary: number;
  totalCalculation: number;
  contractDate: string;
  balanceDate?: string; // 잔금일자 (백엔드 연결 전까지 undefined)
  amount: number;
  status: "ongoing" | "rejected" | "cancelled" | "completed";
  createdAt: string;
  backendContractId: string | number;
} {
  // 백엔드 grandTotal 대신 프론트엔드에서 계산 (반올림 방지)
  // 계산 공식: 과세시 (중개수수료+부가세)+((리베이트-지원금액)×0.967)
  // 비과세시 (중개수수료+부가세)+(리베이트-지원금액)
  const calculatedTotal = (() => {
    const brokerageFee = Number(contract.brokerageFee) || 0;
    const vatAmount = contract.vat ? Math.round(brokerageFee * 0.1) : 0;
    const brokerageAndVat = brokerageFee + vatAmount;
    const totalRebate = (Number(contract.rebate) || 0) * 1000000; // units를 원으로 변환
    const totalSupportAmount = Number(contract.supportAmount) || 0;
    const rebateMinusSupport = totalRebate - totalSupportAmount;
    const multiplier = contract.isTaxed ? 0.967 : 1;
    return brokerageAndVat + rebateMinusSupport * multiplier;
  })();

  return {
    id: contract.id.toString(),
    contractNumber: contract.contractNo || `CONTRACT-${contract.id}`,
    customerName: contract.customerName || "",
    customerContact: contract.customerPhone || "",
    salesPerson: contract.createdBy?.name || "",
    salesPersonSalary: 0, // 백엔드에 없음, 기본값
    totalCalculation: calculatedTotal,
    contractDate: contract.contractDate,
    balanceDate: undefined, // 백엔드에 balanceDate 필드가 없음 (추후 추가 예정)
    amount: calculatedTotal,
    status:
      contract.status === "done"
        ? ("completed" as const)
        : contract.status === "canceled"
        ? ("cancelled" as const) // 백엔드 canceled는 해약으로 매핑
        : ("ongoing" as const),
    createdAt: contract.createdAt,
    backendContractId: contract.id,
  };
}

// 계약 목록 응답을 ContractData로 변환
export function transformContractListItemToContractData(
  item: ContractListItemResponse
): ContractData {
  // 프론트엔드 계산 로직 사용
  // 계산 공식: 과세시 (중개수수료+부가세)+((리베이트-지원금액)×0.967)
  // 비과세시 (중개수수료+부가세)+(리베이트-지원금액)
  const brokerageFee = Number(item.brokerageFee) || 0;
  const vatAmount = item.vatEnabled ? Math.round(brokerageFee * 0.1) : 0;
  const brokerageAndVat = brokerageFee + vatAmount;

  const rebateAmount = (Number(item.rebateUnits) || 0) * 1000000; // units를 원으로 변환
  const supportAmount = Number(item.supportAmount) || 0;
  const rebateMinusSupport = rebateAmount - supportAmount;
  const multiplier = item.isTaxed ? 0.967 : 1;
  const totalCalculation = brokerageAndVat + rebateMinusSupport * multiplier;
  const companyPercent = item.companyPercent ?? 0;
  const salesPersonSalary = Math.round(
    (totalCalculation * companyPercent) / 100
  ); // 담당자 분배와 동일: totalCalculation × 회사비율/100

  return {
    id: String(item.id),
    contractNumber: item.contractNo,
    customerName: item.customerName || "",
    customerContact: item.customerPhone || "",
    salesPerson: item.createdByName || "",
    salesPersonSalary, // 관리자 목록: 회사 입금액 (담당자 분배 기준)
    totalCalculation,
    contractDate: item.contractDate,
    balanceDate: item.finalPaymentDate || undefined,
    status:
      item.status === "done"
        ? "completed"
        : item.status === "canceled"
        ? "cancelled"
        : item.status === "rejected"
        ? "rejected"
        : "ongoing",
    backendContractId: item.id,
  };
}

// 내 계약 목록 응답을 ContractData로 변환
export function transformMyContractListItemToContractData(
  item: MyContractListItemResponse
): ContractData {
  // 프론트엔드 계산 로직 사용 (관리자 페이지와 동일)
  // 계산 공식: 과세시 (중개수수료+부가세)+((리베이트-지원금액)×0.967)
  // 비과세시 (중개수수료+부가세)+(리베이트-지원금액)
  const brokerageFee = Number(item.brokerageFee) || 0;
  const vatAmount = item.vatEnabled ? Math.round(brokerageFee * 0.1) : 0;
  const brokerageAndVat = brokerageFee + vatAmount;

  const rebateAmount = (Number(item.rebateUnits) || 0) * 1000000; // units를 원으로 변환
  const supportAmount = Number(item.supportAmount) || 0;
  const rebateMinusSupport = rebateAmount - supportAmount;
  const multiplier = item.isTaxed ? 0.967 : 1;
  const totalCalculation = brokerageAndVat + rebateMinusSupport * multiplier;
  const salesPersonSalary = Math.round(
    (totalCalculation * (item.mySharePercent ?? 0)) / 100
  ); // 담당자 분배와 동일: totalCalculation × 내비율/100

  return {
    id: String(item.id),
    contractNumber: item.contractNo,
    customerName: item.customerName || "",
    customerContact: item.customerPhone || "",
    salesPerson: item.createdByName || "",
    salesPersonSalary, // 내 계약: 할당된 본인 급여 (담당자 분배 기준)
    totalCalculation,
    contractDate: item.contractDate,
    balanceDate: item.finalPaymentDate || undefined,
    status:
      item.status === "done"
        ? "completed"
        : item.status === "canceled"
        ? "cancelled"
        : item.status === "rejected"
        ? "rejected"
        : "ongoing",
    backendContractId: item.id,
  };
}
