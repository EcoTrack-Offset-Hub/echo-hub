// All platform aggregation stays in PostgreSQL. No raw activity rows are sent to the dashboard.
const QUALITY_SQL = `CASE WHEN reporting_month IS NULL OR result_tonnes IS NULL
 OR NULLIF(trim(category),'') IS NULL OR NULLIF(trim(scope),'') IS NULL
 OR NULLIF(trim(facility),'') IS NULL OR NULLIF(trim(quantity),'') IS NULL
 THEN 'incomplete' WHEN status IN ('Verified','Validated') THEN 'validated' ELSE 'review' END`;
function monthWindow(month, range = "6M", now = new Date()) {
  const current = now.toISOString().slice(0, 7);
  month = !month || month === "current" ? current : month;
  if (typeof month !== "string" || !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error("month must use YYYY-MM or current.");
  if (!["3M", "6M", "12M"].includes(range))
    throw new Error("range must be 3M, 6M or 12M.");
  const end = new Date(month + "-01T00:00:00Z");
  const months = [];
  for (let i = Number(range.slice(0, -1)) - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCMonth(d.getUTCMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }
  const next = new Date(end);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return {
    month,
    months,
    from: month + "-01",
    to: next.toISOString().slice(0, 10),
    trendFrom: months[0] + "-01",
  };
}
async function dashboard(db, companyId, window) {
  const params = [companyId || null, window.from, window.to];
  const scoped = `WITH scoped AS (SELECT *, (${QUALITY_SQL}) AS quality FROM emissions WHERE ($1::text IS NULL OR company_id=$1)),
 period AS (SELECT * FROM scoped WHERE reporting_month >= $2::date AND reporting_month < $3::date)`;
  const queries = {
    summary: () =>
      db.query(
        `SELECT count(*)::int AS registered, count(*) FILTER(WHERE status='Active')::int AS active FROM companies WHERE ($1::text IS NULL OR id=$1)`,
        [companyId || null],
      ),
    emissions: () =>
      db.query(
        `${scoped} SELECT count(*)::int AS records, COALESCE(sum(result_tonnes),0)::float8 AS total,
 count(*) FILTER(WHERE created_at >= date_trunc('week',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')::int AS weekly,
 count(*) FILTER(WHERE quality='validated')::int AS validated, count(*) FILTER(WHERE quality='review')::int AS review,
 count(*) FILTER(WHERE quality='incomplete')::int AS incomplete FROM period`,
        params,
      ),
    trend: () =>
      db.query(
        `SELECT c.id,c.name,to_char(e.reporting_month,'YYYY-MM') AS month,COALESCE(sum(e.result_tonnes),0)::float8 AS total
 FROM companies c LEFT JOIN emissions e ON e.company_id=c.id AND e.reporting_month >= $2::date AND e.reporting_month < $3::date
 WHERE ($1::text IS NULL OR c.id=$1) GROUP BY c.id,c.name,to_char(e.reporting_month,'YYYY-MM') ORDER BY c.name`,
        [companyId || null, window.trendFrom, window.to],
      ),
    marketplace: () =>
      db.query(`SELECT COALESCE((SELECT sum(available_tco2e) FROM offset_projects),0)::float8 AS available,
 COALESCE((SELECT sum(credits_tco2e) FROM transactions WHERE status='Completed'),0)::float8
 - COALESCE((SELECT sum(quantity) FROM credit_retirements),0)::float8 AS sold,
 COALESCE((SELECT sum(quantity) FROM credit_retirements),0)::float8 AS retired,
 (SELECT count(*)::int FROM offset_projects WHERE lifecycle_status='Active') AS active,
 (SELECT count(*)::int FROM offset_projects WHERE low_inventory_threshold IS NULL) AS unconfigured,
 (SELECT string_agg(DISTINCT standard,', ') FROM offset_projects WHERE lifecycle_status='Active') AS standards`),
    lowInventory: () =>
      db.query(`SELECT id,name,available_tco2e::float8 AS available,low_inventory_threshold::float8 AS threshold
 FROM offset_projects WHERE lifecycle_status='Active' AND available_tco2e < low_inventory_threshold ORDER BY available_tco2e LIMIT 100`),
    factors: () =>
      db.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE active AND (review_due IS NULL OR review_due >= CURRENT_DATE))::int AS active,
 count(*) FILTER(WHERE NOT active)::int AS inactive,count(*) FILTER(WHERE active AND review_due < CURRENT_DATE)::int AS outdated,
 count(*) FILTER(WHERE active AND review_due IS NULL)::int AS undated FROM emission_factor_versions`),
    thresholdAlerts: () => db.query(`WITH totals AS (
      SELECT c.id,c.name,c.monthly_emissions_limit AS threshold_limit,
      COALESCE(sum(e.result_tonnes),0) AS emissions FROM companies c LEFT JOIN emissions e ON e.company_id=c.id AND e.reporting_month >= $2::date AND e.reporting_month < $3::date
      WHERE c.status='Active' AND c.monthly_emissions_limit IS NOT NULL AND ($1::text IS NULL OR c.id=$1)
      GROUP BY c.id,c.name,c.monthly_emissions_limit
    ) SELECT id,name,threshold_limit::text AS "limit",emissions::text,round(emissions/threshold_limit*100,2)::text AS percent,
      CASE WHEN emissions>=threshold_limit THEN 'exceeded' ELSE 'warning' END AS status FROM totals WHERE emissions>=threshold_limit*0.8 ORDER BY emissions/threshold_limit DESC,name`, params),
    attention: () =>
      db.query(
        `${scoped}, issues AS (
 SELECT company_id,quality AS kind,count(*)::int AS count,count(*) FILTER(WHERE reporting_month IS NULL)::int AS unknown_month_count FROM scoped
 WHERE (reporting_month IS NULL OR (reporting_month >= $2::date AND reporting_month < $3::date)) AND quality <> 'validated' GROUP BY company_id,quality
 UNION ALL SELECT c.id,'missing',0,0 FROM companies c WHERE c.status='Active' AND ($1::text IS NULL OR c.id=$1)
 AND NOT EXISTS(SELECT 1 FROM period e WHERE e.company_id=c.id))
 SELECT c.id,c.name,i.kind,i.count,i.unknown_month_count AS "unknownMonthCount",count(*) OVER()::int AS total FROM issues i JOIN companies c ON c.id=i.company_id ORDER BY c.name,i.kind LIMIT 100`,
        params,
      ),
    activity: () =>
      db.query(
        `SELECT id,entity_type AS "entityType",entity_id AS "entityId",description,created_at AS "createdAt" FROM audit_events WHERE ($1::text IS NULL OR company_id=$1) ORDER BY created_at DESC,id DESC LIMIT 6`,
        [companyId || null],
      ),
  };
  const names = Object.keys(queries),
    results = await Promise.allSettled(names.map((n) => queries[n]()));
  const data = { window, errors: {} };
  results.forEach((r, i) => {
    const name = names[i];
    if (r.status === "rejected") {
      console.error("Dashboard section:", name, r.reason.message);
      data.errors[name] = "This section could not be loaded.";
    } else
      data[name] = ["trend", "lowInventory", "attention", "activity", "thresholdAlerts"].includes(
        name,
      )
        ? r.value.rows
        : r.value.rows[0];
  });
  if (data.trend) {
    const companies = new Map();
    for (const r of data.trend) {
      if (!companies.has(r.id))
        companies.set(r.id, {
          id: r.id,
          name: r.name,
          values: window.months.map(() => 0),
        });
      const i = window.months.indexOf(r.month);
      if (i >= 0) companies.get(r.id).values[i] = r.total;
    }
    data.trend = [...companies.values()];
  }
  if (data.marketplace) {
    data.marketplace.reserved = 0;
    data.marketplace.total =
      data.marketplace.available +
      data.marketplace.sold +
      data.marketplace.retired;
    data.marketplace.reservationSupported = false;
  }
  if (data.attention && data.summary)
    data.summary.issues = data.attention[0]?.total || 0;
  return data;
}
module.exports = { QUALITY_SQL, monthWindow, dashboard };
