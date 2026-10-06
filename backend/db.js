// PostgreSQL data-access layer. All backend database queries stay in this file.
let pgPool = null;

// Enforce verified TLS for the Supabase PostgreSQL connection.
function secureSupabaseConnectionString(databaseUrl) {
  const caPath = process.env.SUPABASE_SSL_ROOT_CERT_PATH;
  if (!caPath) {
    throw new Error("SUPABASE_SSL_ROOT_CERT_PATH is required for verified Supabase TLS. Download the database root certificate from Supabase Dashboard and set its server-only path.");
  }

  let connectionString = databaseUrl.replace(/([?&])sslmode=[^&]*/i, "$1sslmode=verify-full");
  if (!/[?&]sslmode=/i.test(connectionString)) {
    connectionString += `${connectionString.includes("?") ? "&" : "?"}sslmode=verify-full`;
  }
  if (!/[?&]sslrootcert=/i.test(connectionString)) {
    connectionString += `&sslrootcert=${encodeURIComponent(caPath)}`;
  }
  return connectionString;
}

// Create one reusable connection pool rather than reconnecting for each request.
async function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. The backend does not fall back to in-memory or embedded storage.");
  }
  if (!pgPool) {
    const { Pool } = require("pg");
    pgPool = new Pool({ connectionString: secureSupabaseConnectionString(process.env.DATABASE_URL) });
  }
  return {
    type: "pg",
    query: async (text, params) => {
      const res = await pgPool.query(text, params);
      return { rows: res.rows };
    },
  };
}

const DEMO_PROJECTS = [
  {
    id: "proj-001",
    name: "Amazonia Reforestation Initiative",
    location: "Brazil",
    country: "Brazil",
    type: "Reforestation",
    standard: "Verra VCS",
    description: "Restoring degraded Amazon forest while supporting local communities and biodiversity.",
    tags: ["Biodiversity", "Community Livelihoods"],
    pricePerTonne: 14.5,
    availableTCO2e: 82400,
    badge: "Verified",
    vintage: "2024",
    registryRef: "VCS-1842",
    imageUrl: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "proj-002",
    name: "Solar Energy Transition",
    location: "India",
    country: "India",
    type: "Renewable Energy",
    standard: "Gold Standard",
    description: "Expanding renewable energy access while reducing dependence on fossil-fuel generation.",
    tags: ["Clean Energy", "Local Employment"],
    pricePerTonne: 11.8,
    availableTCO2e: 124000,
    badge: "Gold Standard",
    vintage: "2023",
    registryRef: "GS-4921",
    imageUrl: "https://images.unsplash.com/photo-1594818379496-da1e345b0ded?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "proj-003",
    name: "Mangrove Restoration Initiative",
    location: "Indonesia",
    country: "Indonesia",
    type: "Blue Carbon",
    standard: "Verra VCS",
    description: "Restoring coastal mangrove ecosystems while protecting biodiversity and coastal communities.",
    tags: ["Blue Carbon", "Biodiversity"],
    pricePerTonne: 18.2,
    availableTCO2e: 45600,
    badge: "Verified",
    vintage: "2024",
    registryRef: "VCS-2391",
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "proj-004",
    name: "Clean Cookstoves Program",
    location: "Kenya",
    country: "Kenya",
    type: "Clean Cookstoves",
    standard: "Gold Standard",
    description: "Improving household energy efficiency and reducing emissions from traditional cooking fuels.",
    tags: ["Health", "Clean Energy"],
    pricePerTonne: 9.4,
    availableTCO2e: 210000,
    badge: "Gold Standard",
    vintage: "2023",
    registryRef: "GS-3104",
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "proj-005",
    name: "Forest Conservation Program",
    location: "Peru",
    country: "Peru",
    type: "Forest Conservation",
    standard: "Verra VCS",
    description: "Protecting threatened forest ecosystems while supporting sustainable local livelihoods.",
    tags: ["Forest Protection", "Community"],
    pricePerTonne: 16.7,
    availableTCO2e: 68300,
    badge: "Verified",
    vintage: "2024",
    registryRef: "VCS-1972",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "proj-006",
    name: "Landfill Methane Capture",
    location: "United States",
    country: "United States",
    type: "Methane Capture",
    standard: "Verra VCS",
    description: "Capturing landfill methane and converting recovered gas into usable energy.",
    tags: ["Methane Reduction", "Energy Recovery"],
    pricePerTonne: 12.6,
    availableTCO2e: 96700,
    badge: "Verified",
    vintage: "2023",
    registryRef: "VCS-2041",
    imageUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80",
  },
];

async function seedOffsetProjects() {
  const db = await getDb();
  for (const p of DEMO_PROJECTS) {
    await db.query(
      `INSERT INTO offset_projects (
        id, name, location, country, type, standard, description, tags, price_per_tonne, available_tco2e, badge, image_url, vintage, registry_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        location = EXCLUDED.location,
        country = EXCLUDED.country,
        type = EXCLUDED.type,
        standard = EXCLUDED.standard,
        description = EXCLUDED.description,
        tags = EXCLUDED.tags,
        price_per_tonne = EXCLUDED.price_per_tonne,
        badge = EXCLUDED.badge,
        image_url = EXCLUDED.image_url,
        vintage = EXCLUDED.vintage,
        registry_ref = EXCLUDED.registry_ref`,
      [p.id, p.name, p.location, p.country, p.type, p.standard, p.description, p.tags, p.pricePerTonne, p.availableTCO2e, p.badge, p.imageUrl, p.vintage, p.registryRef]
    );
  }
}

