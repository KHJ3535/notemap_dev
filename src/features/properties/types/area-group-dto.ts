/**
 * 매물등록 시 면적 그룹을 서버에 전송할 때 사용하는 DTO
 * (POST /pins, /pin-drafts 요청의 areaGroups 필드)
 */
export interface AreaUnitDto {
  /** 전용면적(㎡) */
  exclusiveM2?: number | null;
  /** 실면적(㎡) */
  realM2?: number | null;
}

export interface CreatePinAreaGroupDto {
  /** 그룹명 (예: "84A", "전용 59형", "기타") */
  title: string;

  /** 전용(㎡) — 필수 */
  exclusiveMinM2: number;
  exclusiveMaxM2: number;

  /** 실평(㎡) — 필수 */
  actualMinM2: number;
  actualMaxM2: number;

  /** 평(선택): 참조용으로만 전송하고, 서버 계산은 m² 기준 */
  exclusiveMinPy?: number;
  exclusiveMaxPy?: number;
  actualMinPy?: number;
  actualMaxPy?: number;

  /** 정렬 순서(1부터 권장) */
  sortOrder?: number;

  /** 개별 평수 목록 (선택) */
  units?: AreaUnitDto[] | null;
}
