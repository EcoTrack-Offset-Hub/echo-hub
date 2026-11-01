const { randomUUID } = require('crypto');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getDb } = require('../config/db');
const { creditQuantity } = require('./precision');

module.exports = function registerAdminOperations(app) {
  const guard = [requireAuth, requireAdmin];
  app.patch('/api/admin/projects/:id/details', ...guard, async (req, res, next) => {
    try {
      const allowed = { name: 255, location: 255, country: 255, type: 64, standard: 64, description: 10000 };
      const setters = [], args = [req.params.id];
      for (const [key, max] of Object.entries(allowed)) {
        if (req.body[key] === undefined) continue;
        if (typeof req.body[key] !== 'string' || !req.body[key].trim() || req.body[key].length > max) return res.status(400).json({ success: false, error: `Invalid ${key}.` });
        args.push(req.body[key].trim()); setters.push(`${key}=$${args.length}`);
      }
      if (req.body.price !== undefined) {
        if (!/^\d{1,8}(\.\d{1,2})?$/.test(String(req.body.price)) || Number(req.body.price) <= 0) return res.status(400).json({ success: false, error: 'Price must be positive with at most 2 decimal places.' });
        args.push(req.body.price); setters.push(`price_per_tonne=$${args.length}`);
      }
      if (req.body.imageUrl !== undefined) {
        if (typeof req.body.imageUrl !== 'string' || (req.body.imageUrl && !/^https:\/\/[^\s]+$/i.test(req.body.imageUrl))) return res.status(400).json({ success: false, error: 'Provide an HTTPS image URL or leave it blank.' });
        args.push(req.body.imageUrl || null); setters.push(`image_url=$${args.length}`);
      }
      if (!setters.length) return res.status(400).json({ success: false, error: 'Choose project details to update.' });
      // Certification-sensitive edits require a new review before purchasing.
      if (['name','location','country','type','standard','description'].some(key => req.body[key] !== undefined)) setters.push("lifecycle_status='Unreviewed'", 'certification_reviewed_at=NULL');
      const { rows } = await (await getDb()).query(`UPDATE offset_projects SET ${setters.join(',')} WHERE id=$1 RETURNING id`, args);
      return res.status(rows.length ? 200 : 404).json({ success: !!rows.length, data: rows[0], error: rows.length ? undefined : 'Project not found.' });
    } catch (e) { next(e); }
  });
  app.post('/api/admin/projects/:id/restock', ...guard, async (req, res, next) => {
    try {
      let quantity;
      try { quantity = creditQuantity(req.body.quantity).toFixed(2); } catch (e) { return res.status(400).json({ success: false, error: e.message }); }
      const reference = req.body.reference;
      if (typeof reference !== 'string' || reference.trim().length < 3 || reference.length > 255) return res.status(400).json({ success: false, error: 'Provide a unique registry allocation or restock reference.' });
      const { rows } = await (await getDb()).query(`WITH locked AS MATERIALIZED (SELECT id FROM offset_projects WHERE id=$1 FOR UPDATE), evidence AS (
        INSERT INTO inventory_adjustments(id,project_id,quantity,reference,admin_id) SELECT $2,id,$3,$4,$5 FROM locked RETURNING project_id)
        UPDATE offset_projects SET available_tco2e=available_tco2e+$3::numeric WHERE id IN (SELECT project_id FROM evidence) RETURNING id,available_tco2e`, [req.params.id, randomUUID(), quantity, reference.trim(), req.user.sub]);
      return res.status(rows.length ? 200 : 404).json({ success: !!rows.length, data: rows[0], error: rows.length ? undefined : 'Project not found.' });
    } catch (e) { next(e); }
  });
  app.get('/api/admin/reviews', ...guard, async (req, res, next) => {
    try {
      const page = Number(req.query.page || 1);
      if (!Number.isSafeInteger(page) || page < 1 || page > 100000) return res.status(400).json({ success: false, error: 'Invalid page.' });
      const { rows } = await (await getDb()).query(`SELECT e.*,c.name AS company_name,count(*) OVER()::int AS total,
        COALESCE((SELECT jsonb_agg(r ORDER BY r.created_at DESC) FROM emission_reviews r WHERE r.record_id=e.id),'[]') AS reviews
        FROM emissions e JOIN companies c ON c.id=e.company_id WHERE ($1::text IS NULL OR e.id=$1) ORDER BY e.created_at DESC,e.id LIMIT 30 OFFSET $2`, [req.query.record || null, (page-1)*30]);
      res.json({ success: true, data: { rows, total: rows[0]?.total || 0 } });
    } catch (e) { next(e); }
  });
  app.post('/api/admin/reviews/:id', ...guard, async (req, res, next) => {
    try {
      const { decision, comment, revision } = req.body;
      if (!['Approved','Rejected','Comment'].includes(decision) || typeof comment !== 'string' || comment.trim().length < 3 || comment.length > 4000 || !/^\d+$/.test(String(revision))) return res.status(400).json({ success: false, error: 'Choose a decision, provide a review comment, and reload the current record version.' });
      const { rows } = await (await getDb()).query(`WITH locked AS MATERIALIZED (
        SELECT * FROM emissions WHERE id=$1 AND revision=$2::bigint FOR UPDATE
      ), changed AS (
        UPDATE emissions e SET status=CASE WHEN $3='Approved' THEN 'Verified' WHEN $3='Rejected' THEN 'Needs Review' ELSE e.status END FROM locked l WHERE e.id=l.id
        AND ($3<>'Approved' OR (l.result_tonnes IS NOT NULL AND l.reporting_month IS NOT NULL AND l.conversion_factor IS NOT NULL AND NULLIF(trim(l.facility),'') IS NOT NULL AND NULLIF(trim(l.raw_input),'') IS NOT NULL)) RETURNING e.id
      ) INSERT INTO emission_reviews(id,record_id,company_id,reviewer_id,decision,comment,snapshot)
        SELECT $4,l.id,l.company_id,$5,$3,$6,to_jsonb(l) FROM locked l JOIN changed c ON c.id=l.id RETURNING id`, [req.params.id, String(revision), decision, randomUUID(), req.user.sub, comment.trim()]);
      if (!rows.length) return res.status(409).json({ success: false, error: 'Record changed, is missing, or is incomplete for approval. Reload and review it again.' });
      res.status(201).json({ success: true, data: rows[0] });
    } catch (e) { next(e); }
  });
};
