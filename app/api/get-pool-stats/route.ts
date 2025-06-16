import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

dotenv.config();

// ✅ Use DynamoDBDocumentClient for automatic type conversion
const dynamoDBClient = new DynamoDBClient({
    region: process.env.AWS_REGION as string,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
});

const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

// ✅ Constants for Table and Index
const TABLE_NAME = process.env.DYNAMODB_TABLE_POOLID ?? "PoolLookup";
const GSI_NAME = "creatorWallet-index"; // 🔥 Ensure this index exists in your table schema

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const walletAddress = searchParams.get("walletAddress");

        if (!walletAddress) {
            return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
        }

        // ✅ Query DynamoDB using the GSI on `creatorWallet`
        const queryParams = {
            TableName: TABLE_NAME,
            IndexName: GSI_NAME,
            KeyConditionExpression: "creatorWallet = :walletAddress",
            ExpressionAttributeValues: {
                ":walletAddress": walletAddress, // ✅ No need for `{ S: value }` (handled automatically)
            },
        };

        const result = await dynamoDB.send(new QueryCommand(queryParams));

        if (!result.Items || result.Items.length === 0) {
            console.error(`⚠️ No pools found for creatorWallet: ${walletAddress}`);
            return NextResponse.json({ message: "No pools found" }, { status: 404 });
        }

        // ✅ Transform data into a clean format
        const pools = result.Items.map((item) => ({
            poolId: item.poolId ?? "Unknown",
            creatorWallet: item.creatorWallet ?? "Unknown",
            creatorRoyaltyFee: item.creatorRoyaltyFee ? parseFloat(item.creatorRoyaltyFee) : 0,
            coinA: item.coinA ?? "Unknown",
            coinA_symbol: item.coinA_symbol ?? "Unknown",
            coinA_decimals: item.coinA_decimals ? parseInt(item.coinA_decimals, 10) : 0,
            coinA_image: item.coinA_image ?? "",
            coinB: item.coinB ?? "Unknown",
            coinB_symbol: item.coinB_symbol ?? "Unknown",
            coinB_image: item.coinB_image ?? "",
        }));

        return NextResponse.json(pools, { status: 200 });

    } catch (error) {
        console.error("❌ DynamoDB Query Error:", error);

        // ✅ Ensure error is an instance of Error before accessing `message`
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return NextResponse.json({ error: "Internal Server Error", details: errorMessage }, { status: 500 });
    }
}