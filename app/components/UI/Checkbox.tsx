import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import tw from "@/app/utils/twmerge";
// import { ICCheck } from "@/app/assets/icons";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    boxClassName?: string;
  }
>(({ className, boxClassName, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={tw(
      "peer group h-[1.125rem] w-[1.125rem] relative flex items-center justify-center focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <span
      className={tw(
        "transition-all absolute inset-0 h-full w-full rotate-45 shrink-0 border border-skin-base group-hover:border-iris-60 group-focus-visible:ring-1 group-data-[state=checked]:bg-iris-100 group-data-[state=checked]:border-transparent",
        boxClassName,
      )}
    ></span>
    <CheckboxPrimitive.Indicator
      className={tw("relative flex items-center justify-center text-current")}
    >
      {/* <ICCheck className="h-auto w-auto text-white" /> */}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
