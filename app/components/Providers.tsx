// app/components/Providers.tsx
'use client';

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { DEFAULT_NETWORK, networkConfig } from '../config';

const queryClient = new QueryClient();

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
                    {children}
                </WalletProvider>
            </SuiClientProvider>
        </QueryClientProvider>
    );
}