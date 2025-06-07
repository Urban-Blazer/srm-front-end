import { predefinedCoins } from "@data/coins";
import { SUI_SHORT_ID, SUI_LONG_ID } from "../config";
import { CoinMeta } from "../types";

export function normalizeTokenId(tokenId: string) {
  return tokenId.toLowerCase() === SUI_SHORT_ID.toLowerCase() ? SUI_LONG_ID : tokenId;
}

export function denormalizeTokenId(tokenId: string) {
  return tokenId.toLowerCase() === SUI_LONG_ID.toLowerCase() ? SUI_SHORT_ID : tokenId;
}

export function checkIsSui(tokenId: string) {
  return tokenId.toLowerCase() === SUI_LONG_ID.toLowerCase() || tokenId.toLowerCase() === SUI_SHORT_ID.toLowerCase();
}

export function getStaticTokenById(tokenId: string, coins: CoinMeta[]): CoinMeta | undefined {
  return coins.find((coin) => normalizeTokenId(coin.typeName) === normalizeTokenId(tokenId)); 
}
