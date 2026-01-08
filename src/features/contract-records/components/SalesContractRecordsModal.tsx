"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/Dialog/Dialog";
import { Button } from "@/components/atoms/Button/Button";
import { Separator } from "@/components/atoms/Separator/Separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/Card/Card";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { ContractSiteSection } from "./ContractSiteSection";
import { FinancialInfoSection } from "./FinancialInfoSection";
import type {
  SalesContractViewModalProps,
  SalesContractData,
} from "../types/contract-records";
import { formatCurrency, calculateVAT } from "../utils/utils";
import { StaffAllocationSection } from "./StaffAllocationSection";
import { ContractImageSection } from "./ContractImageSection";
import {
  createContract,
  updateContract,
  deleteContract,
} from "../api/contracts";
import {
  transformSalesContractToCreateRequest,
  transformSalesContractToUpdateRequest,
} from "../utils/contractTransformers";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/features/users/api/account";
import { api } from "@/shared/api/api";
import { getTeams } from "@/features/teams";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/atoms/Popover/Popover";
import { statusConfigMap } from "@/components/contract-management/utils/contractUtils";
import { Calendar } from "@/components/atoms/Calendar/Calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Label } from "@/components/atoms/Label/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select/Select";
import { ChevronDownIcon, X } from "lucide-react";

// 기본 데이터
const defaultData: SalesContractData = {
  customerInfo: { name: "", contact: "" },
  salesManager: { name: "", contact: "" }, // 사용하지 않지만 기본값으로 유지
  salesPerson: { name: "", contact: "" },
  contractSite: {
    address: "",
    siteName: "",
    teamContact: "",
  },
  financialInfo: {
    brokerageFee: 0,
    vat: 0,
    vatStatus: "vat-included",
    totalBrokerageFee: 0,
    totalRebate: 0,
    taxStatus: "taxable",
    totalSupportAmount: 0,
    customerAccountNumber: "",
    customerBank: "",
    supportContent: "",
  },
  staffAllocations: [
    {
      id: "company",
      name: "회사",
      type: "company",
      percentage: 100,
      isDirectInput: false,
      rebateAllowance: 0,
      finalAllowance: 0,
    },
    {
      id: "employee1",
      name: "영업담당자",
      type: "employee",
      percentage: 0,
      isDirectInput: false,
      rebateAllowance: 0,
      finalAllowance: 0,
    },
  ],
  contractImages: [],
  totalCalculation: 0,
};

