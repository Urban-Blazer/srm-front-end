import BigNumber from "bignumber.js";

/**
 * The Percent class represents a percentage (or fraction) using a numerator and denominator.
 * This allows precise arithmetic operations (subtraction, multiplication, comparison) for percentage-based calculations,
 * which is useful for computing values such as slippage in token swaps.
 *
 * Example usage:
 *   const fullPercent = new Percent(100, 100);  // Represents 100%
 *   const slippage = new Percent(100, 100_000);   // Represents 0.1%
 *   const result = fullPercent.subtract(slippage) // 1 - 0.001 = 0.999
 *                           .multiply(amountOut)
 *                           .quotient.toNumber(); // Returns the numerical result
 */
export class Percent {
  private readonly _numerator: BigNumber;
  private readonly _denominator: BigNumber;

  /**
   * Constructs a new Percent instance.
   *
   * @param numerator - The numerator of the fraction, which can be a number or a BigNumber.
   * @param denominator - The denominator of the fraction, which can be a number or a BigNumber.
   *                      Defaults to 100, making new Percent(100) represent 100%.
   */
  constructor(numerator: number | BigNumber, denominator: number | BigNumber = 100) {
    this._numerator = BigNumber.isBigNumber(numerator) ? numerator : new BigNumber(numerator);
    this._denominator = BigNumber.isBigNumber(denominator) ? denominator : new BigNumber(denominator);
  }

  /**
   * Returns the quotient of the division (numerator / denominator),
   * which represents the internal numeric value of the fraction.
   */
  get quotient(): BigNumber {
    if (this._denominator.isZero()) {
      throw new Error("Division by zero in Percent");
    }
    return this._numerator.div(this._denominator);
  }

  /**
   * Subtracts another Percent instance from this Percent.
   * The subtraction is performed using fraction arithmetic:
   *   (a/b - c/d) = (a*d - c*b) / (b*d)
   *
   * @param other - Another Percent instance to subtract.
   * @returns A new Percent instance representing the result.
   */
  subtract(other: Percent): Percent {
    const newNumerator = this._numerator
      .multipliedBy(other._denominator)
      .minus(other._numerator.multipliedBy(this._denominator));
    const newDenominator = this._denominator.multipliedBy(other._denominator);
    return new Percent(newNumerator, newDenominator);
  }

  /**
   * Multiplies the current fraction by a scalar value.
   * This is useful to apply the percentage to a specific amount.
   *
   * @param value - A value (number or string) used to multiply the fraction.
   * @returns A new Percent instance representing the product, with a denominator of 1.
   */
  multiply(value: BigNumber.Value): Percent {
    const product = this.quotient.multipliedBy(value);
    return new Percent(product, 1);
  }

  /**
   * Compares whether this Percent instance is equal to another.
   *
   * @param other - The other Percent instance to compare.
   * @returns True if both represent the same percentage value.
   */
  equalTo(other: Percent): boolean {
    return this.quotient.isEqualTo(other.quotient);
  }

  /**
   * Compares the current value with another number or Percent instance to determine if it is greater.
   *
   * @param compare - A number or a Percent instance to compare against.
   * @returns True if the current value is greater.
   */
  greaterThan(compare: number | Percent): boolean {
    if (typeof compare === "number") {
      return this.quotient.gt(compare);
    } else {
      return this.quotient.gt(compare.quotient);
    }
  }

  /**
   * Returns the percentage formatted as a string with the specified number of decimals.
   * The fraction is multiplied by 100 to convert it into conventional percentage terms.
   *
   * @param decimals - The number of decimal places to include.
   * @returns The formatted percentage as a string.
   */
  toFixed(decimals: number): string {
    return this.quotient.multipliedBy(100).toFixed(decimals);
  }

  toBigNumber(): BigNumber {
    return this.quotient;
  }
}

/**
 * Options for formatting amounts.
 */
export interface FormatAmountOptions {
  /**
   * The number of decimals to display (default is 2).
   */
  precision?: number;
  /**
   * A display threshold. If provided and greater than 0, then if the value is below this threshold,
   * the function may display a less-than sign. If not provided (or 0), the minimum displayable value
   * is computed as 1 / (10^precision).
   */
  displayThreshold?: number;
  /**
   * If true, the function uses token precision formatting (normal behavior).
   * If false and the value is greater than 0 but lower than the minimum displayable value,
   * the function returns a string with a less-than sign.
   * Default is true.
   */
  tokenPrecision?: boolean;
}

/**
 * Formats a numerical amount into a string with the specified precision.
 *
 * When the value is greater than 0 but less than the minimum displayable value (computed either from the
 * provided displayThreshold or as 1 / (10^precision)) and tokenPrecision is false, the function returns
 * a string starting with '<' followed by the minimum displayable value.
 *
 * @param value - The numerical value to format.
 * @param options - Formatting options.
 * @returns A formatted string representing the amount.
 */
export function formatAmount(
  value: BigNumber.Value,
  options: FormatAmountOptions = {}
): string {
  // Convert the input value to a BigNumber for precise calculations.
  const num = new BigNumber(value);
  const numericValue = num.toNumber();

  // Set the number of decimals to display (default: 2)
  const precision = options.precision ?? 2;

  // Determine the minimum displayable value either via displayThreshold if provided (and > 0)
  // or calculate it as 1 / (10^precision).
  const minDisplay =
    options.displayThreshold && options.displayThreshold > 0
      ? options.displayThreshold
      : Math.pow(10, -precision);

  // Determine if token precision formatting is enabled (default: true)
  const tokenPrecision =
    options.tokenPrecision !== undefined ? options.tokenPrecision : true;

  // If the value is positive and lower than the minimum displayable value and tokenPrecision is disabled,
  // return a string with a less-than sign.
  if (numericValue > 0 && !tokenPrecision && numericValue < minDisplay) {
    return `<${minDisplay.toFixed(precision)}`;
  }

  // Otherwise, return the number formatted with the specified precision.
  return numericValue.toFixed(precision);
}
