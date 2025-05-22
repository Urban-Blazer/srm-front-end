"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import tw from "@/app/utils/twmerge";
import { m } from "framer-motion";

const TooltipProvider: React.FC<
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>
> = (props) => <TooltipPrimitive.Provider delayDuration={0} {...props} />;

const Tooltip: React.FC<
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>
> = ({ children, ...props }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <TooltipPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      delayDuration={0}
      {...props}
    >
      <div onClick={() => setOpen(true)}>{children}</div>
    </TooltipPrimitive.Root>
  );
};

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={tw(
      "z-10 p-4 overflow-hidden rounded-[0.625rem] bg-[#252734] shadow-soft-2 shadow-skin-base/50 font-normal text-gray-100",
      className,
    )}
    {...props}
    asChild
  >
    <m.div
      initial="close"
      animate="open"
      exit="close"
      variants={{
        open: { opacity: 1, scale: 1 },
        close: { opacity: 0, scale: 0.8 },
      }}
    >
      {children}
    </m.div>
  </TooltipPrimitive.Content>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
