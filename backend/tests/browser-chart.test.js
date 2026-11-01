// Actual Chromium UI -> isolated Next.js frontend -> actual Express routes -> PGlite.
// No application accounts, browser profiles or production data are used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { PGlite } = require('@electric-sql/pglite');
const { decimal } = require('../services/precision');

const root = path.resolve(__dirname, '../..');
const output = process.env.ECOTRACK_BROWSER_OUTPUT || path.join(root,'reports','automated','browser-standalone');
fs.mkdirSync(output,{recursive:true});
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function availablePort() {
  const probe=net.createServer(); await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
  const port=probe.address().port; await new Promise(resolve=>probe.close(resolve)); return port;
}
async function stopChild(child) {
  if(!child || child.exitCode!==null)return;
  if(process.platform==='win32') {
    try { execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true}); } catch {}
  } else { try { process.kill(-child.pid,'SIGTERM'); } catch {} }
  await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(2000)]);
}

async function run() {
  const result={id:'TC-05.4',status:'FAIL',coverage:'Chromium browser interactions with the actual frontend and isolated real API',assertions:[],screenshots:[]};
  const started=Date.now();
  let db,api,frontend,browser,context,page;
  let tracing=false;
  const screenshots=[];
  try {
    const nextBin=path.join(root,'frontend','node_modules','next','dist','bin','next');
    if(!fs.existsSync(nextBin))throw new Error('Install frontend dependencies first: npm --prefix frontend ci');
    const { chromium }=require('playwright');
    if(!fs.existsSync(chromium.executablePath()))throw new Error('Install Chromium first: npm --prefix backend run test:browser:install');
    db=new PGlite();
    for(const file of fs.readdirSync(path.join(__dirname,'../migrations')).filter(file=>file.endsWith('.sql')).sort())await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',file),'utf8'));
    process.env.DATABASE_URL='postgresql://isolated-browser-automation';
    process.env.AUTH_JWT_SECRET='isolated-browser-test-secret-at-least-32-characters';
    require('pg').Pool=class {
      query(sql,args){return db.query(sql,args);}
      async connect(){return {query:(sql,args)=>db.query(sql,args),release(){}};}
    };
    const {app}=require('../server');
    const {hashPassword}=require('../middleware/auth');
    const email='browser@automation.test',password='BrowserTestOnly!2026';
    await db.query("INSERT INTO companies(id,name) VALUES('browser-company','Browser Test Company')");
    await db.query("INSERT INTO users(id,email,password_hash,role,company_id) VALUES('browser-user',$1,$2,'COMPANY_USER','browser-company')",[email,hashPassword(password)]);
    const now=new Date();now.setUTCDate(1);
    const fixture=new Map();
    for(let i=0;i<12;i++) {
      const month=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-11+i,1));
      const period=month.toISOString().slice(0,7);
      const amount=(i+1)*1000,kg=decimal(amount).times('0.42'),tonnes=kg.div(1000);
      fixture.set(period,tonnes.toFixed());
      await db.query(`INSERT INTO emissions(id,company_id,date,activity,scope,category,quantity,emissions,status,facility,conversion_factor,input_unit,raw_input,formula,result_kg,result_tonnes,methodology,reporting_period)
        VALUES($1,'browser-company',$2,'Test electricity','Scope 2','Purchased Electricity',$3,$4,'Verified','Test HQ',0.42,'kWh',$5,$6,$7,$8,'Fixed isolated test factor',$9)`,
        ['browser-'+period,month.toISOString(),amount+' kWh',kg.toFixed()+' kg CO2e',String(amount),`${amount} kWh * 0.42 = ${kg.toFixed()} kg CO2e`,kg.toFixed(),tonnes.toFixed(),period]);
    }
    api=app.listen(0); await new Promise(resolve=>api.once('listening',resolve));
    const apiBase='http://localhost:'+api.address().port;
    const frontendPort=await availablePort(),frontendBase='http://localhost:'+frontendPort;
    const env={...process.env,ECOTRACK_BROWSER_TEST:'1',NEXT_PUBLIC_API_BASE_URL:apiBase,NEXT_TELEMETRY_DISABLED:'1'};
    // Do not pass the temporary API's database/auth settings to a web process.
    delete env.DATABASE_URL;delete env.AUTH_JWT_SECRET;
    frontend=spawn(process.execPath,[nextBin,'dev','--hostname','127.0.0.1','--port',String(frontendPort)],{cwd:path.join(root,'frontend'),env,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
    const log=fs.createWriteStream(path.join(output,'frontend.log'));
    frontend.stdout.pipe(log,{end:false});frontend.stderr.pipe(log,{end:false});frontend.once('exit',()=>log.end());
    let spawnError;frontend.once('error',error=>{spawnError=error;});
    const deadline=Date.now()+180000;
    while(true) {
      if(spawnError)throw spawnError;
      if(frontend.exitCode!==null)throw new Error('Isolated frontend exited before startup. See browser/frontend.log.');
      try { const response=await fetch(frontendBase+'/login',{signal:AbortSignal.timeout(2500)});if(response.ok)break; } catch {}
      if(Date.now()>deadline)throw new Error('Isolated frontend did not become ready within 180 seconds. See browser/frontend.log.');
      await delay(350);
    }
    browser=await chromium.launch({headless:true});
    context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',locale:'en-US'});
    await context.tracing.start({screenshots:true,snapshots:true});tracing=true;
    page=await context.newPage();page.setDefaultTimeout(30000);
    const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
    await page.goto(frontendBase+'/login');
    await page.getByPlaceholder('Enter your email').fill(email);
    await page.getByPlaceholder('Enter your password').fill(password);
    await page.getByRole('button',{name:'Sign In',exact:true}).click();
    await page.waitForURL('**/dashboard');
    const chart=page.getByRole('region',{name:'Emissions Trend',exact:true});
    await chart.waitFor({state:'visible'});
    result.assertions.push('Logged in through the real sign-in form and reached the company dashboard.');
    async function checkRange(range,click) {
      let response;
      if(click) {
        const waiting=page.waitForResponse(r=>r.url().startsWith(apiBase+'/api/dashboard?')&&new URL(r.url()).searchParams.get('range')===range);
        await chart.getByRole('button',{name:range,exact:true}).click();response=await waiting;
      } else {
        // Initial render already loaded the default 6M data from the actual API.
        response=null;
      }
      if(response)assert.equal(response.status(),200);
      const count=Number(range.slice(0,-1));
      await page.waitForFunction(({count})=>document.querySelector('[aria-label="Emissions Trend"]')?.querySelectorAll('[data-period]').length===count,{count});
      assert.equal(await chart.getByRole('button',{name:range,exact:true}).getAttribute('aria-pressed'),'true');
      const points=chart.locator('[data-period]');assert.equal(await points.count(),count);
      const displayedPeriods=await points.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-period')));
      assert.deepEqual(displayedPeriods,[...fixture.keys()].slice(-count));
      const selected=points.last(),period=displayedPeriods.at(-1),expected=Number(fixture.get(period)).toLocaleString('en-US',{maximumFractionDigits:11});
      await selected.locator('circle').hover();
      const tooltip=chart.getByRole('tooltip');await tooltip.waitFor({state:'visible'});
      const text=await tooltip.innerText();assert(text.includes(expected+' tCO₂e'),`Tooltip does not show saved ${expected} tCO2e: ${text}`);
      const expectedMonth=new Date(period+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
      assert(text.includes(expectedMonth));
      const screenshot=`chart-${range}.png`;await chart.screenshot({path:path.join(output,screenshot),animations:'disabled'});screenshots.push(screenshot);
      await page.mouse.move(0,0);await tooltip.waitFor({state:'hidden'});
      await selected.focus();await tooltip.waitFor({state:'visible'});
      assert((await tooltip.innerText()).includes(expected+' tCO₂e'));
      await selected.press('Escape');await tooltip.waitFor({state:'hidden'});
      result.assertions.push(`${range}: ${count} correct monthly points, selected button, actual API response${response?' HTTP 200':''}, mouse tooltip and keyboard focus/Escape behaviour match saved emissions.`);
    }
    await checkRange('6M',false);
    await checkRange('3M',true);
    await checkRange('12M',true);
    await checkRange('6M',true);
    assert.deepEqual(pageErrors,[],'Browser JavaScript errors occurred');
    result.status='PASS';result.detail='Real Chromium sign-in, 3M/6M/12M chart changes, saved-value tooltips, tooltip dismissal, and keyboard focus passed. Screenshots and a Playwright trace were saved.';
    console.log('[PASS] TC-05.4 Browser chart hover, 3M/6M/12M controls and keyboard tooltip interactions.');
  } catch(error) {
    result.detail=error.message;process.exitCode=1;console.error('[FAIL] TC-05.4 '+error.message);
    if(page)try{await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});screenshots.push('failure.png');}catch{}
  } finally {
    result.durationMs=Date.now()-started;result.screenshots=[...new Set(screenshots)];
    if(context && tracing)try{await context.tracing.stop({path:path.join(output,'trace.zip')});}catch{}
    if(browser)await browser.close();
    await stopChild(frontend);
    if(api)await new Promise(resolve=>api.close(resolve));
    if(db)await db.close();
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2));
  }
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
