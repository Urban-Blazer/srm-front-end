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
  xl: "w-full h-10 px-2 font-semibold hover:shadow-soft-2",
  lg: "h-12 px-2 font-bold hover:shadow-soft-2",
  md: "h-8 px-1 font-bold text-base hover:shadow-soft-2",
  sm: "h-8 font-bold text-xs/normal hover:shadow-soft-2",
  xs: "h-5 font-bold text-xs/normal rounded-[4px] hover:shadow-soft",
  full: "w-full py-3 font-semibold text-lg",
};

// className="bg-[#000306] ml-auto rounded-none text-white border border-[#5E21A1] hover:text-red-400 text-xs px-2 py-1"
// Predefined variant styles
const variantClasses = {
  // Primary variant (buy - green gradient)
  primary: "bg-[#61F98A] text-gray-900 hover:border hover:border-[#61F98A] hover:text-[#61F98A] hover:bg-transparent disabled:bg-[#61F98A] disabled:text-gray-900",
  primarySoftDisable: "bg-[#61F98A] text-gray-900 hover:border hover:border-[#5E21A1] hover:text-[#5E21A1] hover:bg-transparent disabled:opacity-100 disabled:bg-[#61F98A] disabled:text-gray-900",
  
  // Secondary variant (sell - purple gradient)
  secondary: "bg-[#5E21A1] text-white hover:border hover:border-[#5E21A1] hover:text-[#5E21A1] hover:bg-transparent disabled:bg-[#5E21A1] disabled:text-white",
  secondarySoftDisable: "bg-[#5E21A1] text-white hover:border hover:border-[#5E21A1] hover:text-[#5E21A1] hover:bg-transparent disabled:opacity-100 disabled:bg-[#5E21A1] disabled:text-white",
  
  // Disabled variant
  disabled: "bg-gray-500 cursor-not-allowed text-white",
  
  // Standard variants from original component
  standard: "",

  default: "bg-[--tw-btn-theme] text-white hover:bg-[--tw-btn-theme]/80  hover:border hover:border-[#5E21A1] hover:text-[#5E21A1] hover:bg-transparent",
  buyDefault: "hover:border hover:border-[#61f98a] hover:text-[#61f98a] hover:bg-transparent disabled:opacity-100 disabled:bg-[#61F98A] disabled:text-[#61f98a]",
  sellDefault: "hover:border hover:border-[#5E21A1] hover:text-[#5E21A1] hover:bg-transparent disabled:opacity-100 disabled:bg-[#5E21A1] disabled:text-[#5E21A1]",
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
      ? <><span className="shink-0 mr-[1ch] inline-block w-[2ch] h-[2ch] border-[0.35ch] border-t-transparent border-current animate-spin"></span>{typeof children === "string" ? children.toUpperCase() : children}</>
      : typeof children === "string" ? children.toUpperCase() : children;

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
