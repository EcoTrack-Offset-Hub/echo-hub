/**
 * DEVELOPMENT / DEMO DATA ONLY — REFERENCE SCHEMA FOR BACKEND DEVELOPER
 *
 * Represents the response contract expected from:
 * GET /api/emissions (or external backend GET /api/v1/emissions)
 * POST /api/emissions
 *
 * Schema includes:
 * - initialEmissionsRecords: list of EmissionRecord objects with id, date, activity, scope, category, quantity, emissions, status, facility.
 * - emissionsSummary: aggregate totals across Scope 1, Scope 2, and Scope 3.
 *
 * DO NOT import directly into production page components.
 * Real PostgreSQL queries should populate this structure dynamically.
 */

import { EmissionRecord } from "@/types";

export const initialEmissionsRecords: EmissionRecord[] = [
  {
    id: "rec-001",
    date: "Sep 08, 2026",
    activity: "Electricity consumption",
    scope: "Scope 2",
    category: "Purchased Electricity",
    quantity: "48,200 kWh",
    emissions: "1,240 tCO₂e",
    status: "Verified",
    facility: "Headquarters Building A",
  },
  {
    id: "rec-002",
    date: "Sep 06, 2026",
    activity: "Fleet diesel usage",
    scope: "Scope 1",
    category: "Fleet & Fuel",
    quantity: "8,420 L",
    emissions: "620 tCO₂e",
    status: "Verified",
    facility: "Distribution Center South",
  },
  {
    id: "rec-003",
    date: "Sep 04, 2026",
    activity: "Business air travel",
    scope: "Scope 3",
    category: "Business Travel",
    quantity: "42 trips",
    emissions: "310 tCO₂e",
    status: "Pending",
    facility: "Corporate Office",
  },
  {
    id: "rec-004",
    date: "Sep 02, 2026",
    activity: "Supplier materials",
    scope: "Scope 3",
    category: "Purchased Goods",
    quantity: "18.4 tons",
    emissions: "540 tCO₂e",
    status: "Verified",
    facility: "Assembly Plant 2",
  },
  {
    id: "rec-005",
    date: "Aug 29, 2026",
    activity: "Freight shipment",
    scope: "Scope 3",
    category: "Logistics & Freight",
    quantity: "24 shipments",
    emissions: "280 tCO₂e",
    status: "Needs Review",
    facility: "Regional Warehouse",
  },
];

export const emissionsSummary = {
  kpis: [
    {
      label: "Total Emissions",
      value: "12,480",
      unit: "tCO₂e",
      trend: "-8.4% vs previous period",
      icon: "cloud",
    },
    {
      label: "Scope 1",
      value: "3,240",
      unit: "tCO₂e",
      trend: "26% of total",
      icon: "flame",
    },
    {
      label: "Scope 2",
      value: "4,860",
      unit: "tCO₂e",
      trend: "39% of total",
      icon: "plug",
    },
    {
      label: "Scope 3",
      value: "4,380",
      unit: "tCO₂e",
      trend: "35% of total",
      icon: "truck",
    },
  ],
  categories: [
    { name: "Purchased Electricity", emissions: 4860, percentage: 39, scope: "Scope 2" },
    { name: "Fleet & Fuel", emissions: 2740, percentage: 22, scope: "Scope 1" },
    { name: "Business Travel", emissions: 1680, percentage: 13, scope: "Scope 3" },
    { name: "Purchased Goods", emissions: 1920, percentage: 15, scope: "Scope 3" },
    { name: "Logistics & Freight", emissions: 1280, percentage: 10, scope: "Scope 3" },
    { name: "Other", emissions: 200, percentage: 1, scope: "Scope 1" },
  ],
  topSources: [
    { rank: "01", source: "Purchased Electricity", scope: "Scope 2", emissions: "4,860 tCO₂e", percentage: 39 },
    { rank: "02", source: "Fleet Fuel", scope: "Scope 1", emissions: "2,740 tCO₂e", percentage: 22 },
    { rank: "03", source: "Purchased Goods", scope: "Scope 3", emissions: "1,920 tCO₂e", percentage: 15 },
    { rank: "04", source: "Business Travel", scope: "Scope 3", emissions: "1,680 tCO₂e", percentage: 13 },
    { rank: "05", source: "Logistics & Freight", scope: "Scope 3", emissions: "1,280 tCO₂e", percentage: 10 },
  ],
  monthlyTimeline: [
    { month: "Oct", scope1: 2100, scope2: 2500, scope3: 2800 },
    { month: "Nov", scope1: 2000, scope2: 2450, scope3: 2700 },
    { month: "Dec", scope1: 1950, scope2: 2550, scope3: 2900 },
    { month: "Jan", scope1: 1800, scope2: 2350, scope3: 2600 },
    { month: "Feb", scope1: 1850, scope2: 2300, scope3: 2550 },
    { month: "Mar", scope1: 1750, scope2: 2200, scope3: 2400 },
    { month: "Apr", scope1: 1700, scope2: 2150, scope3: 2350 },
    { month: "May", scope1: 1650, scope2: 2100, scope3: 2300 },
    { month: "Jun", scope1: 1600, scope2: 2050, scope3: 2250 },
    { month: "Jul", scope1: 1550, scope2: 2000, scope3: 2200 },
    { month: "Aug", scope1: 1500, scope2: 1950, scope3: 2100 },
    { month: "Sep", scope1: 1450, scope2: 1900, scope3: 2050 },
  ],
  dataQuality: {
    percentage: 92,
    incompleteCount: 8,
    message: "8 records require additional information for 100% GHG protocol compliance.",
  },
};
