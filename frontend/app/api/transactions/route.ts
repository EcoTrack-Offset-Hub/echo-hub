import { NextResponse } from "next/server";
import { serverDatabaseStore } from "@/lib/api/serverState";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const project = searchParams.get("project");
    const search = searchParams.get("search");

    let transactions = [...serverDatabaseStore.getTransactions()];

    if (status && status !== "All Statuses") {
      transactions = transactions.filter((t) => t.status === status);
    }
    if (project && project !== "All Projects") {
      transactions = transactions.filter((t) => t.project === project);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      transactions = transactions.filter(
        (t) =>
          t.transactionId.toLowerCase().includes(q) ||
          t.project.toLowerCase().includes(q) ||
          t.certificateId.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        total: transactions.length,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to load audit transaction ledger.",
      },
      { status: 500 }
    );
  }
}
