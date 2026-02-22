"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/atoms/Input/Input";
import { useToast } from "@/hooks/use-toast";
import { isTooBroadKeyword } from "@/features/map/shared/utils/isTooBroadKeyword";

export const FILTER_KEYS = ["all", "new", "old"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

type Props = {
  value?: string; // controlled
  defaultValue?: string; // uncontrolled
  onChange?: (v: string) => void;
  onSubmit?: (v: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  /** 제출 후 입력창 비우기 (기본 false) */
  clearOnSubmit?: boolean;
  /** 자동 포커스 */
  autoFocus?: boolean;
  /** 비활성화 */
  disabled?: boolean;
};

const SearchForm = React.memo(
  React.forwardRef<HTMLFormElement, Props>(function SearchForm(
    {
      value,
      defaultValue,
      onChange,
      onSubmit,
      onClear,
      placeholder = "장소, 주소, 버스 검색",
      className,
      clearOnSubmit = false,
      autoFocus = false,
      disabled = false,
    },
    ref
  ) {
    const [inner, setInner] = React.useState(defaultValue ?? "");
    const controlled = value !== undefined;
    const inputValue = controlled ? (value as string) : inner;
    const hasText = inputValue.trim().length > 0;
    const composingRef = React.useRef(false);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const { toast } = useToast(); // 🔹 추가

    const setVal = React.useCallback(
      (v: string) => {
        if (!controlled) setInner(v);
        onChange?.(v);
      },
      [controlled, onChange]
    );

    const clear = React.useCallback(() => {
      setVal("");
      onClear?.();
      // 지우고 포커스 유지
      inputRef.current?.focus();
    }, [setVal, onClear]);

    const handleSubmit = React.useCallback<
      React.FormEventHandler<HTMLFormElement>
    >(
      (e) => {
        e.preventDefault();
        if (disabled) return;
        if (composingRef.current) return; // 조합 중이면 무시
        const q = inputValue.trim();
        if (!q) return;

        onSubmit?.(q);
        if (clearOnSubmit) setVal("");
      },
      [disabled, inputValue, onSubmit, clearOnSubmit, setVal, toast]
    );

    const handleKeyDown = React.useCallback<
      React.KeyboardEventHandler<HTMLInputElement>
    >(
      (e) => {
        if (disabled) return;

        // IME 조합 중 Enter 방지
        if (composingRef.current && e.key === "Enter") {
          e.preventDefault();
          return;
        }
        // 비어있을 때 Enter 방지
        if (e.key === "Enter" && !inputValue.trim()) {
          e.preventDefault();
          return;
        }
        // ESC로 빠른 지우기
        if (e.key === "Escape" && inputValue) {
          e.preventDefault();
          clear();
        }
      },
      [disabled, inputValue, clear]
    );

    return (
      <form
        ref={ref}
        onSubmit={handleSubmit}
        className={cn(
          "flex h-[32px] items-center rounded-md bg-white/90 px-2 py-1 shadow-sm ring-1 ring-black/5",
          disabled && "opacity-60",
          className
        )}
        role="search"
        aria-label="주소 검색"
        autoComplete="off"
      >
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setVal(e.target.value)}
            placeholder={placeholder}
            className="h-full w-full border-none bg-transparent p-0 text-sm pr-14"
            inputMode="search"
            enterKeyHint="search"
            role="searchbox"
            aria-label="검색어 입력"
            disabled={disabled}
            autoFocus={autoFocus}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
          />

          {/* 오른쪽 버튼 그룹 */}
          <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-1">
            {hasText && !disabled && (
              <button
                type="button"
                onClick={clear}
                className="h-6 w-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded"
                aria-label="검색어 지우기"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}

            <button
              type="submit"
              disabled={!hasText || disabled}
              className="h-6 w-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
              aria-label="검색"
            >
              <Search size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
    );
  })
);

export default SearchForm;
