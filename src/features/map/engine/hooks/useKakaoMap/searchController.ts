import type { MutableRefObject } from "react";
import type { LatLng } from "@/lib/geo/types";
import { isTooBroadKeyword, getBroadKeywordZoomLevel } from "@/features/map/shared/utils/isTooBroadKeyword";
import type { useToast } from "@/hooks/use-toast";

export type SearchOptions = {
  clearPrev?: boolean;
  recenter?: boolean;
  fitZoom?: boolean;
  /** 입력이 ‘…역’일 때 지하철역(SW8)부터 우선 검색 */
  preferStation?: boolean;
  /** 기본 검색 마커(파란핀) 표시 여부 (기본 true) */
  showMarker?: boolean;
  /** 좌표를 받아서 추가 행동(로드뷰 열기 등) 수행 */
  onFound?: (pos: LatLng) => void;
};

// useToast().toast 의 첫 번째 인자 타입을 그대로 따르는 함수 타입
export type ToastFn = (
  opts: Parameters<ReturnType<typeof useToast>["toast"]>[0]
) => void;

type SearchDeps = {
  kakaoRef: MutableRefObject<any>;
  mapRef: MutableRefObject<any>;
  geocoderRef: MutableRefObject<any>;
  placesRef: MutableRefObject<any>;
  maxLevelRef: MutableRefObject<number>;
  lastSearchMarkerRef: MutableRefObject<any>;
  toast: ToastFn;
  isReady: boolean;
};

export function createSearchController({
  kakaoRef,
  mapRef,
  geocoderRef,
  placesRef,
  maxLevelRef,
  lastSearchMarkerRef,
  toast,
  isReady,
}: SearchDeps) {
  const clearLastMarker = () => {
    if (lastSearchMarkerRef.current) {
      lastSearchMarkerRef.current.setMap(null);
      lastSearchMarkerRef.current = null;
    }
  };

  const placeMarkerAt = (coords: any, opts?: SearchOptions) => {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (!kakao || !map) return;

    const {
      clearPrev = true,
      recenter = true,
      fitZoom = false,
      showMarker = true,
    } = opts || {};

    if ((clearPrev || showMarker === false) && lastSearchMarkerRef.current) {
      lastSearchMarkerRef.current.setMap(null);
      lastSearchMarkerRef.current = null;
    }

    if (recenter) {
      const current = map.getCenter?.();
      if (
        !current ||
        current.getLat() !== coords.getLat() ||
        current.getLng() !== coords.getLng()
      ) {
        map.setCenter(coords);
      }
    }

    if (fitZoom) {
      const targetLevel = Math.min(5, maxLevelRef.current);
      if (map.getLevel?.() !== targetLevel) map.setLevel(targetLevel);
    }

    if (showMarker === false) return;

    // 기본 스프라이트 대신 https 아이콘을 명시해 Mixed Content 방지
    const imgUrl =
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png";
    const image = new kakao.maps.MarkerImage(
      imgUrl,
      new kakao.maps.Size(24, 35),
      { offset: new kakao.maps.Point(12, 35) }
    );

    const marker = new kakao.maps.Marker({
      map,
      position: coords,
      image,
    });
    lastSearchMarkerRef.current = marker;
  };

  const searchPlace = (query: string, opts?: SearchOptions) => {
    if (!isReady || !kakaoRef.current || !mapRef.current) return;

    const trimmed = query.trim();
    if (!trimmed) return;

    const kakao = kakaoRef.current;
    const geocoder = geocoderRef.current ?? new kakao.maps.services.Geocoder();
    const places = placesRef.current ?? new kakao.maps.services.Places();
    geocoderRef.current = geocoder;
    placesRef.current = places;

    // 광역 키워드면 해당 지역으로 중심 이동만 수행 (마커 생성 생략)
    if (isTooBroadKeyword(trimmed)) {
      geocoder.addressSearch(trimmed, (res: any[], status: string) => {
        if (status === kakao.maps.services.Status.OK && res?.[0]) {
          const r0 = res[0];
          const coords = new kakao.maps.LatLng(parseFloat(r0.y), parseFloat(r0.x));
          
          // 키워드 자체를 분석하여 명시적으로 줌 레벨 도출
          const zoomLevel = getBroadKeywordZoomLevel(trimmed);

          mapRef.current?.setCenter(coords);
          mapRef.current?.setLevel(zoomLevel);
          toast({ title: `'${trimmed}' 지역으로 이동했습니다.` });
        } else {
          toast({
            title: "지역 정보 없음",
            variant: "destructive",
            description: "해당 지역을 찾을 수 없습니다.",
          });
        }
      });
      return;
    }

    const { preferStation = false, onFound } = opts || {};
    const endsWithStation = trimmed.endsWith("역");

    const tryStationFirst = (): Promise<LatLng | null> =>
      new Promise((resolve) => {
        places.keywordSearch(trimmed, (data: any[], status: string) => {
          if (status === kakao.maps.services.Status.OK && data?.length) {
            const station =
              data.find(
                (d) =>
                  d.category_group_code === "SW8" ||
                  d.category_name?.includes("지하철역")
              ) || null;
            if (station) {
              resolve({
                lat: parseFloat(station.y),
                lng: parseFloat(station.x),
              });
              return;
            }
          }
          resolve(null);
        });
      });

    const tryKeyword = (): Promise<LatLng | null> =>
      new Promise((resolve) => {
        places.keywordSearch(trimmed, (data: any[], status: string) => {
          if (status === kakao.maps.services.Status.OK && data?.[0]) {
            resolve({
              lat: parseFloat(data[0].y),
              lng: parseFloat(data[0].x),
            });
          } else {
            resolve(null);
          }
        });
      });

    const tryAddress = (): Promise<LatLng | null> =>
      new Promise((resolve) => {
        geocoder.addressSearch(trimmed, (res: any[], status: string) => {
          if (status === kakao.maps.services.Status.OK && res?.[0]) {
            resolve({
              lat: parseFloat(res[0].y),
              lng: parseFloat(res[0].x),
            });
          } else {
            resolve(null);
          }
        });
      });

    (async () => {
      let found: LatLng | null = null;

      if (endsWithStation || preferStation) {
        found = await tryStationFirst();
        if (!found) found = await tryKeyword();
        if (!found) found = await tryAddress();
      } else {
        found = await tryAddress();
        if (!found) found = await tryKeyword();
      }

      if (!found) {
        console.warn("검색 결과 없음:", trimmed);
        // 필요하면 여기서도 토스트 가능
        return;
      }

      const kakao = kakaoRef.current;
      placeMarkerAt(new kakao.maps.LatLng(found.lat, found.lng), opts);
      onFound?.(found);
    })();
  };

  return {
    searchPlace,
    clearLastMarker,
  };
}
