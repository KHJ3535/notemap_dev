"use client";

import type { MutableRefObject } from "react";
import {
  parseStationAndExit,
  pickBestStation,
  pickBestExitStrict,
  pickBestPlace,
  shouldCreateSearchPin,
} from "../lib/searchUtils";
import type { PinKind } from "@/features/pins/types";
import type { MapMarker } from "@/features/map/shared/types/mapMarker.type";

// ✅ 매물 핀 kind 계산용 (MapHome에서 쓰는 것과 동일하게)
import { mapBadgeToPinKind } from "@/features/properties/lib/badge";
import { getDisplayPinKind } from "@/features/pins/lib/getDisplayPinKind";
// ✅ 라벨 직접 숨기기용
import { distM } from "@/features/map/poi/lib/geometry";
import { hideLabelsAround } from "@/features/map/engine/overlays/labelRegistry";

import { isTooBroadKeyword, getBroadKeywordZoomLevel } from "@/features/map/shared/utils/isTooBroadKeyword";

type SearchDeps = {
  kakaoSDK: any;
  mapInstance: any;
  effectiveServerPoints: any[];
  effectiveServerDrafts: any[];
  localDraftMarkers: MapMarker[];
  upsertDraftMarker: (m: {
    id: string | number;
    lat: number;
    lng: number;
    address?: string | null;
    source?: "geocode" | "search" | "draft";
    kind?: PinKind;
  }) => void;
  clearTempMarkers: () => void;
  onSubmitSearch?: (q: string) => void;
  // 🔹 기존 메뉴 오픈 콜백 (임시핀 & 실핀 공통)
  onOpenMenu?: (args: {
    position: { lat: number; lng: number };
    propertyId: string | number;
    propertyTitle: string;
    pin?: { kind: PinKind; isFav: boolean };
  }) => void;
  onChangeHideLabelForId?: (id?: string) => void;
  lastSearchCenterRef: MutableRefObject<{ lat: number; lng: number } | null>;
  // 🔹 선택된 핀을 “리스트/사이드바 쪽에서도 클릭” 처리하고 싶을 때
  onMarkerClick?: (id: string | number) => void;
};

