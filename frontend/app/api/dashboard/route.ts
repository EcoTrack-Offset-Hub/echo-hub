import { NextResponse } from "next/server";
import { dashboardSummary } from "@/lib/mock/dashboard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "Current Period";

    // Return the aggregated dashboard summary
    return NextResponse.json({
      success: true,
      data: {
        ...dashboardSummary,
        selectedPeriod: period,
      },
    });
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
