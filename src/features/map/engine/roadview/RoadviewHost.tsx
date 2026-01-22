"use client";

import { useEffect, useLayoutEffect, useRef, useCallback } from "react";
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
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastActiveElRef = useRef<Element | null>(null);

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
      </div>
    </div>,
    portalRoot
  );
}
