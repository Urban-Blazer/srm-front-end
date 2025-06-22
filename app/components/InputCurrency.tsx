import useCombinedRefs from "@/app/hooks/useCombineRef";
import React, { ForwardedRef, useCallback, useEffect, useMemo, useRef, useState } from "react";

const inputRegex = /^\d*\.?\d*$/;

type InputCurrencyProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  decimals?: number;
  onNumberChange?: (val: number) => void;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  value?: string;
};

function InputCurrency(
  { onChange, decimals: _d, onNumberChange, minLength, maxLength, min, max, step, value, ...rest }: InputCurrencyProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  const _ref = useRef<HTMLInputElement>(null);
  const targetRef = useCombinedRefs<HTMLInputElement>(_ref, ref);

  const [previousVal, setPreviousVal] = useState(value || "");
  useEffect(() => {
    setPreviousVal(value || "");
  }, [value]);

  const decimals = useMemo(() => {
    if (typeof _d === "number") {
      return Math.min(_d, 9);
    }
  }, [_d]);

  const _onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const currentValue = e.target.value;

      if (currentValue === "" || inputRegex.test(currentValue)) {
        const numDecimals = currentValue.split(".")[1]?.length || 0;
        if (
          typeof decimals === "number" &&
          decimals >= 0 &&
          numDecimals > decimals
        ) {
          e.target.value = previousVal;
        }
      } else {
        e.target.value = previousVal;
      }
      
      if (typeof onChange === "function") {
        onChange(e);
      }
    },
    [onChange, decimals, previousVal],
  );

  const num = useMemo(() => {
    const _num = +(value || '');
    return Number.isNaN(_num) ? 0 : _num;
  }, [value]);

  useEffect(() => {
    onNumberChange?.(num);
  }, [num, onNumberChange]);

  return (
    <input
      {...rest}
      value={value}
      ref={targetRef}
      // universal input options
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      // text-specific options
      type="text"
      pattern="^[0-9]*[.]?[0-9]*$"
      minLength={minLength}
      maxLength={maxLength}
      min={min}
      max={max}
      step={step}
      spellCheck="false"
      onChange={_onChange}
    />
  );
}

export default React.forwardRef(InputCurrency);
