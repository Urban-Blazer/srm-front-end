import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { NextRequest, NextResponse } from "next/server";

// ✅ Use environment variables (Next.js handles dotenv automatically)
const TABLE_NAME = process.env.DYNAMODB_TABLE_POOLID!;
const REGION = process.env.AWS_REGION;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;

// ✅ Set up DynamoDB client
const dynamoDBClient = new DynamoDBClient({
    region: REGION,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
    },
});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const query = searchParams.get("q");

    if (!query) {
        return NextResponse.json({ error: "Missing query param `q`" }, { status: 400 });
    }

    const isTypename = query.startsWith("0x");
    const keyName = isTypename ? "coinB" : "coinB_symbol";
    const searchValue = isTypename ? decodeURIComponent(query) : query.toUpperCase(); // 🔁 Normalize symbol
    console.log({keyName, isTypename, searchValue});
    try {
        const response = await docClient.send(
            new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: `begins_with(${keyName}, :value)`,
                ExpressionAttributeValues: {
                    ":value": searchValue,
                },
                Limit: 20,
            })
        );

        const items = response.Items || [];

        const formatted = items.map((item) => ({
            poolId: item.poolId,
            coinA: {
                typeName: item.coinA,
                decimals: Number(item.coinA_decimals),
                image: item.coinA_image,
                name: item.coinA_name,
                symbol: item.coinA_symbol,
            },
            coinB: {
                typeName: item.coinB,
                decimals: Number(item.coinB_decimals),
                image: item.coinB_image,
                name: item.coinB_name,
                symbol: item.coinB_symbol,
            },
        }));

        return NextResponse.json({ pairs: formatted });
    } catch (error: any) {
        console.error("DynamoDB Search Error:", error);
        return NextResponse.json({ error: "Failed to scan database" }, { status: 500 });
    }
}
