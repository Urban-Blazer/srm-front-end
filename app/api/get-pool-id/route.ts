import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import dotenv from "dotenv";

dotenv.config();

// ✅ Configure AWS DynamoDB Client (v3 SDK)
const dynamoDB = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

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

        // ✅ Create both possible pair orders
        const pairKeys = [`${coinA}-${coinB}`, `${coinB}-${coinA}`]; // Try both orders

        // ✅ Function to Fetch Pool Metadata from DynamoDB
        const fetchPoolMetadata = async (pairKey: string) => {
            const params = {
                TableName: TABLE_NAME,
                Key: { "Pair": { S: pairKey } },
            };

            const response = await dynamoDB.send(new GetItemCommand(params));

            if (response.Item && response.Item.poolId?.S) {
                return {
                    poolId: response.Item.poolId.S,
                    coinA_metadata: {
                        typeName: response.Item.coinA?.S || "Unknown",
                        name: response.Item.coinA_name?.S || "Unknown",
                        symbol: response.Item.coinA_symbol?.S || "Unknown",
                        description: response.Item.coinA_description?.S || "",
                        decimals: parseInt(response.Item.coinA_decimals?.N || "0", 10),
                        image: response.Item.coinA_image?.S || "",
                    },
                    coinB_metadata: {
                        typeName: response.Item.coinB?.S || "Unknown",
                        name: response.Item.coinB_name?.S || "Unknown",
                        symbol: response.Item.coinB_symbol?.S || "Unknown",
                        description: response.Item.coinB_description?.S || "",
                        decimals: parseInt(response.Item.coinB_decimals?.N || "0", 10),
                        image: response.Item.coinB_image?.S || "",
                    }
                };
            }
            return null;
        };

        // ✅ Try fetching the pool metadata using both token pair orders
        for (const pairKey of pairKeys) {
            const poolMetadata = await fetchPoolMetadata(pairKey);
            if (poolMetadata) {
                return NextResponse.json(poolMetadata, { status: 200 });
            }
        }

        // ✅ If neither order exists, return "Pool Not Found"
        return NextResponse.json({ message: "Pool not found" }, { status: 404 });

    } catch (error) {
        console.error("DynamoDB Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
