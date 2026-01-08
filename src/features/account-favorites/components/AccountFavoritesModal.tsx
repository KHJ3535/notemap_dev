"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/Dialog/Dialog";
import { FavoriteGroupList } from "./FavoriteGroupList";

interface AccountFavoritesModalProps {
  open: boolean;
  accountId: string | null;
  accountName?: string;
  favoritePins?: Array<{
    id: string;
    name: string | null;
  }>; // 해당 계정의 즐겨찾기 핀 목록 (백엔드에서 제공)
  onClose: () => void;
}

export function AccountFavoritesModal({
  open,
  accountId,
  accountName,
  favoritePins = [],
  onClose,
}: AccountFavoritesModalProps) {
  // favoritePins를 단일 그룹으로 변환 (백엔드에서 그룹 정보를 제공하지 않으므로)
  const groupsWithPinNames = useMemo(() => {
    if (!favoritePins || favoritePins.length === 0) {
      return [];
    }

    // favoritePins를 단일 그룹으로 변환
    return [
      {
        id: "default-group",
        title: "즐겨찾기",
        sortOrder: 0,
        itemCount: favoritePins.length,
        items: favoritePins.map((pin, index) => ({
          itemId: `item-${pin.id}`,
          pinId: pin.id,
          sortOrder: index,
          createdAt: new Date().toISOString(),
          pinName: pin.name || `Pin ${pin.id}`,
        })),
      },
    ];
  }, [favoritePins]);

  const isLoading = false;
  const error = null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[95vw] sm:w-full max-w-md sm:max-w-lg md:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {accountName ? `${accountName}님의 즐겨찾기` : "즐겨찾기 목록"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading && (
            <div className="text-center text-gray-500 py-8">
              즐겨찾기 목록을 불러오는 중...
            </div>
          )}

          {error && (
            <div className="text-center text-red-500 py-8">
              즐겨찾기 목록을 불러오는 중 오류가 발생했습니다.
            </div>
          )}

          {!isLoading && !error && (
            <>
              {groupsWithPinNames.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  등록된 즐겨찾기가 없습니다.
                </div>
              ) : (
                <FavoriteGroupList groups={groupsWithPinNames} />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

