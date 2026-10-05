// Main Express API entry point for EcoTrack Hub.
const express = require("express");
const cors = require("cors");

// Load server-only environment variables from backend/.env.
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const {
  initDb,
  getAllEmissions,
  insertEmissionRecord,
  findUserByEmail,
  companyExists,
  getEmissionsReport,
  getDashboardData,
  seedUsers,
} = require("./db");
const { calculateEmissions } = require("./calculationEngine");
const { hashPassword, verifyPassword, signToken, requireAuth } = require("./auth");

const app = express();
const PORT = Number(process.env.PORT || 4000);

// Valid units accepted for each emissions category.
const VALID_UNITS = {
  "Purchased Electricity": ["kWh", "MWh"],
  "Fleet & Fuel": ["L", "liters"],
  Facilities: ["m3", "m³"],
  "Business Travel": ["passenger-km"],
  "Purchased Goods": ["tons", "tonnes"],
  "Logistics & Freight": ["shipments"],
  Other: ["unit", "units"],
};

// Allow the local Next.js application to call this API.
app.use(
  cors({
    origin: /^http:\/\/localhost(:\d+)?$/,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Return only the safe user fields; never return a password hash.
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  companyId: user.companyId,
});

// Restrict company users to their own company; admins may choose a company.
function resolveCompany(req, res) {
  const requested = req.query.companyId || req.body?.companyId;

  if (req.user.role === "ADMIN") return requested || null;

  if (requested && requested !== req.user.companyId) {
    res.status(403).json({
      success: false,
      error: "You are not authorized to access another company's data.",
    });
    return undefined;
  }

  return req.user.companyId;
}

// Validate inputs before calculating or saving an emissions record.
function validateInput(body) {
  const errors = {};
  const consumption = Number(body.consumption);

  if (!Number.isFinite(consumption) || consumption <= 0) {
    errors.consumption = "Consumption must be a valid positive number.";
  }
  if (!body.category || !VALID_UNITS[body.category]) {
    errors.category = "A supported emission category is required.";
  }
  if (!body.unit || !VALID_UNITS[body.category]?.includes(String(body.unit).trim())) {
    errors.unit = "The unit is not valid for the selected category.";
  }
  if (!body.facility?.trim()) errors.facility = "Facility is required.";
  if (!body.reportingPeriod?.trim()) errors.reportingPeriod = "Reporting period is required.";

  return errors;
}

// Shape a calculation result into the database record format.
function recordFromCalculation(calculation, companyId) {
  return {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    companyId,
    date: new Date().toISOString(),
    activity: calculation.activity,
    scope: calculation.scope,
    category: calculation.category,
    quantity: `${calculation.input} ${calculation.unit}`,
    emissions:
      calculation.resultTonnes >= 1
        ? `${calculation.resultTonnes.toFixed(2)} tCO2e`
        : `${calculation.resultKg.toFixed(2)} kg CO2e`,
    status: "Verified",
    facility: calculation.facility,
    conversionFactor: calculation.conversionFactor,
    inputUnit: calculation.unit,
    isNew: true,
  };
}

// Public health check for Postman, deployment checks, and local testing.
app.get(["/health", "/api/health"], (_req, res) => {
  res.json({ status: "healthy", service: "ecotrack-backend", database: "postgresql" });
});

// Login: verify credentials and return a signed access token.
app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    return res.json({ success: true, data: { user: publicUser(user), token: signToken(user) } });
  } catch (error) {
    return next(error);
  }
});

// Calculate an emission only; this route does not write to the database.
app.post("/api/emissions/calculate", requireAuth, (req, res) => {
  const errors = validateInput(req.body || {});
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, error: "Validation error.", details: errors });
  }

  try {
    return res.json({ success: true, data: calculateEmissions(req.body) });
  } catch (_error) {
    return res.status(400).json({ success: false, error: "Unable to calculate emissions." });
  }
});

// List saved records for the signed-in company, with optional query filters.
app.get("/api/emissions", requireAuth, async (req, res, next) => {
  try {
    const companyId = resolveCompany(req, res);
    if (companyId === undefined) return;

    const records = await getAllEmissions({ ...req.query, companyId });
    return res.json({ success: true, data: { records, total: records.length } });
  } catch (error) {
    return next(error);
  }
});

