import { NextResponse } from "next/server";
import { CalculationResult, EmissionRecord } from "@/types";
import { initialEmissionsRecords, emissionsSummary } from "@/lib/mock/emissions";
import { SERVER_EMISSION_FACTORS } from "./calculate/route";

// Server-side database store (initialized empty to reflect real database state)
let serverEmissionsRecords: EmissionRecord[] = [];

function computeSummary(records: EmissionRecord[]) {
  let totalKg = 0;
  let s1Kg = 0;
  let s2Kg = 0;
  let s3Kg = 0;

  for (const r of records) {
    let kg = 0;
    const clean = r.emissions.replace(/,/g, "").trim();
    const num = parseFloat(clean.replace(/[^\d.-]/g, "")) || 0;
    kg = clean.includes("kg") ? num : num * 1000;

    totalKg += kg;
    if (r.scope === "Scope 1") s1Kg += kg;
    else if (r.scope === "Scope 2") s2Kg += kg;
    else if (r.scope === "Scope 3") s3Kg += kg;
  }

  const totalTonnes = totalKg / 1000;
  const s1T = s1Kg / 1000;
  const s2T = s2Kg / 1000;
  const s3T = s3Kg / 1000;

  return {
    totalEmissions: totalTonnes >= 1 ? totalTonnes.toFixed(1) : totalKg.toFixed(0),
    totalUnit: totalTonnes >= 1 ? "tCO₂e" : "kg CO₂e",
    trend: "-8.4% vs last period",
    scopes: {
      scope1: {
        value: `${s1T.toFixed(1)} tCO₂e`,
        pct: totalKg > 0 ? Math.round((s1Kg / totalKg) * 100) : 0,
      },
      scope2: {
        value: `${s2T.toFixed(1)} tCO₂e`,
        pct: totalKg > 0 ? Math.round((s2Kg / totalKg) * 100) : 0,
      },
      scope3: {
        value: `${s3T.toFixed(1)} tCO₂e`,
        pct: totalKg > 0 ? Math.round((s3Kg / totalKg) * 100) : 0,
      },
    },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let filtered = [...serverEmissionsRecords];

    if (scope && scope !== "All Scopes") {
      filtered = filtered.filter((r) => r.scope === scope);
    }
    if (category && category !== "All Categories") {
      filtered = filtered.filter((r) => r.category === category);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.activity.toLowerCase().includes(q) ||
          r.facility?.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        records: filtered,
        total: filtered.length,
        summary: computeSummary(filtered),
      },
    }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to load emissions data from backend database.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // The body can either be a CalculationResult directly (from review step)
    // or an EmissionCalculationInput
    let calculation: CalculationResult;

    if (body.formula && body.resultKg !== undefined) {
      // Already calculated object from backend review
      calculation = body as CalculationResult;
    } else {
      // Calculate server-side from input
      const consumptionNum = Number(body.consumption);
      if (isNaN(consumptionNum) || consumptionNum <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Please check the entered data: consumption must be greater than zero.",
            details: { consumption: "Must be a valid positive number." },
          },
          { status: 400 }
        );
      }

      if (!body.unit || !body.facility || !body.reportingPeriod || !body.category) {
        return NextResponse.json(
          {
            success: false,
            error: "Please check the entered data: missing required activity metadata.",
            details: {
              unit: !body.unit ? "Unit is required." : "",
              facility: !body.facility ? "Facility is required." : "",
              reportingPeriod: !body.reportingPeriod ? "Reporting period is required." : "",
            },
          },
          { status: 400 }
        );
      }

      const meta = SERVER_EMISSION_FACTORS[body.category] || SERVER_EMISSION_FACTORS["Other"];
      const factor = meta.factor;
      const resultKg = Number((consumptionNum * factor).toFixed(2));
      const resultTonnes = Number((resultKg / 1000).toFixed(3));
      const formattedInput = consumptionNum.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      calculation = {
        input: formattedInput,
        unit: body.unit,
        conversionFactor: factor,
        formula: `${formattedInput} ${body.unit} × ${factor} ${meta.unit} = ${resultKg.toLocaleString("en-US", { minimumFractionDigits: 2 })} kg CO₂e`,
        resultKg,
        resultTonnes,
        methodology: meta.methodology,
        reportingPeriod: body.reportingPeriod,
        activity: `${body.facility} ${body.category}`,
        facility: body.facility,
        scope: body.scope || (meta.defaultScope as CalculationResult["scope"]),
        category: body.category,
      };
    }

    // Format new ledger record
    const newRecord: EmissionRecord = {
      id: `rec-${Date.now()}`,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      activity: calculation.activity || `${calculation.facility} ${calculation.category}`,
      scope: calculation.scope,
      category: calculation.category,
      quantity: `${calculation.input} ${calculation.unit}`,
      emissions: calculation.resultTonnes >= 1
        ? `${calculation.resultTonnes.toLocaleString("en-US", { minimumFractionDigits: 2 })} tCO₂e`
        : `${calculation.resultKg.toLocaleString("en-US", { minimumFractionDigits: 2 })} kg CO₂e`,
      status: "Verified",
      facility: calculation.facility,
      conversionFactor: calculation.conversionFactor,
      isNew: true,
    };

    // Prepend to server database store
    serverEmissionsRecords = [newRecord, ...serverEmissionsRecords];

    return NextResponse.json({
      success: true,
      message: "Emission record saved successfully.",
      data: {
        record: newRecord,
        calculation,
        totalRecords: serverEmissionsRecords.length,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error occurred while persisting emission record.",
      },
      { status: 500 }
    );
  }
}
