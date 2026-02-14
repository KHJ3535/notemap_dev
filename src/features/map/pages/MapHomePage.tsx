"use client";

import { useCallback, useMemo, useEffect } from "react";

import { useSidebar } from "@/features/sidebar/SideBarProvider";
import FavGroupModal from "@/features/sidebar/components/FavGroupModal";
import type { ListItem } from "@/features/sidebar/types/sidebar";

import { useReverseGeocode } from "./hooks/useReverseGeocode";
import { useFavModalController } from "./hooks/useFavModalController";
import { eqId } from "@/shared/api/survey-reservations/surveyReservations";
import { useReserveFromMenu } from "./hooks/useReserveFromMenu";
import MapHomeUI from "./MapHomeUI/MapHomeUI";
import { useMapHomeState } from "./hooks/useMapHomeState";
import { createPinDraft } from "@/shared/api/pins";
import { CreateFromPinArgs } from "../components/contextMenu/PinContextMenu/PinContextMenuContainer.types";
import { buildAddressLine } from "../components/contextMenu/PinContextMenu/utils/geo";
import { PIN_MENU_MAX_LEVEL } from "../shared/constants/mapLevels";

export default function MapHomePage() {
  const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (!KAKAO_MAP_KEY) {
    return (
      <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
        NEXT_PUBLIC_KAKAO_MAP_KEY 환경변수가 없습니다. (Vercel 프로젝트에 추가
        후 <b>재배포</b> 필요)
      </div>
    );
  }

  const s = useMapHomeState();

  // 🔍 250m(레벨 5) 이하에서만 컨텍스트 메뉴 유지
  useEffect(() => {
    const kakaoSDK = (s as any).kakaoSDK;
    const map = (s as any).mapInstance;
    if (!kakaoSDK || !map) return;

    const ev = kakaoSDK.maps?.event ?? (globalThis as any)?.kakao?.maps?.event;
    if (!ev || typeof ev.addListener !== "function") return;

    let closing = false;

    const handler = () => {
      const level = map.getLevel?.();
      if (typeof level !== "number") return;

      // 250m(레벨 5)보다 더 축소됐고, 메뉴가 열려있고, 아직 닫는 중이 아닐 때만
      if (level > PIN_MENU_MAX_LEVEL && (s as any).menuOpen && !closing) {
        closing = true;
        (s as any).closeMenu?.();
      }
    };

    // 🔴 기존: "zoom_changed"
    // ev.addListener(map, "zoom_changed", handler);

    // ✅ 수정: 줌/이동이 끝난 뒤 한 번만 호출되도록 "idle" 사용
    ev.addListener(map, "idle", handler);

    return () => {
      try {
        ev.removeListener(map, "idle", handler);
      } catch {
        /* noop */
      }
    };
  }, [s]);

  const {
    nestedFavorites,
    addFavoriteToGroup,
    createGroupAndAdd,
    ensureFavoriteGroup,
    isFavoritePin,
    removeFavoriteByPinId,
    reserveVisitPlan,
  } = useSidebar();

  const reverseGeocode = useReverseGeocode(s.kakaoSDK);

  const fav = useFavModalController({
    getCurrentItem: (): ListItem | null => {
      const id = s.menuTargetId;
      if (!id) return null;
      const todayISO = new Date().toISOString().slice(0, 10);
      const title =
        s.menuRoadAddr ||
        s.menuJibunAddr ||
        (s.items.find((p) => eqId(p.id, id))?.title ?? "이름 없음");
      return { id: String(id), title, dateISO: todayISO };
    },
    addFavoriteToGroup,
    createGroupAndAdd,
    ensureFavoriteGroup,
    isFavorited: (id) => isFavoritePin(String(id)),
    removeFavorite: (id) => removeFavoriteByPinId(String(id)),
  });

  const serverFavById = useMemo(() => {
    // ✅ 서버에서 로드된 즐겨찾기(nestedFavorites) 기준으로 pinId 집계
    const map: Record<string, boolean> = {};
    for (const g of nestedFavorites ?? []) {
      for (const it of g.subItems ?? []) {
        const pid = String((it as any)?.pinId ?? "").trim();
        if (pid) map[pid] = true;
      }
    }
    return map;
  }, [nestedFavorites]);

  // ✅ 즐겨찾기 여부는 서버(즐겨찾기 그룹) 기준으로만 판단 (로컬 map:favs 사용 X)

  // ===== 콜백들 =====
  const onChangeQ = useCallback(
    (v: string) => {
      (s as any).onChangeQ?.(v) ?? (s as any).setQ?.(v);
    },
    [s]
  );

  const onChangeFilter = useCallback(
    (v: any) => {
      (s as any).onChangeFilter?.(v) ?? (s as any).setFilter?.(v);
    },
    [s]
  );

  const onSubmitSearch = useCallback(
    (v?: string) => {
      const text = v ?? "";
      (s as any).onSubmitSearch?.(text) ?? (s as any).performSearch?.(text);
    },
    [s]
  );

  const onChangePoiKinds = useCallback(
    (next: any) => {
      (s as any).onChangePoiKinds?.(next) ??
        (s as any).setPoiKinds?.(next) ??
        (s as any).updatePoiKinds?.(next);
    },
    [s]
  );

  const onCreateFromMenu = useCallback(
    (args: CreateFromPinArgs) => {
      // 좌표/모드 처리 포함한 실제 로직은 useMapHomeState 쪽에서 처리
      (s as any).onCreateFromMenu?.(args) ?? (s as any).createFromMenu?.(args);
    },
    [s]
  );

  const onChangeHideLabelForId = useCallback(
    (id?: string | null) => {
      s.onChangeHideLabelForId?.(id ?? null);
    },
    [s]
  );

  // ✅ MapHomeUI → useMapHomeState onOpenMenu 어댑터 + 줌 레벨 가드
  const handleOpenMenu = useCallback(
    (p: {
      position: { lat: number; lng: number };
      propertyId?: string | number | null;
      propertyTitle?: string | null;
      pin?: { kind: string; isFav?: boolean };
    }) => {
      const payloadForState = {
        ...p,
        propertyId: p.propertyId ?? undefined,
      };
      (s as any).onOpenMenu?.(payloadForState);
    },
    [s]
  );

  // ===== payload → draftId 어댑터 =====
  const reserveVisitPlanFromPayload = useCallback(
    async (payload: {
      lat: number;
      lng: number;
      address?: string;
      roadAddress: string | null;
      jibunAddress: string | null;
      reservedDate?: string;
      dateISO?: string;

      // 🔹 추가: 매물명 + 분양사무실 대표번호
      name?: string | null;
      contactMainPhone?: string | null;
    }) => {
      const addressLine =
        (payload.address && payload.address.trim()) ||
        buildAddressLine(
          payload.lat,
          payload.lng,
          payload.roadAddress,
          payload.jibunAddress,
          null
        );

      const { id: draftId } = await createPinDraft({
        lat: payload.lat,
        lng: payload.lng,
        addressLine,

        // 🔹 여기서 같이 전송
        name: payload.name ?? undefined,
        contactMainPhone: payload.contactMainPhone ?? undefined,
      });
      if (draftId == null)
        throw new Error("Draft 생성에 실패했습니다. (id 없음)");

      await reserveVisitPlan(String(draftId), {
        reservedDate: payload.reservedDate ?? payload.dateISO,
        dateISO: payload.dateISO,
      });

      try {
        (s as any).refetchPins?.({ draftState: "all" });
        (s as any).reloadPins?.();
        (s as any).onViewportChange?.(s.mapInstance);
      } catch {
        /* noop */
      }
    },
    [reserveVisitPlan, s]
  );

  const onReserveFromMenu = useReserveFromMenu({
    s,
    reverseGeocode,
    reserveVisitPlan: reserveVisitPlanFromPayload,
  });

  const menuTitle = useMemo(() => {
    if (!s.menuTargetId) return null;
    return s.items.find((p) => eqId(p.id, s.menuTargetId))?.title ?? null;
  }, [s.items, s.menuTargetId]);

  const uiProps = useMemo(
    () => ({
      appKey: KAKAO_MAP_KEY,
      kakaoSDK: s.kakaoSDK,
      mapInstance: s.mapInstance,

      items: s.items,
      filtered: s.filtered,
      markers: s.markers,
      fitAllOnce: s.fitAllOnce,

      q: s.q,
      filter: s.filter,
      onChangeQ,
      onChangeFilter,
      onSubmitSearch,

      useSidebar: s.useSidebar,
      setUseSidebar: s.setUseSidebar,
      useDistrict: s.useDistrict,
      distanceMeasureVisible: s.distanceMeasureVisible,
      onToggleDistanceMeasure: s.toggleDistanceMeasure,

      poiKinds: s.poiKinds,
      onChangePoiKinds,

      addFav: true,
      favById: serverFavById,
      onAddFav: fav.onAddFav,

      menuOpen: s.menuOpen,
      menuAnchor: s.menuAnchor,
      menuTargetId: s.menuTargetId,
      menuRoadAddr: s.menuRoadAddr,
      menuJibunAddr: s.menuJibunAddr,
      menuTitle,
      onCloseMenu: s.closeMenu,
      onCreateFromMenu,
      onPlanFromMenu: s.onPlanFromMenu,

      onMarkerClick: s.onMarkerClick,
      onMapReady: s.onMapReady,
      onViewportChange: s.onViewportChange,

      editOpen: s.editOpen,
      createOpen: s.createOpen,
      selectedId: s.selectedId,
      prefillAddress: s.prefillAddress,
      draftPin: s.draftPin,
      setDraftPin: s.setDraftPin,
      selectedPos: s.selectedPos,
      closeEdit: s.closeEdit,
      closeCreate: s.closeCreate,
      onSaveViewPatch: s.onSaveViewPatch,
      onEditFromView: s.onEditFromView,
      onDeleteFromView: s.onDeleteFromView,
      createHostHandlers: s.createHostHandlers,
      editHostHandlers: s.editHostHandlers,

      hideLabelForId: s.hideLabelForId,
      onOpenMenu: handleOpenMenu,
      onChangeHideLabelForId,
      onReserveFromMenu,

      createFromDraftId: s.createFromDraftId,
      createPinKind: (s as any).createPinKind ?? null,
      draftHeaderPrefill: (s as any).draftHeaderPrefill ?? null,

      /** ✅ ModalsHost까지 전달할 draft numeric id */
      pinDraftId: (s as any).pinDraftId,
    }),
    [
      KAKAO_MAP_KEY,
      s,
      fav.onAddFav,
      serverFavById,
      nestedFavorites,
      onChangeQ,
      onChangeFilter,
      onSubmitSearch,
      onChangePoiKinds,
      onCreateFromMenu,
      onChangeHideLabelForId,
      onReserveFromMenu,
      handleOpenMenu,
      menuTitle,
    ]
  );

  return (
    <>
      <MapHomeUI {...uiProps} />
      <FavGroupModal
        open={fav.favModalOpen}
        groups={nestedFavorites}
        onSelectGroup={fav.handleSelectGroup}
        onCreateAndSelect={fav.handleCreateAndSelect}
        onClose={fav.closeFavModal}
      />
    </>
  );
}
