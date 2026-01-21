"use client";

import { cn } from "@/lib/cn";
import { Trash2, Pencil, Star } from "lucide-react";

type Props = {
  showEditButton: boolean;
  canDelete: boolean;
  deleting: boolean;
  hasId: boolean;
  onClickEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  showFavorite?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
};

export default function ViewActionsBar({
  showEditButton,
  canDelete,
  deleting,
  hasId,
  onClickEdit,
  onDelete,
  onClose,
  showFavorite = false,
  isFavorited = false,
  onToggleFavorite,
}: Props) {
  return (
    <div className="md:static">
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-20 md:relative",
          "bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70",
          "border-t",
          "px-4 py-3 md:px-5 md:py-3",
          "flex items-center justify-between",
          "shadow-[0_-4px_10px_-6px_rgba(0,0,0,0.15)] md:shadow-none"
        )}
      >
        <div className="flex gap-2">
          {/* ✅ 모바일 + 토글 OFF면 아예 숨김 */}
          {showEditButton && (
            <button
              type="button"
              onClick={onClickEdit}
              data-pvm-initial
              className="inline-flex items-center gap-2 rounded-md border px-3 h-9 text-blue-600 hover:bg-blue-50"
              aria-label="수정"
              title="수정"
            >
              <Pencil className="h-4 w-4" />
              수정
            </button>
          )}

          {/* 즐겨찾기 버튼 */}
          {showFavorite && onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 h-9",
                isFavorited
                  ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                  : "text-gray-700 hover:bg-gray-50"
              )}
              aria-label="즐겨찾기"
              title="즐겨찾기"
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  isFavorited
                    ? "fill-yellow-500 text-yellow-500"
                    : "fill-none text-gray-400"
                )}
              />
              즐겨찾기
            </button>
          )}

          {/* ✅ 부장 / 팀장만 삭제 버튼 노출 */}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting || !hasId}
              className={cn(
                "items-center gap-2 rounded-md border px-3 h-9 text-red-600 hover:bg-red-50 hidden md:inline-flex",
                deleting && "opacity-60 cursor-not-allowed"
              )}
              aria-label="삭제"
              title="삭제"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "삭제 중…" : "삭제"}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-md border px-3 h-9 hover:bg-muted"
          aria-label="닫기"
          title="닫기"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
