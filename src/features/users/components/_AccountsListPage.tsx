"use client";

import React from "react";
import { Trash2, Edit, List, ChevronUp, ChevronDown } from "lucide-react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/atoms/Avatar/Avatar";
import type { UserRow, RoleKey } from "@/features/users/types";

type SortColumn = "name" | "rank" | null;
type SortDirection = "asc" | "desc";

type Props = {
  rows: UserRow[];
  onChangeRole?: (id: string, role: RoleKey) => void; // optional - 필요 시 사용
  onRemove: (id: string) => void;
  onEdit?: (credentialId: string) => void; // optional - 팀 관리에서는 수정 불필요
  onViewFavorites?: (accountId: string) => void; // 즐겨찾기 목록 보기
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  onSort?: (column: SortColumn, direction: SortDirection) => void;
};

export default function AccountsListPage({
  rows,
  onChangeRole,
  onRemove,
  onEdit,
  onViewFavorites,
  sortColumn = null,
  sortDirection = "asc",
  onSort,
}: Props) {
  const handleViewFavorites = (accountId: string) => {
    onViewFavorites?.(accountId);
  };

  const handleSortClick = (column: "name" | "rank") => {
    if (!onSort) return;

    if (sortColumn === column) {
      // 같은 컬럼이면 방향 토글
      onSort(column, sortDirection === "asc" ? "desc" : "asc");
    } else {
      // 다른 컬럼이면 오름차순으로 설정
      onSort(column, "asc");
    }
  };

  const SortIcon = ({ column }: { column: "name" | "rank" }) => {
    if (!onSort) {
      return null;
    }
    
    // 현재 정렬 컬럼인 경우 정렬 방향에 따라 아이콘 표시
    if (sortColumn === column) {
      return sortDirection === "asc" ? (
        <ChevronUp className="h-4 w-4 ml-1" />
      ) : (
        <ChevronDown className="h-4 w-4 ml-1" />
      );
    }
    
    // 정렬되지 않은 컬럼은 기본적으로 오름차순 아이콘 표시
    return <ChevronUp className="h-4 w-4 ml-1 opacity-40" />;
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: "name" | "rank";
    children: React.ReactNode;
  }) => {
    if (!onSort) {
      return <th className="px-4 py-3 text-left font-medium">{children}</th>;
    }

    return (
      <th
        className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-muted/50 select-none"
        onClick={() => handleSortClick(column)}
      >
        <div className="flex items-center">
          {children}
          <SortIcon column={column} />
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border">
      {rows.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">
          데이터가 없습니다.
        </div>
      ) : (
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-center font-medium">프로필 사진</th>
              <SortableHeader column="name">이름</SortableHeader>
              <th className="px-4 py-3 text-left font-medium">연락처</th>
              <SortableHeader column="rank">직급</SortableHeader>
              <th className="px-4 py-3 text-left font-medium">부서</th>
              <th className="px-4 py-3 text-center font-medium">
                즐겨찾기 목록
              </th>
              <th className="px-4 py-3 text-center font-medium">계정 수정</th>
              <th className="px-4 py-3 text-center font-medium">계정 삭제</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const phone = u.phone ?? "-";

              // 직급 매핑
              const positionRankLabel = (rank?: string) => {
                const rankMap: Record<string, string> = {
                  ASSISTANT_MANAGER: "대리",
                  MANAGER: "과장",
                  DEPUTY_GENERAL: "차장",
                  GENERAL_MANAGER: "부장",
                  TEAM_LEADER: "팀장",
                  DIRECTOR: "실장",
                  STAFF: "사원",
                };
                return rank ? rankMap[rank] || rank : "-";
              };

              // 이름 첫 글자로 아바타 초기값 생성
              const initials = u.name ? u.name.charAt(0).toUpperCase() : "?";

              return (
                <tr
                  key={u.id}
                  className="border-b last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={u.photo_url || undefined}
                          alt={u.name}
                        />
                        <AvatarFallback className="bg-muted text-sm font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3">{phone}</td>
                  <td className="px-4 py-3">
                    {positionRankLabel(u.positionRank)}
                  </td>
                  <td className="px-4 py-3">{u.teamName || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      onClick={() => handleViewFavorites(u.id)}
                      title="즐겨찾기 목록"
                    >
                      <List className="h-4 w-4" />
                      목록
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {onEdit ? (
                      <button
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
                        onClick={() => onEdit(u.id)}
                        title="수정"
                      >
                        <Edit className="h-4 w-4" />
                        수정
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.role === "admin" ? (
                      <span className="text-muted-foreground text-xs">-</span>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm("해당 계정을 삭제하시겠습니까?"))
                            onRemove(u.id);
                        }}
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
