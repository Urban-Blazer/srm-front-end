"use client";

import tw from "@/app/utils/twmerge";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { ScrollAreaScrollbarProps } from "@radix-ui/react-scroll-area";
import { m, PanInfo, useAnimation } from "framer-motion";
import * as React from "react";
import Button from "./Button";
import { ScrollArea, ScrollBar } from "./ScrollArea";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={tw("fixed inset-0 z-modal bg-black/70", className)}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sideClassNames = {
  top: "inset-x-0 top-0 rounded-b-2xl max-h-[100dvh]",
  bottom: "inset-x-0 bottom-0 rounded-t-2xl max-h-[100dvh]",
  left: "inset-y-0 left-0 h-full w-3/4 rounded-r-2xl sm:max-w-sm",
  right: "inset-y-0 right-0 h-full w-3/4 rounded-l-2xl sm:max-w-sm",
};
const sideControlClassNames = {
  top: "bottom-1 left-1/2 -translate-x-1/2 w-10 h-1",
  bottom: "top-1 left-1/2 -translate-x-1/2 w-10 h-1",
  left: "right-1 top-1/2 -translate-y-1/2 w-1 h-10",
  right: "left-1 top-1/2 -translate-y-1/2 w-1 h-10",
};

type SheetContentProps = React.ComponentPropsWithoutRef<
  typeof SheetPrimitive.Content
> & {
  side?: "top" | "bottom" | "left" | "right";
  animation?: boolean;
  onOpenChange?: (val: boolean) => void;
};

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      side = "bottom",
      animation = true,
      className,
      children,
      onOpenChange,
      ...props
    },
    ref,
  ) => {
    const control = useAnimation();
    React.useEffect(() => {
      console.log("side", side);
      console.log("animation", animation);
      console.log("control", control);
      setTimeout(() => {
        control.start("open");
      }, 100);
    }, [animation, control, side]);
    return (
      <SheetPortal forceMount={props.forceMount}>
        <SheetOverlay
          forceMount={props.forceMount}
          asChild
          onClick={() => onOpenChange?.(false)}
        >
          <m.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        </SheetOverlay>
        <SheetPrimitive.Content
          ref={ref}
          className={tw(
            "bg-black fixed z-modal p-6 shadow-lg outline-none overflow-auto",
            "grid grid-cols-1 grid-rows-[auto_auto_minmax(0,1fr)_auto]",
            sideClassNames[side],
            className,
          )}
          {...props}
          autoFocus={false}
          asChild
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <m.div
            initial={side}
            animate={control}
            exit={side}
            variants={{
              open: { x: 0, y: 0 },
              top: { x: 0, y: "-100%" },
              bottom: { x: 0, y: 0 },
              left: { x: "-100%", y: 0 },
              right: { x: "100%", y: 0 },
            }}
            transition={{ duration: 0.5 }}
            className="transition-all duration-500"
          >
            <m.div
              className={tw(
                "absolute bg-gray-20",
                sideControlClassNames[side],
              )}
            ></m.div>
            {children}
          </m.div>
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetCloseEsc = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Close>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Close
    ref={ref}
    className={tw("shrink-0 text-sm text-muted-foreground", className)}
    {...props}
    asChild
  >
    <Button
      className="btn-gray-20 dark:btn-gray-inverted-20 font-bold text-sm/none h-6 w-12"
      innerClassName="h-6"
      size="xs"
    >
      ESC
      <span className="sr-only">Close</span>
    </Button>
  </SheetPrimitive.Close>
));
SheetCloseEsc.displayName = "SheetCloseEsc";

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={tw(
      "pb-4 flex justify-between border-b border-b-gray-20",
      className,
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={tw(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetBody = ({
  className,
  orientation = "vertical",
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  Pick<ScrollAreaScrollbarProps, "orientation">) => (
  <ScrollArea
    className={tw(
      orientation === "vertical" ? "-mx-6 px-6" : "-my-6 py-6",
      className,
    )}
  >
    <div {...props} />
    <ScrollBar orientation={orientation} />
  </ScrollArea>
);
SheetBody.displayName = "SheetBody";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={tw("text-base font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={tw("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetCloseEsc,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger
};

