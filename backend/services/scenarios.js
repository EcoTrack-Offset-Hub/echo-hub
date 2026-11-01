const { decimal } = require('./precision');
const { randomUUID } = require('crypto');
const { SERVER_EMISSION_FACTORS } = require('./calculationEngine');

function simulate(records, changes) {
  if (!Array.isArray(changes) || !changes.length || changes.length > 7) throw new Error('Choose 1 to 7 category changes.');
  const seen = new Set();
  const rules = changes.map(change => {
    if (!SERVER_EMISSION_FACTORS[change.category] || seen.has(change.category)) throw new Error('Choose supported, distinct categories.');
    seen.add(change.category);
    const affected = decimal(change.affectedPercent);
    const reduction = decimal(change.reductionPercent);
    if (affected.lt(0) || affected.gt(100) || reduction.lt(0) || reduction.gt(100)) throw new Error('Percentages must be between 0 and 100.');
    return { ...change, multiplier: decimal(1).minus(affected.div(100).times(reduction.div(100))) };
  });
  if (records.some(r => r.result_kg === null)) throw new Error('Baseline contains incomplete calculations. Correct these records first.');
  const categories = [...new Set(records.map(r => r.category))].map(category => {
    const baseline = records.filter(r => r.category === category).reduce((sum, r) => sum.plus(r.result_kg), decimal(0));
    const projected = baseline.times(rules.find(r => r.category === category)?.multiplier || 1).toDecimalPlaces(8);
    return { category, baselineKg: baseline.toFixed(), projectedKg: projected.toFixed(), savedKg: baseline.minus(projected).toFixed() };
  });
  const baseline = categories.reduce((sum, r) => sum.plus(r.baselineKg), decimal(0));
  const projected = categories.reduce((sum, r) => sum.plus(r.projectedKg), decimal(0));
  return { baselineKg: baseline.toFixed(), projectedKg: projected.toFixed(), savedKg: baseline.minus(projected).toFixed(),
    reductionPercent: baseline.isZero() ? '0' : baseline.minus(projected).div(baseline).times(100).toFixed(4),
    recordCount: records.length, categories,
    assumptions: 'Linear model using saved baseline emissions and factor versions. Affected share × emissions reduction within that share determines savings. Activity mix and all other factors remain constant; replacement manufacturing and other lifecycle effects are excluded.',
    baselineRecords: records.map(r => ({ id: r.id, resultKg: r.result_kg, factorVersionId: r.factor_version_id })) };
}

function registerScenarios(app, { requireAuth, resolveCompany, getDb }) {
  app.get('/api/scenarios', requireAuth, async (req, res, next) => {
    try {
      const company = resolveCompany(req, res); if (company === undefined) return;
      if (!company) return res.status(400).json({ success: false, error: 'Select a company.' });
      const { rows } = await (await getDb()).query('SELECT * FROM scenarios WHERE company_id=$1 ORDER BY created_at DESC LIMIT 100', [company]);
      res.json({ success: true, data: rows });
    } catch (e) { next(e); }
  });
  app.post('/api/scenarios', requireAuth, async (req, res, next) => {
    try {
      const company = resolveCompany(req, res); if (company === undefined) return;
      if (!company) return res.status(400).json({ success: false, error: 'Select a company.' });
      const { name, period, changes, save } = req.body;
      if (typeof name !== 'string' || !name.trim() || name.length > 120 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
        return res.status(400).json({ success: false, error: 'Provide a name and baseline month (YYYY-MM).' });
      const db = await getDb();
      const { rows } = await db.query('SELECT id,category,result_kg,factor_version_id FROM emissions WHERE company_id=$1 AND reporting_month=$2::date ORDER BY id', [company, period + '-01']);
      if (!rows.length) return res.status(422).json({ success: false, error: 'No baseline activities exist for this month.' });
      let results;
      try { results = simulate(rows, changes); } catch (e) { return res.status(422).json({ success: false, error: e.message }); }
      if (save === true && req.body.expectedBaseline && JSON.stringify(req.body.expectedBaseline) !== JSON.stringify(results.baselineRecords))
        return res.status(409).json({ success: false, error: 'Baseline activities changed. Preview the scenario again before saving.' });
      const id = randomUUID();
      if (save === true) await db.query('INSERT INTO scenarios(id,company_id,name,reporting_period,changes,results) VALUES($1,$2,$3,$4,$5,$6)', [id, company, name.trim(), period, JSON.stringify(changes), JSON.stringify(results)]);
      res.json({ success: true, data: { id: save === true ? id : null, name: name.trim(), reporting_period: period, changes, results } });
    } catch (e) { next(e); }
  });
}
module.exports = { simulate, registerScenarios };
