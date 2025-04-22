import dynamic from 'next/dynamic';

const PoolRankingTable = dynamic(() => import('@components/PoolRankingTable'), {
    ssr: false, // we fetch from client
});

export default function RankingPage() {
    return <PoolRankingTable />;
}