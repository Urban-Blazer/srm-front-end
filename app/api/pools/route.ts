// app/api/pools/route.ts  (Next 13 App Router)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";

// Configuración desde env vars
const TABLE_NAME = process.env.DYNAMODB_TABLE_POOLID!;
const REGION = process.env.AWS_REGION;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;

// const POOL_WHITELIST = [
//     '0xbad96d82f84d3fa3b31d49054e277eed973347382835b479622f277641abc693',
//     '0x7c82f69c879d2160c5b5d7f09d731b04e46324a9500ed1e023768713c8ceb03e',
// ];

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
    console.log({items})
    // Formateo final
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
    // .filter((p)=>POOL_WHITELIST.includes(p.poolId));

    return NextResponse.json({ pairs: formatted });
  } catch (error: any) {
    console.error("DynamoDB Scan Error:", error);
    return NextResponse.json(
      { error: "Failed to scan database" },
      { status: 500 }
    );
  }
}
