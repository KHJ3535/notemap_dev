"use client";

import { useCallback, useState } from "react";
import type { MapToolMode } from "./mapHome.types";

export function useMapTools() {
  // 토글/필터 (지도 툴 모드, 사이드바)
  const [mapToolMode, setMapToolMode] = useState<MapToolMode>("none");
  const [useSidebar, setUseSidebar] = useState<boolean>(false);

  /** 파생: 지적편집도 / 로드뷰 / 거리재기 상태 */
  const useDistrict = mapToolMode === "district";
  const roadviewVisible = mapToolMode === "roadview";
  const distanceMeasureVisible = mapToolMode === "distanceMeasure";

  /** 지적편집도 토글 (배타적) */
  const toggleDistrict = useCallback(() => {
    setMapToolMode((prev) => (prev === "district" ? "none" : "district"));
  }, []);

  /** 로드뷰 토글 (배타적) */
  const toggleRoadview = useCallback(() => {
    setMapToolMode((prev) => (prev === "roadview" ? "none" : "roadview"));
  }, []);

  /** 기존 setUseDistrict 인터페이스 호환용 */
  const setUseDistrict = useCallback((next: boolean) => {
    setMapToolMode((prev) => {
      if (next) return "district";
      return prev === "district" ? "none" : prev;
    });
  }, []);

  /** 필요 시 로드뷰도 직접 세트할 수 있게 */
  const setRoadviewVisible = useCallback((next: boolean) => {
    setMapToolMode((prev) => {
      if (next) return "roadview";
      return prev === "roadview" ? "none" : prev;
    });
  }, []);

  /** 거리재기 토글 (배타적) */
  const toggleDistanceMeasure = useCallback(() => {
    setMapToolMode((prev) =>
      prev === "distanceMeasure" ? "none" : "distanceMeasure"
    );
  }, []);

  return {
    mapToolMode,
    useSidebar,
    setUseSidebar,
    useDistrict,
    roadviewVisible,
    distanceMeasureVisible,
    toggleDistrict,
    toggleRoadview,
    toggleDistanceMeasure,
    setUseDistrict,
    setRoadviewVisible,
  } as const;
}
