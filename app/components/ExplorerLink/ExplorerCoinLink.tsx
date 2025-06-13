import { DEFAULT_NETWORK, EXPLORER } from "@/app/config";
import React, { memo, useMemo } from "react";

type Props = Omit<JSX.IntrinsicElements["a"], "href"> & {
  tokenId: string;
};

const ExplorerCoinLink = React.forwardRef<HTMLAnchorElement, Props>(
  function ExplorerCoin({ tokenId, ...props }, ref) {
    const link = useMemo(() => {
      return `${EXPLORER.ADDRESS}/${DEFAULT_NETWORK}/coin/${tokenId}`;
    }, [tokenId]);
    return (
      <a target="_blank" rel="noreferrer" {...props} ref={ref} href={link} />
    );
  },
);

export default memo(ExplorerCoinLink);
