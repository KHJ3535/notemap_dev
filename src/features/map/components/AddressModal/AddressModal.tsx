"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useReverseGeocode } from "@/features/map/pages/hooks/useReverseGeocode";

export type AddressModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 클릭된 위치 (null이면 주소 조회 안 함) */
  position: { lat: number; lng: number } | null;
  /** 마우스 클릭 화면 좌표 (있으면 이 위치 기준 우측 대각선 위에 모달 표시) */
  anchorPoint?: { x: number; y: number } | null;
  kakaoSDK: any;
};

/** 클릭 위치 기준 우측 대각선 위로 배치 (마진 없이) */
const OFFSET_X = 8;
const OFFSET_Y = -8;

export function AddressModal({
  open,
  onOpenChange,
  position,
  anchorPoint,
  kakaoSDK,
}: AddressModalProps) {
  const [road, setRoad] = React.useState<string | null>(null);
  const [jibun, setJibun] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const resolveAddress = useReverseGeocode(kakaoSDK);

  React.useEffect(() => {
    if (!open || !position || !kakaoSDK) {
      setRoad(null);
      setJibun(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setRoad(null);
    setJibun(null);
    resolveAddress(position.lat, position.lng)
      .then(({ road: r, jibun: j }) => {
        if (!cancelled) {
          setRoad(r);
          setJibun(j);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoad(null);
          setJibun(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, position?.lat, position?.lng, kakaoSDK, resolveAddress]);

  const hasAddress = road || jibun;
  const isEmpty = !loading && !hasAddress;

  const boxStyle = React.useMemo((): React.CSSProperties | undefined => {
    if (!anchorPoint || typeof window === "undefined") return undefined;
    return {
      left: anchorPoint.x + OFFSET_X,
      top: anchorPoint.y + OFFSET_Y,
      transform: "translate(0, 0)",
    };
  }, [anchorPoint]);

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[2100] cursor-default"
      aria-hidden={false}
      onClick={() => onOpenChange(false)}
      onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-label="선택 위치 주소"
        className="fixed z-[2101] w-max max-w-[90vw] rounded-lg border bg-background shadow-md px-2.5 py-2 inline-flex flex-col gap-0.5"
        style={boxStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[11px] font-medium text-gray-700">
          선택 위치 주소
        </div>
        <div>
          {loading && (
            <p className="text-[11px] text-muted-foreground">주소 조회 중…</p>
          )}
          {isEmpty && !loading && (
            <p className="text-[11px] text-muted-foreground">
              이 위치의 주소 정보가 없습니다.
            </p>
          )}
          {hasAddress && !loading && (
            <div className="space-y-0.5">
              {road && (
                <div className="text-[11px] text-gray-900 leading-snug">
                  {road}
                </div>
              )}
              {jibun && (
                <div className="text-[10px] text-gray-500 leading-snug">
                  {jibun}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(modal, document.body);
  }
  return modal;
}