export function SalesContractRecordsModal({
  isOpen,
  onClose,
  data: initialData,
  onDataChange,
}: SalesContractViewModalProps) {
  const [data, setData] = useState<SalesContractData>(
    initialData || defaultData
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!initialData); // 초기 데이터가 없으면 편집 모드 (신규 생성)
  const { toast } = useToast();

  // 날짜 선택 Popover 상태
  const [isContractDateOpen, setIsContractDateOpen] = useState(false);
  const [isBalanceDateOpen, setIsBalanceDateOpen] = useState(false);

  // 프로필 정보 가져오기
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 10 * 60 * 1000, // 10분
  });

  // 내 팀 멤버 가져오기
  const { data: myTeamMembers } = useQuery({
    queryKey: ["my-team-members"],
    queryFn: async () => {
      try {
        // 프로필에서 accountId 가져오기
        const accountId = profile?.account?.id;
        if (!accountId) return [];

        // 팀 목록 가져오기
        const teams = await getTeams();
        if (teams.length === 0) return [];

        // 각 팀의 상세 조회를 통해 내가 속한 팀 찾기
        for (const team of teams) {
          try {
            const teamDetailResponse = await api.get<{
              message: string;
              data: {
                id: string;
                name: string;
                members: Array<{
                  accountId: string;
                  name: string | null;
                }>;
              };
            }>(`/dashboard/accounts/teams/${team.id}`);

            const isMyTeam = teamDetailResponse.data.data.members.some(
              (member) => String(member.accountId) === String(accountId)
            );

            if (isMyTeam) {
              return teamDetailResponse.data.data.members;
            }
          } catch (error) {
            console.error(`팀 ${team.id} 조회 실패:`, error);
            continue;
          }
        }
        return [];
      } catch (error) {
        console.error("팀 멤버 조회 실패:", error);
        return [];
      }
    },
    enabled: !!profile?.account?.id,
    staleTime: 10 * 60 * 1000, // 10분
  });

  // 초기 데이터가 변경되면 상태 업데이트
  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setIsEditMode(false); // 초기 데이터가 있으면 읽기 전용 모드
    } else {
      setData(defaultData);
      setIsEditMode(true); // 초기 데이터가 없으면 편집 모드 (신규 생성)
    }
  }, [initialData]);

  // 프로필 정보가 로드되면 담당자 정보 자동 채우기
  useEffect(() => {
    if (profile && !initialData && isOpen) {
      setData((prevData) => ({
        ...prevData,
        salesPerson: {
          name: profile.account?.name || "",
          contact: profile.account?.phone || "",
        },
      }));
    }
  }, [profile, initialData, isOpen]);

  // 데이터 변경 핸들러
  const handleDataChange = (newData: SalesContractData) => {
    setData(newData);
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // 인적 정보 변경 핸들러
  const handleCustomerInfoChange = (customerInfo: any) => {
    handleDataChange({ ...data, customerInfo });
  };

  const handleSalesPersonChange = (salesPerson: any) => {
    handleDataChange({ ...data, salesPerson });
  };

  // 계약현장 정보 변경 핸들러
  const handleContractSiteChange = (contractSite: any) => {
    handleDataChange({ ...data, contractSite });
  };

  // 재무 정보 변경 핸들러
  const handleFinancialInfoChange = (financialInfo: any) => {
    // 부가세 자동 계산 (부가세 선택시 10%, 미부가세 선택시 0%)
    const vat = calculateVAT(
      financialInfo.brokerageFee,
      financialInfo.vatStatus
    );

    // 중개보수금합계 자동 계산
    const totalBrokerageFee = financialInfo.brokerageFee + vat;

    const updatedFinancialInfo = {
      ...financialInfo,
      vat,
      totalBrokerageFee,
    };

    // 총 계산 자동 업데이트
    // 계산 공식: 과세시 (중개수수료+부가세)+((리베이트-지원금액)×0.967)
    // 비과세시 (중개수수료+부가세)+(리베이트-지원금액)
    const brokerageAndVat = Number(totalBrokerageFee) || 0;
    const totalRebate = Number(updatedFinancialInfo.totalRebate) || 0;
    const totalSupportAmount =
      Number(updatedFinancialInfo.totalSupportAmount) || 0;
    const rebateMinusSupport = totalRebate - totalSupportAmount;
    const multiplier = updatedFinancialInfo.taxStatus === "taxable" ? 0.967 : 1;
    const totalCalculation = brokerageAndVat + rebateMinusSupport * multiplier;

    handleDataChange({
      ...data,
      financialInfo: updatedFinancialInfo,
      totalCalculation,
    });
  };

  // 담당자 분배 변경 핸들러
  const handleStaffAllocationsChange = (staffAllocations: any) => {
    handleDataChange({ ...data, staffAllocations });
  };

  // 계약 이미지 변경 핸들러
  const handleContractImagesChange = (contractImages: any) => {
    handleDataChange({ ...data, contractImages });
  };

  // 수정 모드로 전환
  const handleEdit = () => {
    setIsEditMode(true);
  };

  // 취소 핸들러 (편집 모드에서 읽기 전용으로 되돌림)
  const handleCancel = () => {
    if (initialData) {
      setData(initialData); // 원래 데이터로 복원
      setIsEditMode(false); // 읽기 전용 모드로 전환
    } else {
      onClose(); // 신규 생성 중이면 모달 닫기
    }
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!data.id) {
      toast({
        title: "삭제 불가",
        description: "계약 ID가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("정말 이 계약을 삭제하시겠습니까?")) {
      return;
    }

    setIsLoading(true);
    try {
      const contractId = Number(data.id);
      await deleteContract(contractId);

      toast({
        title: "계약 삭제 완료",
        description: "계약이 성공적으로 삭제되었습니다.",
      });

      // 목록 새로고침을 위한 콜백 호출
      if (onDataChange) {
        onDataChange({ ...data }); // 삭제된 계약 정보 전달
      }

      onClose();
    } catch (error: any) {
      console.error("계약 삭제 실패:", error);
      toast({
        title: "계약 삭제 실패",
        description:
          error?.response?.data?.message || "계약 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 저장 핸들러 (생성 또는 수정)
  const handleSave = async () => {
    // 필수 데이터 검증
    if (!data.customerInfo.name.trim()) {
      toast({
        title: "입력 오류",
        description: "고객명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    if (!data.customerInfo.contact.trim()) {
      toast({
        title: "입력 오류",
        description: "고객 연락처를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    if (!data.contractSite?.address.trim()) {
      toast({
        title: "입력 오류",
        description: "현장 주소를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    if (!data.contractSite?.siteName.trim()) {
      toast({
        title: "입력 오류",
        description: "현장명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    if (!data.contractSite?.teamContact.trim()) {
      toast({
        title: "입력 오류",
        description: "분양팀 연락처를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    if (!data.contractDate) {
      toast({
        title: "입력 오류",
        description: "계약일을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    if (!data.balanceDate) {
      toast({
        title: "입력 오류",
        description: "잔금일자를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    if (data.totalCalculation <= 0) {
      toast({
        title: "입력 오류",
        description: "계약금액을 확인해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let contractData: SalesContractData;
      const now = new Date();

      if (data.id) {
        // 수정 모드
        const contractId = Number(data.id);
        const updateRequest = transformSalesContractToUpdateRequest(
          data,
          profile
        );
        console.log("변환된 수정 요청 데이터:", updateRequest);
        const result = await updateContract(contractId, updateRequest);
        console.log("계약 수정 API 응답:", result);

        contractData = {
          ...data,
          contractDate: data.contractDate || now.toISOString().split("T")[0],
          updatedAt: now.toISOString(),
        };

        toast({
          title: "계약 수정 완료",
          description: "계약이 성공적으로 수정되었습니다.",
        });

        setIsEditMode(false); // 수정 후 읽기 전용 모드로 전환
      } else {
        // 생성 모드
        // 백엔드 API 형식으로 변환
        const requestData = transformSalesContractToCreateRequest(
          data,
          profile
        );
        console.log("변환된 요청 데이터:", requestData);

        // 필수 필드 검증 (타입 체크)
        if (
          typeof requestData.brokerageFee !== "number" ||
          typeof requestData.vat !== "boolean" ||
          typeof requestData.rebate !== "number" ||
          typeof requestData.supportAmount !== "number" ||
          typeof requestData.isTaxed !== "boolean" ||
          typeof requestData.companyPercent !== "number"
        ) {
          throw new Error("필수 필드의 데이터 타입이 올바르지 않습니다.");
        }

        const result = await createContract(requestData);
        console.log("계약 생성 API 응답:", result);

        contractData = {
          ...data,
          id: result.id.toString(),
          contractNumber: result.contractNo,
          contractDate: data.contractDate || now.toISOString().split("T")[0],
          status: data.status || "ongoing",
          createdAt: data.createdAt || now.toISOString(),
          updatedAt: now.toISOString(),
        };

        toast({
          title: "계약 생성 완료",
          description: `계약 ${result.contractNo}이 성공적으로 생성되었습니다.`,
        });

        onClose(); // 생성 후 모달 닫기
      }

      // 계약관리 리스트 업데이트를 위한 콜백
      if (onDataChange) {
        onDataChange(contractData);
      }
    } catch (error: any) {
      console.error("계약 저장 실패:", error);
      const errorMessages = error?.response?.data?.messages;
      const errorMessage = error?.response?.data?.message;
      let errorDescription =
        errorMessage ||
        (data.id
          ? "계약 수정 중 오류가 발생했습니다."
          : "계약 생성 중 오류가 발생했습니다.");

      // validation 에러 메시지가 있으면 추가
      if (
        errorMessages &&
        Array.isArray(errorMessages) &&
        errorMessages.length > 0
      ) {
        errorDescription = errorMessages.join(", ");
      }

      toast({
        title: data.id ? "계약 수정 실패" : "계약 생성 실패",
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        data-contract-records-modal-root
        className="w-[100vw] max-w-[1240px] h-[95vh] max-h-[900px] p-0 flex flex-col"
      >
        {/* 고정 헤더 */}
        <DialogHeader className="pb-1 flex-shrink-0 p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              영업 계약기록 관리
            </DialogTitle>
            {data.contractNumber && (
              <div className="text-sm text-muted-foreground mr-8">
                계약번호:{" "}
                <span className="font-medium text-foreground">
                  {data.contractNumber}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* 스크롤 가능한 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            {/* 계약일자, 잔금일자, 계약 상태 */}
            <Card className="flex-shrink-0">
              <CardHeader className="pb-1 pt-2 px-3">
                <CardTitle className="text-sm">계약 정보</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-muted-foreground">
                      계약일자
                    </Label>
                    <div className="relative">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={!isEditMode}
                            className={`flex w-full items-center justify-between text-left font-normal h-7 text-xs ${
                              !data.contractDate ? "text-muted-foreground" : ""
                            }`}
                          >
                            {data.contractDate ? (
                              format(new Date(data.contractDate), "PPP", {
                                locale: ko,
                              })
                            ) : (
                              <span>계약일자를 선택하세요</span>
                            )}
                            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          data-contract-calendar="true"
                          className="w-auto p-0 !z-[2200]"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={
                              data.contractDate
                                ? new Date(data.contractDate)
                                : undefined
                            }
                            locale={ko}
                            i18nLocale="ko-KR"
                            captionLayout="dropdown"
                            fromYear={2020}
                            toYear={2050}
                            onSelect={(date) => {
                              if (date) {
                                handleDataChange({
                                  ...data,
                                  contractDate: format(date, "yyyy-MM-dd"),
                                });
                                setIsContractDateOpen(false);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {data.contractDate && isEditMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-8 top-1/2 -translate-y-1/2 h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDataChange({
                              ...data,
                              contractDate: undefined,
                            });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-muted-foreground">
                      잔금일자
                    </Label>
                    <div className="relative">
                      <Popover
                        open={isBalanceDateOpen}
                        onOpenChange={setIsBalanceDateOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={!isEditMode}
                            className={`flex w-full items-center justify-between text-left font-normal h-7 text-xs ${
                              !data.balanceDate ? "text-muted-foreground" : ""
                            }`}
                          >
                            {data.balanceDate ? (
                              format(new Date(data.balanceDate), "PPP", {
                                locale: ko,
                              })
                            ) : (
                              <span>잔금일자를 선택하세요</span>
                            )}
                            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          data-contract-calendar="true"
                          className="w-auto p-0 !z-[2200]"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={
                              data.balanceDate
                                ? new Date(data.balanceDate)
                                : undefined
                            }
                            locale={ko}
                            i18nLocale="ko-KR"
                            captionLayout="dropdown"
                            fromYear={2020}
                            toYear={2050}
                            onSelect={(date) => {
                              if (date) {
                                handleDataChange({
                                  ...data,
                                  balanceDate: format(date, "yyyy-MM-dd"),
                                });
                                setIsBalanceDateOpen(false);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {data.balanceDate && isEditMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-8 top-1/2 -translate-y-1/2 h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDataChange({
                              ...data,
                              balanceDate: undefined,
                            });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-muted-foreground">
                      계약 상태
                    </Label>
                    <Select
                      value={data.status || "ongoing"}
                      onValueChange={(value) => {
                        handleDataChange({
                          ...data,
                          status: value as
                            | "ongoing"
                            | "rejected"
                            | "cancelled"
                            | "completed",
                        });
                      }}
                      disabled={!isEditMode}
                    >
                      <SelectTrigger
                        className={`h-7 text-xs ${
                          statusConfigMap[
                            (data.status ||
                              "ongoing") as keyof typeof statusConfigMap
                          ]?.className || ""
                        }`}
                        disabled={!isEditMode}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        data-contract-records-portal="true"
                        className="!z-[2200]"
                      >
                        <SelectItem value="ongoing" className="text-xs">
                          계약중
                        </SelectItem>
                        <SelectItem value="rejected" className="text-xs">
                          부결
                        </SelectItem>
                        <SelectItem value="cancelled" className="text-xs">
                          해약
                        </SelectItem>
                        <SelectItem value="completed" className="text-xs">
                          계약완료
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 인적 정보 */}
            <PersonalInfoSection
              customerInfo={data.customerInfo}
              salesPerson={data.salesPerson}
              onCustomerInfoChange={handleCustomerInfoChange}
              onSalesPersonChange={handleSalesPersonChange}
              readOnly={!isEditMode}
            />

            {/* 계약현장 정보 */}
            <ContractSiteSection
              contractSite={data.contractSite || defaultData.contractSite!}
              onContractSiteChange={handleContractSiteChange}
              readOnly={!isEditMode}
            />

            {/* 재무 정보 */}
            <FinancialInfoSection
              financialInfo={data.financialInfo}
              onFinancialInfoChange={handleFinancialInfoChange}
              readOnly={!isEditMode}
            />

            {/* 담당자 분배 */}
            <StaffAllocationSection
              staffAllocations={data.staffAllocations}
              onStaffAllocationsChange={handleStaffAllocationsChange}
              totalCalculation={data.totalCalculation}
              totalRebate={data.financialInfo.totalRebate}
              teamMembers={myTeamMembers || []}
              readOnly={!isEditMode}
            />

            {/* 계약 이미지 */}
            <ContractImageSection
              initialImages={data.contractImages}
              onImagesChange={handleContractImagesChange}
              readOnly={!isEditMode}
            />
          </div>
        </div>

        {/* 고정 하단 버튼 영역 */}
        <div className="flex-shrink-0 border-t p-4">
          <Separator className="mb-3" />
          <div className="flex justify-end space-x-2">
            {isEditMode ? (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={isLoading}
                >
                  취소
                </Button>
                <Button
                  onClick={handleSave}
                  className="h-7 text-xs"
                  disabled={isLoading}
                >
                  {isLoading ? "저장 중..." : "저장"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={isLoading}
                >
                  닫기
                </Button>
                {data.id && (
                  <>
                    <Button
                      onClick={handleEdit}
                      className="h-7 text-xs"
                      disabled={isLoading}
                    >
                      수정
                    </Button>
                    <Button
                      onClick={handleDelete}
                      variant="destructive"
                      className="h-7 text-xs"
                      disabled={isLoading}
                    >
                      {isLoading ? "삭제 중..." : "삭제"}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
