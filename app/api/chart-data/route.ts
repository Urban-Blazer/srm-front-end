import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const pool_id = searchParams.get('pool_id');
    const coinA_decimals = Number(searchParams.get('coinA_decimals') || '0');
    const coinB_decimals = Number(searchParams.get('coinB_decimals') || '0');

    if (!pool_id || isNaN(coinA_decimals) || isNaN(coinB_decimals)) {
        return NextResponse.json({ error: 'Missing or invalid query params' }, { status: 400 });
    }

    const swaps = await prisma.swapped.findMany({
        where: { pool_id },
        orderBy: { timestamp: 'asc' },
        select: {
            timestamp: true,
            amountin: true,
            amountout: true,
            is_buy: true,
        },
    });

    const data = swaps
        .filter(s => Number(s.amountin) > 0 && Number(s.amountout) > 0)
        .map(s => {
            const amountIn = Number(s.amountin) / Math.pow(10, s.is_buy ? coinA_decimals : coinB_decimals);
            const amountOut = Number(s.amountout) / Math.pow(10, s.is_buy ? coinB_decimals : coinA_decimals);

            const price = amountOut > 0 ? amountIn / amountOut : null;

            return price
                ? {
                    time: Math.floor(Number(s.timestamp) / 1000),
                    value: price,
                }
                : null;
        })
        .filter(Boolean);

    return NextResponse.json(data);
}