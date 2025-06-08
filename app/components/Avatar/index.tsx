/* eslint-disable @next/next/no-img-element */
import tw from "@/app/utils/twmerge";

import { memo, useEffect, useMemo, useState } from "react";
type Props = JSX.IntrinsicElements["span"] &
  Partial<Pick<HTMLImageElement, "src" | "alt">> & {
    imageClassName?: string;
  };
function Avatar({ src, alt, imageClassName, ...props }: Props) {
  const [error, setError] = useState(false);
  const className = useMemo(() => {
    return tw(
      "relative w-full h-full overflow-hidden bg-stake-dark-300",
      props.className,
    );
  }, [props.className]);
  useEffect(() => {
    setError(false);
  }, [src]);
  return (
    <span {...props} className={className}>
      {src && !error && (
        <img
          src={src}
          alt={alt || ""}
          className={tw("w-full h-full", className)}
          style={{ objectFit: "cover" }}
          onError={() => setError(true)}
        />
      )}
    </span>
  );
}

export default memo(Avatar);
