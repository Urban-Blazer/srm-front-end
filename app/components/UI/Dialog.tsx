import tw from "@/app/utils/twmerge";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { m } from "framer-motion";
import * as React from "react";
import Button from "./Button";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      {...props}
      className={tw(
        "fixed inset-0 z-modal bg-black-80/10 dark:bg-[#030310]/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
    />
  );
});
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Content
    {...props}
    ref={ref}
    className={tw(
      "fixed left-1/2 top-1/2 z-modal -translate-x-1/2 -translate-y-1/2 outline-none",
      "p-12 grid w-full max-w-lg md:w-full gap-4 border border-transparent bg-skin-card shadow-soft-3  shadow-skin-alt dark:shadow-skin-alt/10",
      className,
    )}
  />
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={tw("flex text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
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
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={tw(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={tw("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

const DialogCloseEsc = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.DialogClose>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.DialogClose>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.DialogClose
    ref={ref}
    className={tw("text-sm text-muted-foreground", className)}
    {...props}
    asChild
  >
    <Button
      className="btn-gray-20 dark:btn-gray-inverted-20 font-bold text-sm/none h-6 w-12"
      innerClassName="h-6"
      size="xs"
    >
      ESC
    </Button>
  </DialogPrimitive.DialogClose>
));
DialogCloseEsc.displayName = "DialogCloseEsc";

const DialogContentDefault = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(function DialogContentDefault(
  { className, children, asChild, ...props },
  ref,
) {
  return (
    <DialogPortal forceMount={props.forceMount}>
      <DialogOverlay forceMount={props.forceMount} asChild>
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        ></m.div>
      </DialogOverlay>
      <DialogContent ref={ref} className={tw(className)} {...props} asChild>
        {asChild ? (
          children
        ) : (
          <m.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={{
              open: { scale: 1, opacity: 1, x: "-50%", y: "-50%" },
              closed: { scale: 0.5, opacity: 0, x: "-50%", y: "-50%" },
            }}
          >
            {children}
          </m.div>
        )}
      </DialogContent>
    </DialogPortal>
  );
});

export {
  Dialog,
  DialogCloseEsc,
  DialogContent,
  DialogContentDefault,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
