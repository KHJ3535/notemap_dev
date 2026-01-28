"use client";

import { useEffect, useState } from "react";
import Field from "@/components/atoms/Field/Field";
import { Phone, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BasicInfoViewProps {
  address?: string;
  officePhone?: string; // 대표번호
  officePhone2?: string; // 추가번호(선택)
}

export default function BasicInfoView({
  address,
  officePhone,
  officePhone2,
}: BasicInfoViewProps) {
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);

  // 모바일 여부 감지
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mobileCheck = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);
  }, []);

  const mainPhone = (officePhone ?? "").trim();
  const subPhone = (officePhone2 ?? "").trim();

  const toTel = (phone: string) => phone.replace(/[^0-9+]/g, "");

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        description: "전화번호가 복사되었습니다.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "복사에 실패했습니다. 다시 시도해주세요.",
      });
    }
  };

  const renderPhone = (phone: string) => (
    <div className="flex items-center gap-1">
      <span>{phone}</span>
      {isMobile ? (
        <a
          href={`tel:${toTel(phone)}`}
          aria-label={`${phone}로 전화 걸기`}
        >
          <Phone className="w-4 h-4 text-blue-500 hover:text-blue-600" />
        </a>
      ) : (
        <button
          type="button"
          onClick={() => copyToClipboard(phone)}
          className="cursor-pointer"
          aria-label={`${phone} 복사하기`}
        >
          <Copy className="w-4 h-4 text-slate-500 hover:text-slate-700" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 주소 */}
      <Field label="주소">
        <div className="h-9 flex items-center text-sm text-slate-800">
          {(address ?? "").trim() || "-"}
        </div>
      </Field>

      {/* 분양사무실 / 분양사무실2 (가로 나란히) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Field label="분양사무실" align="start" contentClassName="-mt-[3px]">
          <div className="flex items-center text-sm text-slate-800">
            {mainPhone ? renderPhone(mainPhone) : "-"}
          </div>
        </Field>
        <Field label="분양사무실2" align="start" contentClassName="-mt-[3px]">
          <div className="flex items-center text-sm text-slate-800">
            {subPhone ? renderPhone(subPhone) : "-"}
          </div>
        </Field>
      </div>
    </div>
  );
}
