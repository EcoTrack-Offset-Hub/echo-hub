import { NextResponse } from "next/server";
import { serverDatabaseStore } from "@/lib/api/serverState";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, quantityTCO2e } = body;

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: "Project ID is required.",
        },
        { status: 400 }
      );
    }

    const qty = Number(quantityTCO2e);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Requested quantity must be a positive number.",
        },
        { status: 422 }
      );
    }

    try {
      const result = serverDatabaseStore.purchaseCredits(projectId, qty);
      return NextResponse.json({
        success: true,
        message: "Carbon credits retired and transaction registered.",
        data: result,
      });
    } catch (purchaseError: unknown) {
      const msg = purchaseError instanceof Error ? purchaseError.message : "Inventory validation failed.";
      return NextResponse.json(
        {
          success: false,
          error: msg,
        },
        { status: 422 }
      );
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Server error occurred while processing carbon credit retirement.",
      },
      { status: 500 }
    );
  }
}