// Fail fast if required schema is missing and apply idempotent table updates.
async function initDb() {
  const db = await getDb();
  const { rows } = await db.query("SELECT to_regclass('public.companies') AS companies, to_regclass('public.users') AS users, to_regclass('public.emissions') AS emissions");
  if (!rows[0]?.companies || !rows[0]?.users || !rows[0]?.emissions) {
    throw new Error("Database schema is missing. Apply backend/migrations/001_auth_company_emissions.sql before starting the backend.");
  }

  // Ensure companies status column exists (Migration 003)
  await db.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'Active'");

  // Ensure offset_projects and transactions tables exist (Migration 002)
  await db.query(`
    CREATE TABLE IF NOT EXISTS offset_projects (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      country VARCHAR(255) NOT NULL,
      type VARCHAR(64) NOT NULL,
      standard VARCHAR(64) NOT NULL,
      description TEXT NOT NULL,
      tags TEXT[] DEFAULT '{}',
      price_per_tonne NUMERIC(10,2) NOT NULL CHECK (price_per_tonne > 0),
      available_tco2e NUMERIC(12,2) NOT NULL CHECK (available_tco2e >= 0),
      badge VARCHAR(64) NOT NULL DEFAULT 'Verified',
      image_url TEXT,
      vintage VARCHAR(32) DEFAULT '2024',
      registry_ref VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(64) PRIMARY KEY,
      transaction_id VARCHAR(64) NOT NULL UNIQUE,
      company_id VARCHAR(64) NOT NULL REFERENCES companies(id),
      project_id VARCHAR(64) NOT NULL REFERENCES offset_projects(id),
      credits_tco2e NUMERIC(12,2) NOT NULL CHECK (credits_tco2e > 0),
      price_per_tonne NUMERIC(10,2) NOT NULL,
      subtotal NUMERIC(14,2) NOT NULL,
      service_fee NUMERIC(14,2) NOT NULL,
      total_amount NUMERIC(14,2) NOT NULL,
      certificate_id VARCHAR(64) NOT NULL UNIQUE,
      status VARCHAR(32) NOT NULL DEFAULT 'Completed',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await seedOffsetProjects();
}

// Return emissions records with safe, parameterized optional filters.
async function getAllEmissions(filters = {}) {
  const db = await getDb();
  let queryText = `
    SELECT 
      id,
      company_id as "companyId",
      date,
      activity,
      scope,
      category,
      quantity,
      emissions,
      status,
      facility,
      conversion_factor as "conversionFactor",
      input_unit as "inputUnit",
      raw_input as "rawInput",
      formula,
      result_kg as "resultKg",
      result_tonnes as "resultTonnes",
      methodology,
      reporting_period as "reportingPeriod",
      created_at as "createdAt"
    FROM emissions
  `;
  const conditions = [];
  const params = [];

  if (filters.companyId) {
    params.push(filters.companyId);
    conditions.push(`company_id = $${params.length}`);
  }
  if (filters.scope && filters.scope !== "All Scopes") {
    params.push(filters.scope);
    conditions.push(`scope = $${params.length}`);
  }

  if (filters.category && filters.category !== "All Categories") {
    params.push(filters.category);
    conditions.push(`category = $${params.length}`);
  }

  if (filters.search && filters.search.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(activity) LIKE $${params.length} OR LOWER(facility) LIKE $${params.length} OR LOWER(category) LIKE $${params.length})`);
  }

  if (conditions.length > 0) {
    queryText += " WHERE " + conditions.join(" AND ");
  }

  queryText += " ORDER BY created_at DESC";

  const { rows } = await db.query(queryText, params);
  return rows.map((r) => ({
    ...r,
    conversionFactor: r.conversionFactor ? Number(r.conversionFactor) : undefined,
    resultKg: r.resultKg ? Number(r.resultKg) : undefined,
    resultTonnes: r.resultTonnes ? Number(r.resultTonnes) : undefined,
  }));
}

// Save both display fields and calculation-audit fields for one emissions record.
async function insertEmissionRecord(record, calculation = null) {
  const db = await getDb();
  const queryText = `
    INSERT INTO emissions (
      id, company_id, date, activity, scope, category, quantity, emissions, status,
      facility, conversion_factor, input_unit, raw_input, formula,
      result_kg, result_tonnes, methodology, reporting_period
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
    ) RETURNING *;
  `;

  const params = [
    record.id, record.companyId,
    record.date,
    record.activity,
    record.scope,
    record.category,
    record.quantity,
    record.emissions,
    record.status || "Verified",
    record.facility || (calculation ? calculation.facility : null),
    record.conversionFactor || (calculation ? calculation.conversionFactor : null),
    record.inputUnit || (calculation ? calculation.unit : null),
    calculation ? calculation.input : null,
    calculation ? calculation.formula : null,
    calculation ? calculation.resultKg : null,
    calculation ? calculation.resultTonnes : null,
    calculation ? calculation.methodology : null,
    calculation ? calculation.reportingPeriod : null,
  ];

  const { rows } = await db.query(queryText, params);
  return rows[0];
}

// Retrieve single emission record by ID
async function getEmissionById(id) {
  const db = await getDb();
  const queryText = `
    SELECT 
      id,
      company_id as "companyId",
      date,
      activity,
      scope,
      category,
      quantity,
      emissions,
      status,
      facility,
      conversion_factor as "conversionFactor",
      input_unit as "inputUnit",
      raw_input as "rawInput",
      formula,
      result_kg as "resultKg",
      result_tonnes as "resultTonnes",
      methodology,
      reporting_period as "reportingPeriod",
      created_at as "createdAt"
    FROM emissions
    WHERE id = $1
  `;
  const { rows } = await db.query(queryText, [id]);
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    ...r,
    conversionFactor: r.conversionFactor ? Number(r.conversionFactor) : undefined,
    resultKg: r.resultKg ? Number(r.resultKg) : undefined,
    resultTonnes: r.resultTonnes ? Number(r.resultTonnes) : undefined,
  };
}

// Update existing emission record and recalculate outputs
async function updateEmissionRecord(id, companyId, calculation) {
  const db = await getDb();
  const emissions = calculation.resultTonnes >= 1
    ? `${calculation.resultTonnes.toFixed(2)} tCO2e`
    : `${calculation.resultKg.toFixed(2)} kg CO2e`;
  const quantity = `${calculation.input} ${calculation.unit}`;

  const queryText = `
    UPDATE emissions SET
      activity = $1,
      scope = $2,
      category = $3,
      quantity = $4,
      emissions = $5,
      facility = $6,
      conversion_factor = $7,
      input_unit = $8,
      raw_input = $9,
      formula = $10,
      result_kg = $11,
      result_tonnes = $12,
      methodology = $13,
      reporting_period = $14
    WHERE id = $15 AND company_id = $16
    RETURNING 
      id,
      company_id as "companyId",
      date,
      activity,
      scope,
      category,
      quantity,
      emissions,
      status,
      facility,
      conversion_factor as "conversionFactor",
      input_unit as "inputUnit",
      raw_input as "rawInput",
      formula,
      result_kg as "resultKg",
      result_tonnes as "resultTonnes",
      methodology,
      reporting_period as "reportingPeriod",
      created_at as "createdAt";
  `;

  const params = [
    calculation.activity,
    calculation.scope,
    calculation.category,
    quantity,
    emissions,
    calculation.facility,
    calculation.conversionFactor,
    calculation.unit,
    calculation.input,
    calculation.formula,
    calculation.resultKg,
    calculation.resultTonnes,
    calculation.methodology,
    calculation.reportingPeriod,
    id,
    companyId,
  ];

  const { rows } = await db.query(queryText, params);
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    ...r,
    conversionFactor: r.conversionFactor ? Number(r.conversionFactor) : undefined,
    resultKg: r.resultKg ? Number(r.resultKg) : undefined,
    resultTonnes: r.resultTonnes ? Number(r.resultTonnes) : undefined,
  };
}

