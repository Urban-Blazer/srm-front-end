import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Set cache control for this route
export const dynamic = 'force-dynamic'; // Defaults to auto
export const revalidate = 3; // Revalidate every 3 seconds

const client = new DynamoDBClient({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE_REWARDS!;

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const poolId = searchParams.get("poolId");
    const sinceStr = searchParams.get("since");

    if (!poolId || !sinceStr) {
        return NextResponse.json({ error: "Missing poolId or since" }, { status: 400 });
    }

    const sinceTimestamp = Number(sinceStr);

    try {

        const command = new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "poolId = :poolId AND #ts >= :since",
            ExpressionAttributeNames: {
                "#ts": "timestamp",
            },
            ExpressionAttributeValues: {
                ":poolId": poolId,
                ":since": sinceTimestamp,
            },
            ScanIndexForward: false,
        });

        const result = await ddb.send(command);

        const total = result.Items?.reduce((sum, item) => {
            const amount = typeof item.totalAmount === "number"
                ? item.totalAmount
                : parseFloat(item.totalAmount ?? "0");
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0) ?? 0;

        return NextResponse.json({ rewardsDistributed: total }, {
            headers: {
                // s-maxage=3: Cache for 3 seconds at the edge (CDN/Vercel)
                // stale-while-revalidate=7: Continue serving stale content for up to 7 additional seconds while fetching new data
                'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=7',
            }
        });
    } catch (err) {
        console.error("❌ Error fetching rewards from DynamoDB:", err);
        return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 });
    }
}
