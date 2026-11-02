// Disposable real PostgreSQL on loopback only; existing .env databases are not used.
const {execFileSync,spawnSync}=require('node:child_process');
const crypto=require('node:crypto');
const path=require('node:path');
const name='ecotrack-concurrency-'+crypto.randomBytes(6).toString('hex');
const password=crypto.randomBytes(24).toString('hex');
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:args[0]==='run'?180000:30000,stdio:['ignore','pipe','pipe']}).trim();
(async()=>{
  let started=false;
  try {
    docker('info','--format','{{.ServerVersion}}');
    console.log('Starting disposable PostgreSQL 17 on loopback...');
    docker('run','--detach','--rm','--name',name,'--label','com.ecotrack.test=concurrency','--publish','127.0.0.1::5432','--env','POSTGRES_DB=ecotrack_test','--env','POSTGRES_PASSWORD='+password,'postgres:17-alpine');started=true;
    const deadline=Date.now()+60000;
    while(true){try{docker('exec',name,'pg_isready','-U','postgres','-d','ecotrack_test');break;}catch{if(Date.now()>deadline)throw new Error('Local PostgreSQL did not become ready');await new Promise(r=>setTimeout(r,500));}}
    const address=docker('port',name,'5432/tcp');
    if(!/^127\.0\.0\.1:\d+$/.test(address))throw new Error('Expected a loopback-only database port');
    const test=spawnSync(process.execPath,['--use-system-ca',path.join(__dirname,'purchase-concurrency.test.js')],{env:{...process.env,DATABASE_URL:`postgresql://postgres:${password}@${address}/ecotrack_test`},stdio:'inherit',windowsHide:true,timeout:120000});
    if(test.error)throw test.error;
    process.exitCode=test.status===0?0:1;
  } finally {
    if(started){docker('stop',name);console.log('Disposable PostgreSQL removed.');}
  }
})().catch(error=>{console.error('Local concurrency test: '+error.message);process.exitCode=1;});
