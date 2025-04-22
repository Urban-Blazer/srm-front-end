import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

dotenv.config();

const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
}));

const TABLE_NAME = process.env.DYNAMODB_TABLE_POOLID ?? 'PoolLookup';
const INDEXER_BASE = process.env.INDEXER_URL ?? 'http://localhost:3000';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const range = searchParams.get('range') || '24h'; // range: 24h, 7d, all

        const indexerUrl = `${INDEXER_BASE}/stats/pool-ranking?range=${range}`;
        console.log(`🔁 Fetching indexer data: ${indexerUrl}`);
        const poolRes = await fetch(indexerUrl);
        const pools = await poolRes.json();

        const enrichedPools = await Promise.all(
            pools.map(async (pool: any) => {
                const dynamoQuery = new QueryCommand({
                    TableName: TABLE_NAME,
                    IndexName: 'poolId-index',
                    KeyConditionExpression: 'poolId = :pid',
                    ExpressionAttributeValues: { ':pid': pool.pool_id },
                });

                const result = await dynamoDB.send(dynamoQuery);
                const meta = result.Items?.[0];

                if (!meta) return pool;

                const coinA_decimals = parseInt(meta.coinA_decimals || '0', 10);

                const formatVolume = (val: number) =>
                    val && !isNaN(val)
                        ? (val / Math.pow(10, coinA_decimals)).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })
                        : '0.00';

                return {
                    ...pool,
                    coinA_symbol: meta.coinA_symbol ?? 'A',
                    coinB_symbol: meta.coinB_symbol ?? 'B',
                    coinA_image: meta.coinA_image ?? '',
                    coinB_image: meta.coinB_image ?? '',
                    coinA_decimals,
                    buyVolume: formatVolume(Number(pool.buyVolume)),
                    sellVolume: formatVolume(Number(pool.sellVolume)),
                    totalVolume: formatVolume(Number(pool.totalVolume)),
                };
            })
        );

        return NextResponse.json(enrichedPools);
    } catch (err) {
        console.error('[POOL RANKING PROXY ERROR]', err);
        return NextResponse.json({ error: 'Failed to fetch pool ranking' }, { status: 500 });
    }

    
}