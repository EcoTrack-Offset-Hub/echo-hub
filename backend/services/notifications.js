const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../config/db');
const { dashboard, monthWindow } = require('../config/adminDashboard');

async function notifications(user) {
  const db = await getDb();
  const month = new Date().toISOString().slice(0,7);
  const admin = user.role === 'ADMIN';
  const data = await dashboard(db, admin ? null : user.companyId, monthWindow(month));
  const items = [];
  for (const a of data.thresholdAlerts || []) items.push({ key: `threshold:${month}:${a.id}:${a.status}:${a.limit}`, title: `${a.name}: ${a.status === 'exceeded' ? 'emissions limit reached' : 'approaching emissions limit'}`, detail: `${a.emissions} / ${a.limit} tCO2e (${a.percent}%) for ${month}`, href: admin ? `/emissions?companyId=${encodeURIComponent(a.id)}&month=${month}` : '/dashboard' });
  for (const a of data.attention || []) items.push({ key: `quality:${month}:${a.id}:${a.kind}`, title: `${a.name}: ${a.kind === 'missing' ? 'no monthly activity records' : `${a.count} records need ${a.kind === 'review' ? 'review' : 'completion'}`}`, detail: `Reporting month ${month}`, href: admin ? `/emissions?companyId=${encodeURIComponent(a.id)}&month=${month}` : '/emissions' });
  if (admin) {
    for (const p of data.lowInventory || []) items.push({ key: `inventory:${p.id}`, title: `${p.name}: low offset inventory`, detail: `${p.available} tCO2e available; threshold ${p.threshold}`, href: '/admin/projects?low=1' });
    if (data.factors?.outdated) items.push({ key: `factors:${month}:outdated`, title: `${data.factors.outdated} active emission factors are overdue for review`, detail: 'Review the source and applicability before continued use.', href: '/admin/factors' });
  }
  const { rows } = await db.query('SELECT notification_key FROM notification_receipts WHERE user_id=$1', [user.sub]);
  const read = new Set(rows.map(r => r.notification_key));
  return { items: items.map(item => ({ ...item, read: read.has(item.key) })), errors: Object.fromEntries(Object.entries(data.errors).filter(([key]) => ['thresholdAlerts','attention', ...(admin ? ['lowInventory','factors'] : [])].includes(key))) };
}
module.exports = function registerNotifications(app) {
  app.get('/api/notifications', requireAuth, async (req, res, next) => {
    try { res.json({ success: true, data: await notifications(req.user) }); } catch (e) { next(e); }
  });
  app.post('/api/notifications/read', requireAuth, async (req, res, next) => {
    try {
      if (typeof req.body.key !== 'string' || req.body.key.length > 255) return res.status(400).json({ success: false, error: 'Invalid notification.' });
      const list = await notifications(req.user);
      if (!list.items.some(item => item.key === req.body.key)) return res.status(404).json({ success: false, error: 'Notification is no longer active or is not available to this account.' });
      await (await getDb()).query('INSERT INTO notification_receipts(user_id,notification_key) VALUES($1,$2) ON CONFLICT DO NOTHING', [req.user.sub, req.body.key]);
      res.json({ success: true, data: { saved: true } });
    } catch (e) { next(e); }
  });
};
