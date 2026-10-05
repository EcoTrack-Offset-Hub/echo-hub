import { NextResponse } from "next/server";
import { serverDatabaseStore } from "@/lib/api/serverState";
import { marketplaceStats } from "@/lib/mock/marketplace";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const standard = searchParams.get("standard");
    const search = searchParams.get("search");

    let projects = [...serverDatabaseStore.getProjects()];

    if (category && category !== "All") {
      projects = projects.filter((p) => p.type === category);
    }
    if (standard && standard !== "All Standards") {
      projects = projects.filter((p) => p.standard === standard);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        projects,
        total: projects.length,
        stats: marketplaceStats,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to load verified offset projects catalog.",
      },
      { status: 500 }
    );
  }
}
