const { decimal } = require('./precision');
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { getDb, companyExists } = require("../config/db");
const { monthWindow, dashboard } = require("../config/adminDashboard");
const { randomUUID } = require("crypto");
const { SERVER_EMISSION_FACTORS } = require("./calculationEngine");
const creditNumber = (value) =>
  value !== null &&
  value !== undefined &&
  /^\d{1,10}(\.\d{1,2})?$/.test(String(value));
const evidenceValid = (b) => {
  try { return new URL(b.registryUrl).protocol === 'https:' && typeof b.registryRef === 'string' && b.registryRef.trim() && typeof b.certificationEvidence === 'string' && b.certificationEvidence.trim(); } catch { return false; }
};
const validFactor = (value) => {
  try { const factor = decimal(value); return factor.gt(0) && factor.lt('10000000000') && factor.decimalPlaces() <= 8; } catch { return false; }
};
const validDate = (value) =>
  !value ||
  (/^[1-9]\d{3}-(0[1-9]|1[0-2])-\d{2}$/.test(value) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value);


module.exports = function registerAdminRoutes(app) {
  const guard = [requireAuth, requireAdmin];
  app.get("/api/admin/dashboard", ...guard, async (req, res, next) => {
    try {
      let window;
      try {
        window = monthWindow(req.query.month, req.query.range);
      } catch (e) {
        return res.status(400).json({ success: false, error: e.message });
      }
      const companyId = req.query.companyId;
      if (
        companyId !== undefined &&
        (typeof companyId !== "string" || !companyId || companyId.length > 64)
      )
        return res
          .status(400)
          .json({ success: false, error: "Invalid companyId." });
      if (companyId && !(await companyExists(companyId)))
        return res
          .status(404)
          .json({ success: false, error: "Company not found." });
      res.json({
        success: true,
        data: await dashboard(await getDb(), companyId, window),
      });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/admin/audit", ...guard, async (req, res, next) => {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 30);
      if (![10, 25, 30, 50, 100].includes(pageSize)) return res.status(400).json({ success: false, error: 'Invalid page size.' });
      if (!Number.isInteger(page) || page < 1 || page > 100000)
        return res.status(400).json({ success: false, error: "Invalid page." });
      const db = await getDb();
      const { rows } = await db.query(
        `SELECT id,entity_type AS "entityType",entity_id AS "entityId",description,created_at AS "createdAt",count(*) OVER()::int AS total FROM audit_events ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $1`,
        [(page - 1) * pageSize, pageSize],
      );
      const total = rows.length ? rows[0].total : (await db.query('SELECT count(*)::int AS total FROM audit_events')).rows[0].total;
      res.json({
        success: true,
        data: { rows, page, pageSize, total },
      });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/admin/factors", ...guard, async (req, res, next) => {
    try {
      const db = await getDb();
      const { rows } = await db.query(
        "SELECT *,review_due::text AS review_due FROM emission_factor_versions ORDER BY category,created_at DESC,id DESC",
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      next(e);
    }
  });
  // Append-only factor values. Deactivation and insertion occur in one SQL statement under a category advisory lock.
  app.post("/api/admin/factors", ...guard, async (req, res, next) => {
    try {
      const b = req.body;
      const factor = Number(b.factor);
      if (
        !SERVER_EMISSION_FACTORS[b.category] ||
        !Number.isFinite(factor) || !validFactor(b.factor) ||
        factor <= 0 ||
        !b.methodology?.trim() ||
        !b.standard?.trim() ||
        !b.sourceReference?.trim() || !b.assumptions?.trim() ||
        !["Scope 1", "Scope 2", "Scope 3"].includes(b.defaultScope) ||
        typeof b.active !== "boolean" ||
        !validDate(b.reviewDue)
      )
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Provide a factor (up to 8 decimal places), source, assumptions, methodology, standard, scope and status.",
          });
      const db = await getDb();
      await db.query(
        `WITH lock AS MATERIALIZED(SELECT pg_advisory_xact_lock(hashtext($1))), old AS (UPDATE emission_factor_versions SET active=false WHERE category=$1 AND active AND $8::boolean AND EXISTS(SELECT 1 FROM lock) RETURNING id)
   INSERT INTO emission_factor_versions(category,factor,unit,methodology,standard,default_scope,review_due,active,source_reference,assumptions)
   SELECT $1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10 FROM (SELECT count(*) FROM old) done`,
        [
          b.category,
          String(b.factor),
          SERVER_EMISSION_FACTORS[b.category].unit,
          b.methodology.trim(),
          b.standard.trim(),
          b.defaultScope,
          b.reviewDue || null,
          b.active,
          b.sourceReference.trim(), b.assumptions.trim(),
        ],
      );
      res.status(201).json({ success: true, data: { saved: true } });
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/admin/projects", ...guard, async (req, res, next) => {
    try {
      const b = req.body;
      const required = [
        "name",
        "location",
        "country",
        "type",
        "standard",
        "description",
      ];
      if (
        required.some(
          (k) =>
            typeof b[k] !== "string" ||
            !b[k].trim() ||
            b[k].length > (k === "description" ? 10000 : 255),
        ) ||
        !creditNumber(b.price) ||
        Number(b.price) <= 0 ||
        (b.imageUrl && !/^https:\/\/[^\s]+$/i.test(String(b.imageUrl))) ||
        !creditNumber(b.available) ||
        !["Active", "Inactive", "Unreviewed"].includes(b.status) ||
        !creditNumber(b.threshold) || (b.status === "Active" && !evidenceValid(b))
      )
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Complete required fields and provide valid price, inventory and explicit threshold.",
          });
      const db = await getDb();
      const id = randomUUID();
      await db.query(
        `INSERT INTO offset_projects(id,name,location,country,type,standard,description,price_per_tonne,available_tco2e,lifecycle_status,low_inventory_threshold,badge,registry_ref,registry_url,certification_evidence,certification_reviewed_at,image_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Unreviewed',$12,$13,$14,CASE WHEN $10='Active' THEN now() ELSE NULL END,$15)`,
        [
          id,
          ...required.map((k) => b[k].trim()),
          b.price,
          b.available,
          b.status,
          b.threshold,
          b.registryRef || null, b.registryUrl || null, b.certificationEvidence || null, b.imageUrl || null,
        ],
      );
      res.status(201).json({ success: true, data: { id } });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/admin/projects", ...guard, async (req, res, next) => {
    try {
      const db = await getDb();
      const { rows } = await db.query(
        `SELECT id,name,location,country,type,standard,description,price_per_tonne,lifecycle_status,low_inventory_threshold,available_tco2e,image_url,registry_ref,registry_url,certification_evidence FROM offset_projects ${req.query.low === "1" ? "WHERE lifecycle_status='Active' AND available_tco2e < low_inventory_threshold" : ""} ORDER BY name`,
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      next(e);
    }
  });
  app.patch("/api/admin/projects/:id", ...guard, async (req, res, next) => {
    try {
      const b = req.body;
      if (
        !["Active", "Inactive", "Unreviewed"].includes(b.status) ||
        b.threshold === "" ||
        !creditNumber(b.threshold) || (b.status === "Active" && !evidenceValid(b))
      )
        return res
          .status(400)
          .json({
            success: false,
            error: "Valid lifecycle and explicit threshold required.",
          });
      const db = await getDb();
      const { rows } = await db.query(
        "UPDATE offset_projects SET lifecycle_status=$2,low_inventory_threshold=$3,registry_ref=$4,registry_url=$5,certification_evidence=$6,certification_reviewed_at=CASE WHEN $2='Active' THEN now() ELSE NULL END WHERE id=$1 RETURNING id",
        [req.params.id, b.status, b.threshold, b.registryRef || null, b.registryUrl || null, b.certificationEvidence || null],
      );
      if (!rows.length)
        return res
          .status(404)
          .json({ success: false, error: "Project not found." });
      res.json({ success: true, data: { saved: true } });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/admin/transactions", ...guard, async (req, res, next) => {
    try {
      const page = Number(req.query.page || 1);
      if (!Number.isInteger(page) || page < 1 || page > 100000)
        return res.status(400).json({ success: false, error: "Invalid page." });
      const db = await getDb();
      const { rows } = await db.query(
        `SELECT t.id,t.transaction_id,c.name AS company,p.name AS project,t.credits_tco2e,t.status,COALESCE((SELECT sum(quantity) FROM credit_retirements WHERE transaction_id=t.id),0) AS retired,count(*) OVER()::int AS total FROM transactions t JOIN companies c ON c.id=t.company_id JOIN offset_projects p ON p.id=t.project_id ORDER BY t.created_at DESC LIMIT 30 OFFSET $1`,
        [(page - 1) * 30],
      );
      res.json({ success: true, data: { rows, total: rows[0]?.total || 0 } });
    } catch (e) {
      next(e);
    }
  });
  app.get('/api/admin/transactions/:id', ...guard, async (req, res, next) => {
    try {
      const { rows } = await (await getDb()).query(`SELECT t.id,t.transaction_id,t.created_at,t.credits_tco2e,t.status,c.name AS company,p.name AS project,
        COALESCE((SELECT sum(quantity) FROM credit_retirements WHERE transaction_id=t.id),0)::text AS retired,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'quantity',r.quantity::text,'registry_reference',r.registry_reference,'created_at',r.created_at) ORDER BY r.created_at DESC,r.id) FROM credit_retirements r WHERE r.transaction_id=t.id),'[]'::jsonb) AS retirements
        FROM transactions t JOIN companies c ON c.id=t.company_id JOIN offset_projects p ON p.id=t.project_id WHERE t.id=$1`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ success: false, error: 'Transaction not found.' });
      const { retirements, ...transaction } = rows[0];
      res.json({ success: true, data: { transaction, retirements } });
    } catch (e) { next(e); }
  });
  app.post(
    "/api/admin/transactions/:id/retire",
    ...guard,
    async (req, res, next) => {
      try {
        const { quantity, reference } = req.body;
        if (
          !creditNumber(quantity) ||
          Number(quantity) <= 0 ||
          typeof reference !== "string" ||
          !reference.trim() ||
          reference.length > 255
        )
          return res
            .status(400)
            .json({
              success: false,
              error:
                "Positive quantity and registry retirement reference required.",
            });
        const db = await getDb();
        const { rows } = await db.query(
          `WITH locked AS MATERIALIZED (SELECT * FROM transactions WHERE id=$1 AND status='Completed' FOR UPDATE), inserted AS (
   INSERT INTO credit_retirements(id,transaction_id,quantity,registry_reference)
   SELECT $2,id,$3::numeric,$4 FROM locked WHERE credits_tco2e >= $3::numeric+(SELECT COALESCE(sum(quantity),0) FROM credit_retirements WHERE transaction_id=$1) RETURNING id) SELECT * FROM inserted`,
          [req.params.id, randomUUID(), quantity, reference.trim()],
        );
        if (!rows.length)
          return res
            .status(422)
            .json({
              success: false,
              error:
                "Completed purchase not found or retirement exceeds remaining credits.",
            });
        res.status(201).json({ success: true, data: { saved: true } });
      } catch (e) {
        next(e);
      }
    },
  );
  require("./adminOperations")(app);
  app.use("/api/admin", (error, _req, res, _next) => {
    const status =
      error.code === "23505"
        ? 409
        : ["22007", "22008", "22003", "22P02"].includes(error.code)
          ? 400
          : ["23514", "P0001"].includes(error.code)
            ? 422
            : 500;
    if (status === 500) console.error("Admin operation failed:", error.message);
    res
      .status(status)
      .json({
        success: false,
        error:
          status === 409
            ? "This change conflicts with an existing record. Refresh and retry."
            : status === 400
              ? "Invalid date or numeric value."
              : status === 422
                ? "This change would violate the credit balance or record constraints."
                : "Administrative operation could not be completed.",
      });
  });
};
