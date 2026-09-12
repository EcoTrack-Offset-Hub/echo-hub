/**
 * DEVELOPMENT / DEMO DATA ONLY — REFERENCE SCHEMA FOR BACKEND DEVELOPER
 *
 * Represents the response contract expected from:
 * GET /api/dashboard (or external backend GET /api/v1/dashboard)
 *
 * Schema includes:
 * - period: string (active reporting window)
 * - bannerNotice: string (top insight / milestone alert)
 * - kpis: array of 4 KPI cards (Total Footprint, Scope 1, Scope 2, Scope 3)
 * - trendSeries: monthly emissions line chart values
 * - scopeBreakdown: scope distribution percentage and tonnage for donut chart
 * - reductionProgress: corporate emission reduction goal tracking
 * - offsetStatus: corporate carbon offset summary
 *
 * DO NOT import directly into production page components.
 * Real PostgreSQL queries should populate this structure dynamically.
 */

export const dashboardSummary = {
  period: "Current Period (Jan - Jun 2026)",
  bannerNotice: "Your emissions are trending 8.4% lower than the previous reporting period.",
  kpis: [
    {
      label: "Total Carbon Footprint",
      value: "2,487",
      unit: "tCO₂e",
      trend: "-8.4%",
      trendDirection: "down" as const,
      comparison: "vs. previous period",
      icon: "leaf",
      color: "primary",
    },
    {
      label: "Scope 1 Emissions",
      value: "742",
      unit: "tCO₂e",
      trend: "-12.1%",
      trendDirection: "down" as const,
      comparison: "vs. previous period",
      icon: "cloud",
      color: "scope1",
    },
    {
      label: "Scope 2 Emissions",
      value: "986",
      unit: "tCO₂e",
      trend: "-6.3%",
      trendDirection: "down" as const,
      comparison: "vs. previous period",
      icon: "bolt",
      color: "scope2",
    },
    {
      label: "Scope 3 Emissions",
      value: "759",
      unit: "tCO₂e",
      trend: "-5.7%",
      trendDirection: "down" as const,
      comparison: "vs. previous period",
      icon: "truck",
      color: "scope3",
    },
  ],
  trendSeries: [
    { month: "Jan", emissions: 3500 },
    { month: "Feb", emissions: 3300 },
    { month: "Mar", emissions: 2950 },
    { month: "Apr", emissions: 2600 },
    { month: "May", emissions: 2500 },
    { month: "Jun", emissions: 2300 },
  ],
  scopeBreakdown: [
    { scope: "Scope 1", percentage: 29.9, amount: 742, color: "#16A34A" },
    { scope: "Scope 2", percentage: 39.6, amount: 986, color: "#0284C7" },
    { scope: "Scope 3", percentage: 30.5, amount: 759, color: "#10B981" },
  ],
  reductionProgress: {
    percentage: 62,
    target: "20% reduction by 2030",
    currentProgress: "8.4% reduction",
  },
  sustainabilityImpact: {
    savedKg: "124,000",
    equivalentTrees: 5700,
    headline: "Your efforts this period have saved an estimated 124,000 kg of CO₂e — equivalent to planting 5,700 trees.",
  },
  quickActions: [
    { title: "View detailed emissions report", href: "/emissions" },
    { title: "Explore carbon offsets", href: "/marketplace" },
    { title: "Record new activity", href: "/emissions" },
    { title: "View transactions", href: "/transactions" },
  ],
};
