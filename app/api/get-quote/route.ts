import { NextResponse } from "next/server";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { SuiClient } from "@mysten/sui.js/client";
import { GETTER_RPC, PACKAGE_ID, QUOTE_MODULE_NAME } from "../../config";

const SWAP_FEE_BPS = 10; // 0.1% = 10 basis points

const provider = new SuiClient({ url: GETTER_RPC });
const DEFAULT_SENDER = "0x456c66e09501a4519eba083153c199ea91f7a7d15ecf9993f35994d688353f4f"; // Replace with a real Sui address

// ✅ Helper function to decode `u64` values from byte arrays
function decodeU64(bytes: number[]): bigint {
    if (!Array.isArray(bytes) || bytes.length !== 8) {
        console.error("Invalid byte array for u64 decoding:", bytes);
        return BigInt(0); // Return 0 if there's an issue
    }
    return (
        BigInt(bytes[0]) |
        (BigInt(bytes[1]) << 8n) |
        (BigInt(bytes[2]) << 16n) |
        (BigInt(bytes[3]) << 24n) |
        (BigInt(bytes[4]) << 32n) |
        (BigInt(bytes[5]) << 40n) |
        (BigInt(bytes[6]) << 48n) |
        (BigInt(bytes[7]) << 56n)
    );
}

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

        // ✅ Create Transaction Block
        const txb = new TransactionBlock();
        const method = isSell ? "get_swap_quote_by_sell" : "get_swap_quote_by_buy";

        // ✅ Convert Values to Correct Types
        const amountValue = txb.pure.u64(BigInt(amount));
        const isAtoBValue = txb.pure.bool(isAtoB);
        const balanceAValue = txb.pure.u64(BigInt(balanceA));
        const balanceBValue = txb.pure.u64(BigInt(balanceB));
        const swapFeeValue = txb.pure.u64(SWAP_FEE_BPS);
        const lpBuilderFeeValue = txb.pure.u64(Number(lpBuilderFee) || 0);
        const burnFeeValue = txb.pure.u64(Number(burnFee) || 0);
        const devRoyaltyFeeValue = txb.pure.u64(Number(devRoyaltyFee) || 0);
        const rewardsFeeValue = txb.pure.u64(Number(rewardsFee) || 0);

        console.log("🔥 Swap Debug:");
        console.log("- Buy/Sell Mode:", isSell ? "SELL" : "BUY");
        console.log("- Amount:", amountValue);
        console.log("- isAtoB:", isAtoBValue);
        console.log("- Pool Balance A:", balanceAValue);
        console.log("- Pool Balance B:", balanceBValue);
        console.log("- Swap Fee:", swapFeeValue);
        console.log("- LP Fee:", lpBuilderFeeValue);
        console.log("- Burn Fee:", burnFeeValue);
        console.log("- Dev Fee:", devRoyaltyFeeValue);
        console.log("- Rewards Fee:", rewardsFeeValue);

        console.log("🚀 Checking API inputs before Move call:", {
            isSell,
            isAtoB,
            amount,
            balanceA,
            balanceB,
            swapFeeValue,
            lpBuilderFeeValue,
            burnFeeValue,
            devRoyaltyFeeValue,
            rewardsFeeValue
        });

        // ✅ Standardized Argument Order
        const argumentsList = [
            amountValue,
            isAtoBValue,
            balanceAValue,
            balanceBValue,
            swapFeeValue,
            lpBuilderFeeValue,
            burnFeeValue,
            devRoyaltyFeeValue,
            rewardsFeeValue
        ];

        console.log("✅ Arguments Passed to Move Call:", argumentsList);


        console.log("✅ Arguments Passed to Move Call:", argumentsList);

        // ✅ Call the Move function with corrected arguments
        txb.moveCall({
            target: `${PACKAGE_ID}::${QUOTE_MODULE_NAME}::${method}`,
            arguments: argumentsList,
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

        // ✅ Decode return values properly
        const rawReturnValues = response.results[0].returnValues;

        if (!rawReturnValues || !Array.isArray(rawReturnValues)) {
            console.error("Invalid return values:", rawReturnValues);
            return NextResponse.json({ error: "Invalid return values" }, { status: 400 });
        }

        const quote = rawReturnValues.map(([bytes, type]: any) => {
            if (type === "u64") {
                const value = Number(decodeU64(bytes)) / 1_000_000_000;
                console.log("Decoded Quote (Converted):", value);
                return value.toFixed(6);
            }
            return "0.000000";
        });

        // ✅ Return the correct computed input value
        const responseQuote = isSell ? { buyAmount: quote[0] } : { sellAmount: quote[0] };
        console.log("Final Quote Response:", responseQuote);

        return NextResponse.json(responseQuote, { status: 200 });

    } catch (error) {
        console.error("Error in get-quote API:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}