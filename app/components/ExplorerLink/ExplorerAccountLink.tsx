import { DEFAULT_NETWORK, EXPLORER } from "@/app/config";
import React, { memo, useMemo } from "react";

type Props = Omit<JSX.IntrinsicElements["a"], "href"> & {
  account: string;
};

const ExplorerAccountLink = React.forwardRef<HTMLAnchorElement, Props>(
  function ExplorerAccount({ account, ...props }, ref) {
    const link = useMemo(() => {
      return `${EXPLORER.ADDRESS}/${DEFAULT_NETWORK}/account/${account}`;
    }, [account]);
    return (
      <a target="_blank" rel="noreferrer" {...props} ref={ref} href={link} />
    );
  },
);

export default memo(ExplorerAccountLink);
