// app/components/Providers.tsx
'use client';

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect } from 'react';
import { DEFAULT_NETWORK } from '../config';
import { networkConfig } from '../networkConfig';
import { screenSizeAtom } from '@data/layout.atom';
import { getDefaultStore } from 'jotai';
import { useScreenSize } from '../hooks/dom/useScreenSize';
import useTheme from '../hooks/theme/useTheme';

const queryClient = new QueryClient();

const GlobalHooks = () => {
  useTheme();
  const screenSize = useScreenSize();
  useEffect(() => {
    getDefaultStore().set(screenSizeAtom, screenSize);
  }, [screenSize]);
  return null;
};

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <SuiClientProvider networks={networkConfig} defaultNetwork={DEFAULT_NETWORK}>
                <WalletProvider
                    autoConnect
                    slushWallet={{
                        name: 'Sui Rewards Me',
                    }}
                    >
                    <GlobalHooks />
                    {children}
                </WalletProvider>
            </SuiClientProvider>
        </QueryClientProvider>
    );
}