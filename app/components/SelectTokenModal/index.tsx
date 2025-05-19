"use client";

import Avatar from "@/app/components/Avatar";
import EmptyData from "@/app/components/EmptyData/EmptyData";
import { isMobileAtom } from "@/app/data/layout.atom";
import { Dialog, DialogContent, styled } from "@mui/material";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useRouter } from 'next/navigation';

import Input from "@/app/components/UI/Input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/app/components/UI/Sheet";
import { predefinedCoins } from "@/app/data/coins";
import useAgTokens from "@/app/hooks/useAgTokens";
import { usePools } from "@/app/hooks/usePools";
import { Token as AppToken, CoinMeta, PoolSearchResult } from "@/app/types";
import { TokenAmount } from "@/app/types/token";
import { getStaticTokenById } from "@/app/utils/token";
import { isBuyAtom } from "@data/store";
import { AnimatePresence } from "framer-motion";
import { useAtom, useAtomValue } from "jotai";
import uniqBy from "lodash/uniqBy";
import { SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { VList } from "virtua";
import TokenItem from "./TokenItem";
import Repeat from "@components/UI/Repeat";
import { Skeleton } from "@components/UI/Skeleton";

// Helper function to map AppToken to StaticToken
const mapAppTokenToStaticToken = (appToken: AppToken): CoinMeta => {
  const existingStaticToken = getStaticTokenById(appToken.typeName);
  if (existingStaticToken) {
    return existingStaticToken;
  }
  return {
    typeName: appToken.typeName,
    decimals: appToken.decimals,
    image: appToken.image,
    name: appToken.name,
    symbol: appToken.symbol,
  };
};

type Props = {
  className?: string;
  token: CoinMeta | undefined; // Changed from PoolSearchResult
  pivotTokenId: string;
  accountBalancesObj: Record<string, string> | undefined;
  isIn: boolean;
};

function SelectTokenModal({
  className,
  token,
  pivotTokenId,
  accountBalancesObj,
  isIn,
}: Props) {
  const isMobile = useAtomValue(isMobileAtom);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debounceSearchTerm] = useDebounce(searchTerm, 200);
  const { set: supportedTokenSet, list: supportedTokenList } = useAgTokens();
  const { data: pools, isPending: poolsPending, error: poolsError } = usePools();

  const [isBuy, setIsBuy] = useAtom(isBuyAtom);

  const handleTokenSelect = (token: CoinMeta) => {
    if(!pools){
      console.error('No pools found');
      return;
    }
    console.log('pools', pools); 
    console.log('token', token); 
    console.log('pivotTokenId', pivotTokenId, isIn); 
    const selectedCoinA = pools?.find(pool => {
      return pool.coinA.typeName === token.typeName;
    });
    console.log('selectedCoinA', selectedCoinA);
    if(selectedCoinA){
      setIsBuy(isIn ? true : false);
      router.push(`/swap/${selectedCoinA.coinA.symbol}/${selectedCoinA.coinB.symbol}`);
    }
    const selectedCoinB = pools?.find(pool => {
      return pool.coinB.typeName === token.typeName;
    });
    console.log('selectedCoinB', selectedCoinB);
    if(selectedCoinB){
      setIsBuy(isIn ? false : true);
      router.push(`/swap/${selectedCoinB.coinA.symbol}/${selectedCoinB.coinB.symbol}`);
    }
    if(!selectedCoinA && !selectedCoinB){
      console.error('Token not found in pools');
    }
    setOpen(false);
    };


  const tokenBalances: TokenAmount[] = useMemo(() => {
    if (!debounceSearchTerm) {
      // default tokens
      let tokens: CoinMeta[] = [...predefinedCoins];
      // let tokens = [...DEFAULT_AG_TOKENS];

      // tokens from account balances
      if (accountBalancesObj) {
        Object.keys(accountBalancesObj).forEach((coinType) => {
          const staticToken = getStaticTokenById(coinType);
          // Ensure supportedTokenSet.has checks against the correct type (StaticToken.type)
          if (supportedTokenSet.has(coinType) && staticToken) {
            tokens.push(staticToken);
          }
        });
      }
      // remove pivot token
      tokens = tokens.filter((t) => t.typeName !== token?.typeName);

      // format token balances
      const balances: TokenAmount[] = tokens
        .map((t) => ({
          token: t,
          amount: accountBalancesObj?.[t.typeName] || "0",
        }))
        .sort((a, b) => {
          return Number(b.amount) - Number(a.amount);
        });
      return uniqBy(uniqBy(balances, "token.typeName"), "token.symbol");
    }
    console.log('supportedTokenList', supportedTokenList);
    console.log('pools', pools);
    // Handle searched/filtered tokens from supportedTokenList (which are PoolSearchResult[])
    return (supportedTokenList || [] as PoolSearchResult[]) // Ensure supportedTokenList is not undefined
      .filter(
        (pool) =>
          (pool.coinA.typeName.toLowerCase().includes(debounceSearchTerm.toLowerCase()) ||
          pool.coinB.typeName.toLowerCase().includes(debounceSearchTerm.toLowerCase()) ||
          pool.coinA.symbol.toLowerCase().includes(debounceSearchTerm.toLowerCase()) ||
          pool.coinB.symbol.toLowerCase().includes(debounceSearchTerm.toLowerCase()) ||
          pool.coinA.name.toLowerCase().includes(debounceSearchTerm.toLowerCase()) ||
          pool.coinB.name.toLowerCase().includes(debounceSearchTerm.toLowerCase()) ||
          (isBuy ? pool.coinA : pool.coinB).typeName === pivotTokenId) ||
          (debounceSearchTerm && (pool.coinA.typeName === pivotTokenId || pool.coinB.typeName === pivotTokenId))
      )
      .map((pool): TokenAmount | null => {
        // Decide which coin to present or if the pool itself is the token
        // For now, let's assume we are primarily interested in coinA from the pool for selection
        // and map it to StaticToken
        // You might need a more sophisticated logic if coinB can also be selected independently
        // or if the pool represents a pair to be selected.
        const staticVersionOfCoin = mapAppTokenToStaticToken(isBuy ? pool.coinA : pool.coinB);
        console.log('staticVersionOfCoin', staticVersionOfCoin);
        console.log('pivotTokenId', pivotTokenId);
        // if (staticVersionOfCoin.typeName === pivotTokenId) return null; // double check pivot
        if (token?.typeName === pool.coinA.typeName || token?.typeName === pool.coinB.typeName) return null; // double check pivot

        return {
          token: staticVersionOfCoin,
          amount: accountBalancesObj?.[staticVersionOfCoin.typeName] || "0",
        };
      })
      .filter((item): item is TokenAmount => item !== null) // Remove nulls from pivot filtering
      .sort((a, b) => {
        return Number(b.amount) - Number(a.amount);
      });
  }, [
    debounceSearchTerm,
    accountBalancesObj,
    supportedTokenList, // Added supportedTokenList to dependency array
    supportedTokenSet, // kept supportedTokenSet in case it's used by getStaticTokenById indirectly or future logic
    pivotTokenId,
  ]);

  const trigger = useMemo(
    () => (
      <button
        className="flex items-center gap-2 p-3 rounded-none bg-[#000306] hover:bg-[#000306]/80 transition-colors"
        onClick={() => setOpen(true)}
      >
        <Avatar
          src={token?.image || ""} // Changed from token?.iconUrl (assuming PoolSearchResult had it directly)
          alt={token?.symbol}      // Changed from token?.symbol
          className="w-5 aspect-square rounded-full token-icon"
        />
        <span className="text-sm/none">{token?.symbol}</span>
        <ChevronDownIcon className="w-4 aspect-square text-gray-100" />
      </button>
    ),
    [token],
  );

  const tokenList = useMemo(() => {
    if (searchTerm && poolsPending) {
      return (
        <VList style={{ height: 320 }} className="vlist">
          <Repeat count={10}>
            <Skeleton className="h-12 p-4 bg-[#1C1E2C] text-sm/normal mb-1" />
          </Repeat>
        </VList>
      );
    }

    if (!tokenBalances.length) {
      return <EmptyData title="No coins found" />;
    }

    return (
      <VList style={{ height: 320 }} className="vlist rounded-none">
        {tokenBalances.map((tokenBalance) => (
          <TokenItem
            key={tokenBalance.token.typeName} // Changed key to use StaticToken's type
            item={tokenBalance} // item is now TokenAmount with StaticToken
            onClick={(selectedTokenAmount) => {
              handleTokenSelect(selectedTokenAmount.token); // Pass the StaticToken up
              setOpen(false);
              setSearchTerm('');
            }}
          />
        ))}
      </VList>
    );
  }, [tokenBalances, searchTerm, handleTokenSelect]);

  const content = useMemo(
    () => (
      <>
        <Input
          placeholder="Search coin name, type, package id"
          prefixSlot={
            <SearchIcon className="shrink-0 w-4 h-auto text-gray-100" />
          }
          postfixSlot={
            <button
              className="rounded-none shrink-0 flex items-center justify-center px-2 py-1 bg-[#373947] font-bold text-sm/none text-black-inverted-100 hover:bg-[#373947]/70 transition-colors"
              onClick={() => (setOpen(false), setSearchTerm(''))}
            >
              <XIcon className="w-4 h-auto text-gray-100" />
            </button>
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-4 bg-[#1C1E2C] text-sm/normal"
        />

        <div className="flex flex-col gap-1">
          <div className="p-2 py-6 text-2xl/none">TOKEN LIST</div>
          {tokenList}
        </div>
      </>
    ),
    [searchTerm, tokenList],
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(open) => (setOpen(open), setSearchTerm(''))}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <AnimatePresence>
          {open && (
            <SheetContent
              forceMount
              side="bottom"
              onOpenChange={setOpen}
              animation={true}
              className="p-4"
            >
              <SheetTitle className="text-center">TOKEN LIST</SheetTitle>
              {content}
            </SheetContent>
          )}
        </AnimatePresence>
      </Sheet>
    );
  }

  return (
    <div className={className}>
      {trigger}
      <TokenDialog open={open} onClose={() => setOpen(false)} maxWidth="md" sx={{backgroundColor: '#6A1B9A78'}}>
        <AnimatePresence>
          {open && (
            <DialogContent sx={{backgroundColor: '#000306', color: '#fff', p: 2 }} >
              {content}
            </DialogContent>
          )}
        </AnimatePresence>
      </TokenDialog>
    </div>
  );
}

export default SelectTokenModal;

const TokenDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: theme.spacing(0),
    backgroundColor: '#6A1B9A78',
    backdropFilter: 'blur(10px)',
    boxShadow: 'none',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    minWidth: '24rem',
  },
}));