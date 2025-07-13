import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

dotenv.config();

// ✅ Use DynamoDBDocumentClient for simplified handling
const dynamoDBClient = new DynamoDBClient({
    region: process.env.AWS_REGION as string,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
});

// ✅ Convert low-level client into document client for automatic type conversion
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_POOLID || "PoolLookup";

// ✅ Define GET handler (Edge API Route Format)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tokenPair = searchParams.get("tokenPair");

    if (!tokenPair) {
        return NextResponse.json({ error: "Missing token pair" }, { status: 400 });
    }

    try {
        // Extract CoinA and CoinB from tokenPair
        const [coinA, coinB] = tokenPair.split("-");

        // ✅ Try both possible pair orders
        const pairKeys = [`${coinA}-${coinB}`, `${coinB}-${coinA}`];

        // ✅ Fetch Pool Metadata in parallel
        const fetchPoolMetadata = async (pairKey: string) => {
            const params = {
                TableName: TABLE_NAME,
                Key: { Pair: pairKey },
            };

            const response = await dynamoDB.send(new GetCommand(params));

            if (response.Item) {
                return {
                    poolId: response.Item.poolId,
                    coinA_metadata: {
                        typeName: response.Item.coinA || "Unknown",
                        name: response.Item.coinA_name || "Unknown",
                        symbol: response.Item.coinA_symbol || "Unknown",
                        description: response.Item.coinA_description || "",
                        decimals: response.Item.coinA_decimals || 0,
                        image: response.Item.coinA_image || "",
                    },
                    coinB_metadata: {
                        typeName: response.Item.coinB || "Unknown",
                        name: response.Item.coinB_name || "Unknown",
                        symbol: response.Item.coinB_symbol || "Unknown",
                        description: response.Item.coinB_description || "",
                        decimals: response.Item.coinB_decimals || 0,
                        image: response.Item.coinB_image || "",
                    },
                };
            }
            return null;
        };

        // ✅ Run both queries in parallel to improve performance
        const results = await Promise.all(pairKeys.map(fetchPoolMetadata));

        // ✅ Find the first non-null result
        const poolMetadata = results.find((result) => result !== null);

        if (poolMetadata) {
            return NextResponse.json(poolMetadata, { status: 200 });
        }

        return NextResponse.json({ message: "Pool not found" }, { status: 404 });

    } catch (error) {
        console.error("DynamoDB Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
