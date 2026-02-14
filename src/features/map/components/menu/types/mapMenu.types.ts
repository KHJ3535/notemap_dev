import { PoiKind } from "../../../engine/overlays/poiOverlays";

export type MapMenuKey = "all" | "new" | "old" | "plannedOnly";
export type MapMenuSubmenu = "filter" | "edit";

type CommonProps = {
  /** 현재 선택된 상단 필터 탭 */
  active: MapMenuKey;
  onChange?: (key: MapMenuKey) => void;

  /** 지적편집도 토글 */
  isDistrictOn: boolean;
  onToggleDistrict: (next: boolean) => void;

  /** 로드뷰 토글 */
  roadviewVisible: boolean;
  onToggleRoadview: () => void;

  /** 거리재기 토글 */
  distanceMeasureVisible: boolean;
  onToggleDistanceMeasure: () => void;

  /** 주변시설 선택 */
  poiKinds: readonly PoiKind[];
  onChangePoiKinds: (next: PoiKind[]) => void;

  className?: string;
};

type UncontrolledExpand = {
  /** 내부에서 열림 상태를 관리(기본 동작) */
  expanded?: undefined;
  onExpandChange?: undefined;
};

type ControlledExpand = {
  /** 외부에서 열림 상태 제어 */
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
};

export type MapMenuProps = CommonProps &
  (UncontrolledExpand | ControlledExpand);