export async function searchPlaceOnMap(text: string, deps: SearchDeps) {
  const {
    kakaoSDK,
    mapInstance,
    effectiveServerPoints,
    effectiveServerDrafts,
    localDraftMarkers,
    upsertDraftMarker,
    clearTempMarkers,
    onSubmitSearch,
    onOpenMenu,
    onChangeHideLabelForId,
    lastSearchCenterRef,
    onMarkerClick,
  } = deps;

  const query = text.trim();
  if (!query || !kakaoSDK || !mapInstance) return;

  if (process.env.NODE_ENV !== "production") {
    console.log("[searchPlaceOnMap] start", { query });
  }

  onSubmitSearch?.(query);

  // 0) 광역 키워드인 경우: 주소 검색만 수행하여 레벨 조정 후 바로 return (마커 및 상세메뉴 처리 안함)
  if (isTooBroadKeyword(query)) {
    const geocoder = new kakaoSDK.maps.services.Geocoder();
    geocoder.addressSearch(query, (res: any[], status: string) => {
      if (status === kakaoSDK.maps.services.Status.OK && res?.[0]) {
        const r0 = res[0];
        const lat = Number(r0.y);
        const lng = Number(r0.x);
        const coords = new kakaoSDK.maps.LatLng(lat, lng);
        const zoomLevel = getBroadKeywordZoomLevel(query);
        mapInstance.setCenter(coords);
        mapInstance.setLevel(zoomLevel);
        
        // 광역일 때는 이전 임시 핀 제거 및 선택 해제 유지
        clearTempMarkers?.();
        onChangeHideLabelForId?.(undefined);
      } else {
        console.warn("[searchPlaceOnMap] failed to geo-locate broad keyword", query);
      }
    });
    return;
  }

  const setCenterOnly = (lat: number, lng: number) => {
    console.log("[searchPlaceOnMap] setCenterOnly", { lat, lng, query });
    const ll = new kakaoSDK.maps.LatLng(lat, lng);
    mapInstance.setCenter(ll);
    mapInstance.setLevel(3);
  };

  const runAfterIdle = (fn: () => void) => {
    if (!kakaoSDK || !mapInstance || !(kakaoSDK as any).maps?.event) {
      fn();
      return;
    }

    try {
      const event = (kakaoSDK as any).maps.event;
      let fired = false;

      const listener = event.addListener(mapInstance, "idle", () => {
        if (fired) return;
        fired = true;
        event.removeListener(listener);
        fn();
      });

      setTimeout(() => {
        if (fired) return;
        fired = true;
        event.removeListener(listener);
        fn();
      }, 400);
    } catch {
      fn();
    }
  };

  const setCenterWithMarker = async (
    lat: number,
    lng: number,
    label?: string | null
  ) => {
    const NEAR_THRESHOLD_M = 800;

    type RealAroundPin = {
      id: string;
      lat: number;
      lng: number;
      title?: string | null;
      kind?: PinKind;
    };

    try {
      const ll = new kakaoSDK.maps.LatLng(lat, lng);
      mapInstance.setCenter(ll);
      mapInstance.setLevel(3);
    } catch {}

    const findBestRealAround = (): RealAroundPin | null => {
      let bestReal: RealAroundPin | null = null;
      let bestDist = Infinity;

      const tryReal = (
        id: string | number,
        plat: number,
        plng: number,
        title?: string | null,
        kind?: PinKind
      ) => {
        const d = distM(lat, lng, plat, plng);
        if (d <= NEAR_THRESHOLD_M && d < bestDist) {
          bestDist = d;
          bestReal = {
            id: String(id),
            lat: plat,
            lng: plng,
            title,
            kind,
          };
        }
      };

      // ✅ 실제 매물핀
      (effectiveServerPoints ?? []).forEach((p: any) => {
        const baseKind = mapBadgeToPinKind(p.badge);
        const displayKind = getDisplayPinKind(baseKind, p.ageType ?? null);
        const kind = (displayKind ?? baseKind ?? "1room") as PinKind;

        tryReal(
          p.id,
          p.lat,
          p.lng,
          (p as any).title ?? (p as any).name ?? null,
          kind
        );
      });

      // ✅ 답사예정핀 (question 아이콘)
      (effectiveServerDrafts ?? []).forEach((d: any) => {
        tryReal(
          d.id,
          d.lat,
          d.lng,
          (d as any).title ?? (d as any).name ?? "답사예정",
          "question"
        );
      });

      // ✅ 이미 지도에 떠 있는 __visit__ 임시핀
      localDraftMarkers.forEach((m: any) => {
        const idStr = String(m.id);
        if (!idStr.startsWith("__visit__")) return;
        const pos = m.position;
        if (!pos) return;
        tryReal(idStr, pos.lat, pos.lng, m.title ?? null, "question");
      });

      return bestReal;
    };

    let bestReal = findBestRealAround();

    if (process.env.NODE_ENV !== "production") {
      console.log("[searchPlaceOnMap] bestReal (first)", bestReal);
    }

    // 못 찾았으면 뷰포트 강제 새로고침 한 번 시도
    if (!bestReal && kakaoSDK && mapInstance?.getLevel) {
      try {
        const level = mapInstance.getLevel();
        const center = mapInstance.getCenter();

        mapInstance.setLevel(level + 1, { animate: false });
        mapInstance.setLevel(level, { animate: false });
        mapInstance.setCenter(center);
      } catch {}

      bestReal = findBestRealAround();

      if (process.env.NODE_ENV !== "production") {
        console.log("[searchPlaceOnMap] bestReal (after refresh)", bestReal);
      }
    }

    // ✅ 근처에서 실제 매물을 찾은 경우 → 바로 그 매물 기준으로 메뉴 열기 + 라벨 숨기기
    if (bestReal) {
      const {
        id,
        lat: realLat,
        lng: realLng,
        title: realTitle,
        kind,
      } = bestReal;
      const title = realTitle ?? label ?? "선택 위치";
      const pinKind: PinKind = (kind ?? "question") as PinKind;

      runAfterIdle(() => {
        if (process.env.NODE_ENV !== "production") {
          console.log("[searchPlaceOnMap] open REAL pin from search", {
            id,
            realLat,
            realLng,
            title,
            pinKind,
          });
        }

        clearTempMarkers();

        lastSearchCenterRef.current = {
          lat: realLat,
          lng: realLng,
        };

        // 🔥 좌표 기준으로 라벨 직접 숨기기
        try {
          if (mapInstance) {
            hideLabelsAround(mapInstance, realLat, realLng, 56);
            if (process.env.NODE_ENV !== "production") {
              console.log("[searchPlaceOnMap] hideLabelsAround(real pin)", {
                realLat,
                realLng,
              });
            }
          }
        } catch (e) {
          console.warn("[searchPlaceOnMap] hideLabelsAround error", e);
        }

        // 🔥 이 매물 id 기준으로 라벨 숨김 상태 유지
        onChangeHideLabelForId?.(String(id));

        // ✅ 메뉴를 "실제 매물 id" 기준으로 연다
        onOpenMenu?.({
          position: { lat: realLat, lng: realLng },
          propertyId: id,
          propertyTitle: title,
          pin: { kind: pinKind, isFav: false },
        });

        // 리스트/사이드바 동기화
        onMarkerClick?.(id);
      });

      return;
    }

    // 🚫 마지막 방어선:
    // 현재 시점에라도 근처에 실제 매물/답사핀 있으면 임시핀을 만들지 않는다.
    const hasRealNow =
      (effectiveServerPoints ?? []).some((p: any) => {
        return distM(lat, lng, p.lat, p.lng) <= NEAR_THRESHOLD_M;
      }) ||
      (effectiveServerDrafts ?? []).some((d: any) => {
        return distM(lat, lng, d.lat, d.lng) <= NEAR_THRESHOLD_M;
      });

    if (hasRealNow) {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[searchPlaceOnMap] skip __search__ marker (real pin exists nearby)",
          { lat, lng, label, query }
        );
      }
      // 센터만 맞춰놓고 종료 – 유저는 실제 핀을 직접 클릭해서 사용
      return;
    }

    // 🔹 근처에 실제 핀이 없으면 메뉴만 열기 (핀은 저장 시에만 생성)
    clearTempMarkers();

    lastSearchCenterRef.current = { lat, lng };

    const id = "__search__";

    if (process.env.NODE_ENV !== "production") {
      console.log("[searchPlaceOnMap] open menu only (no pin)", {
        id,
        lat,
        lng,
        label,
      });
    }

    const openMenu = () => {
      onOpenMenu?.({
        position: { lat, lng },
        propertyId: id,
        propertyTitle: label ?? query ?? "선택 위치",
        pin: { kind: "question", isFav: false },
      });
      onChangeHideLabelForId?.(id);
    };

    if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
      window.requestAnimationFrame(openMenu);
    } else {
      setTimeout(openMenu, 0);
    }
  };

  const places = new kakaoSDK.maps.services.Places();
  const geocoder = new kakaoSDK.maps.services.Geocoder();
  const Status = kakaoSDK.maps.services.Status;
  const centerLL = mapInstance.getCenter?.();

  const doAddressFallback = () => {
    geocoder.addressSearch(query, (addrRes: any[], addrStatus: string) => {
      if (addrStatus !== Status.OK || !addrRes?.length) return;
      const { x, y, road_address, address } = addrRes[0] ?? {};
      const lat = Number(y);
      const lng = Number(x);
      const label =
        road_address?.address_name || address?.address_name || query || null;

      const pseudoItem = {
        place_name: query,
        road_address_name: label,
        address_name: label,
        address: { address_name: label },
        category_group_code: "",
      };

      if (shouldCreateSearchPin(pseudoItem, query)) {
        setCenterWithMarker(lat, lng, label);
      } else {
        setCenterOnly(lat, lng);
      }
    });
  };

  const { stationName, exitNo, hasExit } = parseStationAndExit(query);

  places.keywordSearch(
    query,
    (data: any[], status: string) => {
      console.log("[keywordSearch] result", {
        query,
        status,
        count: data?.length ?? 0,
      });

      if (status !== Status.OK || !data?.length) {
        doAddressFallback();
        return;
      }

      if (hasExit && stationName) {
        const station = pickBestStation(data, stationName);
        if (!station) {
          doAddressFallback();
          return;
        }

        const stationLL = new kakaoSDK.maps.LatLng(
          Number(station.y),
          Number(station.x)
        );

        places.keywordSearch(
          `${station.place_name} 출구`,
          (exitData: any[], exitStatus: string) => {
            console.log("[keywordSearch exit]", {
              query,
              exitStatus,
              exitCount: exitData?.length ?? 0,
            });

            if (exitStatus !== Status.OK || !exitData?.length) {
              const lat = stationLL.getLat();
              const lng = stationLL.getLng();
              if (shouldCreateSearchPin(station, query)) {
                setCenterWithMarker(lat, lng, station.place_name);
              } else {
                setCenterOnly(lat, lng);
              }
              return;
            }

            const picked =
              pickBestExitStrict(
                exitData,
                stationName,
                exitNo ?? null,
                stationLL
              ) ?? station;

            const lat = Number(picked.y);
            const lng = Number(picked.x);
            const label = picked.place_name ?? query;

            if (shouldCreateSearchPin(picked, query)) {
              setCenterWithMarker(lat, lng, label);
            } else {
              setCenterOnly(lat, lng);
            }
          },
          {
            location: stationLL,
            radius: 600,
          }
        );
        return;
      }

      let target: any;
      if (stationName) {
        target = pickBestStation(data, stationName);
      } else {
        target = pickBestPlace(data, query, centerLL ?? undefined);
      }

      if (!target) {
        doAddressFallback();
        return;
      }

      const lat = Number(target.y);
      const lng = Number(target.x);
      const label = target.place_name ?? query;

      if (shouldCreateSearchPin(target, query)) {
        setCenterWithMarker(lat, lng, label);
      } else {
        setCenterOnly(lat, lng);
      }
    },
    centerLL
      ? {
          location: centerLL,
          radius: 3000,
        }
      : undefined
  );
}
