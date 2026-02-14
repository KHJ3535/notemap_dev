"use client";

import * as React from "react";
import { Ruler } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { cn } from "@/lib/cn";

type Props = {
  pressed: boolean;
  onPress: () => void;
  showLabel?: boolean;
  label?: string;
  disabled?: boolean;
  size?: "icon" | "sm" | "default" | "lg";
  className?: string;
};

const DistanceMeasureToggleButton = React.memo(
  React.forwardRef<HTMLButtonElement, Props>(function DistanceMeasureToggleButton(
    {
      pressed,
      onPress,
      showLabel = false,
      label = "거리재기",
      disabled = false,
      size = "icon",
      className,
    },
    ref
  ) {
    const title = `${label} 토글`;

    if (!showLabel) {
      return (
        <Button
          ref={ref}
          type="button"
          onClick={onPress}
          role="switch"
          aria-checked={pressed}
          aria-label={title}
          disabled={disabled}
          size={size}
          className={cn(
            "h-10 w-10 rounded-xl shadow transition",
            pressed ? "bg-blue-600 text-white" : "bg-white text-gray-800",
            "hover:opacity-100 hover:bg-opacity-100",
            disabled && "opacity-60 cursor-not-allowed",
            className
          )}
          data-state={pressed ? "on" : "off"}
          title={title}
        >
          <Ruler aria-hidden="true" className="h-4 w-4" />
        </Button>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={onPress}
        disabled={disabled}
        role="switch"
        aria-checked={pressed}
        aria-label={label}
        title={label}
        className={cn(
          "flex h-16 w-full flex-col items-center justify-center gap-1 rounded-lg border text-xs transition",
          pressed
            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          disabled && "opacity-60 cursor-not-allowed",
          className
        )}
        data-state={pressed ? "on" : "off"}
      >
        <Ruler className="h-5 w-5" aria-hidden="true" />
        <span>{label}</span>
      </button>
    );
  })
);

export default DistanceMeasureToggleButton;
