import { Time } from "lightweight-charts";

export interface Coin {
  typeName: string;
  decimals: number;
  image?: string;
  name?: string;
  symbol?: string;
}

export interface ChartProps {
  poolId?: string;
  coinASymbol?: string; // "SUI" | "USDC"
  coinA?: Coin;
  coinB?: Coin;
  children?: React.ReactNode;
}

export interface RecentSwap {
  wallet: string;
  tokenin: any;
  amountin: number;
  tokenout: any;
  amountout: number;
  is_buy: boolean;
  reserve_a: number;
  reserve_b: number;
  timestamp: string;
}

export interface RecentTransactionsProps {
  poolId: string;
  websocketUrl: string;
  coinA: Coin;
  coinB: Coin;
}

export interface PoolStats {
  balance_a: number;
  balance_b: number;
  burn_fee: number;
  creator_royalty_fee: number;
  creator_royalty_wallet: string;
  locked_lp_balance: number;
  lp_builder_fee: number;
  reward_balance_a: number;
  rewards_fee: number;
}

export type IntervalType = "1m" | "5m" | "15m" | "1h" | "4h" | "24h";

export interface Stats {
  buyTx: number;
  buyVolume: number;
  sellTx: number;
  sellVolume: number;
  totalVolume: number;
  rewardsDistributed: number;
  burnedCoins: number;
  creatorRoyalty: number;
}

export type Candle = {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
};

export const rangeMap: Record<string, string> = {
  "1 hour": "1h",
  "6 hour": "6h",
  "12 hour": "12h",
  "24 hour": "24h",
  "7 day": "7d",
  "30 day": "30d",
  Lifetime: "lifetime",
};

export interface CoinMeta {
  decimals: number;
  image?: string;
  typeName: string;
  name: string;
  symbol: string;
  lists?: string[];
  socials?: {
    telegram?: string | null;
    x?: string | null;
    discord?: string | null;
    website?: string | null;
  };
}

export interface PoolSearchResult {
  poolId: string;
  coinA: CoinMeta;
  coinB: CoinMeta;
}

export interface SwapInterfaceProps {
  poolId: string | null;
  coinA: CoinMeta | null;
  coinB: CoinMeta | null;
  poolStats: PoolStats | null;
}

export interface PoolStats {
  balance_a: number;
  balance_b: number;
  burn_fee: number;
  creator_royalty_fee: number;
  creator_royalty_wallet: string;
  locked_lp_balance: number;
  lp_builder_fee: number;
  reward_balance_a: number;
  rewards_fee: number;
  total_lp_supply?: number;
}

export interface CoinMetadata {
  symbol: string;
  image: string;
  typeName: string;
  decimals: number;
}

export interface PoolMetadata {
  poolId: string;
  coinA_metadata: CoinMetadata;
  coinB_metadata: CoinMetadata;
}

export interface LPToken {
  objectId: string;
  type: string;
  balance: bigint;
  poolData: PoolMetadata;
  userCoinA: number;
  userCoinB: number;
}
