import { predefinedCoins } from "@data/coins";
import { SUI_SHORT_ID, SUI_LONG_ID } from "../config";
import { CoinMeta } from "../types";

export function normalizeTokenId(tokenId: string) {
  return tokenId === SUI_SHORT_ID ? SUI_LONG_ID : tokenId;
}

export function denormalizeTokenId(tokenId: string) {
  return tokenId === SUI_LONG_ID ? SUI_SHORT_ID : tokenId;
}

export function checkIsSui(tokenId: string) {
  return tokenId === SUI_LONG_ID || tokenId === SUI_SHORT_ID;
}

export function getStaticTokenById(tokenId: string): CoinMeta | undefined {
  return predefinedCoins.find((coin) => coin.typeName === tokenId); 
}
