import { NextResponse } from "next/server";
import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

// ✅ Configure AWS DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_ACTIVE_POOLS || "ActivePools";

export async function POST(req: Request) {
    let body;

    try {
        // 🔍 Parse the request body
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
            Key: { "poolId": poolId },
            UpdateExpression: "SET isActive = :trueVal",
            ConditionExpression: "attribute_exists(poolId) AND isActive = :falseVal AND isProcessing = :falseProcessing",
            ExpressionAttributeValues: {
                ":trueVal": 1,  // ✅ Use raw numbers, DocumentClient handles it correctly
                ":falseVal": 0, // ✅ Ensure DynamoDB gets correct types
                ":falseProcessing": 0
            },
            ReturnValues: "ALL_NEW"
        };

        try {
            console.info("📌 Attempting conditional update:", JSON.stringify(updateParams, null, 2));
            const updatedData = await dynamoDB.update(updateParams).promise();

            return NextResponse.json({
                message: `✅ Pool ${poolId} is now active.`,
                updatedItem: updatedData.Attributes ?? null // Ensure undefined values are not returned
            }, { status: 200 });

        } catch (error: any) {
            if (error.code === "ConditionalCheckFailedException") {
                console.warn("⚠️ Conditional check failed. Checking if the pool exists...");

                // ✅ Step 2: Check if the pool exists before deciding next action
                const getParams = {
                    TableName: TABLE_NAME,
                    Key: { "poolId": poolId }
                };

                const existingPool = await dynamoDB.get(getParams).promise();

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
                        "poolId": poolId,      // ✅ Store as plain string
                        "isActive": 1,        // ✅ Store as plain number
                        "isProcessing": 0     // ✅ Store as plain number
                    }
                };

                console.info("📌 Creating new entry:", JSON.stringify(putParams, null, 2));
                await dynamoDB.put(putParams).promise();

                return NextResponse.json({
                    message: `✅ ${poolId} set to active.`,
                }, { status: 201 });
            }

            // 🚨 If another error occurs, return it
            throw error;
        }

    } catch (error: any) {
        console.error("❌ Error updating isActive in DynamoDB:", error);

        return NextResponse.json({
            error: error.message || "Failed to update pool activity",
            receivedType: typeof body?.poolId,
            stack: error.stack || "No stack trace available",
            code: error.code || "Unknown code"
        }, { status: 500 });
    }
}