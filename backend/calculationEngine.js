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
function calculateEmissions(input) {
  const category = normalizeCategory(input.category);
  const meta = SERVER_EMISSION_FACTORS[category] || SERVER_EMISSION_FACTORS["Other"];
  const consumptionNum = Number(input.consumption);

  if (isNaN(consumptionNum) || consumptionNum <= 0) {
    throw new Error("Consumption must be a valid positive number.");
  }

  const factor = meta.factor;
  const resultKg = Number((consumptionNum * factor).toFixed(2));
  const resultTonnes = Number((resultKg / 1000).toFixed(3));

  const formattedInput = consumptionNum.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const unit = input.unit ? String(input.unit).trim() : meta.unit.split("/")[1] || "unit";
  const facility = input.facility ? String(input.facility).trim() : "Main Facility";
  const reportingPeriod = input.reportingPeriod ? String(input.reportingPeriod).trim() : "Current Period";
  const scope = input.scope || meta.defaultScope;
  const activity = input.activity || `${facility} ${category}`;

  const formula = `${formattedInput} ${unit} × ${factor} ${meta.unit} = ${resultKg.toLocaleString("en-US", { minimumFractionDigits: 2 })} kg CO₂e`;

  return {
    input: formattedInput,
    unit,
    conversionFactor: factor,
    formula,
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
