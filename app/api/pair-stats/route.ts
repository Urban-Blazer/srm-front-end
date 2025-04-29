// app/api/stats/pair/route.ts
import { NextRequest, NextResponse } from "next/server";

const INDEXER_BASE = process.env.INDEXER_URL || "http://localhost:3000"; // Point to your Express API

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const poolId = searchParams.get("poolId");
    const range = searchParams.get("range");

    if (!poolId || !range) {
        return NextResponse.json({ error: "Missing poolId or range" }, { status: 400 });
    }

    const endpoint = `${INDEXER_BASE}/stats/pair?poolId=${encodeURIComponent(poolId)}&range=${encodeURIComponent(range)}`;

    try {
        const response = await fetch(endpoint);

        if (!response.ok) {
            const text = await response.text();
            console.error("❌ Indexer error response:", text);
            return NextResponse.json({ error: "Indexer returned error" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error("❌ Error fetching pair stats:", err);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}