"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/Card/Card";
import { Input } from "@/components/atoms/Input/Input";
import { Label } from "@/components/atoms/Label/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select/Select";
import { Button } from "@/components/atoms/Button/Button";
import { Plus, Minus } from "lucide-react";
import type { StaffAllocation } from "../types/contract-records";
import { formatCurrency } from "../utils/utils";
import React from "react";

interface StaffAllocationSectionProps {
  staffAllocations: StaffAllocation[];
  onStaffAllocationsChange: (allocations: StaffAllocation[]) => void;
  totalCalculation: number;
  totalRebate: number;
  teamMembers?: Array<{
    accountId: string;
    name: string | null;
    positionRank?: string | null;
    teamRole?: string | null;
  }>;
  readOnly?: boolean;
}

export function StaffAllocationSection({
  staffAllocations,
  onStaffAllocationsChange,
  totalCalculation,
  totalRebate,
  teamMembers = [],
  readOnly = false,
}: StaffAllocationSectionProps) {
  // 총 퍼센티지 계산
  const getTotalPercentage = () => {
    return staffAllocations.reduce((sum, staff) => sum + staff.percentage, 0);
  };

  const addStaff = () => {
    const newStaff: StaffAllocation = {
      id: Date.now().toString(),
      name: "",
      type: "employee",
      percentage: 0,
      isDirectInput: false,
      rebateAllowance: 0,
      finalAllowance: 0,
    };
    onStaffAllocationsChange([...staffAllocations, newStaff]);
  };

  const removeStaff = (id: string) => {
    if (
      id !== "company" &&
      staffAllocations.filter((s) => s.type === "employee").length > 1
    ) {
      onStaffAllocationsChange(
        staffAllocations.filter((staff) => staff.id !== id)
      );
    }
  };

  const handleEmployeeSelect = (staffId: string, employeeId: string) => {
    const selectedEmployee = teamMembers.find(
      (emp) => emp.accountId === employeeId
    );
    if (selectedEmployee) {
      onStaffAllocationsChange(
        staffAllocations.map((staff) =>
          staff.id === staffId
            ? {
                ...staff,
                name: selectedEmployee.name || "",
                accountId: employeeId,
                positionRank: selectedEmployee.positionRank ?? null,
                isTeamLeader: selectedEmployee.teamRole === "manager",
              }
            : staff
        )
      );
    }
  };

  const toggleDirectInput = (id: string) => {
    onStaffAllocationsChange(
      staffAllocations.map((staff) =>
        staff.id === id
          ? {
              ...staff,
              isDirectInput: !staff.isDirectInput,
              percentage: staff.isDirectInput ? 0 : staff.percentage,
            }
          : staff
      )
    );
  };

  const handleDirectPercentageChange = (id: string, value: string) => {
    const numValue = Math.max(0, Math.min(100, Number(value) || 0));
    const otherStaffsTotal = staffAllocations
      .filter((staff) => staff.id !== id)
      .reduce((sum, staff) => sum + staff.percentage, 0);

    const maxAllowed = 100 - otherStaffsTotal;
    const finalValue = Math.min(numValue, maxAllowed);

    onStaffAllocationsChange(
      staffAllocations.map((staff) =>
        staff.id === id ? { ...staff, percentage: finalValue } : staff
      )
    );
  };

  const handleStaffPercentageChange = (id: string, percentage: number) => {
    onStaffAllocationsChange(
      staffAllocations.map((staff) =>
        staff.id === id ? { ...staff, percentage } : staff
      )
    );
  };

  const getAvailablePercentages = (currentStaffId: string) => {
    const currentStaff = staffAllocations.find(
      (staff) => staff.id === currentStaffId
    );
    const otherStaffsTotal = staffAllocations
      .filter((staff) => staff.id !== currentStaffId)
      .reduce((sum, staff) => sum + staff.percentage, 0);

    const maxAvailable = 100 - otherStaffsTotal;
    const availableOptions = [];

    if (currentStaff && currentStaff.percentage > 0) {
      availableOptions.push(currentStaff.percentage);
    }

    for (let i = 0; i <= maxAvailable; i += 5) {
      if (!availableOptions.includes(i)) {
        availableOptions.push(i);
      }
    }

    return availableOptions.sort((a, b) => a - b);
  };

  // 총합계 수당과 최종수당 자동 계산 (총합계는 원래 총합계, 최종수당은 총합계에서 비율로 계산)
  const calculateStaffAllocations = () => {
    return staffAllocations.map((staff) => {
      const percentage = staff.percentage || 0;
      // 총합계는 원래 총합계 전체 값
      const rebateAllowance = totalCalculation;
      // 최종수당은 총합계에서 비율에 따라 계산
      const finalAllowance = (totalCalculation * percentage) / 100;

      return {
        ...staff,
        rebateAllowance: isNaN(rebateAllowance) ? 0 : rebateAllowance,
        finalAllowance: isNaN(finalAllowance) ? 0 : finalAllowance,
      };
    });
  };

  // totalCalculation이 변경될 때마다 자동 계산
  React.useEffect(() => {
    const updatedAllocations = calculateStaffAllocations();
    onStaffAllocationsChange(updatedAllocations);
  }, [totalCalculation, staffAllocations.map((s) => s.percentage).join(",")]);

  return (
    <Card className="flex-1 min-h-0">
      <CardHeader className="pb-1 pt-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">담당자 분배</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addStaff}
            className="h-6 px-2 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            disabled={readOnly}
          >
            <Plus className="h-3 w-3 mr-1" />
            담당자 추가
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          총 퍼센티지: {getTotalPercentage()}%
          {getTotalPercentage() !== 100 && (
            <span className="text-red-600 ml-1 font-medium">
              (100%가 되도록 조정해주세요)
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 overflow-y-auto flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
          {staffAllocations.map((staff, index) => (
            <div
              key={staff.id}
              className={`space-y-1 p-2 border rounded-lg ${
                staff.type === "company"
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <h4
                  className={`font-medium text-xs ${
                    staff.type === "company"
                      ? "text-green-700"
                      : "text-gray-700"
                  }`}
                >
                  {staff.type === "company"
                    ? "회사"
                    : `담당자 ${
                        staffAllocations
                          .filter((s) => s.type === "employee")
                          .findIndex((s) => s.id === staff.id) + 1
                      }`}
                </h4>
                {staff.type === "employee" &&
                  staffAllocations.filter((s) => s.type === "employee").length >
                    1 &&
                  !readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStaff(staff.id)}
                      className="h-4 w-4 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Minus className="h-2 w-2" />
                    </Button>
                  )}
              </div>

              <div className="grid grid-cols-2 gap-1">
                <div className="space-y-1">
                  <Label
                    htmlFor={`staff-name-${staff.id}`}
                    className="text-xs text-gray-600"
                  >
                    담당자
                  </Label>
                  {staff.type === "company" ? (
                    <Input
                      id={`staff-name-${staff.id}`}
                      value="회사"
                      readOnly
                      className="h-5 text-xs w-full bg-green-100 border-green-200"
                    />
                  ) : (
                    <Select
                      value={staff.accountId || ""}
                      onValueChange={(value) =>
                        handleEmployeeSelect(staff.id, value)
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger
                        className="h-5 text-xs border-gray-300"
                        disabled={readOnly}
                      >
                        <SelectValue placeholder="사원 선택">
                          {staff.name || "사원 선택"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent
                        data-contract-records-portal="true"
                        className="!z-[2200]"
                      >
                        {teamMembers.map((employee) => (
                          <SelectItem
                            key={employee.accountId}
                            value={employee.accountId}
                          >
                            {employee.name || "이름 없음"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor={`staff-percentage-${staff.id}`}
                    className="text-xs text-gray-600"
                  >
                    비율체크
                  </Label>
                  <div className="flex items-center gap-1">
                    <div className="flex-1">
                      {staff.isDirectInput ? (
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={staff.percentage || ""}
                            onChange={(e) =>
                              handleDirectPercentageChange(
                                staff.id,
                                e.target.value
                              )
                            }
                            className="h-5 text-xs pr-4 border-blue-300 focus:border-blue-500"
                            placeholder="0"
                            readOnly={readOnly}
                            disabled={readOnly}
                          />
                          <span className="absolute right-1 top-1/2 transform -translate-y-1/2 text-xs text-blue-600">
                            %
                          </span>
                        </div>
                      ) : (
                        <Select
                          value={staff.percentage.toString()}
                          onValueChange={(value) =>
                            handleStaffPercentageChange(staff.id, Number(value))
                          }
                          disabled={readOnly}
                        >
                          <SelectTrigger
                            className="h-5 text-xs border-gray-300"
                            disabled={readOnly}
                          >
                            <SelectValue placeholder="%" />
                          </SelectTrigger>
                          <SelectContent
                            data-contract-records-portal="true"
                            className="!z-[2200]"
                          >
                            {getAvailablePercentages(staff.id).map(
                              (percentage) => (
                                <SelectItem
                                  key={percentage}
                                  value={percentage.toString()}
                                >
                                  {percentage}%
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDirectInput(staff.id)}
                      className="h-5 px-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      disabled={readOnly}
                    >
                      {staff.isDirectInput ? "선택" : "직접"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor={`rebate-allowance-${staff.id}`}
                    className="text-xs text-gray-600"
                  >
                    총 금액
                  </Label>
                  <Input
                    id={`rebate-allowance-${staff.id}`}
                    value={formatCurrency(staff.rebateAllowance)}
                    readOnly
                    className="bg-yellow-50 border-yellow-200 text-xs h-5"
                  />
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor={`final-allowance-${staff.id}`}
                    className="text-xs text-gray-600"
                  >
                    {staff.type === "company"
                      ? "회사입금액"
                      : staff.isTeamLeader
                      ? "팀장 급여"
                      : "영업자 급여"}
                  </Label>
                  <Input
                    id={`final-allowance-${staff.id}`}
                    value={formatCurrency(staff.finalAllowance)}
                    readOnly
                    className="bg-purple-50 border-purple-200 text-xs h-5"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
