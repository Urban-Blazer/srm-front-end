import BigNumber from "bignumber.js";
import React, { memo, useMemo } from "react";
import { formatAmount } from "@/app/utils/bicarus/utils";

/**
 * Extended options interface used by the formatAmount function.
 * It now includes an optional 'notation' property.
 */
export interface FormatAmountOptions {
  /**
   * The number of decimals to display (default is 2).
   */
  precision?: number;
  /**
   * The display threshold for formatting small numbers.
   */
  displayThreshold?: number;
  /**
   * When true, token precision formatting is applied.
   */
  tokenPrecision?: boolean;
  /**
   * An optional notation parameter (e.g. 'standard') for formatting.
   */
  notation?: string;
}

export type TextAmtProps = {
  number?: BigNumber.Value | null;
  className?: string;
  decimalClassName?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  asPrice?: boolean;
  fallback?: string;
} & FormatAmountOptions;

function TextAmt({
  number,
  className,
  decimalClassName,
  prefix,
  suffix,
  asPrice,
  fallback = "-",
  ...options
}: TextAmtProps) {
  const [lt, intPart, decimalPart, sign] = useMemo(() => {
    if (number === null || number === undefined) {
      return [];
    }
    const num = new BigNumber(number).toNumber() || 0;
    const absNum = Math.abs(num);
    const [intPart, decimalPart] =
      formatAmount(absNum, {
        tokenPrecision: absNum > 0.0001,
        precision: asPrice
          ? absNum < 0.01
            ? 6
            : absNum < 1
              ? 5
              : absNum < 100
                ? 4
                : absNum < 1000
                  ? 3
                  : 2
          : absNum > 1
            ? 2
            : 4,
        displayThreshold: 0,
        ...options,
      })?.split(".") || [];
    return [
      intPart?.includes("<") ? "< " : "",
      intPart?.replace("< ", ""),
      decimalPart,
      num < 0 ? "-" : "",
    ];
  }, [asPrice, number, options]);

  const applyDecimalStyle = useMemo(() => {
    return decimalPart && /[0-9]+$/.test(decimalPart);
  }, [decimalPart]);

  if (number === undefined || number === null)
    return <span className={className}>{fallback}</span>;

  return (
    <span translate="no" className={className}>
      {lt}
      {sign}
      {prefix}
      <span>{intPart}</span>
      <span className={applyDecimalStyle ? decimalClassName ?? "" : ""}>
        {decimalPart ? "." + decimalPart : ""}
      </span>
      {suffix}
    </span>
  );
}

export default memo(TextAmt);
