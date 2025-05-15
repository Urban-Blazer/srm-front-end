// app/api/holders/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const coinType = searchParams.get('coinType');
  if (!coinType) {
    return NextResponse.json({ error: 'coinType is required' }, { status: 400 });
  }

  const apiKey = process.env.BLOCKVISION_API_KEY!;
  const url = `https://api.blockvision.org/v2/sui/coin/holders`
            + `?coinType=${encodeURIComponent(coinType)}`
            + `&pageIndex=1&pageSize=50`;

  const res = await fetch(url, { headers: { 
    accept: 'application/json',
    'x-api-key': apiKey
  }});

  if (!res.ok) {
    return NextResponse.json({ error: 'Error fetching from BlockVision' }, { status: res.status });
  }

  const payload = await res.json();
  return NextResponse.json(payload);
}
