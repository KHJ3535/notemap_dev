"use client";

import { useEffect, useLayoutEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

type Props = {
  open: boolean;
  onClose: () => void;
  onResize?: () => void;
  /** Kakao Roadview가 렌더될 DOM 컨테이너 ref (useRoadview에서 전달) */
  containerRef: React.RefObject<HTMLDivElement>;
  /** 로드뷰 인스턴스 ref */
  roadviewRef: React.MutableRefObject<any>;
  /** Kakao SDK 인스턴스 (미니맵용) */
  kakaoSDK?: any;
  /** 메인 맵 인스턴스 (미니맵 초기 상태 복사용) */
  mapInstance?: any;
};

/**
 * 전체화면 로드뷰 오버레이
 * - body 포털
 * - 열릴 때/리사이즈 시 relayout() 트리거
 * - ESC/닫기/딤 클릭으로 닫힘
 */
export default function RoadviewHost({
  open,
  onClose,
  onResize,
  containerRef,
  roadviewRef,
  kakaoSDK,
  mapInstance,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastActiveElRef = useRef<Element | null>(null);
  
  // 미니맵 관련 refs
  const minimapContainerRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const roadviewListenersRef = useRef<any[]>([]);
  
  const MINIMAP_WIDTH = 400;
  const MINIMAP_HEIGHT = 300;

  // 모바일 여부 감지
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ESC로 닫기 (열렸을 때만)
  useEscapeToClose(onClose, { enabled: open });

  // 바디 스크롤 잠금
  useBodyScrollLock(open);

  // 열릴 때 포커스 / 닫힐 때 포커스 복귀
  useEffect(() => {
    if (open) {
      lastActiveElRef.current = document.activeElement ?? null;
      const t = requestAnimationFrame(() => panelRef.current?.focus());
      return () => cancelAnimationFrame(t);
    } else if (lastActiveElRef.current instanceof HTMLElement) {
      lastActiveElRef.current.focus();
    }
  }, [open]);

  // 안전한 relayout 트리거
  const triggerRelayout = useCallback(() => {
    if (!onResize) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => onResize());
    });
  }, [onResize]);

  // transition 끝나면 relayout
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;

    const onEnd = (e: TransitionEvent) => {
      if (
        e.propertyName === "opacity" ||
        e.propertyName === "transform" ||
        e.propertyName === "height" ||
        e.propertyName === "width"
      ) {
        triggerRelayout();
      }
    };

    el.addEventListener("transitionend", onEnd);
    triggerRelayout();
    return () => el.removeEventListener("transitionend", onEnd);
  }, [open, triggerRelayout]);

  // 로드뷰 div 크기 변화 감지
  useEffect(() => {
    if (!open || !containerRef.current || !onResize) return;
    const ro = new ResizeObserver(() => triggerRelayout());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [open, containerRef, onResize, triggerRelayout]);

  // 미니맵 생성 및 동기화
  useEffect(() => {
    if (!open || !kakaoSDK || !mapInstance || !minimapContainerRef.current) {
      // 미니맵 정리
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (minimapRef.current) {
        minimapRef.current = null;
      }
      // 이벤트 리스너 정리
      if (kakaoSDK && roadviewRef.current) {
        roadviewListenersRef.current.forEach((listenerObj) => {
          if (listenerObj) {
            try {
              // addListener가 반환한 리스너 객체를 사용하여 제거
              kakaoSDK.maps.event.removeListener(
                roadviewRef.current,
                listenerObj.event,
                listenerObj.listener
              );
            } catch (e) {
              // ignore
            }
          }
        });
      }
      roadviewListenersRef.current = [];
      return;
    }

    const kakao = kakaoSDK;
    const container = minimapContainerRef.current;
    if (!container) {
      console.warn("[RoadviewHost] minimapContainerRef.current가 없음");
      return;
    }

    // 미니맵 생성 (roadviewRef와 독립적으로 생성 가능)
    if (!minimapRef.current) {
      console.log("[RoadviewHost] 미니맵 생성 시작");
      // 메인 맵의 초기 상태 복사
      let center: any;
      let level: number;
      
      try {
        const mainCenter = mapInstance.getCenter();
        center = new kakao.maps.LatLng(mainCenter.getLat(), mainCenter.getLng());
        level = mapInstance.getLevel();
        console.log("[RoadviewHost] 메인 맵 상태 복사:", { lat: center.getLat(), lng: center.getLng(), level });
      } catch (e) {
        // 기본값 사용
        center = new kakao.maps.LatLng(37.5665, 126.978);
        level = 4;
        console.log("[RoadviewHost] 기본값 사용:", { lat: center.getLat(), lng: center.getLng(), level });
      }

      const mapOptions = {
        center,
        level,
        mapTypeId: kakao.maps.MapTypeId.ROADMAP,
      };

      try {
        minimapRef.current = new kakao.maps.Map(container, mapOptions);
        console.log("[RoadviewHost] 미니맵 생성 완료");
        
        // 맵 생성 후 relayout 호출 (컨테이너 크기가 변경되었을 수 있음)
        requestAnimationFrame(() => {
          if (minimapRef.current) {
            try {
              minimapRef.current.relayout();
              console.log("[RoadviewHost] 미니맵 relayout 완료");
            } catch (e) {
              console.warn("[RoadviewHost] 미니맵 relayout 실패:", e);
            }
          }
        });
      } catch (e) {
        console.error("[RoadviewHost] 미니맵 생성 실패:", e);
      }
    } else {
      console.log("[RoadviewHost] 미니맵이 이미 존재함");
      // 기존 맵도 relayout 호출
      requestAnimationFrame(() => {
        if (minimapRef.current) {
          try {
            minimapRef.current.relayout();
          } catch (e) {
            console.warn("[RoadviewHost] 기존 미니맵 relayout 실패:", e);
          }
        }
      });
    }

    // 마커 생성 함수 (예시 코드 패턴 - MarkerImage 사용)
    const createMarker = (position: any) => {
      if (markerRef.current) {
        console.log("[RoadviewHost] createMarker: 마커가 이미 존재함");
        return;
      }
      
      if (!minimapRef.current) {
        console.warn("[RoadviewHost] createMarker: minimapRef가 없음");
        return;
      }
      
      try {
        // 위치가 없으면 미니맵 중심 사용
        if (!position) {
          position = minimapRef.current.getCenter();
        }
        
        if (position) {
          const lat = position.getLat ? position.getLat() : position.lat;
          const lng = position.getLng ? position.getLng() : position.lng;
          const markerPos = new kakao.maps.LatLng(lat, lng);
          
          // 마커 이미지를 생성합니다 (예시 코드 패턴)
          const markImage = new kakao.maps.MarkerImage(
            'https://t1.daumcdn.net/localimg/localimages/07/2018/pc/roadview_minimap_wk_2018.png',
            new kakao.maps.Size(26, 46),
            {
              // 스프라이트 이미지를 사용합니다.
              // 스프라이트 이미지 전체의 크기를 지정하고
              spriteSize: new kakao.maps.Size(1666, 168),
              // 사용하고 싶은 영역의 좌상단 좌표를 입력합니다.
              // background-position으로 지정하는 값이며 부호는 반대입니다.
              spriteOrigin: new kakao.maps.Point(705, 114),
              offset: new kakao.maps.Point(13, 46)
            }
          );
          
          // 마커를 생성합니다
          const marker = new kakao.maps.Marker({
            image: markImage,
            position: markerPos,
            map: minimapRef.current,
            zIndex: 1000, // 마커가 다른 요소 위에 표시되도록
          });
          markerRef.current = marker;
          
          // 마커가 실제로 맵에 추가되었는지 확인
          const markerMap = marker.getMap();
          console.log("[RoadviewHost] createMarker: 마커 생성 완료", { 
            lat, 
            lng, 
            markerMap: markerMap ? "있음" : "없음",
            minimapRef: minimapRef.current ? "있음" : "없음"
          });
        } else {
          console.warn("[RoadviewHost] createMarker: 위치가 없음");
        }
      } catch (e) {
        console.error("[RoadviewHost] 미니맵 마커 생성 실패:", e);
      }
    };

    // 로드뷰 위치 변경 이벤트 리스너
    const updateMarkerPosition = () => {
      if (!roadviewRef.current || !minimapRef.current) {
        console.warn("[RoadviewHost] updateMarkerPosition: roadviewRef 또는 minimapRef가 없음");
        return;
      }
      
      try {
        const position = roadviewRef.current.getPosition();
        if (position) {
          // 마커가 없으면 생성
          if (!markerRef.current) {
            console.log("[RoadviewHost] updateMarkerPosition: 마커 생성 시도");
            createMarker(position);
          }
          
          if (markerRef.current) {
            const lat = position.getLat();
            const lng = position.getLng();
            const newPos = new kakao.maps.LatLng(lat, lng);
            markerRef.current.setPosition(newPos);
            
            // 미니맵 중심도 이동 (예시 코드처럼)
            minimapRef.current.setCenter(newPos);
            console.log("[RoadviewHost] updateMarkerPosition: 마커 위치 업데이트", { lat, lng });
          } else {
            console.warn("[RoadviewHost] updateMarkerPosition: 마커가 없음");
          }
        } else {
          console.warn("[RoadviewHost] updateMarkerPosition: 로드뷰 위치를 가져올 수 없음");
        }
      } catch (e) {
        console.error("[RoadviewHost] 미니맵 마커 위치 업데이트 실패:", e);
      }
    };

    // 로드뷰 초기화 완료 후 이벤트 리스너 등록 (예시 코드 패턴)
    const onInit = () => {
      if (!roadviewRef.current || !minimapRef.current) {
        console.warn("[RoadviewHost] onInit: roadviewRef 또는 minimapRef가 없음");
        return;
      }
      
      // position_changed 리스너가 이미 등록되어 있으면 스킵
      const hasPositionListener = roadviewListenersRef.current.some(
        (l) => l.event === "position_changed"
      );
      
      if (hasPositionListener) {
        console.log("[RoadviewHost] onInit: position_changed 리스너가 이미 등록됨, 마커만 업데이트");
        updateMarkerPosition();
        return;
      }
      
      try {
        // 초기 위치로 마커 생성
        const position = roadviewRef.current.getPosition();
        console.log("[RoadviewHost] onInit: 로드뷰 위치:", position);
        
        if (position) {
          createMarker(position);
          updateMarkerPosition();
          console.log("[RoadviewHost] onInit: 마커 생성 완료");
        } else {
          console.warn("[RoadviewHost] onInit: 로드뷰 위치를 가져올 수 없음");
        }

        // init 이벤트 안에서 position_changed 리스너 등록 (예시 코드 패턴)
        const positionChangedHandler = () => {
          // 이벤트가 발생할 때마다 로드뷰의 position값을 읽어, 마커에 반영
          console.log("[RoadviewHost] position_changed 이벤트 발생");
          updateMarkerPosition();
        };
        
        const positionChangedListener = kakao.maps.event.addListener(
          roadviewRef.current,
          "position_changed",
          positionChangedHandler
        );

        roadviewListenersRef.current.push({
          event: "position_changed",
          listener: positionChangedListener,
        });
        
        console.log("[RoadviewHost] onInit: position_changed 리스너 등록 완료");
      } catch (e) {
        console.error("[RoadviewHost] init 이벤트 처리 실패:", e);
      }
    };

    // 이벤트 리스너 등록
    // roadviewRef.current가 준비될 때까지 대기
    if (!roadviewRef.current) {
      console.log("[RoadviewHost] roadviewRef.current가 아직 준비되지 않음, 마커 동기화 대기 중...");
      // roadviewRef가 준비될 때까지 주기적으로 체크
      const checkInterval = setInterval(() => {
        if (roadviewRef.current && minimapRef.current) {
          clearInterval(checkInterval);
          console.log("[RoadviewHost] roadviewRef.current 준비 완료, 마커 동기화 시작");
          // roadviewRef가 준비되었으므로 마커 동기화 로직 실행
          // 이 부분은 아래의 이벤트 리스너 등록 로직을 실행
          try {
            const position = roadviewRef.current.getPosition();
            if (position && !markerRef.current) {
              // 마커 생성 함수는 클로저 내부에 있으므로 직접 호출 불가
              // 대신 이벤트 리스너를 등록하면 position_changed 이벤트에서 마커가 생성됨
            }
          } catch (e) {
            // 로드뷰가 아직 완전히 초기화되지 않았을 수 있음
          }
          
          // init 이벤트 리스너 등록
          const hasInitListener = roadviewListenersRef.current.some(
            (l) => l.event === "init"
          );
          
          if (!hasInitListener) {
            const initListener = kakao.maps.event.addListener(
              roadviewRef.current,
              "init",
              onInit
            );

            roadviewListenersRef.current.push({
              event: "init",
              listener: initListener,
            });
            
            // 이미 초기화되었는지 확인
            try {
              const position = roadviewRef.current.getPosition();
              if (position) {
                onInit();
              }
            } catch (e) {
              // init 이벤트를 기다림
            }
          }
        }
        if (!open) {
          clearInterval(checkInterval);
        }
      }, 100);
      
      // 최대 3초 대기
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 3000);
      
      return () => {
        clearInterval(checkInterval);
      };
    }

    // init 리스너가 이미 등록되어 있는지 확인
    const hasInitListener = roadviewListenersRef.current.some(
      (l) => l.event === "init"
    );

    if (hasInitListener) {
      console.log("[RoadviewHost] init 리스너가 이미 등록됨");
      return;
    }

    // 로드뷰가 이미 초기화되었는지 확인
    try {
      const position = roadviewRef.current.getPosition();
      if (position) {
        console.log("[RoadviewHost] 로드뷰가 이미 초기화됨, 바로 onInit 호출");
        // 이미 초기화된 경우 바로 마커 생성 및 리스너 등록
        onInit();
      } else {
        console.log("[RoadviewHost] 로드뷰 초기화 대기 중...");
        // 아직 초기화되지 않은 경우 init 이벤트 대기
        const initListener = kakao.maps.event.addListener(
          roadviewRef.current,
          "init",
          onInit
        );

        roadviewListenersRef.current.push({
          event: "init",
          listener: initListener,
        });
      }
    } catch (e) {
      console.log("[RoadviewHost] getPosition 실패, init 이벤트 대기:", e);
      // getPosition 실패 시 init 이벤트 대기
      const initListener = kakao.maps.event.addListener(
        roadviewRef.current,
        "init",
        onInit
      );

      roadviewListenersRef.current.push({
        event: "init",
        listener: initListener,
      });
    }

    return () => {
      // 정리
      if (kakao && roadviewRef.current) {
        roadviewListenersRef.current.forEach((listenerObj) => {
          if (listenerObj) {
            try {
              kakao.maps.event.removeListener(
                roadviewRef.current,
                listenerObj.event,
                listenerObj.listener
              );
            } catch (e) {
              // ignore
            }
          }
        });
      }
      roadviewListenersRef.current = [];
    };
  }, [open, kakaoSDK, mapInstance, roadviewRef, minimapContainerRef]);

  // 딤 클릭 닫기
  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  // 포털 루트
  const portalRoot =
    (typeof window !== "undefined" &&
      (document.getElementById("portal-root") || document.body)) ||
    null;
  if (!portalRoot) return null;

  return createPortal(
    <div
      className={[
        "pointer-events-none fixed inset-0 z-[120000]",
        open ? "visible" : "invisible",
      ].join(" ")}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={[
          "absolute inset-0 bg-black/60 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={onBackdropClick}
        role="presentation"
      />

      {/* Panel: 전체화면 */}
      <div
        ref={panelRef}
        className={[
          "pointer-events-auto fixed inset-0 outline-none",
          "transition-opacity",
          open ? "opacity-100" : "opacity-0",
          "motion-reduce:transition-none",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="로드뷰"
        tabIndex={-1}
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-[120010] inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/60"
          aria-label="닫기"
          title="닫기 (Esc)"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Kakao Roadview 컨테이너: 화면 꽉 채움 */}
        <div ref={containerRef} className="h-screen w-screen bg-black" />

        {/* 미니맵: 좌측 하단 */}
        {open && (
          <div className="absolute left-0 bottom-0 z-[120010]">
            {/* 미니맵 컨테이너 */}
            <div
              ref={minimapContainerRef}
              className="relative overflow-hidden border-t-2 border-r-2 border-white shadow-lg bg-white"
              style={{
                width: isMobile ? "100vw" : "30vw",
                height: isMobile ? "30vh" : "300px",
              }}
            />
          </div>
        )}
      </div>
    </div>,
    portalRoot
  );
}
