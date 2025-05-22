import { memo } from "react";
import Avatar from ".";
type Props = Omit<Parameters<typeof Avatar>[0], "src" | "alt"> & {
  asset: string;
};
function AssetAvatar({ asset, ...props }: Props) {
  return (
    <Avatar
      src={asset && `./images/assets/${asset}.png`}
      alt={asset}
      {...props}
    />
  );
}

export default memo(AssetAvatar);
