
import { FC } from 'react';
import useHolders, { Holder } from '../hooks/useHolders';
import usePairStats from '../hooks/usePairStats';
import { SRM_COIN_SUPPLY } from '../config';
import { Spinner } from './Spinner';

interface HoldersProps {
  coinType: string;
  poolId: string;
}

const shortenAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const formatNumber = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const Holders: FC<HoldersProps> = ({ coinType, poolId }) => {
    const {pairStats: statsLifetime, isLoading: isStatsLifetimeLoading} = usePairStats(poolId!, "lifetime");
  const { holders, isLoading, error } = useHolders(coinType);

  return (
    <div className="w-full">
      <div className="overflow-x-auto overflow-y-auto max-h-80 min-w-full">
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <p className="text-red-400 text-sm text-left">Failed to load holders</p>
        ) : !holders || holders.length === 0 ? (
          <p className="text-sm text-left">No holders found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase">
                <th className="py-1 px-4 text-left">#</th>
                <th className="py-1 px-4 text-left">Address</th>
                <th className="py-1 px-4 text-left">Quantity</th>
                <th className="py-1 px-4 text-left">% of Supply</th>
              </tr>
            </thead>
            <tbody>
              {holders.map((holder: Holder, idx: number) => (
                <tr key={holder.account} className="">
                  <td className="py-1 px-4 text-left">{idx + 1}</td>
                  <td className="py-1 px-4 text-left">
                    <a
                      href={`https://suiscan.xyz/mainnet/account/${holder.account}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      {shortenAddress(holder.account)}
                    </a>
                  </td>
                  <td className="py-1 px-4 text-left">
                    {formatNumber(Number(holder.balance))}
                  </td>
                  <td className="py-1 px-4 text-left">
                    {Number(holder.percentage) > 0 ? (holder.percentage * 100).toFixed(2) : ((Number(holder.balance) / ((SRM_COIN_SUPPLY - (statsLifetime?.burnedCoins ?? 5)) / 10**9))*100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Holders;
