// import { ICChevronDown } from "@/app/assets/icons";
import tw from "@/app/utils/twmerge";
import * as RadixAccordion from "@radix-ui/react-accordion";
import React from "react";

const Accordion = React.forwardRef<
  HTMLDivElement,
  RadixAccordion.AccordionSingleProps | RadixAccordion.AccordionMultipleProps
>(function Accordion({ className, ...props }, forwardRef) {
  return (
    <RadixAccordion.Root
      {...props}
      className={tw("outline-none", className)}
      ref={forwardRef}
    />
  );
});

export const AccordionContent = React.forwardRef<
  HTMLDivElement,
  RadixAccordion.AccordionContentProps & { collapsedAnimate?: boolean }
>(function Accordion(
  { className, children, collapsedAnimate = true, ...props },
  forwardRef,
) {
  return (
    <RadixAccordion.Content
      {...props}
      className={tw(
        "outline-none pb-4",
        collapsedAnimate &&
          "data-[state=open]:animate-rdxAccordionExpand data-[state=closed]:animate-rdxAccordionCollapsed",
        className,
      )}
      ref={forwardRef}
    >
      {children}
    </RadixAccordion.Content>
  );
});

export const AccordionItem = React.forwardRef<
  HTMLDivElement,
  RadixAccordion.AccordionItemProps
>(function AccordionItem({ children, className, ...props }, forwardedRef) {
  return (
    <RadixAccordion.Item
      {...props}
      className={tw(
        "group overflow-hidden bg-gray-20 first:mt-0 focus-within:relative focus-within:z-10 outline-none",
        className,
      )}
      ref={forwardedRef}
    >
      {children}
    </RadixAccordion.Item>
  );
});

interface AccordionTriggerProps extends RadixAccordion.AccordionTriggerProps {
  iconClassName?: string;
}
export const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps
>(function AccordionTrigger(
  { children, className, iconClassName, ...props },
  forwardedRef,
) {
  return (
    <RadixAccordion.Header className="flex font-bold text-sm/normal">
      <RadixAccordion.Trigger
        {...props}
        className={tw(
          "w-full px-6 py-4 outline-none flex justify-between text-left focus-visible:shadow-[inset_0_0_0_1px]",
          className,
        )}
        ref={forwardedRef}
      >
        {children}
        {/* <ICChevronDown
          className={tw(
            "shrink-0 w-5 h-auto transition-transform duration-300 group-data-[state=open]:rotate-180",
            iconClassName,
          )}
          aria-hidden
        /> */}
      </RadixAccordion.Trigger>
    </RadixAccordion.Header>
  );
});

export default Accordion;
