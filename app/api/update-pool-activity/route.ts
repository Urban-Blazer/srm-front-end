import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

dotenv.config();

// ✅ Configure AWS DynamoDB Client
const dynamoDBClient = new DynamoDBClient({
    region: process.env.AWS_REGION as string,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
});

// ✅ Use DocumentClient for JSON-like object handling
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_ACTIVE_POOLS || "ActivePools";

export async function POST(req: Request) {
    let body;

    try {
        // 🔍 Parse request body
        body = await req.json();
        console.info("🔍 Received API Request:", JSON.stringify(body));

        // ✅ Ensure `poolId` is present and correctly formatted
        if (!body.poolId || typeof body.poolId !== "string") {
            console.error("🚨 Invalid `poolId`. Expected a string but received:", typeof body.poolId);
            return NextResponse.json({ error: "Invalid `poolId`. Must be a string." }, { status: 400 });
        }

        // ✅ Trim and sanitize `poolId`
        const poolId = body.poolId.trim();
        console.info("🔍 Validated `poolId`:", poolId);

        // 🔥 Step 1: Attempt to update `isActive` conditionally
        const updateParams = {
            TableName: TABLE_NAME,
            Key: { poolId },
            UpdateExpression: "SET isActive = :trueVal",
            ConditionExpression: "attribute_exists(poolId) AND isActive = :falseVal AND isProcessing = :falseProcessing",
            ExpressionAttributeValues: {
                ":trueVal": 1,  // ✅ Store as raw numbers (DynamoDBDocumentClient handles it)
                ":falseVal": 0,
                ":falseProcessing": 0,
            },
            ReturnValues: "ALL_NEW",
        };

        try {
            console.info("📌 Attempting conditional update:", JSON.stringify(updateParams, null, 2));
            const updatedData = await dynamoDB.send(new UpdateCommand(updateParams));

            return NextResponse.json({
                message: `✅ Pool ${poolId} is now active.`,
                updatedItem: updatedData.Attributes ?? null, // Ensure undefined values are not returned
            }, { status: 200 });

        } catch (error: unknown) {
            if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
                console.warn("⚠️ Conditional check failed. Checking if the pool exists...");

                // ✅ Step 2: Check if the pool exists before deciding next action
                const getParams = {
                    TableName: TABLE_NAME,
                    Key: { poolId },
                };

                const existingPool = await dynamoDB.send(new GetCommand(getParams));

                if (existingPool.Item) {
                    console.warn("⚠️ Pool exists but does not meet conditions for update.");
                    return NextResponse.json({
                        message: `⚠️ Pool ${poolId} was not updated because it does not meet conditions (already active or isProcessing is not 0).`
                    }, { status: 409 }); // 409 Conflict
                }

                // ✅ Step 3: If pool does not exist, create a new entry
                console.info("🚀 `poolId` does not exist. Creating new entry...");

                const putParams = {
                    TableName: TABLE_NAME,
                    Item: {
                        poolId,
                        isActive: 1,
                        isProcessing: 0,
                    },
                };

                console.info("📌 Creating new entry:", JSON.stringify(putParams, null, 2));
                await dynamoDB.send(new PutCommand(putParams));

                return NextResponse.json({
                    message: `✅ ${poolId} set to active.`,
                }, { status: 201 });
            }

            // 🚨 If another error occurs, return it
            throw error;
        }

    } catch (error: unknown) {
        console.error("❌ Error updating isActive in DynamoDB:", error);

        let errorMessage = "Failed to update pool activity";
        let errorCode = "Unknown code";
        let stackTrace = "No stack trace available";

        if (error instanceof Error) {
            errorMessage = error.message;
            errorCode = (error as any).code ?? "Unknown code";
            stackTrace = error.stack ?? "No stack trace available";
        }

        return NextResponse.json({
            error: errorMessage,
            receivedType: typeof body?.poolId,
            stack: stackTrace,
            code: errorCode,
        }, { status: 500 });
    }
}