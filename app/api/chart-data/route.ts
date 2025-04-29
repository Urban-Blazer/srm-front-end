import { NextRequest, NextResponse } from 'next/server';

const INDEXER_BASE = process.env.INDEXER_URL || 'http://localhost:3000'; // Your Express API URL

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const poolId = searchParams.get('poolId');
    const interval = searchParams.get('interval') || '1m';

    if (!poolId) {
        return NextResponse.json({ error: 'Missing poolId' }, { status: 400 });
    }

    const endpoint = `${INDEXER_BASE}/chart-data?poolId=${encodeURIComponent(poolId)}&interval=${encodeURIComponent(interval)}`;

    try {
        const res = await fetch(endpoint);

        if (!res.ok) {
            const text = await res.text();
            console.error('❌ Indexer error response:', text);
            return NextResponse.json({ error: 'Indexer returned an error' }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('❌ Failed to fetch chart data:', err);
        return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
    }
}