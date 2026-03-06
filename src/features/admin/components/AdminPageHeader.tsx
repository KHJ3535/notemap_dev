"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";

interface AdminPageHeaderProps {
  className?: string;
}

export function AdminPageHeader({ className }: AdminPageHeaderProps) {
  const [activeMenu, setActiveMenu] = useState<string>("");

  const menuItems = [
    {
      key: "team-management",
      label: "팀관리(관리자)",
      href: "/admin/team-management",
    },
    { key: "account-create", label: "계정생성", href: "/admin/account-create" },
    { key: "accounts", label: "계정목록", href: "/admin/accounts" },
    { key: "contracts", label: "계약관리", href: "/admin/contracts" },
    { key: "performance", label: "실적확인", href: "/admin/performance" },
    { key: "expense-management", label: "가계부", href: "/admin/expense-management" },
    { key: "notices", label: "공지사항", href: "/admin/notices" },
  ];

  return (
    <header
      className={`flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-200 ${
        className || ""
      }`}
    >
      {/* 로고와 돌아가기 버튼 */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <Link href="/" className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-gray-100"
            title="메인화면으로 돌아가기"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
        </Link>
        <Link href="/admin" className="flex items-center">
          <Image
            src="/mainlogo.webp"
            alt="로고"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </Link>
      </div>

      {/* 메뉴 - 태블릿부터 스크롤 가능, 스크롤바 숨김 */}
      <nav
        className="flex-1 md:flex-none md:w-auto min-w-0 overflow-x-auto overflow-y-hidden -mx-4 md:mx-0 px-4 md:px-0 flex-shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={
          {
            scrollBehavior: "auto",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties
        }
      >
        <div className="flex items-center gap-2 md:gap-3 lg:gap-4 min-w-max">
          {menuItems.map((item) => (
            <Link key={item.key} href={item.href}>
              <Button
                variant={activeMenu === item.key ? "default" : "ghost"}
                className={`px-3 md:px-4 xl:px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeMenu === item.key
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                onClick={() => setActiveMenu(item.key)}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
