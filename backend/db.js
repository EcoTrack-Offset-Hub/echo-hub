let pgPool = null;

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

async function initDb() {
  const db = await getDb();
  const { rows } = await db.query("SELECT to_regclass('public.companies') AS companies, to_regclass('public.users') AS users, to_regclass('public.emissions') AS emissions");
  if (!rows[0]?.companies || !rows[0]?.users || !rows[0]?.emissions) {
    throw new Error("Database schema is missing. Apply backend/migrations/001_auth_company_emissions.sql before starting the backend.");
  }
}

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

async function findUserByEmail(email) {
  const db = await getDb();
  const { rows } = await db.query('SELECT id, email, password_hash as "passwordHash", role, company_id as "companyId" FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function companyExists(id) {
  const db = await getDb();
  const { rows } = await db.query("SELECT id FROM companies WHERE id = $1", [id]);
  return Boolean(rows[0]);
}

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

function dashboardPeriod(period) {
  const current = new Date();
  const currentMonth = current.toISOString().slice(0, 7);
  if (period === "Q2 2026") return { label: period, from: "2026-04-01", to: "2026-07-01", previousFrom: "2026-01-01", previousTo: "2026-04-01", year: 2026, month: null };
  if (period === "Q1 2026") return { label: period, from: "2026-01-01", to: "2026-04-01", previousFrom: "2025-10-01", previousTo: "2026-01-01", year: 2026, month: null };
  if (period === "Full Year 2025") return { label: period, from: "2025-01-01", to: "2026-01-01", previousFrom: "2024-01-01", previousTo: "2025-01-01", year: 2025, month: null };
  const from = `${currentMonth}-01`;
  const previousDate = new Date(`${from}T00:00:00.000Z`); previousDate.setUTCMonth(previousDate.getUTCMonth() - 1);
  const previousFrom = `${previousDate.toISOString().slice(0, 7)}-01`;
  return { label: "Current Period", from, to: null, previousFrom, previousTo: from, year: Number(currentMonth.slice(0, 4)), month: Number(currentMonth.slice(5, 7)) };
}

async function getDashboardData(companyId, period) {
  const db = await getDb();
  const range = dashboardPeriod(period);
  const makeConditions = (from, to) => {
    const conditions = ["company_id = $1", "date >= $2"];
    const params = [companyId, from];
    if (to) { params.push(to); conditions.push(`date < $${params.length}`); }
    return { where: conditions.join(" AND "), params };
  };
  const current = makeConditions(range.from, range.to);
  const previous = makeConditions(range.previousFrom, range.previousTo);
  const companyResult = await db.query("SELECT id, name FROM companies WHERE id = $1", [companyId]);
  const totalResult = await db.query(`SELECT COALESCE(SUM(result_tonnes), 0)::text AS total, COUNT(*)::int AS count FROM emissions WHERE ${current.where}`, current.params);
  const previousResult = await db.query(`SELECT COALESCE(SUM(result_tonnes), 0)::text AS total FROM emissions WHERE ${previous.where}`, previous.params);
  const categoryResult = await db.query(`SELECT category, COALESCE(SUM(result_tonnes), 0)::text AS total FROM emissions WHERE ${current.where} GROUP BY category ORDER BY category`, current.params);
  const scopeResult = await db.query(`SELECT scope, COALESCE(SUM(result_tonnes), 0)::text AS total FROM emissions WHERE ${current.where} GROUP BY scope ORDER BY scope`, current.params);
  const currentTotal = Number(totalResult.rows[0]?.total || 0);
  const previousTotal = Number(previousResult.rows[0]?.total || 0);
  const rounded = (value) => Number(value.toFixed(3));
  return {
    company: companyResult.rows[0],
    summary: { totalEmissionsTonnes: rounded(currentTotal), previousPeriodEmissionsTonnes: previousTotal > 0 ? rounded(previousTotal) : null, changePercent: previousTotal > 0 ? rounded(((currentTotal - previousTotal) / previousTotal) * 100) : null, recordCount: totalResult.rows[0]?.count || 0 },
    byCategory: categoryResult.rows.map((row) => { const emissionsTonnes = Number(row.total || 0); return { category: row.category, emissionsTonnes: rounded(emissionsTonnes), percentage: currentTotal > 0 ? rounded((emissionsTonnes / currentTotal) * 100) : 0 }; }),
    byScope: scopeResult.rows.map((row) => { const emissionsTonnes = Number(row.total || 0); return { scope: row.scope, emissionsTonnes: rounded(emissionsTonnes), percentage: currentTotal > 0 ? rounded((emissionsTonnes / currentTotal) * 100) : 0 }; }),
    period: { year: range.year, month: range.month, label: range.label },
  };
}

async function seedUsers(users) {
  const db = await getDb();
  await db.query("INSERT INTO companies (id, name) VALUES ('company-a', 'Company A'), ('company-b', 'Company B') ON CONFLICT (id) DO NOTHING");
  for (const user of users) {
    await db.query(`INSERT INTO users (id, email, password_hash, role, company_id) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, company_id = EXCLUDED.company_id`,
      [user.id, user.email, user.passwordHash, user.role, user.companyId]);
  }
}

module.exports = {
  getDb,
  initDb,
  getAllEmissions,
  insertEmissionRecord,
  findUserByEmail,
  companyExists,
  getEmissionsReport,
  getDashboardData,
  seedUsers,
};
