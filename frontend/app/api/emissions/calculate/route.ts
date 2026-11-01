import { NextResponse } from "next/server";

// All calculations use the authenticated Express service and its versioned factors.
export async function POST(request: Request) {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
  const endpoint = base.endsWith("/api") ? `${base}/emissions/calculate` : `${base}/api/emissions/calculate`;
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: request.headers.get("Authorization") || "" }, body: await request.text(), cache: "no-store" });
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json" } });
  } catch {
    return NextResponse.json({ success: false, error: "Calculation service unavailable." }, { status: 503 });
  }
}
