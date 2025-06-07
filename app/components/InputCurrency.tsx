import useCombinedRefs from "@/app/hooks/useCombineRef";
import React, { ForwardedRef, useCallback, useLayoutEffect, useRef, useState } from "react";
import { useMemo } from "react";
import { useEffect } from "react";
const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`);
export function formatWithCommas(value: string): string {
  const [intPart, decPart] = value.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined
    ? `${formattedInt}.${decPart}`
    : formattedInt;
}
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}
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

  const selectionRef = useRef<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  const [previousVal, setPreviousVal] = useState("");
  const [val, setVal] = useState("");
  const decimals = useMemo(() => {
    if (typeof _d === "number") {
      return Math.min(_d, 9);
    }
  }, [_d]);

  const _onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const el = targetRef.current;
      if (!el) return;

      const raw = e.target.value.replace(/,/g, "").replace(/^0+/, "0");
      const formatted = formatWithCommas(raw);
      console.log('_onChange',{formatted, raw, previousVal});
      selectionRef.current = {
        start: (el.selectionStart ?? 0),
        end: (el.selectionEnd ?? 0),
      };

      if (raw === "" || inputRegex.test(escapeRegExp(raw))) {
        const numDecimals = raw.split(".")[1]?.length || 0;
        if (
          typeof decimals === "number" &&
          decimals >= 0 &&
          numDecimals > decimals
        ) {
          e.target.value = previousVal;
        } else {
          e.target.value = formatted;
          setPreviousVal(formatted);
        }
      } else {
        e.target.value = previousVal;
      }
      setVal(e.target.value);
      if (typeof onChange === "function") {
        onChange(e);
      }
    },
    [targetRef, onChange, decimals, previousVal],
  );

  const num = useMemo(() => {
    const _num = +val;
    console.log('num', {_num, val}, Number.isNaN(_num));
    return Number.isNaN(_num) ? 0 : _num;
  }, [val]);

  useEffect(() => {
    onNumberChange?.(num);
  }, [num, onNumberChange]);

  useEffect(() => {
    console.log('useEffect', value, typeof value);
    if (typeof value !== "string") return;
    const raw = value.replace(/,/g, "") || "";
    setPreviousVal(raw);
  }, [value]);

  useLayoutEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const { start, end } = selectionRef.current;
    el.setSelectionRange(start, end);
  }, [value, targetRef]);

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
      pattern="^[0-9]*[.,]?[0-9]*$"
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
