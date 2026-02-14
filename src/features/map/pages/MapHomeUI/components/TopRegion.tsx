"use client";

import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/cn";
import SearchForm from "@/features/map/components/SearchForm/SearchForm";
import TopRightControls from "@/features/map/components/TopRightControls";
import type { MapMenuKey } from "@/features/map/components/menu/types/mapMenu.types";
import { PoiKind } from "@/features/map/poi/lib/poiTypes";

type TopRegionProps = {
  q: string;
  onChangeQ: (v: string) => void;
  onSubmitSearch: (q: string) => void;

  activeMenu: MapMenuKey;
  onChangeFilter: (next: MapMenuKey) => void;

  isDistrictOn: boolean;
  setIsDistrictOn: (next: boolean) => void;

  poiKinds: PoiKind[];
  onChangePoiKinds: (next: PoiKind[]) => void;

  roadviewVisible: boolean;
  onToggleRoadview: () => void;

  distanceMeasureVisible: boolean;
  onToggleDistanceMeasure: () => void;

  rightOpen: boolean;
  setRightOpen: (open: boolean) => void;

  sidebarOpen: boolean;
  onToggleSidebar: () => void;

  getBounds: () => kakao.maps.LatLngBounds | null | undefined;
  getLevel: () => number | undefined;

  roadviewRoadOn: boolean;
  onToggleRoadviewRoad: () => void;

  onMoveToCurrentLocation?: () => void;
};

export const TopRegion = forwardRef<HTMLDivElement, TopRegionProps>(
  (
    {
      q,
      onChangeQ,
      onSubmitSearch,
      activeMenu,
      onChangeFilter,
      isDistrictOn,
      setIsDistrictOn,
      poiKinds,
      onChangePoiKinds,
      roadviewVisible,
      onToggleRoadview,
      distanceMeasureVisible,
      onToggleDistanceMeasure,
      rightOpen,
      setRightOpen,
      sidebarOpen,
      onToggleSidebar,
      getBounds,
      getLevel,
      roadviewRoadOn,
      onToggleRoadviewRoad,
      onMoveToCurrentLocation,
    },
    rightAreaRef
  ) => {
    const safeGetBounds = useCallback(() => {
      const b = getBounds?.();
      return b ?? undefined; // null 이면 undefined 로 변환
    }, [getBounds]);

    return (
      <div
        className={cn(
          "pointer-events-none absolute left-3 right-3 top-3 z-[70]",
          "flex flex-col gap-2"
        )}
        role="region"
        aria-label="지도 상단 검색 및 토글"
      >
        <div className="pointer-events-auto w-full md:w-auto">
          <SearchForm
            value={q}
            onChange={onChangeQ}
            onSubmit={onSubmitSearch}
            placeholder="장소, 주소, 버스 검색"
            className="w-full md:max-w-[360px]"
          />
        </div>

        <div className="pointer-events-auto flex items-center justify-between">
          <div
            ref={rightAreaRef}
            className="flex flex-col md:flex-row items-center gap-2"
          >
            <TopRightControls
              activeMenu={activeMenu}
              onChangeFilter={onChangeFilter}
              isDistrictOn={isDistrictOn}
              setIsDistrictOn={setIsDistrictOn}
              poiKinds={poiKinds}
              onChangePoiKinds={onChangePoiKinds}
              roadviewVisible={roadviewVisible}
              onToggleRoadview={onToggleRoadview}
              distanceMeasureVisible={distanceMeasureVisible}
              onToggleDistanceMeasure={onToggleDistanceMeasure}
              rightOpen={rightOpen}
              setRightOpen={setRightOpen}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={(open: boolean) => {
                if (open !== sidebarOpen) onToggleSidebar();
              }}
              getBounds={safeGetBounds}
              getLevel={getLevel}
              roadviewRoadOn={roadviewRoadOn}
              onToggleRoadviewRoad={onToggleRoadviewRoad}
              onMoveToCurrentLocation={onMoveToCurrentLocation}
            />
          </div>
        </div>
      </div>
    );
  }
);

TopRegion.displayName = "TopRegion";
