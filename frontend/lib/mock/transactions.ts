/**
 * DEVELOPMENT / DEMO DATA ONLY — REFERENCE SCHEMA FOR BACKEND DEVELOPER
 *
 * Represents the response contract expected from:
 * GET /api/transactions (or external backend GET /api/v1/transactions)
 *
 * Schema includes:
 * - mockTransactions: audit ledger history of serialized offset retirements and certificate IDs.
 *
 * DO NOT import directly into production page components.
 * Real PostgreSQL queries should populate this structure dynamically.
 */

import { TransactionRecord } from "@/types";

export const mockTransactions: TransactionRecord[] = [
  {
    id: "txn-1",
    date: "Sep 08, 2026 10:24 AM",
    transactionId: "TXN-001248",
    project: "Amazonia Reforestation Initiative",
    projectType: "Reforestation",
    projectImage: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=200&auto=format&fit=crop&q=80",
    creditsTCO2e: 10000,
    pricePerTonne: 14.5,
    totalAmount: 145000,
    status: "Completed",
    certificateId: "ECO-CERT-2026-09-8421",
    verificationStandard: "Verra VCS (VCS-1842)",
    registryUrl: "https://registry.verra.org/app/projectDetail/VCS/1842",
  },
  {
    id: "txn-2",
    date: "Sep 05, 2026 02:17 PM",
    transactionId: "TXN-001247",
    project: "Solar Energy Transition",
    projectType: "Renewable Energy",
    projectImage: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200&auto=format&fit=crop&q=80",
    creditsTCO2e: 25000,
    pricePerTonne: 11.8,
    totalAmount: 295000,
    status: "Completed",
    certificateId: "ECO-CERT-2026-09-8419",
    verificationStandard: "Gold Standard (GS-4921)",
    registryUrl: "https://registry.goldstandard.org/projects/details/4921",
  },
  {
    id: "txn-3",
    date: "Sep 02, 2026 11:03 AM",
    transactionId: "TXN-001246",
    project: "Mangrove Restoration Initiative",
    projectType: "Blue Carbon",
    projectImage: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&auto=format&fit=crop&q=80",
    creditsTCO2e: 15000,
    pricePerTonne: 18.2,
    totalAmount: 273000,
    status: "Processing",
    certificateId: "ECO-CERT-2026-09-8415",
    verificationStandard: "Verra VCS (VCS-2391)",
  },
  {
    id: "txn-4",
    date: "Aug 28, 2026 04:32 PM",
    transactionId: "TXN-001245",
    project: "Clean Cookstoves Program",
    projectType: "Clean Cookstoves",
    projectImage: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=200&auto=format&fit=crop&q=80",
    creditsTCO2e: 8500,
    pricePerTonne: 9.4,
    totalAmount: 79900,
    status: "Completed",
    certificateId: "ECO-CERT-2026-08-8390",
    verificationStandard: "Gold Standard (GS-3104)",
  },
  {
    id: "txn-5",
    date: "Aug 25, 2026 09:18 AM",
    transactionId: "TXN-001244",
    project: "Forest Conservation Program",
    projectType: "Forest Conservation",
    projectImage: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&auto=format&fit=crop&q=80",
    creditsTCO2e: 20000,
    pricePerTonne: 16.7,
    totalAmount: 334000,
    status: "Completed",
    certificateId: "ECO-CERT-2026-08-8375",
    verificationStandard: "Verra VCS (VCS-1972)",
  },
  {
    id: "txn-6",
    date: "Aug 20, 2026 01:55 PM",
    transactionId: "TXN-001243",
    project: "Landfill Methane Capture",
    projectType: "Methane Capture",
    projectImage: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=200&auto=format&fit=crop&q=80",
    creditsTCO2e: 12000,
    pricePerTonne: 12.6,
    totalAmount: 151200,
    status: "Needs Review",
    certificateId: "ECO-CERT-2026-08-8361",
    verificationStandard: "Verra VCS (VCS-2041)",
  },
];

export const transactionsSummary = {
  kpis: [
    {
      label: "Total Credits Purchased",
      value: "1,240,000",
      unit: "tCO₂e",
      trend: "↑ 12.3% vs. previous period",
      icon: "leaf",
    },
    {
      label: "Total Transactions",
      value: "48",
      unit: "",
      trend: "↑ 8.5% vs. previous period",
      icon: "credits",
    },
    {
      label: "Total Spent",
      value: "$1,742,000",
      unit: "",
      trend: "↑ 15.2% vs. previous period",
      icon: "dollar",
    },
    {
      label: "Certificates Issued",
      value: "48",
      unit: "",
      trend: "100% of completed transactions",
      icon: "certificate",
    },
  ],
  projectTypeBreakdown: [
    { type: "Reforestation", percentage: 32, color: "#16A34A" },
    { type: "Renewable Energy", percentage: 24, color: "#0284C7" },
    { type: "Forest Conservation", percentage: 18, color: "#10B981" },
    { type: "Clean Cookstoves", percentage: 12, color: "#F59E0B" },
    { type: "Other", percentage: 14, color: "#8B5CF6" },
  ],
  paymentStatusBreakdown: [
    { status: "Completed", count: 42, percentage: 88, color: "#16A34A" },
    { status: "Processing", count: 4, percentage: 8, color: "#F59E0B" },
    { status: "Needs Review", count: 2, percentage: 4, color: "#DC2626" },
  ],
};
