import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { SuiClient } from "@mysten/sui.js/client";
import {
    GETTER_RPC,
    PACKAGE_ID,
    DEX_MODULE_NAME,
    FACTORY_ID,
} from "../../config";

const provider = new SuiClient({ url: GETTER_RPC });
const DEFAULT_SENDER =
    "0x456c66e09501a4519eba083153c199ea91f7a7d15ecf9993f35994d688353f4f"; // Replace as needed

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const typeA = decodeURIComponent(searchParams.get("typeA") || "").trim();
        const typeB = decodeURIComponent(searchParams.get("typeB") || "").trim();

        const sender = searchParams.get("sender") || DEFAULT_SENDER;

        if (!typeA || !typeB) {
            return NextResponse.json(
                { error: "Missing typeA or typeB" },
                { status: 400 }
            );
        }

        // ✅ Construct Transaction Block
        const txb = new TransactionBlock();

        txb.moveCall({
            target: `${PACKAGE_ID}::${DEX_MODULE_NAME}::get_pool_id`,
            typeArguments: [typeA, typeB],
            arguments: [txb.object(FACTORY_ID)],
        });

        const response = await provider.devInspectTransactionBlock({
            sender,
            transactionBlock: txb,
        });

        const result = response.results?.[0];

        if (
            !result?.returnValues ||
            !Array.isArray(result.returnValues) ||
            result.returnValues.length === 0
        ) {
            return NextResponse.json(
                { error: "No pool ID returned from simulation" },
                { status: 404 }
            );
        }

        const [bytes, type] = result.returnValues[0];
        const poolId = `0x${Buffer.from(bytes).toString("hex")}`;

        return NextResponse.json({ poolId }, { status: 200 });
    } catch (error) {
        console.error("Error in get-pool-id API:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}