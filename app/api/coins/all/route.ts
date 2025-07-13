import { CreateTableCommand, DynamoDBClient, KeyType, ScalarAttributeType } from "@aws-sdk/client-dynamodb";

export const dynamic = 'force-dynamic';
import {
    DeleteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    ScanCommand
} from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";
import { NextRequest, NextResponse } from "next/server";

dotenv.config();

// Set up DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

// Convert low-level client into document client for automatic type conversion
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_COINS || "SuiCoins";

// Interface for coin metadata
interface CoinMeta {
  decimals: number;
  image?: string;
  typeName: string;
  name: string;
  symbol: string;
  lists?: string[];
}

// Function to create the table if it doesn't exist
async function ensureTableExists() {
  try {
    // Check if table exists by trying to do a scan with limit 1
    await dynamoDB.send(new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 1
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      // Table doesn't exist, create it
      const createTableParams = {
        TableName: TABLE_NAME,
        KeySchema: [
          { AttributeName: "typeName", KeyType: KeyType.HASH } // Partition key
        ],
        AttributeDefinitions: [
          { AttributeName: "typeName", AttributeType: ScalarAttributeType.S }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      };

      try {
        await dynamoDBClient.send(new CreateTableCommand(createTableParams));
        
        // Wait for the table to be active
        let tableActive = false;
        while (!tableActive) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          try {
            await dynamoDB.send(new ScanCommand({
              TableName: TABLE_NAME,
              Limit: 1
            }));
            tableActive = true;
          } catch (error) {
            console.info("Table not active yet, waiting...");
          }
        }
        
        // Seed initial data if needed
        await seedInitialData();
        return true;
      } catch (err) {
        console.error("Error creating table:", err);
        return false;
      }
    } else {
      console.error("Error checking table existence:", error);
      return false;
    }
  }
}

// Function to seed initial data if needed
async function seedInitialData() {
  // Import default coins from the predefined list
  const { predefinedCoins } = await import("@/app/data/coins");
  
  // Add each coin to the database
  for (const coin of predefinedCoins) {
    try {
      await dynamoDB.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: coin
      }));
    } catch (error) {
      console.error(`Failed to add coin ${coin.symbol}:`, error);
    }
  }
}

// Function to update predefined coins from the local data file
async function updatePredefinedCoins() {
  // Import default coins from the predefined list
  const { predefinedCoins } = await import("@/app/data/coins");
  
  // Add or update each coin in the database
  for (const coin of predefinedCoins) {
    try {
      const { typeName } = coin;
      
      if (!typeName) {
        return NextResponse.json({ error: "typeName is required" }, { status: 400 });
      }
      
      // Update the coin
      await dynamoDB.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: coin
      }));

      console.log(`Successfully upserted coin ${coin.symbol}`);
    } catch (error) {
      console.error(`Failed to upsert coin ${coin.symbol}:`, error);
    }
  }
}

