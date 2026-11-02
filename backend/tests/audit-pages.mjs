// Production-build Lighthouse audits with disposable users, data and browser profiles.
// No real database credentials, application users or existing browser sessions are used.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer-core';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { PGlite } from '@electric-sql/pglite';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frontendDir = path.join(root, 'frontend');
const output = path.join(root, 'reports/lighthouse', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(output, { recursive: true });
const serverMode = process.argv.find(arg => arg.startsWith('--server='))?.slice(9) || 'production';
if (!['production', 'development'].includes(serverMode)) throw new Error('Use --server=production or development.');
const categories = process.argv.find(arg => arg.startsWith('--categories='))?.slice(13).split(',') || ['performance', 'accessibility', 'best-practices', 'seo'];
if (!categories.length || categories.some(name => !['performance', 'accessibility', 'best-practices', 'seo'].includes(name))) throw new Error('Unknown Lighthouse category.');
const selectedDevice = process.argv.find(arg => arg.startsWith('--device='))?.split('=')[1] || 'mobile';
if (!['mobile', 'desktop', 'both'].includes(selectedDevice)) throw new Error('Use --device=mobile, desktop or both.');
const devices = selectedDevice === 'both' ? ['mobile', 'desktop'] : [selectedDevice];
// Explicit engineering test profiles, not guarantees for a carrier or radio type.
const { NETWORK_PROFILES: profiles } = require('./network-profiles');
const networkArgument = process.argv.find(arg => arg.startsWith('--network='))?.slice(10) || 'default';
const networks = networkArgument === 'all' ? Object.keys(profiles) : networkArgument.split(',');
if (networks.some(name => name !== 'default' && !profiles[name])) throw new Error('Use --network=all, slow-3g, fast-3g, 4g, wifi or default (comma-separated supported).');
const routeFilter = process.argv.find(arg => arg.startsWith('--routes='))?.slice(9).split(',');
const targets = [
  { role: 'public', route: '/login' },
  ...['/dashboard', '/companies', '/emissions', '/admin/factors', '/admin/projects', '/admin/transactions', '/admin/audit', '/notifications', '/help', '/settings'].map(route => ({ role: 'admin', route })),
  ...['/dashboard', '/emissions', '/marketplace', '/transactions', '/reports', '/notifications', '/settings'].map(route => ({ role: 'company', route })),
].filter(target => !routeFilter || routeFilter.includes(target.route));
if (!targets.length) throw new Error('No audit routes matched --routes.');
const result = { serverMode, categories, expectedMeasurements: targets.length * devices.length * networks.length, cacheMode: 'cold HTTP cache cleared explicitly before each measured navigation; sessionStorage retained', environment: `Local ${serverMode} Next.js server; synthetic isolated API fixtures; no production data`, lighthouseVersion: null, networkProfiles: profiles, throttlingMethod: 'devtools for named profiles; Lighthouse defaults otherwise', targets: { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }, pages: [] };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function port() { const server = net.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const value = server.address().port; await new Promise(resolve => server.close(resolve)); return value; }
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') { try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch {} }
  else { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
}
function child(args, env, name) {
  const processChild = spawn(process.execPath, args, { cwd: frontendDir, env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  const stream = fs.createWriteStream(path.join(output, name)); processChild.stdout.pipe(stream, { end: false }); processChild.stderr.pipe(stream, { end: false }); processChild.on('exit', () => stream.end());
  return processChild;
}
async function waitChild(processChild) { await new Promise((resolve, reject) => { processChild.on('error', reject); processChild.on('exit', code => code === 0 ? resolve() : reject(new Error(`Build failed (${code}); see build.log`))); }); }
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
function saveSummary() {
  result.completedMeasurements = result.pages.length;
  result.complete = result.pages.length === result.expectedMeasurements && !result.error && result.pages.every(page => !page.error);
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(result, null, 2));
  const rows = result.pages.map(page => `<tr><td>${escape(page.role)}</td><td>${escape(page.route)}</td><td>${escape(page.device)}</td><td>${escape(page.network)}</td>${['performance', 'accessibility', 'best-practices', 'seo'].map(key => `<td>${page.scores?.[key] ?? '—'}</td>`).join('')}<td>${page.error ? escape(page.error) : `<a href="${page.report}">Report</a>`}</td></tr>`).join('');
  fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EcoTrack Lighthouse audit</title><style>body{font:15px system-ui;margin:32px;color:#183329}table{border-collapse:collapse;width:100%}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}th{background:#eef7f0}a{color:#166534}p{max-width:1000px;line-height:1.6}</style><main><h1>EcoTrack page quality audit</h1><p>${escape(result.environment)}. Requested categories: ${escape(categories.join(", "))}. Cold HTTP cache is cleared before every page while sessionStorage authentication is retained. Named networks apply real browser request throttling (including API requests); profile values are recorded in summary.json. These are repeatable test conditions, not exact carrier speeds. These single-run lab scores are diagnostic, not a guarantee for deployed websites. Target scores: performance 90, accessibility 95, best practices 95. SEO is relevant principally to public pages. Review each report's warnings and failed audits. All scores use genuine authenticated page content, not login redirects.</p><table><thead><tr><th>Role</th><th>Page</th><th>Device</th><th>Network</th><th>Performance</th><th>Accessibility</th><th>Best practices</th><th>SEO</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table></main></html>`);
  const latest = path.join(root, 'reports/lighthouse/latest.html');
  fs.writeFileSync(latest, `<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${path.basename(output)}/index.html"><title>Latest EcoTrack audit</title><a href="${path.basename(output)}/index.html">Open latest audit</a></html>`);
}

let db, api, frontend, build, browser;
const generatedEnv = path.join(frontendDir, 'next-env.d.ts');
const originalEnv = fs.existsSync(generatedEnv) ? fs.readFileSync(generatedEnv) : null;
try {
  db = new PGlite();
  for (const name of fs.readdirSync(path.join(root, 'backend/migrations')).filter(name => name.endsWith('.sql')).sort()) await db.exec(fs.readFileSync(path.join(root, 'backend/migrations', name), 'utf8'));
  process.env.DATABASE_URL = 'postgresql://isolated-page-audit';
  process.env.AUTH_JWT_SECRET = 'isolated-audit-secret-never-used-outside-this-process';
  require('pg').Pool = class { query(sql, args) { return db.query(sql, args); } async connect() { return { query: (sql, args) => db.query(sql, args), release() {} }; } };
  const { app } = require('../server');
  const { hashPassword } = require('../middleware/auth');
  const { SERVER_EMISSION_FACTORS, calculateEmissions } = require('../services/calculationEngine');
  const data = require('../config/db');
  const password = 'AuditFixturesOnly!2026';
  await db.query("INSERT INTO companies(id,name,monthly_emissions_limit) VALUES('audit-company','Audit Company',10),('audit-second','Second Audit Company',10)");
  for (const [id, role, company] of [['audit-admin', 'ADMIN', null], ['audit-user', 'COMPANY_USER', 'audit-company']]) await db.query('INSERT INTO users(id,email,password_hash,role,company_id) VALUES($1,$2,$3,$4,$5)', [id, `${id}@example.test`, hashPassword(password), role, company]);
  for (const [category, meta] of Object.entries(SERVER_EMISSION_FACTORS)) await db.query('INSERT INTO emission_factor_versions(category,factor,unit,methodology,standard,default_scope,source_reference,assumptions) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [category, meta.factor, meta.unit, 'Synthetic audit fixture', 'Test only', meta.defaultScope, 'Isolated performance audit data', 'Not a real-world factor']);
  const frontendPort = await port(); const base = `http://localhost:${frontendPort}`;
  for (let i = 0; i < 3; i++) await db.query("INSERT INTO offset_projects(id,name,location,country,type,standard,description,price_per_tonne,available_tco2e,lifecycle_status,low_inventory_threshold,registry_ref,registry_url,certification_evidence,certification_reviewed_at,image_url) VALUES($1,$2,'Mindanao','Philippines','Forest','Demo only','Synthetic project for page audits, not real credits',12.5,1000,'Active',100,$3,'https://example.test/registry','DEMO ONLY audit fixture',now(),$4)", [`audit-project-${i}`, `Audit Forest Project ${i + 1}`, `DEMO-AUDIT-${i}`, `${base}/project-placeholder.svg`]);
  const now = new Date(); now.setUTCDate(1);
  for (let i = 0; i < 36; i++) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i % 6, 1)).toISOString().slice(0, 7);
    const calc = calculateEmissions({ category: 'Purchased Electricity', consumption: String(1000 + i), unit: 'kWh', facility: 'Audit HQ', reportingPeriod: month });
    await data.insertEmissionRecord({ id: `audit-record-${i}`, companyId: 'audit-company', date: new Date().toISOString(), activity: 'Audit electricity', scope: 'Scope 2', category: 'Purchased Electricity', quantity: `${1000 + i} kWh`, emissions: `${calc.resultKg} kg CO2e`, status: 'Pending' }, calc);
  }
  await data.purchaseCredits({ companyId: 'audit-company', projectId: 'audit-project-0', quantityTCO2e: '10' });
  api = app.listen(0); await new Promise(resolve => api.once('listening', resolve));
  const env = { ...process.env, ECOTRACK_AUDIT: '1', NEXT_PUBLIC_API_BASE_URL: `http://localhost:${api.address().port}`, NEXT_TELEMETRY_DISABLED: '1' }; delete env.DATABASE_URL; delete env.AUTH_JWT_SECRET;
  const next = path.join(frontendDir, 'node_modules/next/dist/bin/next');
  if (serverMode === 'production') {
    console.log('Building isolated production frontend...');
    build = child([next, 'build'], env, 'build.log'); await waitChild(build);
  }
  frontend = child([next, serverMode === 'production' ? 'start' : 'dev', '--hostname', '127.0.0.1', '--port', String(frontendPort)], env, 'server.log');
  const deadline = Date.now() + 60000;
  while (true) { try { if ((await fetch(base + '/login', { signal: AbortSignal.timeout(2000) })).ok) break; } catch {} if (Date.now() > deadline || frontend.exitCode !== null) throw new Error('Audit frontend failed to start.'); await delay(300); }
  const { chromium } = require('playwright');
  browser = await puppeteer.launch({ executablePath: chromium.executablePath(), headless: true, defaultViewport: null, ignoreDefaultArgs: ['--enable-automation'] });
  for (const device of devices) {
    for (const network of networks) {
    let role = null, page;
    for (const target of targets) {
      const entry = { ...target, device, network, freeMemoryMbAtStart: Math.round(os.freemem() / 1048576) }; const name = `${network}-${device}-${target.role}-${target.route.replace(/\W+/g, '-').replace(/^-/, '')}`;
      try {
        if (role !== target.role) {
          if (page) await page.close(); page = await browser.newPage(); role = target.role;
          if (role !== 'public') {
            await page.goto(base + '/login', { waitUntil: 'networkidle0' });
            await page.locator('#login-email').fill(`${role === 'admin' ? 'audit-admin' : 'audit-user'}@example.test`); await page.locator('#login-password').fill(password);
            await page.click('button[type="submit"]'); await page.waitForFunction(() => location.pathname === '/dashboard'); await page.waitForNetworkIdle();
          }
        }
        // disableStorageReset preserves auth but also skips Lighthouse cache clearing.
        // Clear only HTTP cache explicitly; never clear the signed-in session.
        const cacheSession = await page.createCDPSession();
        await cacheSession.send('Network.enable');
        await cacheSession.send('Network.clearBrowserCache');
        await cacheSession.detach();
        console.log(`Auditing ${network} ${device} ${target.role} ${target.route}...`);
        const { lhr, report } = await lighthouse(base + target.route, { output: ['html', 'json'], logLevel: 'error', disableStorageReset: true, onlyCategories: categories, ...(network !== 'default' ? { throttlingMethod: 'devtools', throttling: { ...profiles[network], cpuSlowdownMultiplier: device === 'mobile' ? 4 : 1 }, maxWaitForLoad: 120000, maxWaitForFcp: 120000 } : {}) }, device === 'desktop' ? desktopConfig : undefined, page);
        if (new URL(lhr.finalDisplayedUrl).pathname !== target.route) throw new Error(`Unexpected redirect to ${new URL(lhr.finalDisplayedUrl).pathname}`);
        if (lhr.runtimeError) throw new Error(lhr.runtimeError.message);
        if (Object.values(lhr.categories).some(category => category.score === null)) throw new Error('A Lighthouse category could not be measured; inspect the run rather than treating it as a pass.');
        if (role !== 'public') { const actualRole = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ecotrack_auth_user') || '{}').role); if (actualRole !== (role === 'admin' ? 'ADMIN' : 'COMPANY_USER')) throw new Error('Authenticated role was not preserved.'); }
        result.lighthouseVersion = lhr.lighthouseVersion;
        entry.scores = Object.fromEntries(Object.entries(lhr.categories).map(([key, category]) => [key, category.score === null ? null : Math.round(category.score * 100)]));
        entry.metrics = Object.fromEntries(['largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'first-contentful-paint'].map(key => [key, lhr.audits[key]?.numericValue]));
        entry.warnings = [...lhr.runWarnings];
        if (entry.freeMemoryMbAtStart < 1024) entry.warnings.push('Less than 1 GB free RAM at measurement start; host resource pressure may affect this score.');
        entry.measuredSettings = { throttlingMethod: lhr.configSettings.throttlingMethod, throttling: lhr.configSettings.throttling };
        entry.bestPracticeFailures = (lhr.categories['best-practices']?.auditRefs || []).filter(ref => ref.weight > 0 && lhr.audits[ref.id]?.score !== null && lhr.audits[ref.id]?.score < 1).map(ref => ({ id: ref.id, title: lhr.audits[ref.id].title, details: lhr.audits[ref.id].details }));
        entry.failedAudits = Object.entries(lhr.audits).filter(([, audit]) => audit.score !== null && audit.score < 1 && ['binary', 'numeric', 'metricSavings'].includes(audit.scoreDisplayMode)).map(([id, audit]) => ({ id, title: audit.title, score: audit.score }));
        entry.report = name + '.html'; fs.writeFileSync(path.join(output, entry.report), report[0]); fs.writeFileSync(path.join(output, name + '.json'), report[1]);
        console.log(JSON.stringify({ role, route: target.route, device, network, scores: entry.scores }));
      } catch (error) { entry.error = error.message; console.error(`${name}: ${error.message}`); }
      result.pages.push(entry); saveSummary();
    }
    if (page) await page.close();
    }
  }
} catch (error) { result.error = error.message; console.error(error.message); process.exitCode = 1; }
finally {
  if (browser) await browser.close(); await stop(frontend); await stop(build);
  if (api) await new Promise(resolve => api.close(resolve)); if (db) await db.close();
  if (originalEnv) fs.writeFileSync(generatedEnv, originalEnv);
  saveSummary(); console.log(`Reports: ${output}`);
}
if (result.pages.some(page => page.error)) process.exitCode = 1;
