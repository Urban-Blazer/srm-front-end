'use client';

import dynamic from 'next/dynamic';

const PoolRankingTable = dynamic(() => import('@components/PoolRankingTable'), {
    ssr: false,
});

export default function RankingPage() {
    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* 🔥 Background Video */}
            <div className="fixed inset-0 -z-20">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover min-h-screen"
                >
                    <source src="/background.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>

            {/* 📊 Main Content */}
            <div className="relative z-10">
                <PoolRankingTable />
            </div>
        </div>
    );
}