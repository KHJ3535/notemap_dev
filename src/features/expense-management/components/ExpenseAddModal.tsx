"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { Input } from "@/components/atoms/Input/Input";
import { Label } from "@/components/atoms/Label/Label";
import { Textarea } from "@/components/atoms/Textarea/Textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/atoms/Popover/Popover";
import { Calendar } from "@/components/atoms/Calendar/Calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/Dialog/Dialog";
import { FormError } from "@/components/atoms/FormError/FormError";

const expenseFormSchema = z.object({
  date: z
    .string()
    .min(1, "날짜를 입력하세요")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식으로 입력하세요"),
  itemName: z.string().min(1, "품목명을 입력하세요").max(100, "품목명은 100자 이내"),
  amount: z
    .number({ invalid_type_error: "금액을 입력하세요" })
    .int("정수만 입력 가능합니다")
    .min(1, "금액은 1원 이상이어야 합니다"),
  memo: z.string().max(500, "메모는 500자 이내").optional().default(""),
});

export type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface ExpenseAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
}

export function ExpenseAddModal({
  open,
  onOpenChange,
  onSubmit,
}: ExpenseAddModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      itemName: "",
      amount: undefined as unknown as number,
      memo: "",
    },
  });

  const handleFormSubmit = async (data: ExpenseFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      reset({
        date: new Date().toISOString().slice(0, 10),
        itemName: "",
        amount: undefined as unknown as number,
        memo: "",
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>지출 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>날짜</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => {
                const selectedDate = field.value
                  ? new Date(field.value)
                  : undefined;
                return (
                  <Popover
                    open={isDatePickerOpen}
                    onOpenChange={setIsDatePickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={`flex w-full items-center justify-between text-left font-normal ${
                          !selectedDate ? "text-muted-foreground" : ""
                        }`}
                        disabled={isLoading}
                      >
                        {selectedDate ? (
                          format(selectedDate, "PPP", { locale: ko })
                        ) : (
                          <span>날짜를 선택하세요</span>
                        )}
                        <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 z-[2200]"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        locale={ko}
                        i18nLocale="ko-KR"
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          field.onChange(
                            date ? format(date, "yyyy-MM-dd") : ""
                          );
                          setIsDatePickerOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                );
              }}
            />
            <FormError message={errors.date?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemName">품목명</Label>
            <Input
              id="itemName"
              placeholder="품목명을 입력하세요"
              {...register("itemName")}
              disabled={isLoading}
            />
            <FormError message={errors.itemName?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">금액</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              placeholder="금액을 입력하세요"
              {...register("amount", { valueAsNumber: true })}
              disabled={isLoading}
            />
            <FormError message={errors.amount?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">메모</Label>
            <Textarea
              id="memo"
              placeholder="메모 (선택)"
              rows={3}
              {...register("memo")}
              disabled={isLoading}
            />
            <FormError message={errors.memo?.message} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "등록 중..." : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
