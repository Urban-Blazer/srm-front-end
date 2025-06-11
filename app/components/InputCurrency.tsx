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

  /**
   * Helper function to calculate cursor position after formatting
   * @param oldValue Original value (may contain commas)
   * @param newValue New value after formatting (with commas)
   * @param cursorPos Current cursor position in the old value
   * @returns New cursor position in the formatted value
   */
  const calculateCursorPosition = (oldValue: string, newValue: string, cursorPos: number): number => {
    // If cursor is at the end, keep it at the end
    console.log({oldValue, newValue, cursorPos});
    console.log('====>',oldValue.length, newValue.length, cursorPos);
    // if(oldValue.length + 1 === cursorPos){}

    if (cursorPos === 4 && newValue.length === 5) {
      return newValue.length + 1;
    }
    if(newValue.length > oldValue.length){
      if (cursorPos === 5 && newValue.length === 9) {
        return newValue.length -2;
      }
      if(cursorPos === 7){
        return cursorPos + 2;
      }
      if(cursorPos === 5 && newValue.length > 10){
        return cursorPos;
      }
      if(cursorPos === 6 && newValue.length > 10){
        return cursorPos - 1;
      }
      if(cursorPos === 5){
        return cursorPos + 1;
      }
      if (cursorPos === 8 && newValue.length === 9 && oldValue.length !== 8) {
        return newValue.length + 1;
      }
      if(cursorPos === 8){
        return cursorPos;
      }
    }
    if(newValue.length === oldValue.length){
      if(cursorPos === 4){
        return cursorPos - 1;
      }
      if (cursorPos === 7 && newValue.length === 7) {
        return newValue.length - 1;
      }
      if(cursorPos === 7){
        return cursorPos + 2;
      }
      return cursorPos;
    }
    if(newValue.length < oldValue.length){
      if(cursorPos === newValue.length){
        return cursorPos;
      }
      if(cursorPos === 2){
        return 1;
      }
      if(cursorPos === 9){
        return cursorPos - 2;
      }
      if(cursorPos === 7){
        return cursorPos - 1;
      }
    }

    // Count commas before cursor in the old value
    const oldCommasBefore = (oldValue.substring(0, cursorPos).match(/,/g) || []).length;
    
    // Get digit position (ignoring commas) in the raw value
    const rawOldValue = oldValue.replace(/,/g, "");
    const rawCursorPos = cursorPos - oldCommasBefore;
    
    // Count commas in the new value up to the same digit position
    let digitalCount = 0;
    let newPos = 0;
    
    // Walk through the new formatted string to find where our digit position should be
    for (let i = 0; i < newValue.length && digitalCount < rawCursorPos; i++) {
      if (newValue[i] !== ',') {
        digitalCount++;
      }
      newPos++;
    }

    if (cursorPos < 4 && digitalCount === 1) {
      return cursorPos+1;
    }
    
    return cursorPos > digitalCount * 3 + digitalCount ? cursorPos - 1 : cursorPos > digitalCount * 3 + digitalCount + 1 ? cursorPos - 2 : cursorPos;
  };

  const _onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const el = targetRef.current;
      if (!el) return;

      // Save selection positions and current value before any changes
      const cursorPos = el.selectionStart || 0;
      const oldValue = previousVal;

      const raw = e.target.value.replace(/,/g, "").replace(/^0+/, "0");
      const formatted = formatWithCommas(raw);
      
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
          
          // Calculate new cursor position
          const newCursorPos = calculateCursorPosition(oldValue, formatted, cursorPos);
          
          selectionRef.current = {
            start: newCursorPos,
            end: newCursorPos,
          };
          
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
    return Number.isNaN(_num) ? 0 : _num;
  }, [val]);

  useEffect(() => {
    onNumberChange?.(num);
  }, [num, onNumberChange]);

  useEffect(() => {
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
