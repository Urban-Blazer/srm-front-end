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
};
function InputCurrency(
  { onChange, decimals: _d, onNumberChange, ...rest }: InputCurrencyProps,
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

      selectionRef.current = {
        start: (el.selectionStart ?? 0)+1,
        end: (el.selectionEnd ?? 0)+1,
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
    [onChange, previousVal, decimals],
  );

  const num = useMemo(() => {
    const _num = +val;
    return Number.isNaN(_num) ? 0 : _num;
  }, [val]);

  useEffect(() => {
    onNumberChange?.(num);
  }, [num, onNumberChange]);

  useEffect(() => {
    if (typeof rest.value !== "string") return;
    const raw = rest.value.replace(/,/g, "") || "";
    setPreviousVal(raw);
  }, [rest.value]);

  useLayoutEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const { start, end } = selectionRef.current;
    el.setSelectionRange(start, end);
  }, [rest.value]);

  return (
    <input
      {...rest}
      ref={targetRef}
      // universal input options
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      // text-specific options
      type="text"
      pattern="^[0-9]*[.,]?[0-9]*$"
      minLength={1}
      maxLength={79}
      spellCheck="false"
      onChange={_onChange}
    />
  );
}

export default React.forwardRef(InputCurrency);
