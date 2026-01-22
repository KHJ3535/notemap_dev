"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { LatLng } from "@/lib/geo/types";

type Options = {
  kakaoSDK?: any; // window.kakao를 주입받을 수도 있음
  map?: any; // kakao.maps.Map 인스턴스
  autoSync?: boolean; // true면 openAtCenter()가 map 중심 사용
};

type UseRoadview = {
  /** 로드뷰 DOM 컨테이너 ref (필수) */
  roadviewContainerRef: React.RefObject<HTMLDivElement>;
  /** 로드뷰 인스턴스 ref (미니맵 동기화용) */
  roadviewRef: React.MutableRefObject<any>;
  /** 현재 패널 표시 여부 */
  visible: boolean;
  /** 파노라마 찾는 중 */
  loading: boolean;
  /** 맵 중심(또는 마지막 좌표)에서 열기 */
  openAtCenter: () => void;
  /** 특정 좌표에서 열기 (face: 바라볼 좌표) */
  openAt: (pos: LatLng, opts?: { face?: LatLng }) => void;
  /** 닫기 */
  close: () => void;
  /** 컨테이너 사이즈 변경 시 relayout */
  resize: () => void;
};

declare global {
  interface Window {
    kakao: any;
  }
}

/* ---- heading 계산 유틸: pano(시작) -> face(대상) 방위각 ---- */
function toRad(d: number) {
  return (d * Math.PI) / 180;
}
function toDeg(r: number) {
  return (r * 180) / Math.PI;
}
/** -180~180 범위의 pan 각도로 변환 */
function heading(from: LatLng, to: LatLng) {
  const φ1 = toRad(from.lat),
    φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ) + Math.sin(φ1) * Math.sin(φ2);
  const θ = Math.atan2(y, x); // -π~π
  const deg0_360 = (toDeg(θ) + 360) % 360;
  return deg0_360 > 180 ? deg0_360 - 360 : deg0_360; // -180~180
}

/** 로드뷰 검색 반경 단계 */
const SEARCH_RADII = [30, 60, 120, 240];

