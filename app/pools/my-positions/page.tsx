"use client";
import { LPToken, PoolMetadata, PoolStats } from "@/app/types";
import { logger } from "@/app/utils/logger";
import { BurnLPPositionCard } from "@components/BurnLPPositionCard";
import { LPPositionCard } from "@components/LPPositionCard";
import {
  useCurrentAccount,
  useCurrentWallet
} from "@mysten/dapp-kit";
import { SuiClient } from "@mysten/sui.js/client";
import { useCallback, useEffect, useState } from "react";
import { DEX_MODULE_NAME, GETTER_RPC, PACKAGE_ID } from "../../config";
import { RefreshCw } from "lucide-react";
import Button from "@components/UI/Button";
import { Spinner } from "@components/Spinner";

const provider = new SuiClient({ url: GETTER_RPC });

export default function MyPositions() {
  const wallet = useCurrentWallet()?.currentWallet;
  const account = useCurrentAccount();
  const walletConnected = !!wallet && !!account;
  const [lpTokens, setLpTokens] = useState<LPToken[]>([]);
  const [loading, setLoading] = useState(false);



  // Fetch pool metadata from API
  const fetchPoolMetadata = async (
    tokenPair: string
  ): Promise<PoolMetadata | null> => {
    try {
      const poolResponse = await fetch(
        `/api/get-pool-id?tokenPair=${tokenPair}`
      );
      if (!poolResponse.ok) {
        logger.error(`Failed to fetch pool data: ${poolResponse.status}`);
        return null;
      }
      return await poolResponse.json();
    } catch (error) {
      logger.error("Error fetching pool metadata:", error);
      return null;
    }
  };

  // Filter objects by LP type
  const filterLPObjects = (objects: any[]) => {
    return objects.filter((obj) => {
      const type = obj.data?.type;
      return type && type.includes(`${PACKAGE_ID}::${DEX_MODULE_NAME}::LP<`);
    });
  };

  // Fetch all LP tokens for the connected wallet
  const fetchLPTokens = useCallback(async () => {
    if (!walletConnected || !account?.address) {
      logger.error("Please connect your wallet first.");
      return;
    }

    setLoading(true);

    try {
      logger.info("Fetching LP tokens for wallet:", account?.address);
      let cursor: string | null | undefined = undefined;
      let ownedObjects: any[] = [];

      // Get all owned objects
      while (true) {
        logger.info("Fetching owned objects...");
        await new Promise((resolve) => setTimeout(resolve, 350));
        const {
          data: ownedObjectsPage,
          hasNextPage,
          nextCursor,
        } = await provider.getOwnedObjects({
          owner: account?.address,
          options: { showType: true, showContent: true },
          cursor,
        });

        ownedObjects = [...ownedObjects, ...ownedObjectsPage];
        if (!hasNextPage) break;
        cursor = nextCursor;
      }

      logger.info(`Found ${ownedObjects.length} owned objects`);

      // Filter LP objects first for efficiency
      const lpObjects = filterLPObjects(ownedObjects);
      logger.info(`Found ${lpObjects.length} LP objects`);

      if (lpObjects.length === 0) {
        setLpTokens([]);
        setLoading(false);
        return;
      }

      // Extract LP tokens with detailed metadata
      const lpTokens = await Promise.all(
        lpObjects.map(async (obj) => {
          const rawType = obj.data?.type;

          // Extract CoinA and CoinB from LP type
          const lpMatch = rawType.match(/LP<([^,]+),\s?([^>]+)>/);
          if (!lpMatch) return null;

          const coinA = lpMatch[1].trim();
          const coinB = lpMatch[2].trim();
          const tokenPair = `${coinA}-${coinB}`;

          logger.info(`Processing LP token: ${tokenPair}`);

          try {
            // Fetch Pool Metadata
            const poolData = await fetchPoolMetadata(tokenPair);
            if (!poolData?.poolId) return null;

            // Fetch Pool Stats
            const poolStats = await fetchPoolStats(poolData.poolId);
            if (!poolStats) return null;

            // Calculate user's ownership share
            const userLpBalance = obj.data?.content?.fields?.balance
              ? BigInt(obj.data?.content?.fields?.balance)
              : BigInt(0);

            const totalLpSupply = BigInt(poolStats.total_lp_supply || 0);
            const balanceA = BigInt(poolStats.balance_a || 0);
            const balanceB = BigInt(poolStats.balance_b || 0);

            const ownershipPercentage =
              totalLpSupply > 0
                ? Number(userLpBalance) / Number(totalLpSupply)
                : 0;

            const coinADecimals = poolData.coinA_metadata?.decimals ?? 9;
            const coinBDecimals = poolData.coinB_metadata?.decimals ?? 9;

            const userCoinA =
              (ownershipPercentage * Number(balanceA)) /
              Math.pow(10, coinADecimals);
            const userCoinB =
              (ownershipPercentage * Number(balanceB)) /
              Math.pow(10, coinBDecimals);

            return {
              objectId: obj.data?.objectId,
              type: rawType,
              balance: userLpBalance,
              poolData: poolData,
              userCoinA: userCoinA,
              userCoinB: userCoinB,
            };
          } catch (apiError) {
            logger.error("Error processing LP token:", apiError);
            return null;
          }
        })
      );

      // Filter out null values
      const validLpTokens = lpTokens.filter(Boolean) as LPToken[];
      logger.info(`Found ${validLpTokens.length} valid LP tokens`);

      setLpTokens(validLpTokens);
    } catch (error: any) {
      logger.error("Error fetching LP tokens:", error);
    } finally {
      setLoading(false);
    }
  }, [walletConnected, account?.address]);

  // Fetch pool statistics including balances and LP supply
  const fetchPoolStats = async (
    poolObjectId: string
  ): Promise<PoolStats | null> => {
    if (!poolObjectId) {
      logger.error("Invalid pool object ID");
      return null;
    }

    logger.info("Fetching pool stats for:", poolObjectId);

    try {
      const poolObject = await provider.getObject({
        id: poolObjectId,
        options: { showContent: true },
      });

      if (!poolObject?.data?.content) {
        logger.error("Pool object data is missing or invalid");
        return null;
      }

      const fields = (poolObject.data.content as any).fields;
      if (!fields) {
        logger.warn("Missing pool fields in response");
        return null;
      }

      return {
        balance_a: Number(fields.balance_a || 0),
        balance_b: Number(fields.balance_b || 0),
        burn_fee: Number(fields.burn_fee || 0),
        creator_royalty_fee: Number(fields.creator_royalty_fee || 0),
        creator_royalty_wallet: fields.creator_royalty_wallet || "",
        locked_lp_balance: Number(fields.locked_lp_balance || 0),
        lp_builder_fee: Number(fields.lp_builder_fee || 0),
        reward_balance_a: Number(fields.reward_balance_a || 0),
        rewards_fee: Number(fields.rewards_fee || 0),
        total_lp_supply: Number(fields.lp_supply?.fields?.value || 0),
      };
    } catch (error) {
      logger.error("Error fetching pool stats:", error);
      return null;
    }
  };

  useEffect(() => {
    if (walletConnected && account?.address) {
      fetchLPTokens();
    }
  }, [fetchLPTokens, walletConnected, account?.address]);

  // LP Position Card component to improve readability

  return (
    <div className="flex flex-col items-center min-h-[80vh] p-4 md:p-6 pt-20 pb-20 text-slate-100 bg-[#000306]">
      <h1 className="pt-10 text-2xl md:text-3xl font-bold mb-6 text-center">
        MY LP POSITIONS
      </h1>

      {!walletConnected ? (
        <div className="text-center max-w-md mx-auto bg-[#130e18] p-6 border border-slate-700 rounded-none">
          <p className="text-slate-300 mb-4">
            <strong>Connect your wallet to view your LP positions.</strong>
          </p>
          <p className="text-slate-400 text-sm">
            Your active liquidity positions will appear here after connecting.
          </p>
        </div>
      ) : (
        <>
          <Button
            variant={loading ? "standard" : "primary"}
            size="lg"
            onClick={fetchLPTokens}
            disabled={loading}
            className="px-4 py-2 rounded-none text-sm font-semibold"
          >
            {loading ? <Spinner /> : <RefreshCw />}
          </Button>

          {/* Display LP Positions */}
          <div className="w-full max-w-3xl mt-8 px-2 md:px-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#130e18] border border-slate-700 rounded-none">
                <LoadingSpinner />
                <p className="text-slate-300 mt-4">
                  Loading your liquidity positions...
                </p>
              </div>
            ) : lpTokens.length > 0 ? (
              lpTokens.map((lp) => (
                <div key={lp.objectId}>
                  <LPPositionCard
                    key={lp.objectId}
                    lp={lp}
                    fetchLPTokens={fetchLPTokens}
                    setLoading={setLoading}
                  >
                    <BurnLPPositionCard
                      key={lp.objectId}
                      lp={lp}
                    />
                  </LPPositionCard>
                </div>
              ))
            ) : (
              <div className="text-center p-8 bg-[#130e18] border border-slate-700 rounded-none">
                <p className="text-slate-300 mb-3">
                  <strong>No LP positions found</strong>
                </p>
                <p className="text-slate-400 text-sm">
                  You don&apos;t have any active liquidity positions yet.
                </p>
                <a
                  href="/pools"
                  className="inline-block mt-4 px-4 py-2 rounded-none text-sm font-semibold bg-gradient-to-r from-[#07a654] from-10% via-[#61f98a] via-30% to-[#07a654] to-90% text-[#000306] hover:text-[#5E21A1] hover:opacity-75"
                >
                  Browse Pools
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
// Loading spinner component for better UX
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#61F98A]"></div>
  </div>
);
