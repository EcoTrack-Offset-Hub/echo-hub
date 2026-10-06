import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "Current Period";
    const range = searchParams.get("range") || "6M";
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

    // Proxy to authoritative backend API if available
    const authHeader = request.headers.get("authorization");
    const response = await fetch(
      `${backendUrl}/api/dashboard?period=${encodeURIComponent(period)}&range=${encodeURIComponent(range)}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Backend dashboard service unavailable.",
      },
      { status: response.status }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve dashboard performance metrics.",
      },
      { status: 500 }
    );
  }
}
