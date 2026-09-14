/**
 * DEVELOPMENT / DEMO DATA ONLY — REFERENCE SCHEMA FOR BACKEND DEVELOPER
 *
 * Represents the response contract expected from:
 * GET /api/marketplace (or external backend GET /api/v1/marketplace)
 * POST /api/marketplace/purchase
 *
 * Schema includes:
 * - marketplaceProjects: verified carbon project catalog with availableTCO2e inventory, pricePerTonne, standard (Verra VCS, Gold Standard), etc.
 * - marketplaceStats: aggregate statistics across certified projects.
 *
 * DO NOT import directly into production page components.
 * Real PostgreSQL queries should populate this structure dynamically.
 */

import { MarketplaceProject } from "@/types";

export const marketplaceProjects: MarketplaceProject[] = [
  {
    id: "proj-001",
    name: "Amazonia Reforestation Initiative",
    location: "Brazil",
    country: "Brazil",
    type: "Reforestation",
    standard: "Verra VCS",
    description:
      "Restoring degraded Amazon forest while supporting local communities and biodiversity.",
    tags: ["Biodiversity", "Community Livelihoods"],
    pricePerTonne: 14.5,
    availableTCO2e: 82400,
    badge: "Verified",
    imageUrl: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&auto=format&fit=crop&q=80",
    isSaved: false,
  },
  {
    id: "proj-002",
    name: "Solar Energy Transition",
    location: "India",
    country: "India",
    type: "Renewable Energy",
    standard: "Gold Standard",
    description:
      "Expanding renewable energy access while reducing dependence on fossil-fuel generation.",
    tags: ["Clean Energy", "Local Employment"],
    pricePerTonne: 11.8,
    availableTCO2e: 124000,
    badge: "Gold Standard",
    imageUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
    isSaved: true,
  },
  {
    id: "proj-003",
    name: "Mangrove Restoration Initiative",
    location: "Indonesia",
    country: "Indonesia",
    type: "Blue Carbon",
    standard: "Verra VCS",
    description:
      "Restoring coastal mangrove ecosystems while protecting biodiversity and coastal communities.",
    tags: ["Blue Carbon", "Biodiversity"],
    pricePerTonne: 18.2,
    availableTCO2e: 45600,
    badge: "Verified",
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80",
    isSaved: false,
  },
  {
    id: "proj-004",
    name: "Clean Cookstoves Program",
    location: "Kenya",
    country: "Kenya",
    type: "Clean Cookstoves",
    standard: "Gold Standard",
    description:
      "Improving household energy efficiency and reducing emissions from traditional cooking fuels.",
    tags: ["Health", "Clean Energy"],
    pricePerTonne: 9.4,
    availableTCO2e: 210000,
    badge: "Gold Standard",
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
    isSaved: false,
  },
  {
    id: "proj-005",
    name: "Forest Conservation Program",
    location: "Peru",
    country: "Peru",
    type: "Forest Conservation",
    standard: "Verra VCS",
    description:
      "Protecting threatened forest ecosystems while supporting sustainable local livelihoods.",
    tags: ["Forest Protection", "Community"],
    pricePerTonne: 16.7,
    availableTCO2e: 68300,
    badge: "Verified",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80",
    isSaved: false,
  },
  {
    id: "proj-006",
    name: "Landfill Methane Capture",
    location: "United States",
    country: "United States",
    type: "Methane Capture",
    standard: "Verra VCS",
    description:
      "Capturing landfill methane and converting recovered gas into usable energy.",
    tags: ["Methane Reduction", "Energy Recovery"],
    pricePerTonne: 12.6,
    availableTCO2e: 96700,
    badge: "Verified",
    imageUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80",
    isSaved: false,
  },
];

export const marketplaceStats = {
  remainingTargetTCO2e: "6,400",
  verifiedProjectsCount: 128,
  availableCreditsTCO2e: "2.4M",
};
