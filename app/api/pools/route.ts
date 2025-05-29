// app/api/pools/route.ts  (Next 13 App Router)

// Fuerza ejecución en Node.js y deshabilita caché/SSG
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";

// Configuración desde env vars
const TABLE_NAME = process.env.DYNAMODB_TABLE_POOLID!;
const REGION = process.env.AWS_REGION;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;

// Cliente DynamoDB
const dynamoDBClient = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

export async function GET() {
  try {
    let items: any[] = [];
    let ExclusiveStartKey: Record<string, any> | undefined = undefined;

    // Loop de paginación
    do {
      const response: any = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          ExclusiveStartKey,
        })
      );
      if (response.Items) {
        items.push(...response.Items);
      }
      ExclusiveStartKey = response.LastEvaluatedKey;
    } while (ExclusiveStartKey);

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

    return NextResponse.json(
      { pairs: formatted },
      {
        status: 200,
        headers: {
          // Evita cualquier cache en Edge/CDN y forzar siempre datos frescos
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("DynamoDB Scan Error:", error);
    return NextResponse.json(
      { error: "Failed to scan database" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  }
}
