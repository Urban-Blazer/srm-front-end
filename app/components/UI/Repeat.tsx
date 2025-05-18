import React, { useMemo } from "react";

type Props = {
  count?: number;
  children?: React.ReactNode;
};
function Repeat({ count, children }: Props) {
  const list = useMemo(() => {
    const data = [];
    for (let i = 0; i < (count || 1); i++) {
      data.push(children);
    }
    return data;
  }, [children, count]);
  return list;
}

export default Repeat;
