import { DEFAULT_NETWORK, EXPLORER } from "@/app/config";
import React, { memo, useMemo } from "react";

type Props = Omit<JSX.IntrinsicElements["a"], "href"> & {
  objectId: string;
};

const ExplorerObjectLink = React.forwardRef<HTMLAnchorElement, Props>(
  function ExplorerObjectLink({ objectId, ...props }, ref) {
    const link = useMemo(() => {
      return `${EXPLORER.ADDRESS}/${DEFAULT_NETWORK}/object/${objectId}`;
    }, [objectId]);
    return (
      <a target="_blank" rel="noreferrer" {...props} ref={ref} href={link} />
    );
  },
);

export default memo(ExplorerObjectLink);