// GET all coins
export async function GET(req: NextRequest) {
  try {
    // await ensureTableExists();
    // await updatePredefinedCoins();
    
    // Parse pagination parameters from query string
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    
    // Validate pagination parameters
    const validatedPage = page > 0 ? page : 1;
    const validatedPageSize = pageSize > 0 && pageSize <= 100 ? pageSize : 50;
    
    // Calculate pagination values
    const limit = validatedPageSize;
    const exclusiveStartKey = searchParams.get("nextToken") 
      ? JSON.parse(decodeURIComponent(searchParams.get("nextToken") || ""))
      : undefined;
    
    // Get the total count first
    const countResponse = await dynamoDB.send(new ScanCommand({
      TableName: TABLE_NAME,
      Select: "COUNT"
    }));
    
    const totalItems = countResponse.Count || 0;
    
    // Then get the paginated results
    const response = await dynamoDB.send(new ScanCommand({
      TableName: TABLE_NAME,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey
    }));
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / validatedPageSize);
    const hasNextPage = !!response.LastEvaluatedKey;
    const nextToken = hasNextPage 
      ? encodeURIComponent(JSON.stringify(response.LastEvaluatedKey))
      : null;
    
    return NextResponse.json({
      items: response.Items || [],
      pagination: {
        totalItems,
        totalPages,
        currentPage: validatedPage,
        pageSize: validatedPageSize,
        hasNextPage,
        nextToken
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching coins:", error);
    return NextResponse.json({ error: "Failed to fetch coins" }, { status: 500 });
  }
}

// Security Disable
// // POST - Create a new coin
// export async function POST(req: NextRequest) {
//   try {
//     await ensureTableExists();
    
//     const coinData: CoinMeta = await req.json();
    
//     // Validate required fields
//     if (!coinData.typeName || !coinData.symbol || !coinData.name || coinData.decimals === undefined) {
//       return NextResponse.json(
//         { error: "Missing required fields (typeName, symbol, name, decimals)" }, 
//         { status: 400 }
//       );
//     }
    
//     // Check if coin already exists
//     const existingCoin = await dynamoDB.send(new GetCommand({
//       TableName: TABLE_NAME,
//       Key: { typeName: coinData.typeName }
//     }));
    
//     if (existingCoin.Item) {
//       return NextResponse.json(
//         { error: "Coin with this typeName already exists" }, 
//         { status: 409 }
//       );
//     }
    
//     // Add the new coin
//     await dynamoDB.send(new PutCommand({
//       TableName: TABLE_NAME,
//       Item: coinData
//     }));
    
//     return NextResponse.json(coinData, { status: 201 });
//   } catch (error) {
//     console.error("Error creating coin:", error);
//     return NextResponse.json({ error: "Failed to create coin" }, { status: 500 });
//   }
// }

// // PUT - Update an existing coin
// export async function PUT(req: NextRequest) {
//   try {
//     await ensureTableExists();
    
//     const coinData: CoinMeta = await req.json();
//     const { typeName } = coinData;
    
//     if (!typeName) {
//       return NextResponse.json({ error: "typeName is required" }, { status: 400 });
//     }
    
//     // Check if coin exists
//     const existingCoin = await dynamoDB.send(new GetCommand({
//       TableName: TABLE_NAME,
//       Key: { typeName }
//     }));
    
//     if (!existingCoin.Item) {
//       return NextResponse.json({ error: "Coin not found" }, { status: 404 });
//     }
    
//     // Update the coin
//     await dynamoDB.send(new PutCommand({
//       TableName: TABLE_NAME,
//       Item: coinData
//     }));
    
//     return NextResponse.json(coinData, { status: 200 });
//   } catch (error) {
//     console.error("Error updating coin:", error);
//     return NextResponse.json({ error: "Failed to update coin" }, { status: 500 });
//   }
// }

// // DELETE - Delete a coin
// export async function DELETE(req: NextRequest) {
//   try {
//     await ensureTableExists();
    
//     const { searchParams } = new URL(req.url);
//     const typeName = searchParams.get("typeName");
    
//     if (!typeName) {
//       return NextResponse.json({ error: "typeName query parameter is required" }, { status: 400 });
//     }
    
//     // Check if coin exists
//     const existingCoin = await dynamoDB.send(new GetCommand({
//       TableName: TABLE_NAME,
//       Key: { typeName }
//     }));
    
//     if (!existingCoin.Item) {
//       return NextResponse.json({ error: "Coin not found" }, { status: 404 });
//     }
    
//     // Delete the coin
//     await dynamoDB.send(new DeleteCommand({
//       TableName: TABLE_NAME,
//       Key: { typeName }
//     }));
    
//     return NextResponse.json({ message: "Coin deleted successfully" }, { status: 200 });
//   } catch (error) {
//     console.error("Error deleting coin:", error);
//     return NextResponse.json({ error: "Failed to delete coin" }, { status: 500 });
//   }
// }
