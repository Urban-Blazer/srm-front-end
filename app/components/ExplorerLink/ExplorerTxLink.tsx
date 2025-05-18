import { DEFAULT_NETWORK, EXPLORER } from "@/app/config";
import React, { memo, useMemo } from "react";

type Props = Omit<JSX.IntrinsicElements["a"], "href"> & {
  txHash: string;
};

const ExplorerTxLink = React.forwardRef<HTMLAnchorElement, Props>(
  function ExplorerAccount({ txHash, ...props }, ref) {
    const link = useMemo(() => {
      return `${EXPLORER.ADDRESS}/${DEFAULT_NETWORK}/tx/${txHash}`;
    }, [txHash]);
    return (
      <a target="_blank" rel="noreferrer" {...props} ref={ref} href={link} />
    );
  },
);

export default memo(ExplorerTxLink);
