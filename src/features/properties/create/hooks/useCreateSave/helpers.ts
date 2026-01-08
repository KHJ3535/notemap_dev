"use client";

import { validateUnitPriceRanges } from "../useCreateValidation";

type CanSaveArgs = {
  form: any;
  isVisitPlanPin: boolean;
  mainTitle: string;
  mainOfficePhone: string;
  hasImageFolderWithTitle: boolean;
  isSaving: boolean;
};

export type CanSaveDebugInfo = {
  minimalForVisitPlan: boolean;
  hasBuildingGradeForCanSave: boolean;
  elevatorSelected: boolean;
  rebateFilled: boolean;
  unitLinesPriceError: string | null;
};

export function computeCanSave({
  form,
  isVisitPlanPin,
  mainTitle,
  mainOfficePhone,
  hasImageFolderWithTitle,
  isSaving,
}: CanSaveArgs): { canSave: boolean; debug: CanSaveDebugInfo } {
  const f: any = form;

  // 답사예정핀 전용 최소 조건
  const minimalForVisitPlan = !!mainTitle && !!mainOfficePhone;

  // 신축/구옥 선택 여부
  const hasBuildingGradeForCanSave =
    f.buildingGrade != null || f.isNew === true || f.isOld === true;

  // 엘리베이터 선택 여부
  const elevatorSelected = f.elevator === "O" || f.elevator === "X";

  // 리베이트 인풋 채움 여부 (rebateRaw 기준)
  const rawRebateForCanSave = String(f.rebateRaw ?? "").trim();
  const rebateFilled = rawRebateForCanSave.replace(/[^\d]/g, "").length > 0;

  // 구조별 최소/최대 매매가 체크
  const unitLinesPriceError = validateUnitPriceRanges(
    Array.isArray(f.unitLines) ? (f.unitLines as any[]) : [],
    f.remainingHouseholds
  );

  // 모든 추가 필드는 옵셔널 (이름, 주소, 분양실 전화번호만 필수)
  const canSave = isVisitPlanPin
    ? minimalForVisitPlan && !isSaving
    : f.isSaveEnabled &&
      !unitLinesPriceError &&
      !isSaving;

  return {
    canSave,
    debug: {
      minimalForVisitPlan,
      hasBuildingGradeForCanSave,
      elevatorSelected,
      rebateFilled,
      unitLinesPriceError,
    },
  };
}
