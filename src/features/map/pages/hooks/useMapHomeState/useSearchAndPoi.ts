"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  MutableRefObject,
} from "react";
import { isTooBroadKeyword } from "../../../shared/utils/isTooBroadKeyword";
import type { PropertyItem } from "@/features/properties/types/propertyItem";
import type { LatLng } from "@/lib/geo/types";
import type { Viewport } from "./mapHome.types";
import { PoiKind } from "@/features/map/poi/lib/poiTypes";
import { useRunSearch } from "@/features/map/hooks/search/useRunSearch";

type UseSearchAndPoiArgs = {
  kakaoSDK: any;
  mapInstance: any;
  points: any[] | undefined;
  items: PropertyItem[];
  toast: (opts: { title: string; description?: string; variant?: any }) => void;

  // viewport/poi 연동용
  lastViewportRef: MutableRefObject<Viewport | null>;
  sendViewportQuery: (vp: Viewport, opts?: { force?: boolean }) => void;
  refetch: () => void;

  // 검색 결과에 따른 동작 (외부에서 주입)
  onMatchedPin: (p: any) => Promise<void> | void;
  onNoMatch: (coords: LatLng) => Promise<void> | void;
};

export function useSearchAndPoi({
  kakaoSDK,
  mapInstance,
  points,
  items,
  toast,
  lastViewportRef,
  sendViewportQuery,
  refetch,
  onMatchedPin,
  onNoMatch,
}: UseSearchAndPoiArgs) {
  // 검색/필터
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [filter, setFilter] = useState<"all" | "pins" | "units" | string>(
    "all"
  );
  const [q, setQ] = useState("");

  const onChangeQ = useCallback((v: string) => setQ(v), []);
  const onChangeFilter = useCallback((v: any) => setFilter(v), []);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const qq = query.trim().toLowerCase();
      const matchQ =
        !qq ||
        p.title.toLowerCase().includes(qq) ||
        (p.address?.toLowerCase().includes(qq) ?? false);
      const matchType = type === "all" || (p as any).type === type;
      const matchStatus = status === "all" || (p as any).status === status;
      return matchQ && matchType && matchStatus;
    });
  }, [items, query, type, status]);

  // 검색용 items
  const searchItems = useMemo(
    () =>
      (points ?? []).map((p: any) => ({
        id: String(p.id),
        position: { lat: p.lat, lng: p.lng },
        name: p.name ?? p.propertyName ?? "",
        address: p.addressLine ?? p.address ?? null,
      })),
    [points]
  );

  const runSearchRaw = useRunSearch({
    kakaoSDK,
    mapInstance,
    items: searchItems as any,
    onMatchedPin,
    onNoMatch,
  });

  const runSearch = useCallback(
    (keyword?: string) => runSearchRaw(keyword ?? q),
    [runSearchRaw, q]
  );

  const handleSearchSubmit = useCallback(
    async (kw?: string) => {
      const keyword = (kw ?? q).trim();
      if (!keyword) return;

      await runSearch(keyword);
    },
    [q, runSearch, toast]
  );

  const onSubmitSearch = useCallback(
    (v?: string) => handleSearchSubmit(v),
    [handleSearchSubmit]
  );

  // POI
  const [poiKinds, setPoiKinds] = useState<PoiKind[]>([]);
  const onChangePoiKinds = useCallback(
    (next: PoiKind[]) => setPoiKinds(next),
    []
  );

  // POI 변경 즉시 반영 (기존 useEffect 그대로 이동)
  useEffect(() => {
    if (lastViewportRef.current) {
      sendViewportQuery(lastViewportRef.current, { force: true });
      refetch();
    } else {
      runSearch();
      if (kakaoSDK && mapInstance) {
        kakaoSDK.maps.event.trigger(mapInstance, "idle");
        requestAnimationFrame(() =>
          kakaoSDK.maps.event.trigger(mapInstance, "idle")
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poiKinds]);

  return {
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
  } as const;
}
