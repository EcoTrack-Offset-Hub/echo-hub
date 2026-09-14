import { NextResponse } from "next/server";
import { ReportRecord } from "@/types";
import { mockReports } from "@/lib/mock/reports";

let serverReports: ReportRecord[] = [...mockReports];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let reports = [...serverReports];

    if (type && type !== "All Reports") {
      reports = reports.filter((r) => r.type === type);
    }
    if (status && status !== "All Statuses") {
      reports = reports.filter((r) => r.status === status);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      reports = reports.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.period.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reports,
        total: reports.length,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load reports library from server.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, period, summary } = body;

    if (!name || !type || !period) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required report parameters: name, type, or period.",
        },
        { status: 422 }
      );
    }

    const newReport: ReportRecord = {
      id: `rep-${Date.now()}`,
      name,
      type,
      period,
      created: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      owner: "Jordan Davis",
      status: "Ready",
      hasDownload: true,
      fileSize: "7.4 MB",
      summary: summary || `Standard ${type} report generated for period ${period}.`,
    };

    serverReports = [newReport, ...serverReports];

    return NextResponse.json({
      success: true,
      message: "Report successfully generated.",
      data: newReport,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Server error occurred during report generation.",
      },
      { status: 500 }
    );
  }
}
