"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type MapDistanceMeasureProps = {
  visible: boolean;
  kakaoSDK: any;
  mapInstance: any;
};

const STROKE_COLOR = "#2563eb";

export function MapDistanceMeasure({
  visible,
  kakaoSDK,
  mapInstance,
}: MapDistanceMeasureProps) {
  const [drawingFlag, setDrawingFlag] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const clickLineRef = useRef<any>(null);
  const moveLineRef = useRef<any>(null);
  const distanceOverlayRef = useRef<any>(null);
  const dotsRef = useRef<{ circle: any; distance?: any }[]>([]);

  const deleteClickLine = useCallback(() => {
    if (clickLineRef.current && mapInstance) {
      clickLineRef.current.setMap(null);
      clickLineRef.current = null;
    }
  }, [mapInstance]);

  const deleteDistance = useCallback(() => {
    if (distanceOverlayRef.current) {
      distanceOverlayRef.current.setMap(null);
      distanceOverlayRef.current = null;
    }
  }, []);

  const deleteCircleDot = useCallback(() => {
    dotsRef.current.forEach((d) => {
      if (d.circle) d.circle.setMap(null);
      if (d.distance) d.distance.setMap(null);
    });
    dotsRef.current = [];
  }, []);

  const showDistance = useCallback(
    (content: string, position: any) => {
      if (!kakaoSDK || !mapInstance) return;
      if (distanceOverlayRef.current) {
        distanceOverlayRef.current.setPosition(position);
        distanceOverlayRef.current.setContent(content);
      } else {
        const overlay = new kakaoSDK.maps.CustomOverlay({
          map: mapInstance,
          content,
          position,
          xAnchor: 0,
          yAnchor: 0,
          zIndex: 3,
        });
        distanceOverlayRef.current = overlay;
      }
    },
    [kakaoSDK, mapInstance]
  );

  const displayCircleDot = useCallback(
    (position: any, distance: number) => {
      if (!kakaoSDK || !mapInstance) return;
      const circleContent =
        '<span style="display:block;width:12px;height:12px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.3)"></span>';
      const circleOverlay = new kakaoSDK.maps.CustomOverlay({
        content: circleContent,
        position,
        zIndex: 1,
      });
      circleOverlay.setMap(mapInstance);

      let distanceOverlay: any = null;
      if (distance > 0) {
        const distContent = `<div style="position:relative;bottom:10px;border-radius:6px;border:1px solid #ccc;float:left;font-size:12px;padding:4px 8px;background:#fff;box-shadow:0 1px 2px #888"><span style="font-weight:bold;color:#2563eb">${distance}</span>m</div>`;
        distanceOverlay = new kakaoSDK.maps.CustomOverlay({
          content: distContent,
          position,
          yAnchor: 1,
          zIndex: 2,
        });
        distanceOverlay.setMap(mapInstance);
      }
      dotsRef.current.push({ circle: circleOverlay, distance: distanceOverlay ?? undefined });
    },
    [kakaoSDK, mapInstance]
  );

  const getTimeHTML = useCallback((distance: number) => {
    const walkkTime = Math.floor(distance / 67);
    let walkHour = "";
    const walkMin = `${walkkTime % 60}분`;
    if (walkkTime > 60) {
      walkHour = `${Math.floor(walkkTime / 60)}시간 `;
    }
    const bycicleTime = Math.floor(distance / 227);
    let bycicleHour = "";
    const bycicleMin = `${bycicleTime % 60}분`;
    if (bycicleTime > 60) {
      bycicleHour = `${Math.floor(bycicleTime / 60)}시간 `;
    }
    return `
      <ul style="position:relative;top:5px;left:5px;list-style:none;margin:0;padding:6px 10px;background:#fff;border-radius:6px;box-shadow:0 1px 2px #888;font-size:12px">
        <li><span style="display:inline-block;width:50px">총거리</span><span style="font-weight:bold;color:#2563eb">${distance}</span>m</li>
        <li><span style="display:inline-block;width:50px">도보</span>${walkHour}${walkMin}</li>
        <li><span style="display:inline-block;width:50px">자전거</span>${bycicleHour}${bycicleMin}</li>
      </ul>
    `;
  }, []);

  // 클릭: 그리기 시작 또는 점 추가
  useEffect(() => {
    if (!visible || !kakaoSDK || !mapInstance) return;
    const ev = kakaoSDK.maps?.event ?? (globalThis as any)?.kakao?.maps?.event;
    if (!ev?.addListener) return;

    const handler = (e: any) => {
      const clickPosition = e?.latLng;
      if (!clickPosition) return;

      if (!drawingFlag) {
        setDrawingFlag(true);
        setShowIntro(false);
        deleteClickLine();
        deleteDistance();
        deleteCircleDot();

        const line = new kakaoSDK.maps.Polyline({
          map: mapInstance,
          path: [clickPosition],
          strokeWeight: 3,
          strokeColor: STROKE_COLOR,
          strokeOpacity: 1,
          strokeStyle: "solid",
        });
        clickLineRef.current = line;

        const moveLine = new kakaoSDK.maps.Polyline({
          strokeWeight: 3,
          strokeColor: STROKE_COLOR,
          strokeOpacity: 0.5,
          strokeStyle: "solid",
        });
        moveLineRef.current = moveLine;

        displayCircleDot(clickPosition, 0);
      } else {
        const path = clickLineRef.current.getPath();
        path.push(clickPosition);
        clickLineRef.current.setPath(path);
        const distance = Math.round(clickLineRef.current.getLength());
        displayCircleDot(clickPosition, distance);
      }
    };

    ev.addListener(mapInstance, "click", handler);
    return () => {
      ev.removeListener(mapInstance, "click", handler);
    };
  }, [visible, kakaoSDK, mapInstance, drawingFlag, deleteClickLine, deleteDistance, deleteCircleDot, displayCircleDot]);

  // 마우스 무브: 그리는 중일 때 미리보기 선 + 총거리 표시
  useEffect(() => {
    if (!visible || !kakaoSDK || !mapInstance) return;
    const ev = kakaoSDK.maps?.event ?? (globalThis as any)?.kakao?.maps?.event;
    if (!ev?.addListener) return;

    const handler = (e: any) => {
      if (!drawingFlag || !clickLineRef.current || !moveLineRef.current) return;
      const mousePosition = e?.latLng;
      if (!mousePosition) return;

      const path = clickLineRef.current.getPath();
      const movepath = [path[path.length - 1], mousePosition];
      moveLineRef.current.setPath(movepath);
      moveLineRef.current.setMap(mapInstance);

      const distance = Math.round(
        clickLineRef.current.getLength() + moveLineRef.current.getLength()
      );
      const content = `<div style="position:relative;top:5px;left:5px;padding:4px 8px;background:#fff;border-radius:6px;box-shadow:0 1px 2px #888;font-size:12px">총거리 <span style="font-weight:bold;color:#2563eb">${distance}</span>m</div>`;
      showDistance(content, mousePosition);
    };

    ev.addListener(mapInstance, "mousemove", handler);
    return () => {
      ev.removeListener(mapInstance, "mousemove", handler);
    };
  }, [visible, kakaoSDK, mapInstance, drawingFlag, showDistance]);

  // 오른쪽 클릭: 그리기 종료
  useEffect(() => {
    if (!visible || !kakaoSDK || !mapInstance) return;
    const ev = kakaoSDK.maps?.event ?? (globalThis as any)?.kakao?.maps?.event;
    if (!ev?.addListener) return;

    const handler = () => {
      if (!drawingFlag) return;

      if (moveLineRef.current) {
        moveLineRef.current.setMap(null);
        moveLineRef.current = null;
      }

      const path = clickLineRef.current?.getPath();
      if (path && path.length > 1) {
        const lastDot = dotsRef.current[dotsRef.current.length - 1];
        if (lastDot?.distance) {
          lastDot.distance.setMap(null);
          lastDot.distance = null;
        }
        const distance = Math.round(clickLineRef.current.getLength());
        const content = getTimeHTML(distance);
        showDistance(content, path[path.length - 1]);
      } else {
        deleteClickLine();
        deleteCircleDot();
        deleteDistance();
      }

      setDrawingFlag(false);
      setShowIntro(true);
    };

    ev.addListener(mapInstance, "rightclick", handler);
    return () => {
      ev.removeListener(mapInstance, "rightclick", handler);
    };
  }, [visible, kakaoSDK, mapInstance, drawingFlag, showDistance, getTimeHTML, deleteClickLine, deleteCircleDot, deleteDistance]);

  // 비활성 시 전부 제거
  useEffect(() => {
    if (!visible) {
      setDrawingFlag(false);
      setShowIntro(true);
      if (moveLineRef.current) {
        moveLineRef.current.setMap(null);
        moveLineRef.current = null;
      }
      deleteClickLine();
      deleteDistance();
      deleteCircleDot();
    }
  }, [visible, deleteClickLine, deleteDistance, deleteCircleDot]);

  if (!visible) return null;

  return (
    <>
      {showIntro && !drawingFlag && (
        <div
          className="fixed left-1/2 bottom-20 z-[100] -translate-x-1/2 px-4 py-2 rounded-lg bg-gray-800/90 text-white shadow-lg pointer-events-none text-center"
          aria-live="polite"
        >
          <span className="text-sm">지도를 클릭해 거리 측정 구간을 찍어 주세요.</span>
          <br />
          <em className="text-[11px] opacity-90 block">
            왼쪽 클릭으로 선 그리기, 오른쪽 클릭으로 종료
          </em>
        </div>
      )}
    </>
  );
}
