import Avatar from "@/app/components/Avatar";
import ExplorerTokenLink from "@/app/components/ExplorerLink/ExplorerTokenLink";
import TextAmt from "@/app/components/TextAmt";
import { TokenAmount } from "@/app/types/token";
import { formatBalance } from "@/app/utils/number";
import { formatAddress } from "@mysten/sui/utils";

type Props = {
  item: TokenAmount;
  onClick: (item: TokenAmount) => void;
};

function TokenItem({ item, onClick }: Props) {
  return (
    <button
      className="h-12 w-full flex items-center justify-between gap-2 p-2 py-8 mb-1 bg-[#000306] rounded-none hover:bg-[#000306]/80 transition-colors"
      onClick={() => onClick(item)}
    >
      <div className="flex items-center gap-2">
        <Avatar
          src={item.token.image || ""}
          alt={item.token.symbol}
          className="w-6 aspect-square rounded-full h-full token-icon"
        />
        <div className="flex flex-col items-start gap-1">
          <span className="truncate">{item.token.symbol}</span>
          <span className="truncate text-2xs/none font-normal text-gray-100">
            {item.token.name.length > 10 ? item.token.name.slice(0, 10) + "..." : item.token.name}
          </span>
        </div>
      </div>
      <div className="flex flex-col justify-end gap-1 items-end">
        <TextAmt
          number={formatBalance(item.amount, item.token.decimals ?? 0)}
        />
        <ExplorerTokenLink
          tokenId={item.token.typeName}
          className="flex items-center gap-1 truncate text-2xs/none font-normal text-gray-100 hover:text-[#fff]/80 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <span>{formatAddress(item.token.typeName)}</span>
          {/* <ICExport className="w-2.5 aspect-square" /> */}
        </ExplorerTokenLink>
      </div>
    </button>
  );
}

export default TokenItem;
