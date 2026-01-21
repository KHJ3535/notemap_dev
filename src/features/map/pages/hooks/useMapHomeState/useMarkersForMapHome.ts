"use client";

import { useMemo } from "react";
import type { LatLng } from "@/lib/geo/types";
import type { MapMarker } from "@/features/map/shared/types/mapMarker.type";

// 🔹 핀 타입/뱃지 ↔ kind 매핑 유틸 추가
import type { PinKind } from "@/features/pins/types";
import { mapBadgeToPinKind } from "@/features/properties/lib/badge";
import { getDisplayPinKind } from "@/features/pins/lib/getDisplayPinKind";

// ⭐ MapMarker 확장: isFav는 선택 필드로만 추가
export type MapMarkerWithFav = MapMarker & { isFav?: boolean };

type UseMarkersArgs = {
  points: any[] | undefined;
  drafts: any[] | undefined;
  draftPin: LatLng | null; // 지금은 안 써도 타입은 그대로 둠
  hiddenDraftIds: Set<string>;
  filter: string;
};

export function useMarkersForMapHome({
  points,
  drafts,
  draftPin, // eslint-disable-line @typescript-eslint/no-unused-vars
  hiddenDraftIds,
  filter,
}: UseMarkersArgs): MapMarkerWithFav[] {
  return useMemo(() => {
    // 0) drafts 배열에서 숨긴 것 제외
    const visibleDraftsRaw = (drafts ?? []).filter(
      (d: any) => !hiddenDraftIds.has(String(d.id))
    );

    // 1) 필터 모드 판별
    const isPlannedOnlyMode = filter === "plannedOnly";

    // 2) 매물핀: plannedOnly 모드에서는 안 보이게
    const visiblePoints = isPlannedOnlyMode ? [] : points ?? [];

    // 3) 임시핀: plannedOnly 모드일 때는 draftState === "BEFORE" 만 남기기
    const visibleDrafts = visibleDraftsRaw.filter((d: any) => {
      if (!isPlannedOnlyMode) return true;
      const state = d.draftState as "BEFORE" | "SCHEDULED" | undefined;
      return state === "BEFORE";
    });

    // 4) 매물핀 마커 변환
    const pointMarkers: MapMarkerWithFav[] = visiblePoints.map((p: any) => {
      // 🔹 서버에서 내려준 badge/ageType 기준으로 kind 계산
      const baseKind = mapBadgeToPinKind(p.badge);
      const displayKind = getDisplayPinKind(baseKind, p.ageType ?? null);
      const kind: PinKind = (displayKind ?? baseKind ?? "1room") as PinKind;

      // 🔹 매물명 우선 표시: name → propertyName → data.propertyName → data.name → badge
      const name =
        (p.name ?? "").trim() ||
        (p.propertyName ?? "").trim() ||
        (p.data?.propertyName ?? "").trim() ||
        (p.data?.name ?? "").trim() ||
        "";
      const displayTitle = name || (p.badge ?? "");

      return {
        id: String(p.id),
        position: { lat: p.lat, lng: p.lng },
        kind,
        name, // 라벨 텍스트
        title: displayTitle,
        isFav: false,
      };
    });

    // 5) 임시핀 마커 변환 (__visit__ 접두사)
    const draftMarkers: MapMarkerWithFav[] = visibleDrafts.map((d: any) => {
      const name = (d.name ?? "").trim();
      const title = (d.title ?? "").trim();
      const displayName = name || title || "답사예정";
      
      return {
        id: `__visit__${d.id}`,
        position: { lat: d.lat, lng: d.lng },
        kind: "question" as const,
        name: displayName,
        title: title || displayName,
        isFav: false,
      };
    });

    // ✅ 최종 리턴
    return [...pointMarkers, ...draftMarkers];
  }, [points, drafts, draftPin, hiddenDraftIds, filter]);
}
