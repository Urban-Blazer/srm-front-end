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
        console.log("🔍 API Request Body:", body);

        // ✅ Ensure `poolId` is present and correctly formatted
        if (!body.poolId || typeof body.poolId !== "string") {
            console.error("🚨 Invalid `poolId`. Expected a string but received:", typeof body.poolId);
            return NextResponse.json({ error: "Invalid `poolId`. Must be a string." }, { status: 400 });
        }

        // ✅ Trim and sanitize `poolId`
        const poolId = body.poolId.trim();
        console.log("🔍 Validated `poolId`:", poolId);

        // 🔥 Step 1: Attempt to update `isActive` conditionally
        const updateParams = {
            TableName: TABLE_NAME,
            Key: { "poolId": poolId },
            UpdateExpression: "SET isActive = :trueVal",
            ConditionExpression: "attribute_not_exists(poolId) OR isActive = :falseVal",
            ExpressionAttributeValues: {
                ":trueVal": 1,
                ":falseVal": 0
            },
            ReturnValues: "ALL_NEW"
        };

        try {
            console.log("📌 Attempting conditional update:", JSON.stringify(updateParams, null, 2));
            const updatedData = await dynamoDB.update(updateParams).promise();

            return NextResponse.json({
                message: `✅ Pool ${poolId} is now active.`,
                updatedItem: updatedData.Attributes
            }, { status: 200 });

        } catch (error: any) {
            // ❌ If the update fails due to `poolId` not existing, we catch the error and create a new record
            if (error.code === "ConditionalCheckFailedException") {
                console.log("🚀 `poolId` does not exist. Creating new entry...");

                const putParams = {
                    TableName: TABLE_NAME,
                    Item: {
                        "poolId": poolId,
                        "isActive": 1  // ✅ Normal attribute
                    }
                };

                console.log("📌 Creating new entry:", JSON.stringify(putParams, null, 2));
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
