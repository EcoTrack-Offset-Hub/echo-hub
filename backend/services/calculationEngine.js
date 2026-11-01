const { decimal } = require('./precision');
// Authoritative emission factors used by the backend calculation endpoint.
const SERVER_EMISSION_FACTORS = {
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

// Map user-friendly category text to a supported standard GHG category.
function normalizeCategory(catStr) {
  if (!catStr) return "Purchased Electricity";
  const lower = String(catStr).toLowerCase().trim();
  if (lower.includes("electric") || lower === "energy" || lower.includes("power")) {
    return "Purchased Electricity";
  }
  if (lower.includes("fleet") || lower.includes("fuel") || lower === "transportation" || lower.includes("vehicle")) {
    return "Fleet & Fuel";
  }
  if (lower.includes("facilit") || lower.includes("building") || lower.includes("gas") || lower.includes("heating")) {
    return "Facilities";
  }
  if (lower.includes("travel") || lower.includes("flight")) {
    return "Business Travel";
  }
  if (lower.includes("good") || lower.includes("supply") || lower.includes("purchased")) {
    return "Purchased Goods";
  }
  if (lower.includes("logistic") || lower.includes("freight") || lower.includes("ship")) {
    return "Logistics & Freight";
  }
  if (SERVER_EMISSION_FACTORS[catStr]) {
    return catStr;
  }
  return "Other";
}

// Convert validated activity data into kg and tonnes CO2e plus audit details.
function calculateEmissions(input, factorMetadata) {
  const category = normalizeCategory(input.category);
  const meta = factorMetadata || SERVER_EMISSION_FACTORS[category] || SERVER_EMISSION_FACTORS["Other"];
  const amount = decimal(input.consumption);
  if (amount.lte(0) || amount.gt('999999999999') || amount.decimalPlaces() > 8) {
    throw new Error("Consumption must be positive, at most 999999999999, with up to 8 decimal places.");
  }
  const baseUnit = SERVER_EMISSION_FACTORS[category].unit.split("/")[1];
  const units = {
    "Purchased Electricity": { kWh: 1, MWh: 1000 },
    "Fleet & Fuel": { L: 1, liters: 1 },
    Facilities: { m3: 1, "m\u00b3": 1 },
    "Business Travel": { "passenger-km": 1 },
    "Purchased Goods": { tons: 1, tonnes: 1 },
    "Logistics & Freight": { shipments: 1 },
    Other: { unit: 1, units: 1 },
  };
  const unit = String(input.unit || baseUnit).trim();
  const multiplier = units[category][unit];
  if (multiplier === undefined) throw new Error("The unit is not valid for this category.");
  const factor = decimal(meta.factor);
  const normalized = amount.times(multiplier);
  const kg = normalized.times(factor).toDecimalPlaces(8);
  if (kg.gte("1e24")) throw new Error("Calculated emissions exceed the supported range.");
  const resultKg = kg.toNumber();
  const resultTonnes = kg.div(1000).toNumber();
  const formattedInput = amount.toFixed();
  const facility = input.facility ? String(input.facility).trim() : "Main Facility";
  const reportingPeriod = input.reportingPeriod ? String(input.reportingPeriod).trim() : "Current Period";
  const scope = meta.defaultScope || SERVER_EMISSION_FACTORS[category].defaultScope;
  const activity = input.activity || `${facility} ${category}`;

  const formula = `${formattedInput} ${unit} * ${multiplier} ${baseUnit}/${unit} * ${factor.toFixed()} ${meta.unit} = ${kg.toFixed()} kg CO2e`;

  return {
    input: formattedInput,
    unit,
    conversionFactor: factor.toNumber(),
    factorUnit: meta.unit,
    normalizedInput: normalized.toFixed(),
    normalizedUnit: baseUnit,
    assumptions: meta.assumptions || "Category-average intensity; purchased goods uses metric tonnes. Results are estimates, not independently verified emissions.",
    source: meta.source || "Built-in illustrative factor; replace with an approved regional/source-specific factor before compliance reporting.",
    factorVersionId: meta.id || null,
    formula,
    resultKgExact: kg.toFixed(),
    resultTonnesExact: kg.div(1000).toFixed(),
    resultKg,
    resultTonnes,
    methodology: meta.methodology,
    reportingPeriod,
    activity,
    facility,
    scope,
    category,
  };
}

module.exports = {
  SERVER_EMISSION_FACTORS,
  normalizeCategory,
  calculateEmissions,
};
