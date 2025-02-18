import { NextResponse } from "next/server";
import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

// Configure AWS DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const TABLE_NAME = process.env.DYNAMODB_TABLE || "PoolLookup";

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
                Pair: pairKey, // ✅ Store with "0x" prefixes
                poolId: body.poolId,
                coinA: formattedCoinA, // ✅ Store formatted coinA
                coinB: formattedCoinB, // ✅ Store formatted coinB
                initA: body.initA || 0,
                initB: body.initB || 0,
                lpMinted: body.lpMinted || 0,
                lockedLpBalance: body.lockedLpBalance || 0,
                lpBuilderFee: body.lpBuilderFee || 0,
                burnFee: body.burnFee || 0,
                devRoyaltyFee: body.devRoyaltyFee || 0,
                rewardsFee: body.rewardsFee || 0,
                devWallet: body.devWallet || "",
            },
        };

        await dynamoDB.put(params).promise();

        return NextResponse.json({ message: "Pool data stored successfully!" }, { status: 201 });

    } catch (error) {
        console.error("Error saving to DynamoDB:", error);
        return NextResponse.json({ error: "Failed to store data" }, { status: 500 });
    }
}
