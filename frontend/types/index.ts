export type ScopeType = "Scope 1" | "Scope 2" | "Scope 3";

export type UserRole = "ADMIN" | "COMPANY_USER";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  companyId: string | null;
}

export interface AuthSession {
  token: string;
  user: AuthenticatedUser;
}

export interface Company {
  id: "company-a" | "company-b";
  name: "Company A" | "Company B";
}

export interface ReportBreakdown {
  category: string;
  co2e: number;
}

export interface EmissionsReport {
  companyId: string;
  period: { from: string; to: string; label: string };
  totalCo2e: number;
  breakdown: ReportBreakdown[];
  recordCount: number;
}

export type EmissionCategory =
  | "Purchased Electricity"
  | "Fleet & Fuel"
  | "Business Travel"
  | "Purchased Goods"
  | "Logistics & Freight"
  | "Facilities"
  | "Other";

export type EmissionStatus = "Verified" | "Pending" | "Needs Review";

export interface EmissionRecord {
  id: string;
  date: string;
  activity: string;
  scope: ScopeType;
  category: EmissionCategory;
  quantity: string;
  emissions: string; // e.g. "420.00 kg CO₂e" or "1,240 tCO₂e"
  status: EmissionStatus;
  facility?: string;
  conversionFactor?: number;
  inputUnit?: string;
  isNew?: boolean;
}

export interface EmissionCalculationInput {
  category: EmissionCategory;
  scope: ScopeType;
  consumption: number;
  unit: string;
  reportingPeriod: string;
  facility: string;
}

export interface CalculationResult {
  input: string;
  unit: string;
  conversionFactor: number;
  formula: string;
  resultKg: number;
  resultTonnes: number;
  methodology: string;
  reportingPeriod: string;
  activity: string;
  facility: string;
  scope: ScopeType;
  category: EmissionCategory;
}

export type ProjectStandard = "Verra VCS" | "Gold Standard" | "American Carbon Registry";
export type ProjectCategory =
  | "Reforestation"
  | "Renewable Energy"
  | "Forest Conservation"
  | "Methane Capture"
  | "Clean Cookstoves"
  | "Blue Carbon";

export interface MarketplaceProject {
  id: string;
  name: string;
  location: string;
  country: string;
  type: ProjectCategory;
  standard: ProjectStandard;
  description: string;
  tags: string[];
  pricePerTonne: number;
  availableTCO2e: number;
  imageUrl: string;
  badge: "Verified" | "Gold Standard";
  isSaved?: boolean;
}

export interface PurchaseOrder {
  id: string;
  projectId: string;
  projectName: string;
  quantityTCO2e: number;
  pricePerTonne: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  certificateId: string;
  date: string;
  status: "Completed" | "Processing" | "Needs Review";
}

export interface TransactionRecord {
  id: string;
  date: string;
  transactionId: string;
  project: string;
  projectType: ProjectCategory;
  projectImage: string;
  creditsTCO2e: number;
  pricePerTonne: number;
  totalAmount: number;
  status: "Completed" | "Processing" | "Needs Review";
  certificateId: string;
  verificationStandard: string;
  registryUrl?: string;
}

export type ReportType = "All Reports" | "Emissions" | "Sustainability" | "Offsets" | "Compliance";
export type ReportStatus = "Ready" | "Processing" | "Scheduled";

export interface ReportRecord {
  id: string;
  name: string;
  type: "Emissions" | "Sustainability" | "Offsets" | "Compliance";
  period: string;
  created: string;
  owner: string;
  status: ReportStatus;
  hasDownload: boolean;
  fileSize?: string;
  summary?: string;
}

export interface OrganizationContext {
  id: string;
  name: string;
  role: string;
  tier: string;
}
