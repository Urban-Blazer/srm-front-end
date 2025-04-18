// app/api/get-coina-price/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.NINJA_API_KEY!;
const API_URL = "https://api.api-ninjas.com/v1/cryptoprice";

export async function GET(req: NextRequest) {
    const symbol = req.nextUrl.searchParams.get("symbol");

    if (!symbol) {
        return NextResponse.json({ error: "Missing 'symbol' query parameter" }, { status: 400 });
    }

    try {
        const response = await fetch(`${API_URL}?symbol=${symbol}`, {
            method: "GET",
            headers: {
                "X-Api-Key": API_KEY!,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: `API Error: ${response.statusText}`, details: errorText }, { status: response.status });
        }

        const data = await response.json();

        return NextResponse.json({ price: parseFloat(data.price) });
    } catch (error: any) {
        console.error("Error fetching Coin A price:", error);
        return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
    }
}