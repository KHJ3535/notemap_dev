"use client";

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import useKakaoMap from "../../engine/hooks/useKakaoMap/useKakaoMap";
import { useClustererWithLabels } from "../../engine/clusterer/useClustererWithLabels";
import { useDistrictOverlay } from "../../engine/hooks/useDistrictOverlay";
import type { MapViewProps } from "./mapView.types";
import { PoiKind } from "../../engine/overlays/poiOverlays";
import usePoiLayer from "../../poi/hooks/usePoiLayer";
import { PoiLayerToggle } from "../../poi/components/PoiLayerToggle";
import { PIN_MENU_MAX_LEVEL } from "../../shared/constants/mapLevels";

type Props = MapViewProps;

export type MapViewHandle = {
  searchPlace: (
    q: string,
    opts?: {
      clearPrev?: boolean;
      recenter?: boolean;
      fitZoom?: boolean;
      preferStation?: boolean;
      showMarker?: boolean;
      onFound?: (pos: { lat: number; lng: number }) => void;
    }
  ) => void;
  panTo: (p: { lat: number; lng: number }) => void;
};

const MapView = React.forwardRef<MapViewHandle, Props>(function MapView(
  {
    appKey,
    center,
    level = 5,
    markers = [],
    fitToMarkers = false,
    useDistrict = false,
    allowCreateOnMapClick = false,
    onMarkerClick,
    onDraftPinClick,
    onMapClick,
    onMapReady,
    onViewportChange,
    pinKind = "1room",
    hideLabelForId = null,

    poiKinds = [],
    showPoiToolbar = false,
    onOpenMenu,

    // 🔵 로드뷰 관련 신규 props
    showRoadviewOverlay = false,
    onRoadviewClick,
  },
  ref
) {
  // useKakaoMap이 idle 디바운스를 제공하므로 내부 타이머 제거
  const { containerRef, kakao, map, searchPlace, panTo } = useKakaoMap({
    appKey,
    center,
    level,
    fitKoreaBounds: true,
    viewportDebounceMs: 500,
    onMapReady,
    onViewportChange, // 그대로 전달 (훅이 디바운스 처리)
    useCurrentLocationOnInit: true,
    showRoadviewOverlay,
  });

  // 외부로 제어 메서드 노출
  useImperativeHandle(
    ref,
    () => ({
      searchPlace,
      panTo,
    }),
    [searchPlace, panTo]
  );

  // 마우스 클릭 화면 좌표 보관 (주소 모달 위치용)
  const lastClickPointRef = useRef({ x: 0, y: 0 });

  // 구/군 경계 오버레이
  useDistrictOverlay(kakao, map, useDistrict);

  // ▼ 주변시설 레이어 (외부 상태 사용) — 가드 강화
  usePoiLayer({
    kakaoSDK: kakao,
    map,
    enabledKinds: [...(poiKinds ?? [])] as PoiKind[],
    maxResultsPerKind: 80,
    // 500m 체감 게이트
    minViewportEdgeMeters: 1000,
    showAtOrBelowLevel: 6,
  });

  // 지도 클릭 (로드뷰/임시핀 클릭 처리)
  useEffect(() => {
    if (!kakao || !map) return;

    const handler = (e: any) => {
      const latlng = e?.latLng;
      if (!latlng) return;

      const pos = {
        lat: latlng.getLat(),
        lng: latlng.getLng(),
      };

      console.log("map clicked", pos.lat, pos.lng);

      // 1) 지도 클릭 콜백 (주소 모달 등; allowCreateOnMapClick와 별개)
      if (onMapClick) {
        onMapClick(pos, lastClickPointRef.current);
      }

      // 2) 로드뷰 도로(파란선) 모드일 때 → 로드뷰 열기 콜백
      if (showRoadviewOverlay && onRoadviewClick) {
        onRoadviewClick(pos);
      }
    };

    kakao.maps.event.addListener(map, "click", handler);
    return () => {
      kakao.maps.event.removeListener(map, "click", handler);
    };
  }, [kakao, map, allowCreateOnMapClick, onMapClick, showRoadviewOverlay, onRoadviewClick]);

  // 마커 클릭 핸들러
  const handleMarkerClick = useCallback(
    (id: string) => {
      const level = map?.getLevel?.() ?? 0;

      // 1) 드래프트 핀은 기존 동작 유지
      if (id === "__draft__") {
        const draft = markers.find((m) => String(m.id) === "__draft__");
        if (draft && onDraftPinClick) {
          onDraftPinClick(draft.position);
        } else if (map && onDraftPinClick && kakao) {
          const c = map.getCenter();
          onDraftPinClick({ lat: c.getLat(), lng: c.getLng() });
        }
        return;
      }

      const isVisit = String(id).startsWith("__visit__");
      const m = markers.find((x) => String(x.id) === String(id));
      if (!m) return;

      // 2) 너무 멀리서 클릭한 경우 → 먼저 250m(레벨 5)로 "점프" 줌
      if (level > PIN_MENU_MAX_LEVEL && map) {
        try {
          map.setLevel(PIN_MENU_MAX_LEVEL);
        } catch {
          /* noop */
        }
      }

      // 3) 답사예정 핀 (__visit__) → 자동 예약 금지, 메뉴만 오픈
      if (isVisit) {
        if (onOpenMenu) {
          onOpenMenu({
            position: m.position,
            propertyId: String(m.id),
            propertyTitle: (m as any).title ?? null,
            pin: { kind: "question", isFav: !!(m as any).isFav },
          });
        }
        return;
      }

      // 4) 일반 매물 핀 → 컨텍스트 메뉴 열기 + 상위 콜백 알림
      if (onOpenMenu) {
        onOpenMenu({
          position: m.position,
          propertyId: String(m.id),
          propertyTitle: (m as any).title ?? (m as any).name ?? "",
          pin: {
            kind: (m as any).pin?.kind ?? pinKind,
            isFav: !!(m as any).isFav,
          },
        });
      }

      onMarkerClick?.(id);
    },
    [markers, onDraftPinClick, onMarkerClick, map, kakao, onOpenMenu, pinKind]
  );

  // 클러스터러 + 라벨
  useClustererWithLabels(kakao, map, markers, {
    hitboxSizePx: 56,
    onMarkerClick: handleMarkerClick,
    defaultPinKind: pinKind,
    fitToMarkers,
    hideLabelForId,
    enableDebug: true,
  });

  return (
    <div className="relative w-full h-full">
      {showPoiToolbar && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur rounded-xl p-2 shadow">
          <PoiLayerToggle
            value={[...poiKinds] as PoiKind[]}
            onChange={() => {
              /* 외부 제어형: 부모에서 상태를 바꾸도록 유지 */
            }}
          />
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full"
        onMouseDownCapture={(e) => {
          lastClickPointRef.current = { x: e.clientX, y: e.clientY };
        }}
      />
    </div>
  );
});

export default MapView;
