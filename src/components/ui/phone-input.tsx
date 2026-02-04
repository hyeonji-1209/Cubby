"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatPhone, validatePhone } from "@/lib/input-validation";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  showValidation?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, label, error, value, onChange, showValidation = true, ...props }, ref) => {
    const id = React.useId();
    const [validationError, setValidationError] = React.useState<string | null>(null);
    const [isTouched, setIsTouched] = React.useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // 숫자만 추출
      const digitsOnly = e.target.value.replace(/\D/g, "");

      // 최대 11자리까지만 허용
      const truncated = digitsOnly.slice(0, 11);

      // 포맷팅된 값으로 표시
      const formatted = formatPhone(truncated);
      onChange(formatted);

      // 실시간 유효성 검사
      if (showValidation && isTouched && truncated.length > 0) {
        const validation = validatePhone(truncated);
        setValidationError(validation.valid ? null : validation.error || null);
      }
    };

    const handleBlur = () => {
      setIsTouched(true);
      if (showValidation && value) {
        const digitsOnly = value.replace(/\D/g, "");
        const validation = validatePhone(digitsOnly);
        setValidationError(validation.valid ? null : validation.error || null);
      }
    };

    const displayError = error || (isTouched ? validationError : null);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          type="tel"
          id={id}
          inputMode="numeric"
          autoComplete="tel"
          placeholder="010-1234-5678"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            displayError && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
        {displayError && (
          <p className="mt-1.5 text-sm text-destructive">{displayError}</p>
        )}
      </div>
    );
  }
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
