import tw from "@/app/utils/twmerge";
import copyText from "copy-to-clipboard";
import { CopyIcon } from "lucide-react";
import { ReactNode, useCallback, useState } from "react";
type Props = {
  text?: string;
  copiedMsg?: string;
  children?: ReactNode;
  className?: string;
  copyHandler?: () => void | Promise<void>;
};
function CopyBtn({
  text,
  copiedMsg = "Copied!",
  children,
  className,
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
    <>
      {visibleTooltip && <span className="text-sm">{copiedMsg}</span>}
      {!visibleTooltip && (
        <button onClick={() => copy()} className={tw("hover: transition", className)}>
          {children || <CopyIcon className="w-4 h-4" />}
        </button>
      )}
    </>
  );
}

export default CopyBtn;
