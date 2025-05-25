import tw from "@/app/utils/twmerge";
import React, { useMemo } from "react";

const baseBtnShadowClassName =
  "hover:shadow-[rgba(var(--tw-btn-theme-rgb,0_0_0)/0.1)]";

const baseClassName =
  "group overflow-hidden transition-all duration-300 ease-in-out bg-[--tw-btn-theme] active:bg-[--tw-btn-theme] border border-transparent active:shadow-none text-center disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-1 outline-none";

const baseOutlineClassName = "hover:bg-transparent border-[--tw-btn-theme]";

const baseInnerClassName =
  "transition-[background] duration-300 ease-in-out w-full h-full px-1.5 flex items-center justify-center truncate";

const sizeClasses = {
  lg: "h-13 font-bold text-lg hover:shadow-soft-2",
  md: "h-10 font-bold text-base rounded-[10px] hover:shadow-soft-2",
  sm: "h-8 font-bold text-xs/normal hover:shadow-soft-2",
  xs: "h-5 font-bold text-xs/normal rounded-[4px] hover:shadow-soft",
  full: "w-full py-3 font-semibold text-lg",
};

// Predefined variant styles
const variantClasses = {
  // Primary variant (buy - green gradient)
  primary: "bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] text-[#5E21A1] hover:opacity-75",
  
  // Secondary variant (sell - purple gradient)
  secondary: "bg-gradient-to-r from-[#5E21A1] from-10% via-[#6738a8] via-30% to-[#663398] to-90% text-[#61F98A] hover:opacity-75",
  
  // Disabled variant
  disabled: "bg-gray-500 cursor-not-allowed text-white",
  
  // Standard variants from original component
  standard: "",
};

type Props = JSX.IntrinsicElements["button"] & {
  size?: keyof typeof sizeClasses;
  theme?: keyof typeof themeClassName;
  variant?: keyof typeof variantClasses;
  innerClassName?: string;
  withOutline?: boolean;
  loading?: boolean;
  processing?: boolean;
  rounded?: boolean;
};

const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  {
    size = "lg",
    theme,
    variant = "standard",
    innerClassName,
    withOutline,
    className,
    children,
    loading,
    processing,
    rounded = true,
    ...rest
  },
  ref,
) {
  const btn = useMemo(() => {
    return tw(
      baseClassName,
      baseBtnShadowClassName,
      withOutline && baseOutlineClassName,
      sizeClasses[size],
      theme && themeClassName[theme],
      variant && variantClasses[variant],
      !rounded && "rounded-none",
      className,
    );
  }, [className, size, theme, variant, withOutline, rounded]);

  const inner = useMemo(() => {
    return tw(
      baseInnerClassName,
      withOutline && "bg-[--tw-btn-theme]",
      size === "lg" ? "rounded-[10px]" : "",
      innerClassName,
    );
  }, [innerClassName, size, withOutline]);

  // Determine content based on state
  const buttonContent = processing 
    ? "Processing..." 
    : loading
      ? <><span className="shink-0 mr-[1ch] inline-block w-[2ch] h-[2ch] border-[0.35ch] border-t-transparent border-current animate-spin"></span>{children}</>
      : children;

  return (
    <button type="button" {...rest} className={btn} ref={ref}>
      <span className={inner}>
        {buttonContent}
      </span>
    </button>
  );
});

const themeClassName = {
  primary:
    "btn-black-70 dark:btn-black-inverted-70 active:bg-black-100 hover:shadow-black-70/30 dark:hover:shadow-skin-base/50 text-white",
  green: "btn-green-80 dark:btn-green-inverted-80 text-skin-inverted",
  red: "btn-red-80 dark:btn-red-inverted-80 text-skin-inverted",
  none: "",
} as const;

export const BTN_THEME = themeClassName;
export const BTN_VARIANTS = variantClasses;
export default Button;