// Calculate and save a new emissions record for an authorized company.
app.post("/api/emissions", requireAuth, async (req, res, next) => {
  try {
    const companyId = resolveCompany(req, res);
    if (companyId === undefined) return;
    if (!companyId) {
      return res.status(400).json({ success: false, error: "Admins must select a companyId when creating an emission." });
    }
    if (!(await companyExists(companyId))) {
      return res.status(404).json({ success: false, error: "Company not found." });
    }

    const input = req.body?.input !== undefined
      ? { ...req.body, consumption: Number(String(req.body.input).replace(/,/g, "")) }
      : req.body;
    const errors = validateInput(input || {});
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, error: "Validation error.", details: errors });
    }

    const calculation = calculateEmissions(input);
    const record = recordFromCalculation(calculation, companyId);
    await insertEmissionRecord(record, calculation);
    return res.status(201).json({
      success: true,
      message: "Emission record saved successfully.",
      data: { record, calculation },
    });
  } catch (error) {
    return next(error);
  }
});

// Build a category report for all, monthly, or yearly records.
app.get("/api/reports", requireAuth, async (req, res, next) => {
  try {
    const companyId = resolveCompany(req, res);
    if (companyId === undefined) return;
    if (!companyId) {
      return res.status(400).json({ success: false, error: "Admins must select a companyId for reports." });
    }
    if (!(await companyExists(companyId))) {
      return res.status(404).json({ success: false, error: "Company not found." });
    }

    const month = typeof req.query.month === "string" ? req.query.month : null;
    const year = typeof req.query.year === "string" ? req.query.year : null;
    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ success: false, error: "month must use YYYY-MM format." });
    }
    if (year && !/^\d{4}$/.test(year)) {
      return res.status(400).json({ success: false, error: "year must use YYYY format." });
    }
    if (month && year) {
      return res.status(400).json({ success: false, error: "Specify either month or year, not both." });
    }

    const report = await getEmissionsReport(companyId, { month, year });
    const label = month || year || "All recorded periods";
    return res.json({
      success: true,
      data: {
        companyId,
        period: {
          from: month ? `${month}-01` : year ? `${year}-01-01` : null,
          to: month ? `${month}-31` : year ? `${year}-12-31` : null,
          label,
        },
        ...report,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// Return dashboard totals and category/scope breakdowns for one company.
app.get("/api/dashboard", requireAuth, async (req, res, next) => {
  try {
    const companyId = resolveCompany(req, res);
    if (companyId === undefined) return;
    if (!companyId) {
      return res.status(400).json({ success: false, error: "Admins must select a companyId for the dashboard." });
    }
    if (!(await companyExists(companyId))) {
      return res.status(404).json({ success: false, error: "Company not found." });
    }

    const period = typeof req.query.period === "string" ? req.query.period : "Current Period";
    const supportedPeriods = ["Current Period", "Q2 2026", "Q1 2026", "Full Year 2025"];
    if (!supportedPeriods.includes(period)) {
      return res.status(400).json({ success: false, error: "Unsupported dashboard period." });
    }

    return res.json({ success: true, data: await getDashboardData(companyId, period) });
  } catch (error) {
    return next(error);
  }
});

// Consistent fallback responses for unknown routes and unexpected errors.
app.use((_req, res) => res.status(404).json({ success: false, error: "Route not found." }));
app.use((error, _req, res, _next) => {
  console.error("Backend error:", error.message);
  res.status(500).json({ success: false, error: "Unexpected server error." });
});

// Verify the schema, seed demo users, then start the HTTP server.
async function start() {
  await initDb();
  const password = process.env.SEED_PASSWORD || "EcoTrackDemo!2026";
  await seedUsers([
    { id: "usr-admin-david", email: "admin@ecotrack.test", passwordHash: hashPassword(password), role: "ADMIN", companyId: null },
    { id: "usr-company-a", email: "companya@ecotrack.test", passwordHash: hashPassword(password), role: "COMPANY_USER", companyId: "company-a" },
    { id: "usr-company-b", email: "companyb@ecotrack.test", passwordHash: hashPassword(password), role: "COMPANY_USER", companyId: "company-b" },
  ]);
  app.listen(PORT, () => console.log(`EcoTrack backend listening on port ${PORT}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  });
}

module.exports = { app, start, VALID_UNITS };
