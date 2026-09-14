/**
 * DEVELOPMENT / DEMO DATA ONLY — REFERENCE SCHEMA FOR BACKEND DEVELOPER
 *
 * Represents the response contract expected from:
 * GET /api/reports (or external backend GET /api/v1/reports)
 * POST /api/reports
 *
 * Schema includes:
 * - mockReports: generated ESG sustainability decks, compliance audits, and carbon summaries.
 *
 * DO NOT import directly into production page components.
 * Real PostgreSQL queries should populate this structure dynamically.
 */

import { ReportRecord } from "@/types";

export const mockReports: ReportRecord[] = [
  {
    id: "rep-001",
    name: "2026 Sustainability Performance Report",
    type: "Sustainability",
    period: "Q3 2026",
    created: "Sep 05, 2026",
    owner: "Jordan Davis",
    status: "Ready",
    hasDownload: true,
    fileSize: "14.2 MB",
    summary: "Comprehensive assessment of Scope 1, 2, and 3 emissions, decarbonization milestones, and ESG targets.",
  },
  {
    id: "rep-002",
    name: "Q3 Carbon Emissions Report",
    type: "Emissions",
    period: "Jul–Sep 2026",
    created: "Sep 03, 2026",
    owner: "Jordan Davis",
    status: "Ready",
    hasDownload: true,
    fileSize: "8.6 MB",
    summary: "Breakdown of facility energy consumption, fleet fuel usage, and supply chain logistics carbon load.",
  },
  {
    id: "rep-003",
    name: "Scope 1–3 Emissions Summary",
    type: "Emissions",
    period: "2026 YTD",
    created: "Aug 30, 2026",
    owner: "Jordan Davis",
    status: "Ready",
    hasDownload: true,
    fileSize: "5.1 MB",
    summary: "High-level summary of aggregate greenhouse gas outputs categorized by direct, indirect, and value-chain scopes.",
  },
  {
    id: "rep-004",
    name: "Carbon Offset Activity Report",
    type: "Offsets",
    period: "Q3 2026",
    created: "Aug 28, 2026",
    owner: "Jordan Davis",
    status: "Ready",
    hasDownload: true,
    fileSize: "6.4 MB",
    summary: "Detailed audit of carbon credit retirements, certified project registries (Verra / Gold Standard), and certificates.",
  },
  {
    id: "rep-005",
    name: "GHG Protocol Inventory",
    type: "Compliance",
    period: "2026",
    created: "Aug 20, 2026",
    owner: "Jordan Davis",
    status: "Processing",
    hasDownload: false,
    summary: "Mandatory corporate standard inventory compiling third-party verification calculations.",
  },
  {
    id: "rep-006",
    name: "Monthly Sustainability Snapshot",
    type: "Sustainability",
    period: "August 2026",
    created: "Sep 01, 2026",
    owner: "Jordan Davis",
    status: "Scheduled",
    hasDownload: false,
    summary: "Automated monthly reporting scheduled to deliver executive performance summaries.",
  },
];

export const reportsOverview = {
  kpis: [
    {
      title: "Reports Generated",
      value: "24",
      supporting: "This year",
      trend: "↑ 33.3% vs last year",
      icon: "reports",
    },
    {
      title: "Scheduled Reports",
      value: "6",
      supporting: "Active schedules",
      trend: "3 automated this mo",
      icon: "clock",
    },
    {
      title: "Last Report",
      value: "Sep 05, 2026",
      supporting: "Sustainability Performance",
      trend: "Q3 cycle ready",
      icon: "calendar",
    },
    {
      title: "Data Coverage",
      value: "94%",
      supporting: "Reporting completeness",
      trend: "100% auditable",
      icon: "shieldCheck",
    },
  ],
  scheduledList: [
    { name: "Monthly Emissions Summary", schedule: "1st of every month", type: "Automated" },
    { name: "Board Sustainability Deck", schedule: "Quarterly on 15th", type: "Scheduled" },
    { name: "Compliance Ledger Audit", schedule: "Bi-weekly Fridays", type: "Automated" },
  ],
};
