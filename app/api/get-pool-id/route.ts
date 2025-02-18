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

const TABLE_NAME = process.env.DYNAMODB_TABLE || "PoolLookup";

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
        const pairKey1 = `${coinA}-${coinB}`; // Original order
        const pairKey2 = `${coinB}-${coinA}`; // Reversed order

        // ✅ Try fetching both orders
        const params1 = {
            TableName: TABLE_NAME,
            Key: { "Pair": { S: pairKey1 } },
        };
        const params2 = {
            TableName: TABLE_NAME,
            Key: { "Pair": { S: pairKey2 } },
        };

        // ✅ Try fetching first pair order
        const command1 = new GetItemCommand(params1);
        let response = await dynamoDB.send(command1);

        if (response.Item && response.Item.poolId?.S) {
            return NextResponse.json({ poolId: response.Item.poolId.S }, { status: 200 });
        }

        // ✅ Try fetching second pair order if the first one failed
        const command2 = new GetItemCommand(params2);
        response = await dynamoDB.send(command2);

        if (response.Item && response.Item.poolId?.S) {
            return NextResponse.json({ poolId: response.Item.poolId.S }, { status: 200 });
        }

        // ✅ If neither order exists, return "Pool Not Found"
        return NextResponse.json({ message: "Pool not found" }, { status: 404 });

    } catch (error) {
        console.error("DynamoDB Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