export function useRoadview(opts: Options = {}): UseRoadview {
  const { kakaoSDK, map, autoSync = true } = opts;
  const { toast } = useToast();

  const roadviewContainerRef = useRef<HTMLDivElement>(null);
  const roadviewRef = useRef<any>(null);
  const initListenerRef = useRef<any>(null);

  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  /** 마지막으로 열려고 했던 위치/시선 */
  const lastPosRef = useRef<LatLng | null>(null);
  const lastFaceRef = useRef<LatLng | null>(null);

  const getKakao = () =>
    kakaoSDK ?? (typeof window !== "undefined" ? window.kakao : undefined);

  const ensureInstance = useCallback(() => {
    const el = roadviewContainerRef.current;
    const kakao = getKakao();
    if (!el || !kakao?.maps) return false;
    if (!roadviewRef.current) {
      roadviewRef.current = new kakao.maps.Roadview(el);
    }
    return true;
  }, [kakaoSDK]);

  /** pos 주변에 로드뷰 파노라마가 있는지 미리 검사 */
  const hasPanoNearby = useCallback(
    async (pos: LatLng, face?: LatLng): Promise<boolean> => {
      const kakao = getKakao();
      if (!kakao?.maps) return false;

      const searchPoint = face ?? pos;
      const target = new kakao.maps.LatLng(
        searchPoint.lat,
        searchPoint.lng
      ) as any;

      const rvClient = new kakao.maps.RoadviewClient();

      for (const r of SEARCH_RADII) {
        // eslint-disable-next-line no-await-in-loop
        const panoId = await new Promise<number | null>((resolve) => {
          rvClient.getNearestPanoId(target, r, (id: number | null) =>
            resolve(id)
          );
        });
        if (panoId) return true;
      }

      return false;
    },
    [kakaoSDK]
  );

  /** pos 주변에서 가장 가까운 파노라마를 찾아 로드뷰 세팅 + face 방향으로 카메라 회전 */
  const renderAt = useCallback(
    async (pos: LatLng, face?: LatLng) => {
      const kakao = getKakao();
      if (!kakao?.maps) return;
      if (!ensureInstance()) return;
      if (!pos) return;

      setLoading(true);
      lastPosRef.current = pos;

      const searchPoint = face ?? pos;
      const target = new kakao.maps.LatLng(searchPoint.lat, searchPoint.lng);

      const rvClient = new kakao.maps.RoadviewClient();

      let found = false;

      // init 리스너 중복 방지
      if (initListenerRef.current) {
        kakao.maps.event.removeListener(
          roadviewRef.current,
          "init",
          initListenerRef.current
        );
        initListenerRef.current = null;
      }

      for (const r of SEARCH_RADII) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise<void>((done) => {
          rvClient.getNearestPanoId(target, r, (panoId: number | null) => {
            if (panoId) {
              try {
                roadviewRef.current.setPanoId(panoId, target);
              } catch (e) {
                console.error("[useRoadview] setPanoId 실패:", e);
              }

              // pano 변경 후 초기화 시점에 카메라 방향 설정
              const listener = kakao.maps.event.addListener(
                roadviewRef.current,
                "init",
                () => {
                  try {
                    if (face) {
                      const panoPos = roadviewRef.current.getPosition();
                      const pan = heading(
                        { lat: panoPos.getLat(), lng: panoPos.getLng() },
                        face
                      );
                      roadviewRef.current.setViewpoint({
                        pan,
                        tilt: 0,
                        zoom: 0,
                      });
                    }
                    // 살짝 지연 후 레이아웃 보정
                    setTimeout(() => {
                      roadviewRef.current?.relayout?.();
                    }, 150);
                  } catch (err) {
                    console.error("[useRoadview] init handler error:", err);
                  }
                }
              );
              initListenerRef.current = listener;

              found = true;
            }
            done();
          });
        });
        if (found) break;
      }

      setLoading(false);
    },
    [ensureInstance, kakaoSDK]
  );

  /** 맵 중심(또는 마지막 위치)에서 열기 */
  const openAtCenter = useCallback(() => {
    let base: LatLng | null = null;

    if (autoSync && map?.getCenter) {
      try {
        const c = map.getCenter();
        base = { lat: c.getLat(), lng: c.getLng() };
      } catch {
        // ignore
      }
    }

    if (!base && lastPosRef.current) {
      base = lastPosRef.current;
    }

    if (!base) return;

    const face = base;
    lastPosRef.current = base;
    lastFaceRef.current = face;

    // 먼저 로드뷰 가능 여부 체크 후, 있을 때만 패널 열기
    (async () => {
      const ok = await hasPanoNearby(base!, face);
      if (!ok) {
        toast({
          title: "로드뷰를 열 수 없어요",
          description:
            "해당 축척 또는 위치에는 로드뷰 데이터가 없어요.\n파란 도로가 보일 정도로 확대해서 다시 시도해 주세요.",
        });
        return;
      }
      setVisible(true); // 실제 Kakao Roadview 세팅은 effect에서
    })();
  }, [autoSync, map, hasPanoNearby, toast]);

  /** 특정 좌표에서 열기 */
  const openAt = useCallback(
    (pos: LatLng, opts?: { face?: LatLng }) => {
      const face = opts?.face ?? pos;
      lastPosRef.current = pos;
      lastFaceRef.current = face;

      // 먼저 로드뷰 가능 여부 체크 후, 있을 때만 패널 열기
      (async () => {
        const ok = await hasPanoNearby(pos, face);
        if (!ok) {
          toast({
            title: "로드뷰를 열 수 없어요",
            description:
              "해당 위치 주변에는 로드뷰 데이터가 없어요.\n다른 지점이나 축척에서 다시 시도해 주세요.",
          });
          return;
        }
        setVisible(true); // 실제 Kakao Roadview 세팅은 effect에서
      })();
    },
    [hasPanoNearby, toast]
  );

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const resize = useCallback(() => {
    try {
      roadviewRef.current?.relayout?.();
    } catch {
      /* ignore */
    }
  }, []);

  /** visible + containerRef 준비된 뒤에 실제 Kakao Roadview 생성/이동 */
  useEffect(() => {
    if (!visible) return;
    if (!roadviewContainerRef.current) return;
    if (!lastPosRef.current) return;

    const pos = lastPosRef.current;
    const face = lastFaceRef.current ?? lastPosRef.current;

    renderAt(pos, face);
  }, [visible, renderAt]);

  // ESC로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (visible) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, close]);

  return {
    roadviewContainerRef,
    roadviewRef,
    visible,
    loading,
    openAtCenter,
    openAt,
    close,
    resize,
  };
}
