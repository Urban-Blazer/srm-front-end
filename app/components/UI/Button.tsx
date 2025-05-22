import tw from "@/app/utils/twmerge";
import React, { useMemo } from "react";
const baseBtnShadowClassName =
  "hover:shadow-[rgba(var(--tw-btn-theme-rgb,0_0_0)/0.1)]";
const baseClassName =
  "group overflow-hidden transition-all duration-300 ease-in-out bg-[--tw-btn-theme] active:bg-[--tw-btn-theme] border border-transparent active:shadow-none text-center disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-1 outline-none";
const baseOutlineClassName = "hover:bg-transparent border-[--tw-btn-theme]";
const baseInnerClassName =
  "transition-[background] duration-300 ease-in-out w-full h-full px-1.5 flex items-center justify-center truncate";
const sizeClasses = {
  lg: "h-13 font-bold text-lg hover:shadow-soft-2",
  md: "h-10 font-bold text-base rounded-[10px] hover:shadow-soft-2",
  sm: "h-8 font-bold text-xs/normal hover:shadow-soft-2",
  xs: "h-5 font-bold text-xs/normal rounded-[4px] hover:shadow-soft",
};
type Props = JSX.IntrinsicElements["button"] & {
  size?: keyof typeof sizeClasses;
  theme?: keyof typeof themeClassName;
  innerClassName?: string;
  withOutline?: boolean;
  loading?: boolean;
};
const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  {
    size = "lg",
    theme,
    innerClassName,
    withOutline,
    className,
    children,
    loading,
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
      className,
    );
  }, [className, size, theme, withOutline]);
  const inner = useMemo(() => {
    return tw(
      baseInnerClassName,
      withOutline && "bg-[--tw-btn-theme]",
      size === "lg" ? "rounded-[10px]" : "",
      innerClassName,
    );
  }, [innerClassName, size, withOutline]);
  return (
    <button type="button" {...rest} className={btn} ref={ref}>
      <span className={inner}>
        {loading && (
          <span className="shink-0 mr-[1ch] inline-block w-[2ch] h-[2ch] border-[0.35ch] border-t-transparent border-current animate-spin"></span>
        )}
        {children}
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
export default Button;
