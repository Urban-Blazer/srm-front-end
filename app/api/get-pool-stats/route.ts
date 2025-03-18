import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import dotenv from "dotenv";

dotenv.config();

// ✅ Initialize AWS DynamoDB Client once (avoids re-instantiating on each request)
const dynamoDB = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

// ✅ Constants for Table and Index
const TABLE_NAME = process.env.DYNAMODB_TABLE_POOLID ?? "PoolLookup";
const GSI_NAME = "creatorWallet-index"; // 🔥 Ensure this index exists

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const walletAddress = searchParams.get("walletAddress");

        if (!walletAddress) {
            return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
        }

        console.log(`🔍 Searching pools for creatorWallet: ${walletAddress}`);

        // ✅ Query DynamoDB using the GSI on `creatorWallet`
        const queryParams = {
            TableName: TABLE_NAME,
            IndexName: GSI_NAME,
            KeyConditionExpression: "creatorWallet = :walletAddress",
            ExpressionAttributeValues: {
                ":walletAddress": { S: walletAddress },
            },
        };

        const result = await dynamoDB.send(new QueryCommand(queryParams));

        if (!result.Items || result.Items.length === 0) {
            console.log(`⚠️ No pools found for creatorWallet: ${walletAddress}`);
            return NextResponse.json({ message: "No pools found" }, { status: 404 });
        }

        console.log(`✅ Found ${result.Items.length} pools for ${walletAddress}`);

        // ✅ Transform data into a clean format
        const pools = result.Items.map((item) => ({
            poolId: item.poolId?.S,
            creatorWallet: item.creatorWallet?.S,
            creatorRoyaltyFee: item.creatorRoyaltyFee?.N ? parseFloat(item.creatorRoyaltyFee.N) : 0,
            coinA: item.coinA?.S || "Unknown",
            coinA_symbol: item.coinA_symbol?.S || "Unknown",
            coinA_decimals: item.coinA_decimals?.N ? parseInt(item.coinA_decimals.N, 10) : 0,
            coinA_image: item.coinA_image?.S || "",
            coinB: item.coinB?.S || "Unknown",
            coinB_symbol: item.coinB_symbol?.S || "Unknown",
            coinB_image: item.coinB_image?.S || "",
        }));

        return NextResponse.json(pools, { status: 200 });

    } catch (error) {
        console.error("❌ DynamoDB Query Error:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}