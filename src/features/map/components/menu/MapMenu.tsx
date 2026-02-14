"use client";

import * as React from "react";
import { Map } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/cn";
import {
  MapMenuKey,
  MapMenuProps,
  MapMenuSubmenu,
} from "./types/mapMenu.types";
import { ExpandedMenu } from "./components/ExpandedMenu";
import { useMapMenuState } from "../../hooks/menu/useMapMenuState";

export default function MapMenu(props: MapMenuProps) {
  const {
    active,
    onChange,
    isDistrictOn,
    onToggleDistrict,
    className,
    poiKinds,
    onChangePoiKinds,
    roadviewVisible,
    onToggleRoadview,
    distanceMeasureVisible,
    onToggleDistanceMeasure,
    expanded,
    onExpandChange,
  } = props;

  // 컨트롤드 여부 판별
  const isControlled = typeof expanded === "boolean" && !!onExpandChange;

  // 언컨트롤드 모드용 로컬 상태 훅
  const {
    isExpanded: localExpanded,
    activeSubmenu,
    open,
    close,
    toggle,
    handleSubmenuClick,
  } = useMapMenuState();

  // 실제 사용될 열림 상태/제어 API
  const isExpanded = isControlled ? (expanded as boolean) : localExpanded;

  const api = React.useMemo(
    () => ({
      open: () => (isControlled ? onExpandChange!(true) : open()),
      close: () => (isControlled ? onExpandChange!(false) : close()),
      toggle: () => (isControlled ? onExpandChange!(!isExpanded) : toggle()),
    }),
    [isControlled, onExpandChange, isExpanded, open, close, toggle]
  );

  const onKeyDownToggle = React.useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        api.toggle();
      }
    },
    [api]
  );

  const handleMenuItemClick = React.useCallback(
    (key: MapMenuKey) => {
      onChange?.(key);
      api.close(); // 항목 누르면 닫기
    },
    [onChange, api]
  );

  const handleSubmenu = React.useCallback(
    (submenu: MapMenuSubmenu) => {
      // 서브메뉴는 내부 훅으로 관리
      handleSubmenuClick(submenu);
    },
    [handleSubmenuClick]
  );

  // ✅ ExpandedMenu가 기대하는 () => void 시그니처에 맞게 래핑
  const handleToggleDistrictClick = React.useCallback(() => {
    onToggleDistrict?.(!isDistrictOn);
  }, [onToggleDistrict, isDistrictOn]);

  return (
    <div className={cn("relative z-[210]", className)}>
      <Button
        type="button"
        variant={isExpanded ? "default" : "outline"}
        size="icon"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          api.toggle();
        }}
        onKeyDown={onKeyDownToggle}
        className={cn(
          "h-10 w-10 rounded-xl",
          "hover:opacity-100 hover:bg-opacity-100",
          isExpanded ? "shadow-md" : "shadow-sm"
        )}
        aria-label="맵 메뉴 열기"
        aria-pressed={isExpanded}
        aria-expanded={isExpanded}
        data-state={isExpanded ? "on" : "off"}
      >
        <Map className="h-4 w-4" aria-hidden />
      </Button>

      {isExpanded && (
        <div
          className={cn(
            // 📱 모바일: 위에서부터, 아래 토글 버튼들 남겨두고 꽉 차게
            "fixed left-0 right-0 top-0 bottom-[80px] z-[80] flex justify-center items-start pt-4 px-3",
            // 💻 데스크탑: 예전처럼 MapMenu 옆에서만 뜨게
            "md:static md:inset-auto md:z-auto md:flex-none md:p-0"
          )}
          // 바깥 눌렀을 때 닫히게 하고 싶으면 이거 추가해도 됨
          onClick={() => api.close()}
        >
          {/* 안쪽 패널 눌렀을 땐 바깥 onClick 안 타도록 막기 */}
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
            <ExpandedMenu
              active={active}
              activeSubmenu={activeSubmenu}
              onSubmenuClick={handleSubmenu}
              onMenuItemClick={handleMenuItemClick}
              isDistrictOn={isDistrictOn}
              onToggleDistrict={handleToggleDistrictClick}
              onToggle={api.close}
              poiKinds={poiKinds}
              onChangePoiKinds={onChangePoiKinds}
              roadviewVisible={roadviewVisible}
              onToggleRoadview={onToggleRoadview}
              distanceMeasureVisible={distanceMeasureVisible}
              onToggleDistanceMeasure={onToggleDistanceMeasure}
            />
          </div>
        </div>
      )}
    </div>
  );
}
