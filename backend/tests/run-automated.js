// CMD-friendly coordinator. Default suites use isolated in-memory PostgreSQL fixtures.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('/?')) {
  console.log(`EcoTrack automated testing

From the project root:
  npm --prefix backend run test:automated
  npm --prefix backend run test:automated -- --local-concurrency
  npm --prefix backend run test:automated -- --live

The local concurrency option requires Docker Desktop and uses disposable PostgreSQL.
The live option checks the database configured in backend/.env.
Reports: reports/automated/latest.html, latest.json and latest.xml.`);
  process.exit(0);
}
if (args.some(arg=>!['--live','--local-concurrency'].includes(arg))) { console.error('Unknown option. Use npm --prefix backend run test:automated -- --help.'); process.exit(2); }
if (Number(process.versions.node.split('.')[0]) < 24) { console.error('Node.js 24 or newer is required.'); process.exit(1); }
if (!fs.existsSync(path.join(root, 'backend/node_modules/@electric-sql/pglite'))) { console.error('Install dependencies first: npm --prefix backend ci'); process.exit(1); }

const started = new Date();
const stamp = started.toISOString().replace(/[:.]/g,'-');
const output = path.join(root,'reports','automated',stamp);
fs.mkdirSync(output,{recursive:true});
const results = [];
const live = args.includes('--live');
const localConcurrency = args.includes('--local-concurrency');
if(live && localConcurrency) throw new Error('Choose --live or --local-concurrency, not both.');
const clean = text => String(text ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
const escape = text => clean(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
console.log('============================================================');
console.log('EcoTrack Automated Testing');
console.log('Mode: '+(live?'isolated API checks + live PostgreSQL verification':'isolated API checks (application data is not changed)'));
console.log('Excel plan: 31 retained cases; includes actual Chromium chart testing.');
console.log('============================================================');

function child(file, extraEnv = {}) {
  const begin=Date.now();
  const logName=path.basename(file,'.js')+'.log';
  const run=spawnSync(process.execPath,['--use-system-ca',path.join(__dirname,file)],{cwd:path.join(root,'backend'),env:{...process.env,...extraEnv},encoding:'utf8',timeout:file==='run-local-concurrency.js'?600000:file==='browser-chart.test.js'?360000:180000,maxBuffer:5*1024*1024,windowsHide:true});
  const text=(run.stdout || '')+(run.stderr || '')+(run.error ? '\n'+run.error.message : '');
  fs.writeFileSync(path.join(output,logName),text);
  if (run.stdout)process.stdout.write(run.stdout);
  if (run.status !== 0 && run.stderr)process.stderr.write(run.stderr);
  return { status:run.status===0?'PASS':'FAIL', durationMs:Date.now()-begin, logName, detail:run.status===0?'All assertions in this suite passed.':run.error?.message || `Process exited with code ${run.status}. See ${logName}.` };
}
function suite(id,title,file) {
  console.log('\nRunning: '+title);
  const result={id,title,kind:'Regression suite',coverage:(live||localConcurrency) && id.startsWith('LIVE')?'Real PostgreSQL':'Isolated integration tests',...child(file)};
  results.push(result);console.log(`[${result.status}] ${id} ${title}`);return result;
}

let failure;
try {
  const caseFile=path.join(output,'excel-case-results.json');
  const core=child('excel-api-cases.test.js',{ECOTRACK_CASE_REPORT:caseFile,ECOTRACK_BROWSER_QUEUED:'1',ECOTRACK_LIVE_QUEUED:(live||localConcurrency)?'1':'0'});
  if (fs.existsSync(caseFile))results.push(...JSON.parse(fs.readFileSync(caseFile,'utf8')));
  const count=results.filter(r=>r.id.startsWith('TC-')).length;
  if (count!==31 || (core.status==='FAIL' && !results.some(r=>r.status==='FAIL')))results.push({id:'SETUP',title:'Complete Excel API execution',kind:'Runner',coverage:'Setup and execution',status:'FAIL',detail:`Only ${count}/31 case results were recorded. ${core.detail}`,durationMs:core.durationMs});
  console.log('\nRunning: real Chromium chart interactions (TC-05.4)');
  const browserOutput=path.join(output,'browser');
  const browserRun=child('browser-chart.test.js',{ECOTRACK_BROWSER_OUTPUT:browserOutput});
  const browserCase=results.find(r=>r.id==='TC-05.4');
  let browserEvidence;
  if(fs.existsSync(path.join(browserOutput,'result.json')))browserEvidence=JSON.parse(fs.readFileSync(path.join(browserOutput,'result.json'),'utf8'));
  if(browserCase)Object.assign(browserCase,{status:browserRun.status==='PASS' && browserEvidence?.status==='PASS'?'PASS':'FAIL',kind:'Excel browser check',coverage:'Real Chromium frontend + isolated API',detail:browserEvidence?.detail || browserRun.detail,durationMs:browserRun.durationMs,screenshots:(browserEvidence?.screenshots || []).map(name=>'browser/'+name),assertions:browserEvidence?.assertions || [],tracePath:fs.existsSync(path.join(browserOutput,'trace.zip'))?'browser/trace.zip':undefined});
  else results.push({id:'BROWSER-SETUP',title:'Browser case mapping',kind:'Runner',status:'FAIL',coverage:'Browser execution',detail:'Missing TC-05.4 mapping',durationMs:browserRun.durationMs});
  suite('REG-NETWORK','Frontend network failure handling','api-client-network.test.js');
  suite('REG-ADMIN','Admin dashboard and management','admin-dashboard.test.js');
  suite('REG-THRESHOLD','Company warning thresholds','emissions-threshold.test.js');
  suite('REG-TRUST','Calculation precision, records and purchases','trust-and-records.test.js');
  suite('REG-OPERATIONS','Admin reviews, restocking, sessions and notifications','admin-operations.test.js');
  if (live) suite('LIVE-READ','Read-only configured database dashboard checks','admin-dashboard-live.test.js');
  if (live || localConcurrency) {
    const concurrency=suite('LIVE-CONCURRENCY',localConcurrency?'Concurrent purchases in disposable local PostgreSQL':'Concurrent purchases in a temporary PostgreSQL schema',localConcurrency?'run-local-concurrency.js':'purchase-concurrency.test.js');
    const row=results.find(r=>r.id==='TC-06.6');
    if(row)Object.assign(row,{status:concurrency.status,coverage:'Real PostgreSQL concurrent purchase transactions',detail:concurrency.status==='PASS'?'Two independent companies attempted 5000 tCO2e each against 5000 available. Exactly one succeeded; inventory ended at zero and one transaction was recorded.':concurrency.detail,durationMs:concurrency.durationMs});
  }
} catch(e) {
  failure=e;results.push({id:'RUNNER',title:'Automation coordinator',kind:'Runner',status:'FAIL',coverage:'Execution',detail:e.message,durationMs:0});
}

const finished=new Date();
const counts=Object.fromEntries(['PASS','FAIL','MANUAL','NOT_RUN'].map(status=>[status,results.filter(r=>r.status===status).length]));
const cases=results.filter(r=>r.id.startsWith('TC-'));
const report={name:'EcoTrack automated test report',startedAt:started.toISOString(),finishedAt:finished.toISOString(),mode:live?'isolated + live':localConcurrency?'isolated + local PostgreSQL':'isolated',sourcePlan:'EcoTrack-Hub_Updated.xlsx (31 retained test IDs)',scope:'API/backend assertions mapped to the Excel plan, plus actual Chromium chart interaction testing (TC-05.4). Other browser flows, payment gateways and external registry certification are not tested.',counts,excelCases:{total:cases.length,automatedPassed:cases.filter(r=>r.status==='PASS').length,failed:cases.filter(r=>r.status==='FAIL').length,manual:cases.filter(r=>r.status==='MANUAL').length,notRun:cases.filter(r=>r.status==='NOT_RUN').length},results};
const dateLabel=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}).format(started);
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EcoTrack automated test report</title><style>body{font:15px Arial,sans-serif;color:#172b22;background:#f5f8f6;margin:0}main{max-width:1250px;margin:35px auto;padding:24px}h1{margin-bottom:8px}section{background:white;border:1px solid #dce5df;border-radius:10px;padding:18px;margin:20px 0}.summary{display:flex;gap:25px;flex-wrap:wrap}.summary strong{font-size:25px;display:block}table{border-collapse:collapse;width:100%;background:white}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #dce5df}th{background:#e6f0e9}td:nth-child(1){white-space:nowrap}.PASS{color:#166534;font-weight:bold}.FAIL{color:#b91c1c;font-weight:bold}.MANUAL,.NOT_RUN{color:#92400e;font-weight:bold}.scroll{overflow-x:auto}p{line-height:1.5}small{color:#4b6356}@media print{body{background:white}main{margin:0;padding:0}th{display:table-cell}tr{break-inside:avoid}}</style><main><h1>EcoTrack automated test report</h1><p>${escape(dateLabel)} Asia/Manila · Mode: ${escape(report.mode)}</p><section class="summary">${Object.entries(counts).map(([status,n])=>`<div><strong class="${status}">${n}</strong>${status==='NOT_RUN'?'Not run':status}</div>`).join('')}</section><section><h2>What this report proves</h2><p>${escape(report.scope)}</p><p><strong>Excel coverage:</strong> ${report.excelCases.automatedPassed}/${report.excelCases.total} cases have passing automated API/database/browser assertions. Chart hover, keyboard tooltip interaction and 3M/6M/12M controls are checked in Chromium. Use <code>--local-concurrency</code> for a disposable local PostgreSQL container, or <code>--live</code> for the configured database; otherwise concurrency is not run. Other screen flows and visual design are outside this focused browser test.</p><p>Regression-suite rows summarize additional assertions; they are not extra Excel cases. Test fixture factors and certification evidence are synthetic and do not verify real-world certification.</p></section><div class="scroll"><table><thead><tr><th>ID</th><th>Check</th><th>Result</th><th>Coverage</th><th>Evidence / remaining action</th><th>Seconds</th></tr></thead><tbody>${results.map(r=>`<tr><td>${escape(r.id)}</td><td>${escape(r.title)}<br><small>${escape(r.kind)}</small></td><td class="${r.status}">${escape(r.status)}</td><td>${escape(r.coverage)}</td><td>${escape(r.detail)}</td><td>${(r.durationMs/1000).toFixed(2)}</td></tr>`).join('')}</tbody></table></div><p>Run again: <code>npm --prefix backend run test:automated -- --local-concurrency</code>. Results reflect this run only.</p></main></html>`;
const evidenceFiles=results.flatMap(r=>[...(r.screenshots || []),...(r.tracePath ? [r.tracePath] : [])]);
const evidenceHtml=evidenceFiles.length ? `<section><h2>Browser evidence</h2>${evidenceFiles.map(file=>`<p><a href="__RUN_ROOT__/${escape(file)}" target="_blank">${escape(path.basename(file))}</a></p>`).join('')}</section>` : '';
const htmlWithEvidence=html.replace('</main>',evidenceHtml+'</main>');
const skipped=results.filter(r=>r.status==='MANUAL'||r.status==='NOT_RUN').length;
const junit=`<?xml version="1.0" encoding="UTF-8"?><testsuites><testsuite name="EcoTrack" tests="${results.length}" failures="${counts.FAIL}" skipped="${skipped}" time="${(finished-started)/1000}">${results.map(r=>`<testcase classname="${escape(r.kind)}" name="${escape(r.id+' '+r.title)}" time="${r.durationMs/1000}">${r.status==='FAIL'?`<failure message="${escape(r.detail)}"/>`:r.status!=='PASS'?`<skipped message="${escape(r.detail)}"/>`:''}<system-out>${escape(r.coverage+'\n'+r.detail)}</system-out></testcase>`).join('')}</testsuite></testsuites>`;
for(const [extension,body]of[['json',JSON.stringify(report,null,2)],['html',html],['xml',junit]]) {
  fs.writeFileSync(path.join(output,'report.'+extension),extension==='html'?htmlWithEvidence.replaceAll('__RUN_ROOT__','.') : body);
  fs.writeFileSync(path.join(root,'reports','automated','latest.'+extension),extension==='html'?htmlWithEvidence.replaceAll('__RUN_ROOT__',stamp) : body);
}
console.log('\n============================================================');
console.log(`RESULT: ${counts.PASS} passed checks/suites; ${counts.FAIL} failed; ${counts.MANUAL} manual; ${counts.NOT_RUN} not run`);
console.log(`Excel automated portions passed: ${report.excelCases.automatedPassed}/${report.excelCases.total}`);
console.log('HTML report: '+path.join(root,'reports','automated','latest.html'));
console.log('JSON / JUnit XML: reports\\automated\\latest.json and latest.xml');
console.log('Run logs: '+output);
console.log('============================================================');
if(failure || counts.FAIL)process.exitCode=1;
