import { NextResponse } from "next/server";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { SuiClient } from "@mysten/sui.js/client";
import { GETTER_RPC, PACKAGE_ID, QUOTE_MODULE_NAME, CONFIG_ID } from "../../config";

const provider = new SuiClient({ url: GETTER_RPC });
const DEFAULT_SENDER = "0x456c66e09501a4519eba083153c199ea91f7a7d15ecf9993f35994d688353f4f"; // Replace with a real Sui address

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const poolId = searchParams.get("poolId")?.trim();
        const amount = searchParams.get("amount");
        const isSell = searchParams.get("isSell") === "true";
        const isAtoB = searchParams.get("isAtoB") === "true";
        const sender = searchParams.get("sender") || DEFAULT_SENDER;

        // ✅ Required Pool Data
        const balanceA = searchParams.get("balanceA");
        const balanceB = searchParams.get("balanceB");
        const lpBuilderFee = searchParams.get("lpBuilderFee");
        const burnFee = searchParams.get("burnFee");
        const devRoyaltyFee = searchParams.get("devRoyaltyFee");
        const rewardsFee = searchParams.get("rewardsFee");

        if (!poolId || !amount || !balanceA || !balanceB) {
            console.error("Error: Missing required parameters", { poolId, amount, balanceA, balanceB });
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        console.log("Calling get-quote API with:", { poolId, amount, isSell, isAtoB, sender, balanceA, balanceB });

        // ✅ Create Transaction Block
        const txb = new TransactionBlock();
        const method = isSell ? "get_swap_quote_by_sell" : "get_swap_quote_by_buy";

        // ✅ Ensure Values are Numbers
        const amountValue = txb.pure(Number(amount));
        const isAtoBValue = txb.pure(isAtoB);
        const balanceAValue = txb.pure(Number(balanceA));
        const balanceBValue = txb.pure(Number(balanceB));
        const swapFeeValue = txb.pure(100); // ✅ Always 100 basis points
        const lpBuilderFeeValue = txb.pure(Number(lpBuilderFee || 0));
        const burnFeeValue = txb.pure(Number(burnFee || 0));
        const devRoyaltyFeeValue = txb.pure(Number(devRoyaltyFee || 0));
        const rewardsFeeValue = txb.pure(Number(rewardsFee || 0));

        // ✅ Remove `typeArguments` since `quote.move` functions don't need them
        txb.moveCall({
            target: `${PACKAGE_ID}::${QUOTE_MODULE_NAME}::${method}`,
            arguments: [
                amountValue,
                isAtoBValue,
                balanceAValue,
                balanceBValue,
                swapFeeValue,
                lpBuilderFeeValue,
                burnFeeValue,
                devRoyaltyFeeValue,
                rewardsFeeValue
            ],
        });

        console.log("Simulating Transaction...");
        const response = await provider.devInspectTransactionBlock({
            sender,
            transactionBlock: txb,
        });

        console.log("Simulation Response:", JSON.stringify(response, null, 2));

        if (!response || !response.results || response.results.length === 0 || !response.results[0].returnValues) {
            console.error("No quote available, response:", response);
            return NextResponse.json({ error: "No quote available" }, { status: 400 });
        }

        // ✅ Fix: Properly Decode `u64` Return Values
        const decodeU64 = (bytes: number[]) => {
            return bytes.reduce((acc, byte, index) => acc + BigInt(byte) * (BigInt(256) ** BigInt(index)), BigInt(0));
        };

        const quote = response.results[0].returnValues.map(([bytes]: any) =>
            Number(decodeU64(bytes)) / 1_000_000_000
        );

        console.log("Final Quote:", quote);

        return NextResponse.json({ quote }, { status: 200 });

    } catch (error) {
        console.error("Error in get-quote API:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
