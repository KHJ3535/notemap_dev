"use client";

import { Button } from "@/components/atoms/Button/Button";
import { Plus, Star, Trash2, X } from "lucide-react";
import StarMeter from "@/features/properties/view/ui/parts/StarMeter";

import type React from "react";

import { useContextMenuPanelLogic } from "./hooks/useContextMenuPanel";
import type { ContextMenuPanelProps } from "./panel.types";

export default function ContextMenuPanel(props: ContextMenuPanelProps) {
  const {
    roadAddress,
    jibunAddress,
    showFav,
    favActive,
    onAddFav,
    canDelete,
    onDelete,
    onClose,
  } = props;

  const {
    // refs
    panelRef,
    firstFocusableRef,

    // aria
    headingId,
    descId,

    // 상태
    headerTitle,
    officePhone,
    parkingGrade,
    draft,
    planned,
    reserved,
    canView,
    isAlreadyReserved,
    isReservedByOtherAccount,
    assigneeName,
    onCancelReservation,

    // 핸들러
    stopAll,
    handleCreateClick,
    handleViewClick,
    handleReserveClick,
    handleHoverPrefetch,
  } = useContextMenuPanelLogic(props);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-describedby={descId}
      tabIndex={-1}
      onPointerDown={stopAll}
      onMouseDown={stopAll}
      onClick={stopAll}
      className="rounded-2xl bg-white shadow-xl border border-gray-200 p-3 w-[280px] sm:w-[320px] max-w-[90vw] outline-none"
    >
      {/* ---------------- 헤더 ---------------- */}
      <div className="flex items-start justify-between gap-3">
        <div id={headingId} className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <div className="font-semibold text-base truncate min-w-0">
              {headerTitle}
            </div>
            {assigneeName && (
              <span className="text-xs text-gray-500 font-normal shrink-0">
                예약자: {assigneeName}
              </span>
            )}
            {Number(parkingGrade) > 0 && (
              <StarMeter value={Number(parkingGrade)} size="sm" showValue />
            )}
          </div>
        </div>

        {/* 닫기 버튼 (상단 유지) */}
        <Button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          variant="outline"
          size="sm"
          className="hover:bg-transparent"
        >
          닫기
        </Button>
      </div>

      {/* ---------------- 주소 설명 ---------------- */}
      <div id={descId} className="sr-only">
        {roadAddress || jibunAddress
          ? "선택된 위치의 주소가 표시됩니다."
          : "선택된 위치의 주소 정보가 없습니다."}
      </div>

      {(jibunAddress || roadAddress || officePhone) && (
        <div className="mt-2 mb-3">
          {/* 구주소(지번) */}
          {jibunAddress && (
            <div className="text-[13px] text-gray-700 leading-snug">
              {jibunAddress}
            </div>
          )}
          {/* 도로명주소 */}
          {roadAddress && (
            <div className="text-[12px] text-gray-500 mt-0.5 leading-snug">
              {roadAddress}
            </div>
          )}
          {/* 현장 대표번호 */}
          {officePhone && (
            <div className="text-[12px] text-gray-500 mt-0.5 leading-snug">
              현장 대표번호 {officePhone}
            </div>
          )}
        </div>
      )}

      {/* 즐겨찾기/매물삭제: 상세보기 버튼 위 */}
      {(showFav || canDelete) && (
        <div className="mt-2 mb-3 flex items-center gap-2">
          {showFav && (
            <Button
              type="button"
              onClick={onAddFav}
              aria-label="즐겨찾기"
              variant="outline"
              size="sm"
              className={`flex-1 h-9 gap-1.5 text-sm bg-transparent ${
                favActive
                  ? "border-yellow-300 text-yellow-700"
                  : "text-gray-900"
              } hover:bg-transparent hover:text-inherit hover:border-inherit`}
              ref={firstFocusableRef}
            >
              <Star
                className={`w-4 h-4 ${
                  favActive
                    ? "fill-yellow-500 text-yellow-500"
                    : "fill-none text-gray-400"
                }`}
              />
              <span>즐겨찾기</span>
            </Button>
          )}

          {canDelete && (
            <Button
              type="button"
              onClick={onDelete}
              aria-label="매물삭제"
              variant="outline"
              size="sm"
              className="flex-1 h-9 gap-1.5 text-sm text-red-500 border-red-200 bg-transparent hover:bg-transparent hover:text-red-500 hover:border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              <span>삭제</span>
            </Button>
          )}
        </div>
      )}

      {/* ---------------- 액션 구역 ---------------- */}
      {reserved ? (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={handleCreateClick}
            disabled={isReservedByOtherAccount}
            className="w-full"
          >
            {isReservedByOtherAccount ? "이미 예약됨" : "매물 정보 입력"}
          </Button>
          {onCancelReservation && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                onCancelReservation();
                onClose();
              }}
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              답사지 예약 취소
            </Button>
          )}
        </div>
      ) : planned ? (
        <Button
          type="button"
          variant="default"
          size="lg"
          onClick={handleReserveClick}
          disabled={isAlreadyReserved}
          className="w-full"
        >
          {isAlreadyReserved ? "이미 예약된 핀" : "답사지 예약"}
        </Button>
      ) : draft ? (
        <Button
          type="button"
          variant="default"
          size="lg"
          onClick={handleCreateClick}
          className="w-full"
        >
          답사예정지 등록
        </Button>
      ) : (
        <Button
          type="button"
          variant="default"
          size="lg"
          onClick={handleViewClick}
          onMouseEnter={handleHoverPrefetch}
          className="w-full"
          disabled={!canView}
        >
          상세 보기
        </Button>
      )}
    </div>
  );
}
