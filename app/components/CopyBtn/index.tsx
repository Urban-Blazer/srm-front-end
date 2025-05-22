import * as PopoverPrimitive from "@radix-ui/react-popover";
import { AnimatePresence, m } from "framer-motion";
import { ReactNode, useCallback, useState } from "react";
import copyText from "copy-to-clipboard";
type Props = {
  text?: string;
  copiedMsg?: string;
  children?: ReactNode;
  className?: string;
  asChild?: boolean;
  copyHandler?: () => void | Promise<void>;
};
function CopyBtn({
  text,
  copiedMsg = "Copied!",
  children,
  className,
  asChild,
  copyHandler,
}: Props) {
  const [visibleTooltip, setVisibleTooltip] = useState(false);
  const copy = useCallback(async () => {
    if (typeof copyHandler === "function") {
      await copyHandler();
    } else {
      copyText(text || "");
    }
    setVisibleTooltip(true);
    setTimeout(() => setVisibleTooltip(false), 2000);
  }, [copyHandler, text]);
  return (
    <PopoverPrimitive.Root open={visibleTooltip}>
      <PopoverPrimitive.Trigger
        asChild={asChild}
        onClick={copy}
        className={className}
      >
        {children}
      </PopoverPrimitive.Trigger>
      <AnimatePresence>
        {visibleTooltip && (
          <PopoverPrimitive.Content
            forceMount
            side="top"
            sideOffset={8}
            className="z-[1]"
          >
            <m.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                closed: {
                  scale: 0,
                  opacity: 0,
                  y: 10,
                },
                open: { scale: 1, opacity: 1, y: 0 },
              }}
              className="px-4 py-2 backdrop-blur-lg font-bold bg-skin-card/80 border border-iris-20 dark:border-skin-base text-xs/normal text-skin-base"
            >
              {copiedMsg}
            </m.div>
          </PopoverPrimitive.Content>
        )}
      </AnimatePresence>
    </PopoverPrimitive.Root>
  );
}

export default CopyBtn;
