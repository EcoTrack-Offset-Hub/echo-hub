import Decimal from "decimal.js";
import type { EmissionRecord } from "@/types";

export function recordTonnes(record: EmissionRecord): Decimal {
  const value = record.calculationDetails?.resultTonnesExact ?? record.resultTonnes;
  if (value !== undefined && value !== null && new Decimal(value).isFinite()) return new Decimal(value);
  // Legacy display-only records: parse the leading amount, never digits in CO2e.
  const match = record.emissions.replace(/,/g, "").match(/^\s*([+-]?\d+(?:\.\d+)?)\s*(kg|t)/i);
  if (!match) return new Decimal(0);
  const amount = new Decimal(match[1]);
  return match[2].toLowerCase() === "kg" ? amount.div(1000) : amount;
}
