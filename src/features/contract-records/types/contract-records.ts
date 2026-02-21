export interface PersonInfo {
  name: string;
  contact: string;
}

export interface ContractSiteInfo {
  address: string;
  siteName: string;
  teamContact: string;
}

export interface FinancialInfo {
  brokerageFee: number;
  vat: number;
  vatStatus: "vat-included" | "vat-excluded";
  totalBrokerageFee: number;
  totalRebate: number;
  taxStatus: "taxable" | "tax-free";
  totalSupportAmount: number;
  customerAccountNumber: string;
  customerBank: string;
  supportContent: string;
}

export interface StaffAllocation {
  id: string;
  name: string;
  accountId?: string; // 담당자 계정 ID (employee 타입일 때만 사용)
  type: "company" | "employee";
  positionRank?: string | null; // 직급 (팀장 여부 판단용)
  isTeamLeader?: boolean; // 팀장 여부 (최종수당 라벨 결정)
  percentage: number;
  isDirectInput: boolean;
  rebateAllowance: number;
  finalAllowance: number;
}

export interface ContractImage {
  id: string;
  file: File;
  preview: string;
}

export interface SalesContractData {
  id?: string; // 백엔드에서 생성
  contractNumber?: string; // 백엔드에서 생성
  /** 연동된 핀 ID (매물 ID) */
  pinId?: number;
  customerInfo: PersonInfo;
  salesManager?: PersonInfo; // 선택적 필드로 변경 (사용하지 않음)
  salesPerson: PersonInfo;
  contractSite?: ContractSiteInfo;
  financialInfo: FinancialInfo;
  staffAllocations: StaffAllocation[];
  contractImages: ContractImage[];
  totalCalculation: number;
  contractDate?: string; // 계약일
  balanceDate?: string; // 잔금일자
  status?: "ongoing" | "rejected" | "cancelled" | "completed"; // 계약 상태
  createdAt?: string; // 생성일
  updatedAt?: string; // 수정일
}

export interface SalesContractViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: SalesContractData;
  onDataChange?: (data: SalesContractData) => void;
}
