"use client";

import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ImageItem } from "@/features/properties/types/media";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  images: ImageItem[];
  initialIndex?: number;
  onClose: () => void;
  objectFit?: "contain" | "cover";
  withThumbnails?: boolean;
  title?: string;
};

export default function LightboxModal({
  open,
  images,
  initialIndex = 0,
  onClose,
  objectFit = "contain",
  withThumbnails = false,
  title,
}: Props) {
  /* ---------- 상태 ---------- */
  const len = Array.isArray(images) ? images.length : 0;
  const hasImages = len > 0;

  // 현재 인덱스
  const [index, setIndex] = useState(() => {
    const i = Number.isFinite(initialIndex) ? initialIndex : 0;
    return Math.max(0, Math.min(i, Math.max(0, len - 1)));
  });

  // open 또는 images/initialIndex 변경 시 인덱스 초기화(클램프)
  useEffect(() => {
    if (!open) return;
    const clamped = Math.max(
      0,
      Math.min(
        Number.isFinite(initialIndex) ? initialIndex : 0,
        Math.max(0, len - 1)
      )
    );
    setIndex(clamped);
  }, [open, initialIndex, len]);

  const prev = useCallback(() => {
    if (!hasImages) return;
    setIndex((i) => (((i - 1 + len) % len) + len) % len);
  }, [hasImages, len]);

  const next = useCallback(() => {
    if (!hasImages) return;
    setIndex((i) => (((i + 1) % len) + len) % len);
  }, [hasImages, len]);

  // Esc / 좌우 화살표
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, prev, next]);

  /* ---------- 핀치 줌 (모바일) ---------- */
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const pinchStartRef = useRef<{ distance: number; scale: number; cx: number; cy: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const resetZoom = useCallback(() => {
    setZoom({ scale: 1, x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!open) return;
    resetZoom();
  }, [open, index, resetZoom]);

  const getTouchDistance = useCallback((touches: React.TouchList | TouchList) => {
    if (touches.length < 2) return 0;
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }, []);

  const getTouchCenter = useCallback((touches: React.TouchList | TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }, []);

  /* ---------- 드래그/스와이프 ---------- */
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const lastXRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const lockedDirRef = useRef<"x" | "y" | null>(null);
  const threshold = 50; // px

  const dragStart = useCallback((x: number, y: number) => {
    startXRef.current = x;
    startYRef.current = y;
    lastXRef.current = x;
    draggingRef.current = true;
    lockedDirRef.current = null;
  }, []);

  const dragMove = useCallback((x: number, y: number) => {
    if (
      !draggingRef.current ||
      startXRef.current == null ||
      startYRef.current == null
    )
      return;

    const dx = x - startXRef.current;
    const dy = y - startYRef.current;

    // 처음 크게 움직인 축을 잠금
    if (!lockedDirRef.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        lockedDirRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
    }
    lastXRef.current = x;
  }, []);

  const dragEnd = useCallback(() => {
    if (
      !draggingRef.current ||
      startXRef.current == null ||
      lastXRef.current == null
    ) {
      draggingRef.current = false;
      lockedDirRef.current = null;
      return;
    }
    const dx = lastXRef.current - startXRef.current;

    if (lockedDirRef.current === "x") {
      if (dx > threshold) prev();
      else if (dx < -threshold) next();
    }

    draggingRef.current = false;
    lockedDirRef.current = null;
    startXRef.current = null;
    startYRef.current = null;
    lastXRef.current = null;
  }, [prev, next]);

  if (!open || !hasImages) return null;

  const safeIndex = useMemo(
    () => Math.max(0, Math.min(index, len - 1)),
    [index, len]
  );
  const cur = images[safeIndex];

  const albumTitle = useMemo(() => {
    const t =
      (title && title.trim()) ||
      images[0]?.caption?.trim?.() ||
      images[0]?.name?.trim?.() ||
      "";
    return t;
  }, [title, images]);

  const fitClass = objectFit === "cover" ? "object-cover" : "object-contain";
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const thumbColWidth = 112; // px (w-28)

  const gridTemplateColumns = useMemo(
    () => (withThumbnails && len > 1 ? `${thumbColWidth}px 1fr` : "1fr"),
    [withThumbnails, len]
  );

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/80 flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* 상단 바 */}
      <div className="flex items-center justify-end gap-2 p-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="닫기"
          className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-white/10 hover:bg-white/20 text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 본문 */}
      <div className="relative px-4 pb-4 flex-1" onClick={stop}>
        <div
          className={`flex flex-col md:grid gap-4 items-stretch ${
            withThumbnails && len > 1 ? "md:grid-cols-[112px_1fr]" : ""
          }`}
        >
          {/* 왼쪽 썸네일 컬럼 (데스크톱) / 하단 썸네일 목록 (모바일) */}
          {withThumbnails && len > 1 && (
            <div className="w-full md:w-28 order-2 md:order-none">
              {/* 모바일: 가로 스크롤 */}
              <div className="md:hidden overflow-x-auto overflow-y-hidden scrollbar-hide pb-2">
                <div className="flex gap-2">
                  {images.map((im, i) => {
                    const active = i === safeIndex;
                    const t = (
                      im?.caption ||
                      im?.name ||
                      `썸네일 ${i + 1}`
                    ).trim();
                    return (
                      <button
                        key={i}
                        className={`relative h-20 w-20 flex-shrink-0 rounded border ${
                          active ? "border-white" : "border-white/30"
                        }`}
                        onClick={() => setIndex(i)}
                        aria-label={t}
                        title={t}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={im?.dataUrl ?? im?.url}
                          alt={t}
                          className="h-full w-full object-cover rounded"
                          draggable={false}
                          loading="lazy"
                          decoding="async"
                        />
                        {active && (
                          <span className="absolute inset-0 ring-2 ring-white rounded pointer-events-none" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* 데스크톱: 세로 스크롤 */}
              <div className="hidden md:block max-h-[78vh] overflow-y-auto pr-1 scrollbar-hide">
                <div className="flex flex-col gap-2">
                  {images.map((im, i) => {
                    const active = i === safeIndex;
                    const t = (
                      im?.caption ||
                      im?.name ||
                      `썸네일 ${i + 1}`
                    ).trim();
                    return (
                      <button
                        key={i}
                        className={`relative h-20 w-full rounded border ${
                          active ? "border-white" : "border-white/30"
                        }`}
                        onClick={() => setIndex(i)}
                        aria-label={t}
                        title={t}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={im?.dataUrl ?? im?.url}
                          alt={t}
                          className="h-full w-full object-cover rounded"
                          draggable={false}
                          loading="lazy"
                          decoding="async"
                        />
                        {active && (
                          <span className="absolute inset-0 ring-2 ring-white rounded pointer-events-none" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 메인 이미지 영역 */}
          <div
            className="relative h-[60vh] md:h-[78vh] flex items-center justify-center select-none order-1 md:order-none overflow-hidden"
            onMouseDown={(e) => {
              if (zoom.scale <= 1) {
                dragStart(e.clientX, e.clientY);
              }
            }}
            onMouseMove={(e) => {
              if (draggingRef.current && zoom.scale <= 1) {
                dragMove(e.clientX, e.clientY);
              }
            }}
            onMouseUp={dragEnd}
            onMouseLeave={dragEnd}
            onTouchStart={(e) => {
              if (zoom.scale <= 1) {
                if (e.touches.length === 1) {
                  dragStart(e.touches[0].clientX, e.touches[0].clientY);
                }
              }
            }}
            onTouchMove={(e) => {
              if (zoom.scale <= 1 && draggingRef.current && e.touches.length === 1) {
                dragMove(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchEnd={dragEnd}
          >
            {len > 1 && (
              <>
                <button
                  onClick={prev}
                  aria-label="이전"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={next}
                  aria-label="다음"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* 메인 이미지 (핀치 줌 시 transform 적용) */}
            <div
              className="flex items-center justify-center w-full h-full touch-none"
              style={{
                transform: `scale(${zoom.scale}) translate(${zoom.x}px, ${zoom.y}px)`,
                transformOrigin: "center center",
                touchAction: "none",
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (zoom.scale > 1) {
                  panStartRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                    tx: zoom.x,
                    ty: zoom.y,
                  };
                }
              }}
              onMouseMove={(e) => {
                if (panStartRef.current) {
                  setZoom((z) => ({
                    ...z,
                    x: panStartRef.current!.tx + (e.clientX - panStartRef.current!.x),
                    y: panStartRef.current!.ty + (e.clientY - panStartRef.current!.y),
                  }));
                }
              }}
              onMouseUp={() => {
                if (panStartRef.current) {
                  panStartRef.current = null;
                }
              }}
              onMouseLeave={() => {
                if (panStartRef.current) panStartRef.current = null;
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (e.touches.length === 2) {
                  const d = getTouchDistance(e.touches);
                  const { x: cx, y: cy } = getTouchCenter(e.touches);
                  pinchStartRef.current = {
                    distance: d,
                    scale: zoom.scale,
                    cx,
                    cy,
                  };
                } else if (e.touches.length === 1) {
                  if (zoom.scale > 1) {
                    panStartRef.current = {
                      x: e.touches[0].clientX,
                      y: e.touches[0].clientY,
                      tx: zoom.x,
                      ty: zoom.y,
                    };
                  }
                }
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
                if (e.touches.length === 2 && pinchStartRef.current) {
                  e.preventDefault();
                  const d = getTouchDistance(e.touches);
                  if (d <= 0) return;
                  const k = pinchStartRef.current.distance > 0
                    ? d / pinchStartRef.current.distance
                    : 1;
                  const nextScale = Math.max(1, Math.min(4, pinchStartRef.current.scale * k));
                  setZoom((z) => ({ ...z, scale: nextScale }));
                } else if (e.touches.length === 1) {
                  if (panStartRef.current) {
                    setZoom((z) => ({
                      ...z,
                      x: panStartRef.current!.tx + (e.touches[0].clientX - panStartRef.current!.x),
                      y: panStartRef.current!.ty + (e.touches[0].clientY - panStartRef.current!.y),
                    }));
                  }
                }
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                if (e.touches.length < 2) pinchStartRef.current = null;
                if (e.touches.length === 0) {
                  panStartRef.current = null;
                }
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cur?.dataUrl ?? cur?.url}
                alt={albumTitle || `이미지 ${safeIndex + 1}`}
                className={`block max-h-full max-w-[85vw] ${fitClass}`}
                draggable={false}
                style={{ pointerEvents: "none" }}
              />
            </div>

            {/* 카운터 */}
            {len > 1 && (
              <div className="absolute top-3 right-3 md:right-6 rounded bg-black/60 text-white text-xs px-2 py-0.5 z-10">
                {safeIndex + 1} / {len}
              </div>
            )}
            {/* 줌 초기화 버튼 (확대 시에만) */}
            {zoom.scale > 1 && (
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  resetZoom();
                }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 rounded bg-black/60 text-white text-sm px-3 py-1.5"
              >
                원래 크기
              </button>
            )}
          </div>

          {/* 제목 */}
          {albumTitle && (
            <div className={`order-3 md:order-none ${withThumbnails && len > 1 ? "md:col-start-2 md:col-span-1" : ""}`}>
              <div
                className="text-center text-white text-lg whitespace-pre-wrap break-words px-2"
                title={albumTitle}
              >
                {albumTitle}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
