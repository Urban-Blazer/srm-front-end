import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SuiClient } from "@mysten/sui.js/client";
import { GETTER_RPC } from "../../config";

// ✅ Initialize DynamoDB Client
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

// ✅ Initialize Blockchain Provider
const provider = new SuiClient({ url: GETTER_RPC });

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("query"); // ✅ This is the TypeName

        if (!query) {
            return NextResponse.json({ message: "Missing query parameter" }, { status: 400 });
        }

        // ✅ Query DynamoDB GSI for CoinB (which is the TypeName)
        const command = new QueryCommand({
            TableName: process.env.DYNAMODB_TABLE,
            IndexName: "CoinB-index", // ✅ Use GSI on CoinB
            KeyConditionExpression: "CoinB = :query",
            ExpressionAttributeValues: {
                ":query": query,
            },
        });

        const { Items } = await docClient.send(command);

        if (!Items || Items.length === 0) {
            return NextResponse.json({ message: "Token not found" }, { status: 404 });
        }

        // ✅ Since CoinB **is** the TypeName, use `query` directly
        const typeName = query;

        // ✅ Fetch metadata from blockchain using provider.getCoinMetadata()
        let metadata;
        try {
            metadata = await provider.getCoinMetadata({ coinType: typeName });

            if (!metadata) {
                return NextResponse.json({ message: "Metadata not found for token" }, { status: 404 });
            }
        } catch (error) {
            console.error("❌ Error fetching blockchain metadata:", error);
            return NextResponse.json({ message: "Failed to fetch token metadata" }, { status: 500 });
        }

        // ✅ Construct response with metadata & logo URL
        const token = {
            symbol: metadata.symbol || "Unknown",
            typeName: typeName,
            logo: metadata.logoURI || "/default-logo.png",
        };

        return NextResponse.json(token);
    } catch (error) {
        console.error("❌ Error fetching token:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}