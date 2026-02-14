import { CreateFromPinArgs } from "@/features/map/components/contextMenu/PinContextMenu/PinContextMenuContainer.types";
import type { LatLng } from "@/lib/geo/types";

/** 지도 도구 모드 (지적/로드뷰/거리재기 배타적 관리) */
export type MapToolMode = "none" | "district" | "roadview" | "distanceMeasure";

/** 검색/뷰포트 정보 */
export type Viewport = {
  leftTop: LatLng;
  leftBottom: LatLng;
  rightTop: LatLng;
  rightBottom: LatLng;
  zoomLevel: number;
};

export type OpenMenuOpts = {
  roadAddress?: string | null;
  jibunAddress?: string | null;
  /** 줌 레벨 상관 없이 강제로 메뉴 열기 */
  forceOpen?: boolean;
  /** 외부에서 이미 panTo를 한 경우, 여기서는 지도 이동 생략 */
  skipPan?: boolean;
};

/** PinContextMenu에서 사용하는 create 인자 + 방문예정 간단등록 플래그 */
export type LocalCreateFromPinArgs = CreateFromPinArgs & {
  /** 답사예정지 '간단등록' 모드인지 여부 */
  visitPlanOnly?: boolean;
};
