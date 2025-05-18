import tw from "@/app/utils/twmerge";
import React, { ReactNode, memo } from "react";

type Props = JSX.IntrinsicElements["input"] & {
  prefixSlot?: ReactNode;
  postfixSlot?: ReactNode;
  innerClassName?: string;
};
const Input = React.forwardRef<HTMLInputElement, Props>(function Input(
  { className, prefixSlot, postfixSlot, innerClassName, ...props },
  ref,
) {
  return (
    <div
      className={tw(
        "group transition-all px-6 h-12 bg-white focus-within:bg-skin-alt border border-transparent hover:border-iris-60 focus-within:!border-iris-100 caret-iris-100 flex items-center gap-2 font-medium text-sm/normal",
        className,
      )}
    >
      {prefixSlot}
      <input
        {...props}
        ref={ref}
        type="text"
        className={tw(
          "grow max-w-full h-full min-w-0 outline-none bg-transparent placeholder:text-gray-100 caret-inherit",
          innerClassName,
        )}
      />
      {postfixSlot}
    </div>
  );
});

export default memo(Input);
