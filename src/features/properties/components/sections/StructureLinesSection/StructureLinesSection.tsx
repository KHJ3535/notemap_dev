"use client";

import { Button } from "@/components/atoms/Button/Button";
import { Input } from "@/components/atoms/Input/Input";
import { Checkbox } from "@/components/atoms/Checkbox/Checkbox";
import { Trash2, Plus } from "lucide-react";
import type { UnitLine } from "@/features/properties/types/property-domain";

type StructureLinesProps = {
  lines: UnitLine[];
  onAddPreset: (preset: string) => void;
  onAddEmpty: () => void;
  onUpdate: (idx: number, patch: Partial<UnitLine>) => void;
  onRemove: (idx: number) => void;
  presets: readonly string[];
  title?: string;
};

export default function StructureLinesSection({
  lines,
  onAddPreset,
  onAddEmpty,
  onUpdate,
  onRemove,
  presets,
  title = "구조별 입력",
}: StructureLinesProps) {
  return (
    <div className="space-y-2">
      {/* 상단 헤더 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 text-sm font-medium shrink-0">
          <span>{title}</span>
        </div>

        <div className="flex flex-wrap gap-1 sm:justify-end">
          {presets.map((p) => (
            <Button
              key={p}
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              type="button"
              onClick={() => onAddPreset(p)}
            >
              {p}
            </Button>
          ))}
          <Button
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-xs"
            type="button"
            onClick={onAddEmpty}
          >
            <Plus className="h-3 w-3 mr-1" />
            직접추가
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {lines.length === 0 && (
          <div className="text-xs text-muted-foreground">
            프리셋을 누르거나 ‘직접추가’를 눌러 행을 추가하세요.
          </div>
        )}

        {lines.map((line, idx) => (
          <div
            key={idx}
            className={`
              grid items-center
              gap-x-2 gap-y-1 md:gap-x-2
              grid-cols-[44px_max-content_max-content_minmax(0,1fr)_40px]
              md:grid-cols-[64px_max-content_max-content_minmax(240px,1fr)_40px]
            `}
          >
            {/* 구조 */}
            <Input
              value={`${line.rooms || ""}/${line.baths || ""}`}
              onChange={(e) => {
                const v = e.target.value.replace(/\s/g, "");
                const [r, b] = v.split("/");
                onUpdate(idx, {
                  rooms: parseInt(r || "0", 10) || 0,
                  baths: parseInt(b || "0", 10) || 0,
                });
              }}
              placeholder="2/1"
              className="h-8 md:h-9 w-[38px] md:w-[64px] text-center"
              inputMode="numeric"
              pattern="[0-9/]*"
            />

            {/* 복층 */}
            <label className="inline-flex items-center gap-1 md:gap-2 text-xs md:text-sm pl-1 md:pl-2">
              <Checkbox
                checked={line.duplex}
                onCheckedChange={(c) => onUpdate(idx, { duplex: !!c })}
              />
              <span>복층</span>
            </label>

            {/* 테라스 */}
            <label className="inline-flex items-center gap-1 md:gap-2 text-xs md:text-sm pr-1 md:pr-5">
              <Checkbox
                checked={line.terrace}
                onCheckedChange={(c) => onUpdate(idx, { terrace: !!c })}
              />
              <span>테라스</span>
            </label>

            {/* 가격 범위 */}
            <div
              className={`
                w-full
                flex flex-col gap-1
                md:grid md:grid-cols-[minmax(110px,1fr)_auto_minmax(110px,1fr)]
                md:items-center md:justify-items-center md:gap-2
              `}
            >
              {/* 최소 */}
              <div className="flex w-full min-w-0 items-center gap-1 md:gap-2">
                <Input
                  value={line.primary}
                  onChange={(e) => onUpdate(idx, { primary: e.target.value })}
                  placeholder="최소매매가"
                  className="h-8 md:h-9 flex-1 min-w-0"
                  inputMode="numeric"
                  inputClassName="placeholder:text-[11px] md:placeholder:text-xs"
                  required
                  aria-required="true"
                />
                <span className="text-[11px] md:text-xs text-gray-500 shrink-0 leading-none">
                  백만원
                </span>
              </div>

              <span className="hidden md:inline text-xs text-gray-500 justify-self-center px-2">
                ~
              </span>

              {/* 최대 */}
              <div className="flex w-full min-w-0 items-center gap-1 md:gap-2">
                <Input
                  value={line.secondary}
                  onChange={(e) => onUpdate(idx, { secondary: e.target.value })}
                  placeholder="최대매매가"
                  className="h-8 md:h-9 flex-1 min-w-0"
                  inputMode="numeric"
                  inputClassName="placeholder:text-[11px] md:placeholder:text-xs"
                  required
                  aria-required="true"
                />
                <span className="text-[11px] md:text-xs text-gray-500 shrink-0 leading-none">
                  백만원
                </span>
              </div>
            </div>

            {/* 삭제버튼 */}
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => onRemove(idx)}
              title="행 삭제"
              className="shrink-0 justify-self-end"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