// Delete an emission record
async function deleteEmissionRecord(id, companyId) {
  const db = await getDb();
  await db.query("DELETE FROM emissions WHERE id = $1 AND company_id = $2", [id, companyId]);
}

// Authentication lookup: returns a user and stored password hash by email.
async function findUserByEmail(email) {
  const db = await getDb();
  const { rows } = await db.query('SELECT id, email, password_hash as "passwordHash", role, company_id as "companyId" FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

// Confirm the requested company exists before company-scoped actions.
async function companyExists(id) {
  const db = await getDb();
  const { rows } = await db.query("SELECT id FROM companies WHERE id = $1", [id]);
  return Boolean(rows[0]);
}

// Find company by ID including status.
async function findCompanyById(id) {
  const db = await getDb();
  const { rows } = await db.query('SELECT id, name, COALESCE(status, \'Active\') AS status, created_at AS "createdAt" FROM companies WHERE id = $1', [id]);
  return rows[0] || null;
}

// Aggregate records into the category totals shown on the reports page.
async function getEmissionsReport(companyId, period) {
  const db = await getDb();
  const conditions = ["company_id = $1"];
  const params = [companyId];
  if (period.month) {
    params.push(`${period.month}%`);
    conditions.push(`date LIKE $${params.length}`);
  }
  if (period.year) {
    params.push(`${period.year}%`);
    conditions.push(`date LIKE $${params.length}`);
  }
  const where = conditions.join(" AND ");
  const { rows } = await db.query(`
    SELECT category, COALESCE(SUM(result_tonnes), 0)::text AS "co2e"
    FROM emissions WHERE ${where}
    GROUP BY category ORDER BY category`, params);
  const total = rows.reduce((sum, row) => sum + Number(row.co2e || 0), 0);
  const { rows: countRows } = await db.query(`SELECT COUNT(*)::int AS count FROM emissions WHERE ${where}`, params);
  return { totalCo2e: Number(total.toFixed(3)), recordCount: countRows[0]?.count || 0, breakdown: rows.map((row) => ({ category: row.category, co2e: Number(Number(row.co2e).toFixed(3)) })) };
}

const { SERVER_EMISSION_FACTORS } = require("./calculationEngine");

// Translate the selected dashboard label into current and comparison date ranges.
function dashboardPeriod(period) {
  const current = new Date();
  const currentYear = 2026; // Demo base year
  const currentMonthNum = 10; // October 2026
  const currentMonthStr = "2026-10";

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const p = (period || "Current Period").trim();

  if (p === "Current Period") {
    const year = currentYear;
    const month = currentMonthNum;
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const previousFrom = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const previousTo = from;

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const displayRange = `Oct 1–${daysInMonth}, ${year}`;

    return {
      label: "Current Period",
      reportingPeriodName: "Current Period",
      from,
      to,
      previousFrom,
      previousTo,
      year,
      month,
      displayRange,
      start: from,
      end: `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`,
    };
  }

  // Handle quarters e.g. "Q2 2026"
  const qMatch = p.match(/^Q([1-4])\s+(\d{4})$/i);
  if (qMatch) {
    const q = parseInt(qMatch[1], 10);
    const y = parseInt(qMatch[2], 10);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = startMonth + 3;
    const from = `${y}-${String(startMonth).padStart(2, "0")}-01`;
    const to = endMonth > 12 ? `${y + 1}-01-01` : `${y}-${String(endMonth).padStart(2, "0")}-01`;

    const prevQ = q === 1 ? 4 : q - 1;
    const prevY = q === 1 ? y - 1 : y;
    const prevStartMonth = (prevQ - 1) * 3 + 1;
    const prevEndMonth = prevStartMonth + 3;
    const previousFrom = `${prevY}-${String(prevStartMonth).padStart(2, "0")}-01`;
    const previousTo = prevEndMonth > 12 ? `${prevY + 1}-01-01` : `${prevY}-${String(prevEndMonth).padStart(2, "0")}-01`;

    const qRanges = {
      1: `Jan 1–Mar 31, ${y}`,
      2: `Apr 1–Jun 30, ${y}`,
      3: `Jul 1–Sep 30, ${y}`,
      4: `Oct 1–Dec 31, ${y}`,
    };

    return {
      label: p,
      reportingPeriodName: p,
      from,
      to,
      previousFrom,
      previousTo,
      year: y,
      month: null,
      displayRange: qRanges[q] || p,
      start: from,
      end: to,
    };
  }

  // Handle Full Year e.g. "Full Year 2025"
  const yMatch = p.match(/^Full Year\s+(\d{4})$/i);
  if (yMatch) {
    const y = parseInt(yMatch[1], 10);
    return {
      label: p,
      reportingPeriodName: p,
      from: `${y}-01-01`,
      to: `${y + 1}-01-01`,
      previousFrom: `${y - 1}-01-01`,
      previousTo: `${y}-01-01`,
      year: y,
      month: null,
      displayRange: `Jan 1–Dec 31, ${y}`,
      start: `${y}-01-01`,
      end: `${y}-12-31`,
    };
  }

  // Handle Month Year e.g. "September 2026" or "August 2026"
  const monthsMap = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  const mMatch = p.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (mMatch) {
    const mName = mMatch[1].toLowerCase();
    const mNum = monthsMap[mName];
    if (mNum) {
      const y = parseInt(mMatch[2], 10);
      const from = `${y}-${String(mNum).padStart(2, "0")}-01`;
      const nextMonth = mNum === 12 ? 1 : mNum + 1;
      const nextYear = mNum === 12 ? y + 1 : y;
      const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

      const prevMonth = mNum === 1 ? 12 : mNum - 1;
      const prevYear = mNum === 1 ? y - 1 : y;
      const previousFrom = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
      const previousTo = from;

      const daysInMonth = new Date(Date.UTC(y, mNum, 0)).getUTCDate();
      return {
        label: `${monthNames[mNum - 1]} ${y}`,
        reportingPeriodName: p,
        from,
        to,
        previousFrom,
        previousTo,
        year: y,
        month: mNum,
        displayRange: `${monthAbbr[mNum - 1]} 1–${daysInMonth}, ${y}`,
        start: from,
        end: `${y}-${String(mNum).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`,
      };
    }
  }

  // Fallback
  return {
    label: p,
    reportingPeriodName: p,
    from: `${currentMonthStr}-01`,
    to: null,
    previousFrom: null,
    previousTo: null,
    year: currentYear,
    month: currentMonthNum,
    displayRange: p,
    start: `${currentMonthStr}-01`,
    end: null,
  };
}

// Build the real dashboard KPI, category, scope aggregates, completeness, and audit calculations.
async function getDashboardData(companyId, period = "Current Period", rangeFilter = "6M") {
  const db = await getDb();
  const range = dashboardPeriod(period);

  // 1. Company details
  const companyResult = await db.query("SELECT id, name FROM companies WHERE id = $1", [companyId]);
  const company = companyResult.rows[0] || { id: companyId, name: "Company" };

  // 2. Discover available reporting periods for this company
  const periodRows = await db.query(
    "SELECT DISTINCT reporting_period FROM emissions WHERE company_id = $1 AND reporting_period IS NOT NULL",
    [companyId]
  );
  const foundPeriods = new Set(["Current Period", "September 2026", "August 2026", "Q2 2026", "Q1 2026", "Full Year 2025"]);
  for (const r of periodRows.rows) {
    if (r.reporting_period && r.reporting_period.trim()) {
      foundPeriods.add(r.reporting_period.trim());
    }
  }
  const availablePeriods = Array.from(foundPeriods).map((pLabel) => {
    const pInfo = dashboardPeriod(pLabel);
    return {
      key: pLabel,
      label: pLabel,
      displayRange: pInfo.displayRange,
    };
  });

  // 3. Query records for the selected period
  // Match by date window if defined, or by reporting_period string
  let currentRecordsQuery = `
    SELECT * FROM emissions
    WHERE company_id = $1
  `;
  const currentParams = [companyId];
  if (range.from && range.to) {
    currentParams.push(range.from, range.to);
    if (range.label === "Current Period") {
      currentRecordsQuery += ` AND ((date >= $2 AND date < $3) OR reporting_period = 'Current Period')`;
    } else {
      currentParams.push(range.label);
      currentRecordsQuery += ` AND ((date >= $2 AND date < $3) OR reporting_period = $4)`;
    }
  } else if (range.from) {
    currentParams.push(range.from);
    currentRecordsQuery += ` AND (date >= $2 OR reporting_period = 'Current Period')`;
  }
  currentRecordsQuery += ` ORDER BY date DESC, created_at DESC`;

  const { rows: currentRecords } = await db.query(currentRecordsQuery, currentParams);

  // 4. Query previous period total
  let previousTotal = 0;
  if (range.previousFrom && range.previousTo) {
    const prevQuery = `
      SELECT COALESCE(SUM(result_tonnes), 0)::text AS total
      FROM emissions
      WHERE company_id = $1 AND date >= $2 AND date < $3
    `;
    const { rows: prevRows } = await db.query(prevQuery, [companyId, range.previousFrom, range.previousTo]);
    previousTotal = Number(prevRows[0]?.total || 0);
  }

  // 5. Current period emissions total and record count
  const currentTotal = currentRecords.reduce((sum, r) => sum + Number(r.result_tonnes || 0), 0);
  const recordCount = currentRecords.length;

  const rounded = (val) => Number(Number(val).toFixed(3));
  const roundedCurrent = rounded(currentTotal);
  const roundedPrevious = previousTotal > 0 ? rounded(previousTotal) : null;

  // Safe percentage change calculation
  let percentageChange = null;
  if (previousTotal > 0) {
    percentageChange = Number((((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1));
  }

  let bannerNotice = null;
  if (percentageChange !== null) {
    if (percentageChange < 0) {
      bannerNotice = `Emissions are ${Math.abs(percentageChange).toFixed(1)}% lower than the previous period.`;
    } else if (percentageChange > 0) {
      bannerNotice = `Emissions are ${percentageChange.toFixed(1)}% higher than the previous period.`;
    } else {
      bannerNotice = `Emissions are unchanged compared to the previous period.`;
    }
  } else if (recordCount > 0) {
    bannerNotice = "Real-time emissions data is ready for review.";
  }

  // 6. Scope Breakdown
  const scope1Tonnes = currentRecords.filter((r) => r.scope === "Scope 1").reduce((s, r) => s + Number(r.result_tonnes || 0), 0);
  const scope2Tonnes = currentRecords.filter((r) => r.scope === "Scope 2").reduce((s, r) => s + Number(r.result_tonnes || 0), 0);
  const scope3Tonnes = currentRecords.filter((r) => r.scope === "Scope 3").reduce((s, r) => s + Number(r.result_tonnes || 0), 0);

  const calcScopePct = (val) => (currentTotal > 0 ? Number(((val / currentTotal) * 100).toFixed(1)) : 0);
  const scopes = {
    scope1: {
      emissions: rounded(scope1Tonnes),
      percentage: calcScopePct(scope1Tonnes),
    },
    scope2: {
      emissions: rounded(scope2Tonnes),
      percentage: calcScopePct(scope2Tonnes),
    },
    scope3: {
      emissions: rounded(scope3Tonnes),
      percentage: calcScopePct(scope3Tonnes),
    },
    dominantScope: scope2Tonnes >= scope1Tonnes && scope2Tonnes >= scope3Tonnes ? "Scope 2" : scope1Tonnes >= scope3Tonnes ? "Scope 1" : "Scope 3",
  };

  // 7. Data Completeness Validation
  let completeRecords = 0;
  const incompleteReasons = [];

  for (const r of currentRecords) {
    const missing = [];
    if (!r.category || !r.category.trim()) missing.push("category");
    if (!r.scope || !r.scope.trim()) missing.push("scope");
    if (!r.facility || !r.facility.trim()) missing.push("facility");
    if (!r.input_unit && (!r.quantity || !r.quantity.trim())) missing.push("unit");
    if (!r.raw_input && (!r.quantity || !r.quantity.trim())) missing.push("consumption value");
    if (!r.reporting_period || !r.reporting_period.trim()) missing.push("reporting period");
    if (r.result_tonnes === null || r.result_tonnes === undefined) missing.push("calculated result");

    if (missing.length === 0) {
      completeRecords++;
    } else {
      incompleteReasons.push({ id: r.id, missing });
    }
  }

  const completenessPercentage = recordCount > 0 ? Math.round((completeRecords / recordCount) * 100) : 0;
  const dataCompleteness = {
    totalRecords: recordCount,
    completeRecords,
    incompleteRecords: recordCount - completeRecords,
    completenessPercentage,
    isComplete: recordCount > 0 && completeRecords === recordCount,
    message:
      recordCount === 0
        ? "No activity data recorded for this period"
        : completeRecords === recordCount
        ? "All activity records for this period are validated"
        : `${recordCount - completeRecords} of ${recordCount} records missing required data`,
    reasons: incompleteReasons,
  };

  // 8. Top Emission Sources
  const categoryMap = new Map();
  for (const r of currentRecords) {
    const cat = r.category || "Other";
    const tonnes = Number(r.result_tonnes || 0);
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + tonnes);
  }

  const topSourcesList = Array.from(categoryMap.entries())
    .map(([category, tonnes]) => ({
      category,
      emissions: rounded(tonnes),
      percentage: currentTotal > 0 ? Number(((tonnes / currentTotal) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.emissions - a.emissions);

  // If fewer than 3 categories in this period, supplement with other common categories with 0 emissions
  const standardCategories = ["Purchased Electricity", "Facilities", "Logistics & Freight", "Fleet & Fuel", "Business Travel"];
  for (const std of standardCategories) {
    if (topSourcesList.length >= 3) break;
    if (!topSourcesList.some((s) => s.category.toLowerCase().includes(std.toLowerCase().slice(0, 5)))) {
      topSourcesList.push({
        category: std,
        emissions: 0,
        percentage: 0,
      });
    }
  }

  const topSources = topSourcesList.slice(0, 3).map((s, idx) => ({
    rank: idx + 1,
    ...s,
  }));

  // 9. Calculation Summary ("How was this calculated?")
  let calculationSummary = {
    recordCount,
    totalEmissions: roundedCurrent,
    summaryText: recordCount === 0 ? "No activity data recorded for this period" : `${recordCount} activity record${recordCount === 1 ? "" : "s"} contributed to ${roundedCurrent} tCO₂e`,
    primaryCalculation: null,
  };

  if (recordCount > 0) {
    // Find dominant category
    const primaryCat = topSources[0]?.category || currentRecords[0]?.category || "Purchased Electricity";
    const catRecords = currentRecords.filter((r) => r.category === primaryCat);
    const catFactor = catRecords[0]?.conversion_factor
      ? Number(catRecords[0].conversion_factor)
      : SERVER_EMISSION_FACTORS[primaryCat]?.factor || 0.42;
    const catUnit = catRecords[0]?.input_unit || SERVER_EMISSION_FACTORS[primaryCat]?.unit.split("/")[1] || "kWh";
    const factorUnit = SERVER_EMISSION_FACTORS[primaryCat]?.unit || `kg CO₂e/${catUnit}`;

    // Sum consumption input
    let totalCatInput = 0;
    for (const cr of catRecords) {
      if (cr.raw_input) {
        totalCatInput += Number(String(cr.raw_input).replace(/,/g, "")) || 0;
      } else if (cr.quantity) {
        const val = parseFloat(String(cr.quantity).replace(/,/g, ""));
        if (!isNaN(val)) totalCatInput += val;
      }
    }

    const calculatedKg = Number((totalCatInput * catFactor).toFixed(2));
    const calculatedTonnes = Number((calculatedKg / 1000).toFixed(3));

    const formattedInput = totalCatInput.toLocaleString("en-US", { maximumFractionDigits: 2 });
    const formattedFactor = Number(catFactor.toFixed(4)).toString();
    const formattedKg = Math.round(calculatedKg).toLocaleString("en-US");
    const formulaStr = `${formattedInput} ${catUnit} × ${formattedFactor} ${factorUnit} = ${formattedKg} kg CO₂e = ${calculatedTonnes} tCO₂e`;

    calculationSummary.primaryCalculation = {
      category: primaryCat,
      input: formattedInput,
      unit: catUnit,
      factor: catFactor,
      factorUnit,
      formula: formulaStr,
      resultKg: calculatedKg,
      resultTonnes: calculatedTonnes,
      methodology: SERVER_EMISSION_FACTORS[primaryCat]?.methodology || "GHG Protocol standard calculation methodology.",
      standard: SERVER_EMISSION_FACTORS[primaryCat]?.standard || "GHG Protocol Corporate Standard",
    };
  }

  // 10. Emissions Trend (3M, 6M, 12M)
  const rangeMonthsCount = rangeFilter === "3M" ? 3 : rangeFilter === "12M" ? 12 : 6;
  const targetYear = range.year || 2026;
  const targetMonth = range.month || 10;

  const trendMonths = [];
  const monthNamesAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = rangeMonthsCount - 1; i >= 0; i--) {
    let m = targetMonth - i;
    let y = targetYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const key = `${y}-${String(m).padStart(2, "0")}`;
    trendMonths.push({
      key,
      label: `${monthNamesAbbr[m - 1]} ${y}`,
      shortMonth: monthNamesAbbr[m - 1],
      year: y,
    });
  }

  // Aggregate monthly emissions for this company from DB
  const { rows: monthlyRows } = await db.query(
    `SELECT SUBSTRING(date, 1, 7) AS month, COALESCE(SUM(result_tonnes), 0)::text AS total
     FROM emissions
     WHERE company_id = $1
     GROUP BY SUBSTRING(date, 1, 7)
     ORDER BY month ASC`,
    [companyId]
  );

  const monthlyTotals = new Map();
  let distinctMonthsCountWithData = 0;
  for (const mr of monthlyRows) {
    const val = Number(mr.total || 0);
    monthlyTotals.set(mr.month, val);
    if (val > 0) distinctMonthsCountWithData++;
  }

  const trendSeries = trendMonths.map((tm) => {
    const val = monthlyTotals.get(tm.key) || 0;
    return {
      period: tm.key,
      month: tm.label,
      shortMonth: tm.shortMonth,
      emissions: rounded(val),
    };
  });

  const trend = {
    range: rangeFilter,
    hasEnoughData: distinctMonthsCountWithData >= 2,
    emptyMessage: "Add activity data for another reporting period to view an emissions trend.",
    series: trendSeries,
  };

  // 11. Carbon Offsets Portfolio
  const { rows: txRows } = await db.query(
    `SELECT 
      COALESCE(SUM(credits_tco2e), 0)::text AS "purchased",
      COALESCE(SUM(CASE WHEN status = 'Completed' THEN credits_tco2e ELSE 0 END), 0)::text AS "retired",
      COUNT(*)::int AS count
     FROM transactions
     WHERE company_id = $1`,
    [companyId]
  );
  const txRow = txRows[0] || {};
  const creditsPurchased = Number(Number(txRow.purchased || 0).toFixed(3));
  const creditsRetired = Number(Number(txRow.retired || 0).toFixed(3));
  const grossEmissions = roundedCurrent;
  const netEmissions = Math.max(0, rounded(grossEmissions - creditsRetired));
  const hasPurchases = (txRow.count || 0) > 0;

  const offsets = {
    grossEmissions,
    creditsPurchased,
    creditsRetired,
    netEmissions,
    hasPurchases,
    purchasedLabel: hasPurchases ? `${creditsPurchased.toLocaleString()} tCO₂e` : "0 tCO₂e",
    purchasedSubtext: hasPurchases ? "Verified credits" : "No purchases yet",
    retiredLabel: hasPurchases ? `${creditsRetired.toLocaleString()} tCO₂e` : "0 tCO₂e",
    retiredSubtext: hasPurchases ? "Permanent retirement" : "No retirements yet",
    netLabel: `${netEmissions.toLocaleString()} tCO₂e`,
    netSubtext: creditsRetired > 0 ? "Reconciled in ledger" : "Same as gross (no offsets)",
    footerNotice: hasPurchases
      ? `${creditsRetired.toLocaleString()} tCO₂e retired across verified projects.`
      : "No offset purchases yet. Explore verified carbon credits to neutralize your emissions.",
  };

  // 12. Structure backward-compatible and enriched response
  return {
    company: {
      id: company.id,
      name: company.name,
    },
    period: {
      key: range.label,
      label: range.label,
      displayRange: range.displayRange,
      year: range.year,
      month: range.month,
      start: range.start,
      end: range.end,
    },
    availablePeriods,
    emissions: {
      current: roundedCurrent,
      previous: roundedPrevious,
      percentageChange,
      recordCount,
      periodStart: range.start,
      periodEnd: range.end,
      periodLabel: range.label,
      displayRange: range.displayRange,
      bannerNotice,
    },
    scopes,
    dataCompleteness,
    trend: trendSeries,
    trendMeta: trend,
    topSources,
    calculationSummary,
    offsets,
    // Backward compatibility for existing callers
    summary: {
      totalEmissionsTonnes: roundedCurrent,
      previousPeriodEmissionsTonnes: roundedPrevious,
      changePercent: percentageChange,
      recordCount,
    },
    byCategory: topSources.map((s) => ({
      category: s.category,
      emissionsTonnes: s.emissions,
      percentage: s.percentage,
    })),
    byScope: [
      { scope: "Scope 1", emissionsTonnes: scopes.scope1.emissions, percentage: scopes.scope1.percentage },
      { scope: "Scope 2", emissionsTonnes: scopes.scope2.emissions, percentage: scopes.scope2.percentage },
      { scope: "Scope 3", emissionsTonnes: scopes.scope3.emissions, percentage: scopes.scope3.percentage },
    ],
  };
}

// Add or update local demo users without duplicating existing database rows.
async function seedUsers(users) {
  const db = await getDb();
  await db.query("INSERT INTO companies (id, name, status) VALUES ('company-a', 'Company A', 'Active'), ('company-b', 'Company B', 'Active') ON CONFLICT (id) DO NOTHING");
  for (const user of users) {
    await db.query(`INSERT INTO users (id, email, password_hash, role, company_id) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, company_id = EXCLUDED.company_id`,
      [user.id, user.email, user.passwordHash, user.role, user.companyId]);
  }
}

// Return all registered companies with primary user email and status.
async function getAllCompanies() {
  const db = await getDb();
  const queryText = `
    SELECT 
      c.id, 
      c.name, 
      COALESCE(c.status, 'Active') AS status,
      c.created_at AS "createdAt",
      (SELECT u.email FROM users u WHERE u.company_id = c.id ORDER BY u.created_at ASC LIMIT 1) AS "userEmail"
    FROM companies c
    ORDER BY c.created_at DESC;
  `;
  const { rows } = await db.query(queryText);
  return rows;
}

// Find company by case-insensitive name.
async function findCompanyByName(name) {
  const db = await getDb();
  const { rows } = await db.query('SELECT id, name, COALESCE(status, \'Active\') AS status, created_at AS "createdAt" FROM companies WHERE LOWER(name) = LOWER($1)', [name.trim()]);
  return rows[0] || null;
}

// Register a new company and its initial company user atomically.
async function createCompanyWithUser({ name, email, passwordHash }) {
  await getDb();
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
    const companyId = `comp-${slug || "org"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const compRes = await client.query(
      'INSERT INTO companies (id, name, status) VALUES ($1, $2, \'Active\') RETURNING id, name, status, created_at AS "createdAt"',
      [companyId, name.trim()]
    );
    const userRes = await client.query(
      'INSERT INTO users (id, email, password_hash, role, company_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, company_id AS "companyId"',
      [userId, email.trim().toLowerCase(), passwordHash, "COMPANY_USER", companyId]
    );

    await client.query("COMMIT");
    return {
      company: compRes.rows[0],
      user: userRes.rows[0],
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Update company name and/or primary user login email atomically without changing companyId / tenant ID.
async function updateCompany({ companyId, name, email }) {
  await getDb();
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    // Check if new email is already taken by another user outside this company
    if (email) {
      const emailCheck = await client.query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND company_id != $2",
        [email.trim(), companyId]
      );
      if (emailCheck.rows.length > 0) {
        const error = new Error("This email is already registered.");
        error.code = "DUPLICATE_EMAIL";
        throw error;
      }
    }

    // Check if new company name is taken by another company
    if (name) {
      const nameCheck = await client.query(
        "SELECT id FROM companies WHERE LOWER(name) = LOWER($1) AND id != $2",
        [name.trim(), companyId]
      );
      if (nameCheck.rows.length > 0) {
        const error = new Error("A company with this name already exists.");
        error.code = "DUPLICATE_NAME";
        throw error;
      }
    }

    // Update company name if provided
    let compRow;
    if (name) {
      const compRes = await client.query(
        'UPDATE companies SET name = $1 WHERE id = $2 RETURNING id, name, COALESCE(status, \'Active\') AS status, created_at AS "createdAt"',
        [name.trim(), companyId]
      );
      compRow = compRes.rows[0];
    } else {
      const compRes = await client.query(
        'SELECT id, name, COALESCE(status, \'Active\') AS status, created_at AS "createdAt" FROM companies WHERE id = $1',
        [companyId]
      );
      compRow = compRes.rows[0];
    }

    if (!compRow) {
      throw new Error("Company not found.");
    }

    // Update primary company user login email if provided
    let userRow;
    if (email) {
      const userRes = await client.query(
        'UPDATE users SET email = $1 WHERE company_id = $2 AND role = \'COMPANY_USER\' RETURNING id, email, role, company_id AS "companyId"',
        [email.trim().toLowerCase(), companyId]
      );
      userRow = userRes.rows[0];
    } else {
      const userRes = await client.query(
        'SELECT id, email, role, company_id AS "companyId" FROM users WHERE company_id = $1 AND role = \'COMPANY_USER\' ORDER BY created_at ASC LIMIT 1',
        [companyId]
      );
      userRow = userRes.rows[0];
    }

    await client.query("COMMIT");
    return {
      company: compRow,
      user: userRow,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Reset company user password
async function resetCompanyUserPassword({ companyId, passwordHash }) {
  const db = await getDb();
  const res = await db.query(
    "UPDATE users SET password_hash = $1 WHERE company_id = $2 AND role = 'COMPANY_USER' RETURNING id, email",
    [passwordHash, companyId]
  );
  if (res.rows.length === 0) {
    throw new Error("Company user not found.");
  }
  return res.rows[0];
}

// Update company status (Active or Inactive)
async function setCompanyStatus({ companyId, status }) {
  const db = await getDb();
  const res = await db.query(
    'UPDATE companies SET status = $1 WHERE id = $2 RETURNING id, name, status, created_at AS "createdAt"',
    [status, companyId]
  );
  if (res.rows.length === 0) {
    throw new Error("Company not found.");
  }
  return res.rows[0];
}

// Return offset projects catalog with optional filters and computed stats
async function getAllProjects(filters = {}) {
  const db = await getDb();
  let queryText = `
    SELECT 
      id,
      name,
      location,
      country,
      type,
      standard,
      description,
      tags,
      price_per_tonne AS "pricePerTonne",
      available_tco2e AS "availableTCO2e",
      badge,
      image_url AS "imageUrl",
      vintage,
      registry_ref AS "registryRef",
      created_at AS "createdAt"
    FROM offset_projects
  `;
  const conditions = [];
  const params = [];

  if (filters.category && filters.category !== "All") {
    params.push(filters.category);
    conditions.push(`type = $${params.length}`);
  }
  if (filters.standard && filters.standard !== "All Standards") {
    params.push(filters.standard);
    conditions.push(`standard = $${params.length}`);
  }
  if (filters.search && filters.search.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(location) LIKE $${params.length} OR LOWER(type) LIKE $${params.length})`);
  }

  if (conditions.length > 0) {
    queryText += " WHERE " + conditions.join(" AND ");
  }

  queryText += " ORDER BY id ASC";

  const { rows } = await db.query(queryText, params);
  const projects = rows.map((r) => ({
    ...r,
    pricePerTonne: Number(r.pricePerTonne),
    availableTCO2e: Number(r.availableTCO2e),
    tags: Array.isArray(r.tags) ? r.tags : [],
  }));

  // Summary aggregates computed dynamically from all projects
  const { rows: statRows } = await db.query(`
    SELECT 
      COUNT(*)::int AS "count",
      COALESCE(SUM(available_tco2e), 0)::text AS "totalAvailable",
      COALESCE(AVG(price_per_tonne), 0)::text AS "avgPrice"
    FROM offset_projects
  `);
  const count = statRows[0]?.count || 0;
  const totalAvailable = Number(statRows[0]?.totalAvailable || 0);
  const avgPrice = Number(Number(statRows[0]?.avgPrice || 0).toFixed(2));

  return {
    projects,
    total: projects.length,
    stats: {
      verifiedProjectsCount: count,
      availableCreditsTCO2e: totalAvailable,
      averagePricePerTonne: avgPrice.toFixed(2),
    },
  };
}

// Return single offset project by ID
async function getProjectById(id) {
  const db = await getDb();
  const queryText = `
    SELECT 
      id,
      name,
      location,
      country,
      type,
      standard,
      description,
      tags,
      price_per_tonne AS "pricePerTonne",
      available_tco2e AS "availableTCO2e",
      badge,
      image_url AS "imageUrl",
      vintage,
      registry_ref AS "registryRef",
      created_at AS "createdAt"
    FROM offset_projects
    WHERE id = $1
  `;
  const { rows } = await db.query(queryText, [id]);
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    ...r,
    pricePerTonne: Number(r.pricePerTonne),
    availableTCO2e: Number(r.availableTCO2e),
    tags: Array.isArray(r.tags) ? r.tags : [],
  };
}

// Atomic credit purchase with row-level locking
async function purchaseCredits({ companyId, projectId, quantityTCO2e }) {
  await getDb();
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    // Row-level lock on project row to prevent race conditions & double-spend
    const projRes = await client.query(
      `SELECT id, name, location, country, type, standard, description, tags, 
              price_per_tonne AS "pricePerTonne", available_tco2e AS "availableTCO2e", 
              badge, image_url AS "imageUrl", vintage, registry_ref AS "registryRef"
       FROM offset_projects 
       WHERE id = $1 FOR UPDATE`,
      [projectId]
    );

    if (projRes.rows.length === 0) {
      throw new Error("Project not found.");
    }

    const project = projRes.rows[0];
    const available = Number(project.availableTCO2e);
    const qty = Number(quantityTCO2e);

    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error("Requested quantity must be a positive number.");
    }

    if (qty > available) {
      throw new Error(`Requested quantity (${qty.toLocaleString()} tCO2e) exceeds available inventory (${available.toLocaleString()} tCO2e).`);
    }

    const newAvailable = available - qty;
    await client.query(
      "UPDATE offset_projects SET available_tco2e = $1 WHERE id = $2",
      [newAvailable, projectId]
    );

    const price = Number(project.pricePerTonne);
    const subtotal = Number((qty * price).toFixed(2));
    const serviceFee = Number((subtotal * 0.02).toFixed(2));
    const totalAmount = Number((subtotal + serviceFee).toFixed(2));

    const txnInternalId = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const transactionId = `TXN-${Date.now().toString().slice(-4)}${randomSeq}`;
    const certYear = new Date().getFullYear();
    const certMonth = String(new Date().getMonth() + 1).padStart(2, "0");
    const certificateId = `ECO-CERT-${certYear}-${certMonth}-${randomSeq}`;

    const txnRes = await client.query(
      `INSERT INTO transactions (
        id, transaction_id, company_id, project_id, credits_tco2e, price_per_tonne,
        subtotal, service_fee, total_amount, certificate_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id,
        transaction_id AS "transactionId",
        company_id AS "companyId",
        project_id AS "projectId",
        credits_tco2e AS "creditsTCO2e",
        price_per_tonne AS "pricePerTonne",
        subtotal,
        service_fee AS "serviceFee",
        total_amount AS "totalAmount",
        certificate_id AS "certificateId",
        status,
        created_at AS "createdAt"`,
      [txnInternalId, transactionId, companyId, projectId, qty, price, subtotal, serviceFee, totalAmount, certificateId, "Completed"]
    );

    await client.query("COMMIT");

    const txnRow = txnRes.rows[0];

    const order = {
      id: txnRow.id,
      projectId: project.id,
      projectName: project.name,
      quantityTCO2e: Number(txnRow.creditsTCO2e),
      pricePerTonne: Number(txnRow.pricePerTonne),
      subtotal: Number(txnRow.subtotal),
      serviceFee: Number(txnRow.serviceFee),
      total: Number(txnRow.totalAmount),
      certificateId: txnRow.certificateId,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: txnRow.status,
    };

    return {
      order,
      transaction: {
        ...txnRow,
        creditsTCO2e: Number(txnRow.creditsTCO2e),
        pricePerTonne: Number(txnRow.pricePerTonne),
        subtotal: Number(txnRow.subtotal),
        serviceFee: Number(txnRow.serviceFee),
        totalAmount: Number(txnRow.totalAmount),
        project: project.name,
        projectType: project.type,
        projectImage: project.imageUrl,
      },
      updatedProject: {
        ...project,
        pricePerTonne: Number(project.pricePerTonne),
        availableTCO2e: newAvailable,
        tags: Array.isArray(project.tags) ? project.tags : [],
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Return transaction ledger for a company (or all if companyId is null/admin) with filters
async function getTransactions(companyId, filters = {}) {
  const db = await getDb();
  let queryText = `
    SELECT 
      t.id,
      t.transaction_id AS "transactionId",
      t.company_id AS "companyId",
      t.project_id AS "projectId",
      t.credits_tco2e AS "creditsTCO2e",
      t.price_per_tonne AS "pricePerTonne",
      t.subtotal,
      t.service_fee AS "serviceFee",
      t.total_amount AS "totalAmount",
      t.certificate_id AS "certificateId",
      t.status,
      t.created_at AS "createdAt",
      p.name AS "projectName",
      p.type AS "projectType",
      p.standard AS "verificationStandard",
      p.image_url AS "projectImage",
      p.registry_ref AS "registryRef"
    FROM transactions t
    JOIN offset_projects p ON t.project_id = p.id
  `;
  const conditions = [];
  const params = [];

  if (companyId) {
    params.push(companyId);
    conditions.push(`t.company_id = $${params.length}`);
  }

  if (filters.status && filters.status !== "All Statuses") {
    params.push(filters.status);
    conditions.push(`t.status = $${params.length}`);
  }

  if (filters.project && filters.project !== "All Projects") {
    params.push(filters.project);
    conditions.push(`p.name = $${params.length}`);
  }

  if (filters.search && filters.search.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    conditions.push(`(
      LOWER(t.transaction_id) LIKE $${params.length} OR 
      LOWER(p.name) LIKE $${params.length} OR 
      LOWER(t.certificate_id) LIKE $${params.length}
    )`);
  }

  if (conditions.length > 0) {
    queryText += " WHERE " + conditions.join(" AND ");
  }

  queryText += " ORDER BY t.created_at DESC";

  const { rows } = await db.query(queryText, params);
  return rows.map((r) => {
    const d = new Date(r.createdAt);
    const formattedDate = d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return {
      id: r.id,
      date: formattedDate,
      rawCreatedAt: r.createdAt,
      transactionId: r.transactionId,
      project: r.projectName,
      projectType: r.projectType,
      projectImage: r.projectImage,
      creditsTCO2e: Number(r.creditsTCO2e),
      pricePerTonne: Number(r.pricePerTonne),
      totalAmount: Number(r.totalAmount),
      status: r.status,
      certificateId: r.certificateId,
      verificationStandard: r.verificationStandard + (r.registryRef ? ` (${r.registryRef})` : ""),
      registryUrl: r.verificationStandard?.includes("Verra")
        ? `https://registry.verra.org/app/projectDetail/VCS/${r.registryRef ? r.registryRef.replace("VCS-", "") : "1842"}`
        : r.verificationStandard?.includes("Gold")
        ? `https://registry.goldstandard.org/projects/details/${r.registryRef ? r.registryRef.replace("GS-", "") : "4921"}`
        : undefined,
    };
  });
}

// Compute aggregate offset portfolio for a company
async function getCompanyPortfolio(companyId) {
  const db = await getDb();
  const queryText = `
    SELECT 
      COALESCE(SUM(t.credits_tco2e), 0)::text AS "totalCreditsRetired",
      COALESCE(SUM(t.total_amount), 0)::text AS "totalInvested",
      COUNT(t.id)::int AS "transactionCount",
      COUNT(DISTINCT t.project_id)::int AS "projectsSupportedCount"
    FROM transactions t
    WHERE t.company_id = $1
  `;
  const { rows } = await db.query(queryText, [companyId]);
  const row = rows[0] || {};

  const breakdownText = `
    SELECT 
      p.type AS "projectType",
      COALESCE(SUM(t.credits_tco2e), 0)::text AS "credits",
      COALESCE(SUM(t.total_amount), 0)::text AS "amount"
    FROM transactions t
    JOIN offset_projects p ON t.project_id = p.id
    WHERE t.company_id = $1
    GROUP BY p.type
    ORDER BY SUM(t.credits_tco2e) DESC
  `;
  const { rows: breakdownRows } = await db.query(breakdownText, [companyId]);

  return {
    totalCreditsRetired: Number(Number(row.totalCreditsRetired || 0).toFixed(2)),
    totalInvested: Number(Number(row.totalInvested || 0).toFixed(2)),
    transactionCount: row.transactionCount || 0,
    projectsSupportedCount: row.projectsSupportedCount || 0,
    breakdown: breakdownRows.map((b) => ({
      projectType: b.projectType,
      credits: Number(Number(b.credits || 0).toFixed(2)),
      amount: Number(Number(b.amount || 0).toFixed(2)),
    })),
  };
}

module.exports = {
  getDb,
  initDb,
  getAllEmissions,
  insertEmissionRecord,
  getEmissionById,
  updateEmissionRecord,
  deleteEmissionRecord,
  findUserByEmail,
  companyExists,
  findCompanyById,
  getEmissionsReport,
  getDashboardData,
  seedUsers,
  getAllCompanies,
  findCompanyByName,
  createCompanyWithUser,
  updateCompany,
  resetCompanyUserPassword,
  setCompanyStatus,
  getAllProjects,
  getProjectById,
  purchaseCredits,
  getTransactions,
  getCompanyPortfolio,
};
