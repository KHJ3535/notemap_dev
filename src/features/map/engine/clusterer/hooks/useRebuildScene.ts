"use client";

import { useEffect, useMemo } from "react";
import type { MapMarker } from "@/features/map/shared/types/mapMarker.type";
import type { PinKind } from "@/features/pins/types";

import { buildSceneKey } from "@/features/map/engine/scene/buildSceneKey";
import { firstNonEmpty } from "@/features/map/engine/scene/firstNonEmpty";
import { cleanLabelCandidate } from "@/features/map/engine/scene/cleanLabelCandidate";
import {
  EnrichedMarker,
  enrichMarkers,
} from "@/features/map/engine/scene/enrichMarkers";
import { mountClusterMode } from "../mountClusterMode";
import {
  createHitboxOverlay,
  createLabelOverlay,
  createMarker,
} from "../overlays/pinOverlays";
import { DRAFT_ID, SELECTED_Z } from "../overlays/overlayStyles";

type Args = {
  isReady: boolean;
  kakao: any;
  map: any;
  markers: readonly MapMarker[];
  reservationOrderMap: Record<string, number | undefined> | undefined;
  reservationOrderByPosKey?: Record<string, number | undefined>;
  defaultPinKind: PinKind;
  labelGapPx: number;
  hitboxSizePx: number;
  safeLabelMax: number;
  clusterMinLevel: number;
  selectedKey: string | null;
  realMarkersKey: string;
  markerObjsRef: React.MutableRefObject<Record<string, any>>;
  markerClickHandlersRef: React.MutableRefObject<
    Record<string, ((...a: any[]) => void) | null>
  >;
  labelOvRef: React.MutableRefObject<Record<string, any>>;
  hitboxOvRef: React.MutableRefObject<Record<string, any>>;
  clustererRef: React.MutableRefObject<any>;
  onMarkerClickRef: React.MutableRefObject<((id: string) => void) | undefined>;
};

