// app/api/pair-stats/route.ts
import { NextRequest, NextResponse } from "next/server";

// Set cache control for this route
export const dynamic = 'force-dynamic'; // Defaults to auto
export const revalidate = 3; // Revalidate every 3 seconds

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
    // Use native fetch with no-store option to always get fresh data from indexer
    // The Next.js framework will handle caching based on revalidate setting
    const response = await fetch(endpoint, { cache: 'no-store' });

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Indexer error response:", text);
      return NextResponse.json({ error: "Indexer returned error" }, { status: response.status });
    }

    const data = await response.json();
    
    // Return with cache control headers
    return NextResponse.json(data, {
      headers: {
        // s-maxage=3: Cache for 3 seconds at the edge (CDN/Vercel)
        // stale-while-revalidate=7: Continue serving stale content for up to 7 additional seconds while fetching new data
        'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=7',
      }
    });
  } catch (err) {
    console.error("❌ Error fetching pair stats:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}