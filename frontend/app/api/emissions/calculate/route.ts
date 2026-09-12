import { NextResponse } from "next/server";
import { CalculationResult, EmissionCalculationInput } from "@/types";

// Standard GHG Protocol Emission Factors (Server Authority)
export const SERVER_EMISSION_FACTORS: Record<
  string,
  { factor: number; unit: string; methodology: string; standard: string; defaultScope: string }
> = {
  "Purchased Electricity": {
    factor: 0.42,
    unit: "kg CO₂e/kWh",
    methodology: "GHG Protocol Scope 2 location-based grid emission factor (regional grid average).",
    standard: "GHG Protocol Corporate Standard (Scope 2)",
    defaultScope: "Scope 2",
  },
  "Fleet & Fuel": {
    factor: 2.68,
    unit: "kg CO₂e/L",
    methodology: "DEFRA mobile combustion factor for diesel transport fuel.",
    standard: "GHG Protocol Scope 1 Mobile Combustion",
    defaultScope: "Scope 1",
  },
  "Facilities": {
    factor: 1.93,
    unit: "kg CO₂e/m³",
    methodology: "Stationary combustion natural gas commercial heating index.",
    standard: "GHG Protocol Scope 1 Stationary Combustion",
    defaultScope: "Scope 1",
  },
  "Business Travel": {
    factor: 0.15,
    unit: "kg CO₂e/passenger-km",
    methodology: "ICAO carbon calculator standard with radiative forcing factor.",
    standard: "GHG Protocol Scope 3 Category 6",
    defaultScope: "Scope 3",
  },
  "Purchased Goods": {
    factor: 29.34,
    unit: "kg CO₂e/tonne",
    methodology: "Cradle-to-gate supplier material carbon intensity database.",
    standard: "GHG Protocol Scope 3 Category 1",
    defaultScope: "Scope 3",
  },
  "Logistics & Freight": {
    factor: 11.66,
    unit: "kg CO₂e/shipment",
    methodology: "Standard road freight distance & weight average intensity.",
    standard: "GHG Protocol Scope 3 Category 4",
    defaultScope: "Scope 3",
  },
  "Other": {
    factor: 1.0,
    unit: "kg CO₂e/unit",
    methodology: "Generic Scope 1/2 reporting factor.",
    standard: "GHG Protocol General Guidance",
    defaultScope: "Scope 3",
  },
};

export async function POST(request: Request) {
  try {
    const body: EmissionCalculationInput = await request.json();

    // Backend Validation
    const details: Record<string, string> = {};

    if (body.consumption === undefined || body.consumption === null || isNaN(Number(body.consumption)) || Number(body.consumption) <= 0) {
      details.consumption = "Consumption must be a valid positive number.";
    }

    if (!body.unit || typeof body.unit !== "string" || body.unit.trim().length === 0) {
      details.unit = "Measurement unit is required.";
    }

    if (!body.facility || typeof body.facility !== "string" || body.facility.trim().length === 0) {
      details.facility = "Facility or entity location is required.";
    }

    if (!body.reportingPeriod || typeof body.reportingPeriod !== "string" || body.reportingPeriod.trim().length === 0) {
      details.reportingPeriod = "Reporting period is required.";
    }

    if (!body.category) {
      details.category = "Emission category is required.";
    }

    if (Object.keys(details).length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Backend validation failed for emission calculation input.",
          details,
        },
        { status: 422 }
      );
    }

    const meta = SERVER_EMISSION_FACTORS[body.category] || SERVER_EMISSION_FACTORS["Other"];
    const factor = meta.factor;
    const consumptionNum = Number(body.consumption);
    const resultKg = Number((consumptionNum * factor).toFixed(2));
    const resultTonnes = Number((resultKg / 1000).toFixed(3));

    const formattedInput = consumptionNum.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const calculation: CalculationResult = {
      input: formattedInput,
      unit: body.unit.trim(),
      conversionFactor: factor,
      formula: `${formattedInput} ${body.unit.trim()} × ${factor} ${meta.unit} = ${resultKg.toLocaleString("en-US", { minimumFractionDigits: 2 })} kg CO₂e`,
      resultKg,
      resultTonnes,
      methodology: meta.methodology,
      reportingPeriod: body.reportingPeriod.trim(),
      activity: `${body.facility.trim()} ${body.category}`,
      facility: body.facility.trim(),
      scope: body.scope || (meta.defaultScope as CalculationResult["scope"]),
      category: body.category,
    };

    return NextResponse.json({
      success: true,
      data: calculation,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to calculate emissions on backend. Malformed request.",
      },
      { status: 400 }
    );
  }
}
