import { api } from "@/shared/api/api";

// 계약 상세 조회 응답 타입
export type ContractResponse = {
  id: number;
  contractNo: string;
  createdBy: {
    accountId: string | null;
    name: string | null;
  };
  customerName: string;
  customerPhone: string;
  brokerageFee: number; // 중개보수
  vat: boolean; // 부가세 여부
  rebate: number; // 리베이트 units (1 = 100만원)
  supportAmount: number; // 지원금
  isTaxed: boolean; // 과세 여부
  calcMemo: string | null;
  companyPercent: number; // 회사 비율
  contractDate: string;
  finalPaymentDate: string;
  status: "ongoing" | "done" | "canceled" | "rejected";
  siteAddress: string;
  siteName: string;
  salesTeamPhone: string;
  bank?: string; // 은행명
  account?: string; // 계좌번호
  assignees: Array<{
    accountId: string | null;
    name: string | null;
    sharePercent: number;
    sortOrder: number;
  }>;
  urls: string[]; // 계약 이미지 URL
  derived?: {
    vatAmount: number;
    rebateAmount: number;
    grandTotal: number;
    companyAmount: number;
    staffPoolAmount: number;
    mySharePercent?: number;
    myAmount?: number;
  };
  createdAt: string;
  updatedAt: string;
};

// 백엔드 API 요청 타입
export type CreateContractRequest = {
  customerName: string;
  customerPhone: string;
  brokerageFee: number;
  vat: boolean; // 부가세 여부 (10%)
  rebate: number; // units (1 = 100만원)
  supportAmount: number; // 원
  isTaxed: boolean; // 과세 여부 (0.967 적용)
  calcMemo?: string;
  companyPercent: number; // 회사 비율 (0~100)
  contractDate: string; // YYYY-MM-DD
  finalPaymentDate: string; // YYYY-MM-DD
  status?: "ongoing" | "done" | "canceled" | "rejected"; // 기본값 ongoing
  siteAddress: string; // 현장 주소
  siteName: string; // 현장명
  salesTeamPhone: string; // 분양팀 연락처
  bank?: string; // 은행명
  account?: string; // 계좌번호
  assignees?: Array<{
    accountId: string; // accounts.id
    sharePercent: number; // 전체 기준 퍼센트
    sortOrder?: number;
  }>;
  urls?: string[]; // 계약 이미지 URL
};

export type UpdateContractRequest = Partial<CreateContractRequest>;

export type ListContractsRequest = {
  page?: number;
  size?: number;
  q?: string; // 검색어
  status?: "ongoing" | "done" | "canceled" | "rejected"; // 상태
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  orderBy?: "contract_date" | "created_at"; // 정렬 기준
  orderDir?: "ASC" | "DESC"; // 정렬 방향
};

// 계약 목록 응답 아이템 타입
export type ContractListItemResponse = {
  id: number;
  contractNo: string;
  createdByName: string; // 담당자
  customerName: string;
  customerPhone: string;
  contractDate: string; // 계약일
  finalPaymentDate: string; // 잔금일
  status: "ongoing" | "done" | "canceled" | "rejected";
  // 계산에 필요한 원본 필드들
  brokerageFee: number; // 중개보수금 (원)
  vatEnabled: boolean; // 부가세 여부
  rebateUnits: number; // 리베이트 units (1 = 100만원)
  supportAmount: number; // 지원금액 (원)
  isTaxed: boolean; // 과세 여부 (0.967 적용)
  companyPercent?: number; // 회사 비율 (담당자 분배 계산용)
};

// 계약 목록 응답 타입
export type ContractListResponse = {
  items: ContractListItemResponse[];
  total: number;
};

// 내 계약 목록 응답 아이템 타입 (ContractListItemResponse + mySharePercent, myAmount)
export type MyContractListItemResponse = ContractListItemResponse & {
  mySharePercent: number; // 내 퍼센트
  myAmount: number; // 내 정산 금액
};

// 내 계약 목록 응답 타입
export type MyContractListResponse = {
  items: MyContractListItemResponse[];
  total: number;
};

// 계약 생성 API
export async function createContract(
  data: CreateContractRequest
): Promise<{ id: number; contractNo: string }> {
  try {
    console.log("계약 생성 API 호출:", data);

    const response = await api.post<{
      message: string;
      data: { id: number; contractNo: string };
    }>("/contracts", data);

    console.log("계약 생성 API 응답:", response.data);
    return response.data.data;
  } catch (error: any) {
    console.error("계약 생성 API 호출 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    console.error("에러 메시지들:", error?.response?.data?.messages);
    if (error?.response?.data?.messages) {
      console.error("상세 에러 메시지:", JSON.stringify(error.response.data.messages, null, 2));
    }
    throw error;
  }
}

// 계약 목록 조회 API (관리자 페이지용)
export async function getContracts(
  params?: ListContractsRequest
): Promise<ContractListResponse> {
  try {
    const response = await api.get<{
      data: ContractListResponse;
    }>("/contracts", { params });

    console.log("계약 목록 API 응답:", response.data);
    return response.data.data;
  } catch (error: any) {
    console.error("계약 목록 API 호출 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    console.error("에러 메시지들:", error?.response?.data?.messages);
    throw error;
  }
}

// 계약 상세 조회 API
export async function getContract(id: number): Promise<ContractResponse> {
  try {
    const response = await api.get<{
      data: ContractResponse;
    }>(`/contracts/${id}`);

    console.log("계약 상세 API 응답:", response.data);
    return response.data.data;
  } catch (error: any) {
    console.error("계약 상세 API 호출 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    throw error;
  }
}

// 계약 수정 API
export async function updateContract(
  id: number,
  data: UpdateContractRequest
): Promise<{ id: number }> {
  try {
    const response = await api.patch<{
      message: string;
      data: { id: number };
    }>(`/contracts/${id}`, data);

    console.log("계약 수정 API 응답:", response.data);
    return response.data.data;
  } catch (error: any) {
    console.error("계약 수정 API 호출 실패:", error);
    throw error;
  }
}

// 계약 삭제 API
export async function deleteContract(id: number): Promise<void> {
  try {
    await api.delete(`/contracts/${id}`);
    console.log("계약 삭제 성공:", id);
  } catch (error: any) {
    console.error("계약 삭제 API 호출 실패:", error);
    throw error;
  }
}

// 내 계약 목록 조회 API (마이페이지용)
export async function getMyContracts(
  params?: ListContractsRequest
): Promise<MyContractListResponse> {
  try {
    const response = await api.get<{
      data: MyContractListResponse;
    }>("/contracts/me", { params });

    console.log("내 계약 목록 API 응답:", response.data);
    return response.data.data;
  } catch (error: any) {
    console.error("내 계약 목록 API 호출 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    console.error("에러 메시지들:", error?.response?.data?.messages);
    throw error;
  }
}
