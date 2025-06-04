'use client';

import dynamic from 'next/dynamic';

const PoolsStatsTable = dynamic(() => import('@components/PoolsStatsTable'), {
    ssr: false,
});

export default function RankingPage() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-[#000306]">
            <div className="relative z-10">
                <PoolsStatsTable />
            </div>
        </div>
    );
}