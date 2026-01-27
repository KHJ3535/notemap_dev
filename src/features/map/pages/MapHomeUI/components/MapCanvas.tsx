"use client";

import * as React from "react";

import { MapMarker } from "../../../shared/types/mapMarker.type";
import MapView from "@/features/map/components/mapview/MapView";
import { attachLabelRegistryGlobalHandlers } from "@/features/map/engine/overlays/labelRegistry";
import { PoiKind } from "@/features/map/poi/lib/poiTypes";

export default function MapCanvas(props: {
  appKey: string;
  kakaoSDK: any;
  mapInstance: any;
  markers: MapMarker[];
  fitAllOnce?: any;
  poiKinds: readonly PoiKind[];
  pinsLoading?: boolean;
  pinsError?: string | null;
  menuOpen: boolean;
  menuAnchor?: { lat: number; lng: number } | null;
  hideLabelForId?: string | null;
  onMarkerClick?: (id: string) => void;
  onOpenMenu?: (args: any) => void;
  onChangeHideLabelForId?: (id?: string) => void;
  onMapReady?: (api: unknown) => void;
  onViewportChange?: (v: any) => void;
  isDistrictOn: boolean;

  /** 🔵 로드뷰 도로(파란 라인) 오버레이 표시 여부 */
  showRoadviewOverlay?: boolean;

  /** 🔵 로드뷰 도로 위 클릭 시 호출 */
  onRoadviewClick?: (pos: { lat: number; lng: number }) => void;

  /** 지도 빈 곳 클릭 시 호출 (point: 마우스 화면 좌표) */
  onMapClick?: (
    pos: { lat: number; lng: number },
    point?: { x: number; y: number }
  ) => void;
}) {
  const {
    appKey,
    kakaoSDK,
    // mapInstance, // 필요하면 나중에 사용할 수 있음
    markers,
    fitAllOnce,
    poiKinds,
    pinsLoading,
    pinsError,
    hideLabelForId,
    onMarkerClick,
    onOpenMenu,
    onChangeHideLabelForId,
    onMapReady,
    onViewportChange,
    isDistrictOn,

    // 🔹 메뉴 상태 (라벨 hide/show 에 사용)
    menuOpen,
    menuAnchor,

    showRoadviewOverlay,
    onRoadviewClick,
    onMapClick,
  } = props;

  // ✅ 전역 라벨 레지스트리 이벤트 핸들러 1회 연결
  React.useEffect(() => {
    attachLabelRegistryGlobalHandlers();
  }, []);

  // ✅ Map 인스턴스 보관(라벨 숨김 이벤트 + 로드뷰 도로 오버레이에서 사용)
  const mapRef = React.useRef<any>(null);

  // 🔵 로드뷰 도로 오버레이 인스턴스 보관
  const roadviewOverlayRef = React.useRef<any>(null);

  const handleMapReady = React.useCallback(
    (api: any) => {
      // MapView가 무엇을 넘기는지에 따라 유연하게 보관
      mapRef.current = api?.map ?? api?.kakaoMap ?? api ?? null;
      onMapReady?.(api);
    },
    [onMapReady]
  );

  // 🔵 로드뷰 도로(파란 라인) 오버레이 토글
  React.useEffect(() => {
    // SDK 없으면 아무것도 안 함
    if (!kakaoSDK) return;

    // 오버레이가 꺼져야 하는 경우 → 있으면 제거
    if (!showRoadviewOverlay) {
      if (roadviewOverlayRef.current) {
        try {
          roadviewOverlayRef.current.setMap(null);
        } catch {}
      }
      return;
    }

    // 여기부터는 켜야 하는 경우
    if (!mapRef.current) return; // 아직 지도 준비 안 됨

    // 최초 생성
    if (!roadviewOverlayRef.current) {
      try {
        roadviewOverlayRef.current = new kakaoSDK.maps.RoadviewOverlay();
      } catch {
        return;
      }
    }

    try {
      roadviewOverlayRef.current.setMap(mapRef.current);
    } catch {}
  }, [kakaoSDK, showRoadviewOverlay]);

  // ✅ 공통: 메뉴 오픈 시 근처 라벨 숨김 이벤트 발행
  const emitHideLabels = React.useCallback(
    (pos: { lat: number; lng: number }) => {
      try {
        if (typeof window !== "undefined" && "dispatchEvent" in window) {
          window.dispatchEvent(
            new CustomEvent("map:hide-labels-around", {
              detail: {
                map: mapRef.current,
                lat: pos.lat,
                lng: pos.lng,
                radiusPx: 40,
              },
            })
          );
        }
      } catch {}
    },
    []
  );

  // ✅ 메뉴가 닫힐 때, 해당 위치 주변 라벨 다시 보이게
  React.useEffect(() => {
    if (!mapRef.current) return;
    if (!menuAnchor) return;

    // menuOpen → false 로 바뀔 때만 동작
    if (menuOpen) return;

    try {
      if (typeof window !== "undefined" && "dispatchEvent" in window) {
        window.dispatchEvent(
          new CustomEvent("map:cleanup-overlays-at", {
            detail: {
              map: mapRef.current,
              lat: menuAnchor.lat,
              lng: menuAnchor.lng,
              radiusPx: 56, // 필요하면 조절
            },
          })
        );
      }
    } catch {
      // ignore
    }
  }, [menuOpen, menuAnchor]);

  return (
    <div className="absolute inset-0 notemap-map-root">
      <MapView
        appKey={appKey}
        center={{ lat: 37.5665, lng: 126.978 }}
        level={4}
        markers={markers}
        fitToMarkers={fitAllOnce}
        useDistrict={isDistrictOn}
        onMarkerClick={(id) => onMarkerClick?.(String(id))}
        onMapReady={handleMapReady}
        onViewportChange={onViewportChange}
        allowCreateOnMapClick={false}
        hideLabelForId={hideLabelForId}
        // ✅ 신규핀(지도 클릭으로 생성) 메뉴 오픈
        onDraftPinClick={(pos) => {
          emitHideLabels(pos);
          onOpenMenu?.({
            position: pos,
            propertyId: "__draft__",
            propertyTitle: "선택 위치",
            pin: { kind: "question", isFav: false },
          });
          onChangeHideLabelForId?.("__draft__");
        }}
        // ✅ 기존핀/주소검색 등 모든 메뉴 오픈 진입점
        onOpenMenu={({ position, propertyId, propertyTitle, pin }) => {
          if (position) emitHideLabels(position);
          onOpenMenu?.({ position, propertyId, propertyTitle, pin });
        }}
        poiKinds={poiKinds}
        showPoiToolbar={false}
        // 🔵 로드뷰 관련
        showRoadviewOverlay={showRoadviewOverlay}
        onRoadviewClick={onRoadviewClick}
        onMapClick={onMapClick}
      />

      {pinsLoading && (
        <div className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-xs shadow">
          Loading pins…
        </div>
      )}
      {pinsError && (
        <div className="absolute left-2 top-8 rounded bg-red-50 px-2 py-1 text-xs text-red-700 shadow">
          {pinsError}
        </div>
      )}
    </div>
  );
}
