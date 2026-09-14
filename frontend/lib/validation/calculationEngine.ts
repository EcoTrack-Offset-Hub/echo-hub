import { CalculationResult, EmissionCalculationInput } from "@/types";

// Standard GHG Protocol Emission Factors (Mock / Client Reference standard)
export const EMISSION_FACTORS: Record<
  string,
  { factor: number; unit: string; methodology: string; standard: string }
> = {
  "Purchased Electricity": {
    factor: 0.42,
    unit: "kg CO₂e/kWh",
    methodology: "GHG Protocol Scope 2 location-based grid emission factor (regional grid average).",
    standard: "GHG Protocol Corporate Standard (Scope 2)",
  },
  "Fleet & Fuel": {
    factor: 2.68,
    unit: "kg CO₂e/L",
    methodology: "DEFRA mobile combustion factor for diesel transport fuel.",
    standard: "GHG Protocol Scope 1 Mobile Combustion",
  },
  "Business Travel": {
    factor: 0.15,
    unit: "kg CO₂e/passenger-km",
    methodology: "ICAO carbon calculator standard with radiative forcing factor.",
    standard: "GHG Protocol Scope 3 Category 6",
  },
  "Purchased Goods": {
    factor: 29.34,
    unit: "kg CO₂e/tonne",
    methodology: "Cradle-to-gate supplier material carbon intensity database.",
    standard: "GHG Protocol Scope 3 Category 1",
  },
  "Logistics & Freight": {
    factor: 11.66,
    unit: "kg CO₂e/shipment",
    methodology: "Standard road freight distance & weight average intensity.",
    standard: "GHG Protocol Scope 3 Category 4",
  },
  "Facilities": {
    factor: 1.93,
    unit: "kg CO₂e/m³",
    methodology: "Stationary combustion natural gas commercial heating index.",
    standard: "GHG Protocol Scope 1 Stationary Combustion",
  },
  "Other": {
    factor: 1.0,
    unit: "kg CO₂e/unit",
    methodology: "Generic Scope 1/2 reporting factor.",
    standard: "GHG Protocol General Guidance",
  },
};

export function calculateEmissions(input: EmissionCalculationInput): CalculationResult {
  const meta = EMISSION_FACTORS[input.category] || EMISSION_FACTORS["Other"];
  const factor = meta.factor;
  const resultKg = Number((input.consumption * factor).toFixed(2));
  const resultTonnes = Number((resultKg / 1000).toFixed(3));

  const formattedInput = input.consumption.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    input: formattedInput,
    unit: input.unit,
    conversionFactor: factor,
    formula: `${formattedInput} ${input.unit} × ${factor} ${meta.unit} = ${resultKg.toLocaleString("en-US", { minimumFractionDigits: 2 })} kg CO₂e`,
    resultKg,
    resultTonnes,
    methodology: meta.methodology,
    reportingPeriod: input.reportingPeriod,
    activity: `${input.facility} ${input.category}`,
    facility: input.facility,
    scope: input.scope,
    category: input.category,
  };
}

export function validateEmissionInput(input: {
  consumption: number;
  unit: string;
  facility: string;
  reportingPeriod: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.consumption || isNaN(input.consumption) || input.consumption <= 0) {
    errors.consumption = "Please enter a valid positive consumption amount.";
  }

  if (!input.unit || input.unit.trim().length === 0) {
    errors.unit = "Measurement unit is required.";
  }

  if (!input.facility || input.facility.trim().length === 0) {
    errors.facility = "Facility / Location name is required.";
  }

  if (!input.reportingPeriod || input.reportingPeriod.trim().length === 0) {
    errors.reportingPeriod = "Reporting period is required.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
