'use client';

import dynamic from 'next/dynamic';

const PoolRankingTable = dynamic(() => import('@components/PoolRankingTable'), {
    ssr: false,
});

export default function RankingPage() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-[#000306]">
            <div className="relative z-10">
                <PoolRankingTable />
            </div>
        </div>
    );
}