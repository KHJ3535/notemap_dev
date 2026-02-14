"use client";

import { useCallback, useRef, useState } from "react";
import type { PropertyItem } from "@/features/properties/types/propertyItem";
import type { LatLng } from "@/lib/geo/types";

import { useToast } from "@/hooks/use-toast";
import { useResolveAddress } from "@/hooks/useResolveAddress";
import { useViewportPost } from "../../../hooks/viewport/useViewportPost";
import { usePinsMap } from "../../../hooks/pins/usePinsMap";
import { usePanToWithOffset } from "../../../hooks/useKakaoTools";

import type { MapToolMode, Viewport } from "./mapHome.types";
import { sameViewport } from "./mapHome.utils";
import { useMenuAndDraft } from "./useMenuAndDraft";
import { usePropertyModals } from "./usePropertyModals";
import { useSearchAndPoi } from "./useSearchAndPoi";

import { useMapTools } from "./useMapTools";
import { useHiddenDrafts } from "./useHiddenDrafts";
import { useMarkersForMapHome } from "./useMarkersForMapHome";

export function useMapHomeState() {
  const { toast } = useToast();

  // 지도/SDK
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [kakaoSDK, setKakaoSDK] = useState<any>(null);

  // 토글/툴모드/사이드바
  const {
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
  } = useMapTools();

  // 데이터 (ViewModal 목록용)
  const [items, setItems] = useState<PropertyItem[]>([]);
  const [addFav] = useState<boolean>(false); // (지금은 미사용이지만 기존 인터페이스 유지용)

  // 뷰포스트 & 서버 핀
  const postViewport = useViewportPost();
  const lastViewportRef = useRef<Viewport | null>(null);
  const { points, drafts, setBounds, refetch } = usePinsMap();

  // 방금 등록된 draft 숨김 관리
  const { hiddenDraftIds, hideDraft, clearHiddenDraft } = useHiddenDrafts();

  // 뷰포트 전송 (pins/poi 쿼리용)
  const sendViewportQuery = useCallback(
    (vp: Viewport, opts?: { force?: boolean }) => {
      if (!opts?.force && sameViewport(vp, lastViewportRef.current)) return;
      lastViewportRef.current = vp;

      (postViewport as any)?.sendViewportQuery
        ? (postViewport as any).sendViewportQuery(vp)
        : (postViewport as any)(vp);

      if (kakaoSDK && mapInstance) {
        kakaoSDK.maps.event.trigger(mapInstance, "idle");
        requestAnimationFrame(() =>
          kakaoSDK.maps.event.trigger(mapInstance, "idle")
        );
      }

      try {
        const sw = vp.leftBottom;
        const ne = vp.rightTop;
        setBounds({
          swLat: sw.lat,
          swLng: sw.lng,
          neLat: ne.lat,
          neLng: ne.lng,
        });
      } catch {}
    },
    [postViewport, kakaoSDK, mapInstance, setBounds]
  );

  const lastViewport = lastViewportRef.current;

  // 공통 유틸
  const resolveAddress = useResolveAddress(kakaoSDK);
  const panToWithOffset = usePanToWithOffset(kakaoSDK, mapInstance);

  // ───────── 메뉴/드래프트 훅 ─────────
  const {
    hideLabelForId,
    onChangeHideLabelForId,
    menuOpen,
    menuAnchor,
    menuTargetId,
    menuRoadAddr,
    menuJibunAddr,
    draftPin,
    setDraftPin,
    createFromDraftId,
    setCreateFromDraftId,
    setRawMenuAnchor,
    openMenuAt,
    focusAndOpenAt,
    focusMapTo,
    handleMarkerClick,
    closeMenu,
    onPlanFromMenu,
    onOpenMenu,
  } = useMenuAndDraft({
    kakaoSDK,
    mapInstance,
    items,
    drafts,
    toast,
    resolveAddress,
    panToWithOffset,
    // ⭐ 답사예정지 등록/삭제 후 서버 핀을 다시 가져오기 위해 usePinsMap.refetch 넘김
    refetchPins: refetch,
  });

  // ───────── 검색/POI 훅 ─────────
  const {
    filtered,
    q,
    setQ,
    filter,
    setFilter,
    onChangeQ,
    onChangeFilter,
    runSearch,
    handleSearchSubmit,
    onSubmitSearch,
    poiKinds,
    setPoiKinds,
    onChangePoiKinds,
  } = useSearchAndPoi({
    kakaoSDK,
    mapInstance,
    points,
    items,
    toast,
    lastViewportRef,
    sendViewportQuery,
    refetch,
    onMatchedPin: async (p: any) => {
      setDraftPin(null);
      setCreateFromDraftId(null);

      const pos = { lat: p.position.lat, lng: p.position.lng };

      console.log("[useMapHomeState/runSearch] matched pin by search:", {
        id: p.id,
        name: (p as any).name,
        address: (p as any).address,
        pos,
      });

      await focusAndOpenAt(pos as LatLng, String(p.id));
    },
    onNoMatch: async (coords: LatLng) => {
      setCreateFromDraftId(null);

      console.log(
        "[useMapHomeState/runSearch] no matched pin, open draft at:",
        coords
      );

      await focusAndOpenAt(coords, "__draft__");
    },
  });

  // ───────── 매물 모달 훅 ─────────
  const {
    // selection
    selectedId,
    setSelectedId,
    selected,
    selectedViewItem,
    selectedPos,

    // modals
    viewOpen,
    setViewOpen,
    editOpen,
    setEditOpen,
    createOpen,
    setCreateOpen,
    prefillAddress,
    closeCreate,
    closeView,
    closeEdit,
    onEditFromView,

    // view/edit handlers
    onSaveViewPatch,
    onDeleteFromView,
    onSubmitEdit,

    // create from menu
    createPos,
    createPinKind,
    setCreatePinKind,
    draftHeaderPrefill,
    openViewFromMenu,
    openCreateFromMenu,
    onViewFromMenu,
    onCreateFromMenu,

    // host bridge
    createHostHandlers,
    editHostHandlers,

    /** ✅ ModalsHost로 넘길 pin-drafts용 id (number) */
    pinDraftId,
  } = usePropertyModals({
    items,
    setItems,
    drafts,
    draftPin,
    menuAnchor,
    menuRoadAddr,
    menuJibunAddr,
    createFromDraftId,
    setCreateFromDraftId,
    setDraftPinSafe: setDraftPin,
    hideDraft,
    refetch,
    closeMenu,
  });

  // 마커 클릭 (매물핀 / __visit__ / __draft__ 모두 지원)
  const onMarkerClick = handleMarkerClick;

  // 지도 준비
  const [fitAllOnce, setFitAllOnce] = useState(false);
  const onMapReady = useCallback(
    ({ kakao, map }: any) => {
      setKakaoSDK(kakao);
      setMapInstance(map);
      requestAnimationFrame(() => setFitAllOnce(false));
      setTimeout(() => {
        map.relayout?.();
        kakao.maps.event.trigger(map, "resize");
        kakao.maps.event.trigger(map, "idle");
      }, 0);

      try {
        const b = map.getBounds();
        const sw = b.getSouthWest();
        const ne = b.getNorthEast();
        setBounds({
          swLat: sw.getLat(),
          swLng: sw.getLng(),
          neLat: ne.getLat(),
          neLng: ne.getLng(),
        });
        refetch();
      } catch {}
    },
    [refetch, setBounds]
  );

  // ⭐ 마커 목록 (필터 + 숨김 반영)
  const markers = useMarkersForMapHome({
    points,
    drafts,
    draftPin,
    hiddenDraftIds,
    filter,
  });

  const onViewportChange = useCallback(
    (vp: any, opts?: { force?: boolean }) => sendViewportQuery(vp, opts),
    [sendViewportQuery]
  );

  return {
    // sdk/map
    kakaoSDK,
    mapInstance,
    onMapReady,
    sendViewportQuery,
    lastViewport,

    // data
    items,
    setItems,
    filtered,

    // markers
    fitAllOnce,
    setFitAllOnce,
    markers,

    // selection
    selectedId,
    setSelectedId,
    selected,

    // search/filter
    q,
    setQ,
    filter,
    setFilter,
    runSearch,
    handleSearchSubmit,
    onChangeQ,
    onChangeFilter,
    onSubmitSearch,

    // toggles
    useSidebar,
    setUseSidebar,
    mapToolMode,
    useDistrict,
    setUseDistrict,
    roadviewVisible,
    setRoadviewVisible,
    distanceMeasureVisible,
    toggleDistanceMeasure,
    toggleDistrict,
    toggleRoadview,

    // POI
    poiKinds,
    setPoiKinds,
    onChangePoiKinds,

    // menu
    menuOpen,
    menuAnchor,
    menuTargetId,
    menuRoadAddr,
    menuJibunAddr,
    closeMenu,
    openViewFromMenu,
    openCreateFromMenu,
    onCloseMenu: closeMenu,
    onViewFromMenu,
    onCreateFromMenu,
    onOpenMenu,
    onPlanFromMenu,

    // draft
    draftPin,
    setDraftPin,
    createPinKind,
    setCreatePinKind,

    // marker / viewport
    handleMarkerClick,
    onMarkerClick,
    onViewportChange,

    // modals
    addFav,
    viewOpen,
    setViewOpen,
    editOpen,
    setEditOpen,
    createOpen,
    setCreateOpen,
    prefillAddress,
    closeCreate,
    closeView,
    closeEdit,
    onEditFromView,

    // view handlers
    onSaveViewPatch,
    onDeleteFromView,
    selectedViewItem,

    // host bridges
    createHostHandlers,
    editHostHandlers,

    // misc
    selectedPos,
    hideLabelForId,
    onChangeHideLabelForId,

    // 숨김 제어
    hideDraft,
    clearHiddenDraft,
    createFromDraftId,

    // ⭐ 외부에서 지도 포커스 이동용
    focusMapTo,
    draftHeaderPrefill,

    /** ✅ ModalsHost로 내려줄 draft numeric id */
    pinDraftId,
  } as const;
}
