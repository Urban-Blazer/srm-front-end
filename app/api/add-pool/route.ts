import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

dotenv.config();

// Configure AWS DynamoDB v3
const dynamoDBClient = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
});

// Use the high-level DocumentClient for easier data manipulation
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_POOLID || "PoolLookup";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body.poolId || !body.coinA || !body.coinB) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // ✅ Ensure coinA and coinB are stored as strings
        const coinA = typeof body.coinA === "object" ? body.coinA.name || "" : body.coinA;
        const coinB = typeof body.coinB === "object" ? body.coinB.name || "" : body.coinB;

        // ✅ Ensure Pair key is properly formatted with "0x" prefix
        const formattedCoinA = coinA.startsWith("0x") ? coinA : `0x${coinA}`;
        const formattedCoinB = coinB.startsWith("0x") ? coinB : `0x${coinB}`;

        const pairKey = `${formattedCoinA}-${formattedCoinB}`;

        const params = {
            TableName: TABLE_NAME,
            Item: {
                Pair: pairKey,
                poolId: body.poolId,
                coinA: formattedCoinA,
                coinB: formattedCoinB,
                initA: body.initA || 0,
                initB: body.initB || 0,
                lpMinted: body.lpMinted || 0,
                lockedLpBalance: body.lockedLpBalance || 0,
                lpBuilderFee: body.lpBuilderFee || 0,
                burnFee: body.burnFee || 0,
                creatorRoyaltyFee: body.creatorRoyaltyFee || 0,
                rewardsFee: body.rewardsFee || 0,
                creatorWallet: body.creatorWallet || "",

                // ✅ Store Coin A Metadata
                coinA_name: body.coinA_name || "Unknown",
                coinA_symbol: body.coinA_symbol || "Unknown",
                coinA_description: body.coinA_description || "",
                coinA_decimals: body.coinA_decimals || 0,
                coinA_image: body.coinA_image || "",

                // ✅ Store Coin B Metadata
                coinB_name: body.coinB_name || "Unknown",
                coinB_symbol: body.coinB_symbol || "Unknown",
                coinB_description: body.coinB_description || "",
                coinB_decimals: body.coinB_decimals || 0,
                coinB_image: body.coinB_image || "",
            },
        };

        // Use the PutCommand instead of `put().promise()`
        await dynamoDB.send(new PutCommand(params));

        return NextResponse.json({ message: "Pool data stored successfully!" }, { status: 201 });

    } catch (error) {
        console.error("Error saving to DynamoDB:", error);
        return NextResponse.json({ error: "Failed to store data" }, { status: 500 });
    }
}