export function useRebuildScene(args: Args) {
  const {
    isReady,
    kakao,
    map,
    markers,
    reservationOrderMap,
    reservationOrderByPosKey,
    defaultPinKind,
    labelGapPx,
    hitboxSizePx,
    safeLabelMax,
    clusterMinLevel,
    selectedKey,
    realMarkersKey,
    markerObjsRef,
    markerClickHandlersRef,
    labelOvRef,
    hitboxOvRef,
    clustererRef,
    onMarkerClickRef,
  } = args;

  const sceneKey = useMemo(() => buildSceneKey(markers), [markers]);

  useEffect(() => {
    if (!isReady) return;

    // ── cleanup old ─────────────────────────────────────────────
    Object.entries(markerClickHandlersRef.current).forEach(([id, handler]) => {
      const mk = markerObjsRef.current[id];
      if (mk && handler) kakao.maps.event.removeListener(mk, "click", handler);
    });
    markerClickHandlersRef.current = {};
    Object.values(labelOvRef.current).forEach((ov: any) => ov.setMap(null));
    labelOvRef.current = {};
    Object.values(hitboxOvRef.current).forEach((ov: any) => ov.setMap(null));
    hitboxOvRef.current = {};
    clustererRef.current?.clear?.();
    Object.values(markerObjsRef.current).forEach((mk: any) => mk.setMap(null));
    markerObjsRef.current = {};

    // ① enrich
    const enriched: EnrichedMarker[] = enrichMarkers(
      markers,
      reservationOrderMap,
      reservationOrderByPosKey
    );

    // ② posKey 단위로 라벨 1개만 유지
    const labelByPos: Record<string, { ov: any; isPlan: boolean }> = {};

    // ③ 렌더 순서: 일반 → plan 나중
    const ordered = enriched.sort((a, b) =>
      a.isPlan === b.isPlan ? 0 : a.isPlan ? 1 : -1
    );

    // 거리 계산 유틸
    const distM = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371000;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };

    const hideLabelsByPosKey = (pk: string) => {
      Object.entries(labelOvRef.current).forEach(([k, ov]: any) => {
        try {
          const el = ov?.getContent?.();
          if (el?.dataset?.posKey === pk) {
            ov.setMap?.(null);
            delete labelOvRef.current[k];
          }
        } catch {}
      });
    };

    const hideLabelsNear = (lat: number, lng: number, thresholdM = 20) => {
      Object.entries(labelOvRef.current).forEach(([k, ov]: any) => {
        try {
          const el = ov?.getContent?.();
          const plat = parseFloat(el?.dataset?.posLat ?? "NaN");
          const plng = parseFloat(el?.dataset?.posLng ?? "NaN");
          if (Number.isFinite(plat) && Number.isFinite(plng)) {
            if (distM(lat, lng, plat, plng) <= thresholdM) {
              ov.setMap?.(null);
              delete labelOvRef.current[k];
            }
          }
        } catch {}
      });
    };

    ordered.forEach(
      ({ m, key, order, isDraft, isPlan, isAddressOnly, posKey }) => {
        const pos = new kakao.maps.LatLng(m.position.lat, m.position.lng);

        const primaryName =
          firstNonEmpty(
            cleanLabelCandidate((m as any).name),
            cleanLabelCandidate((m as any).propertyName),
            cleanLabelCandidate((m as any).property?.name),
            cleanLabelCandidate((m as any).data?.propertyName)
          ) || "";

        const displayName =
          primaryName ||
          firstNonEmpty(
            cleanLabelCandidate((m as any).property?.title),
            cleanLabelCandidate((m as any).data?.name),
            cleanLabelCandidate(m.title),
            cleanLabelCandidate(String(m.id ?? ""))
          ) ||
          "";

        const planText = `${m.regionLabel ?? ""} 답사예정`.trim();
        const planDisplayName = displayName || planText;

        // ── marker 생성 ──────────────────────────────
        const mk = createMarker(kakao, pos, {
          isDraft,
          key,
          kind: (m.kind ?? defaultPinKind) as PinKind,
          title: isPlan ? planDisplayName : displayName,
        });
        markerObjsRef.current[key] = mk;

        if (
          key === "__draft__" ||
          key === DRAFT_ID ||
          key.startsWith("__visit__")
        ) {
          mk.setZIndex(-99999);
        }

        const handler = () => onMarkerClickRef.current?.(key);
        kakao.maps.event.addListener(mk, "click", handler);
        markerClickHandlersRef.current[key] = handler;

        if (isAddressOnly) {
          const hitOv = createHitboxOverlay(kakao, pos, hitboxSizePx, () =>
            onMarkerClickRef.current?.(key)
          );
          hitboxOvRef.current[key] = hitOv;
          return;
        }

        if (isPlan && posKey && labelByPos[posKey]?.isPlan === false) {
          const hitOv = createHitboxOverlay(kakao, pos, hitboxSizePx, () =>
            onMarkerClickRef.current?.(key)
          );
          hitboxOvRef.current[key] = hitOv;
          return;
        }

        const labelText = isPlan ? planText : displayName;

        if (isPlan) {
          if (posKey) hideLabelsByPosKey(posKey);
          const lat = m.position?.lat;
          const lng = m.position?.lng;
          if (typeof lat === "number" && typeof lng === "number") {
            hideLabelsNear(lat, lng, 20);
          }
        }

        const prev = labelOvRef.current[key];
        if (prev) {
          const el = prev.getContent?.() as HTMLElement | null;
          const titleEl = el?.querySelector?.(
            '[data-role="label-title"]'
          ) as HTMLElement | null;

          if (titleEl) {
            titleEl.textContent = labelText;
          } else if (el) {
            el.textContent = labelText;
          }

          prev.setPosition(pos);
          prev.setMap(map);

          return;
        }

        if (isPlan && posKey && labelByPos[posKey]) {
          try {
            labelByPos[posKey].ov.setMap?.(null);
          } catch {}
          delete labelByPos[posKey];
        }

        const labelOv = createLabelOverlay(
          kakao,
          pos,
          labelText,
          labelGapPx,
          typeof order === "number" ? order : undefined
        );

        try {
          const el = labelOv.getContent?.() as HTMLDivElement | null;
          if (el) {
            (el as any).dataset = (el as any).dataset || {};
            (el as any).dataset.rawLabel = labelText;
            (el as any).dataset.posKey = posKey ?? "";
            (el as any).dataset.posLat = String(m.position?.lat ?? "");
            (el as any).dataset.posLng = String(m.position?.lng ?? "");
            (el as any).dataset.labelType = isPlan ? "plan" : "property";
          }
        } catch {}

        labelOvRef.current[key] = labelOv;
        if (posKey) {
          labelByPos[posKey] = { ov: labelOv, isPlan };
        }

        const hitOv = createHitboxOverlay(kakao, pos, hitboxSizePx, () =>
          onMarkerClickRef.current?.(key)
        );
        hitboxOvRef.current[key] = hitOv;
      }
    );

    const level = map.getLevel();
    if (level <= safeLabelMax) {
      clustererRef.current?.clear?.();
      Object.values(markerObjsRef.current).forEach((mk: any) => mk.setMap(map));
      const cleared = selectedKey == null;
      Object.entries(labelOvRef.current).forEach(([id, ov]: any[]) =>
        ov.setMap(!cleared && id === selectedKey ? null : map)
      );
      Object.entries(hitboxOvRef.current).forEach(([id, ov]: any[]) =>
        ov.setMap(!cleared && id === selectedKey ? null : map)
      );
      if (!cleared) {
        markerObjsRef.current[selectedKey!]?.setZIndex?.(SELECTED_Z);
      }
    } else if (level >= clusterMinLevel) {
      mountClusterMode(
        { kakao, map },
        {
          markerObjsRef,
          markerClickHandlersRef,
          labelOvRef,
          hitboxOvRef,
          clustererRef,
          onMarkerClickRef,
        },
        selectedKey
      );
    } else {
      Object.values(labelOvRef.current).forEach((ov: any) => ov.setMap(null));
      clustererRef.current?.clear?.();
      Object.values(markerObjsRef.current).forEach((mk: any) => mk.setMap(map));
      Object.values(hitboxOvRef.current).forEach((ov: any) => ov.setMap(map));
    }

    return () => {
      Object.entries(markerClickHandlersRef.current).forEach(
        ([id, handler]) => {
          const mk = markerObjsRef.current[id];
          if (mk && handler) {
            kakao.maps.event.removeListener(mk, "click", handler);
          }
        }
      );
      markerClickHandlersRef.current = {};
      clustererRef.current?.clear?.();
      Object.values(labelOvRef.current).forEach((ov: any) => ov.setMap(null));
      Object.values(hitboxOvRef.current).forEach((ov: any) => ov.setMap(null));
      Object.values(markerObjsRef.current).forEach((mk: any) =>
        mk.setMap(null)
      );
      labelOvRef.current = {};
      hitboxOvRef.current = {};
      markerObjsRef.current = {};
    };
  }, [
    isReady,
    sceneKey,
    realMarkersKey,
    kakao,
    map,
    reservationOrderMap,
    reservationOrderByPosKey,
    defaultPinKind,
    labelGapPx,
    hitboxSizePx,
    safeLabelMax,
    clusterMinLevel,
    selectedKey,
  ]);
}
