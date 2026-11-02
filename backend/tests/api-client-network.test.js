// Execute the actual bundled frontend API client with deterministic failed networks.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const { buildSync } = require('esbuild');
const code = buildSync({entryPoints:[path.join(__dirname,'../../frontend/lib/api/client.ts')],bundle:true,platform:'node',format:'cjs',write:false,tsconfig:path.join(__dirname,'../../frontend/tsconfig.json')}).outputFiles[0].text;
function client(fetch, online=true) {
  let timeout, cleared=0, calls=0;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,Headers,FormData,AbortSignal,AbortController,process:{env:{}},navigator:{onLine:online},fetch:(...args)=>{calls++;return fetch(...args);},setTimeout:fn=>{timeout=fn;return 1;},clearTimeout:()=>{cleared++;}});
  return {...module.exports,expire:()=>timeout(),calls:()=>calls,cleared:()=>cleared};
}
const stalled=(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
(async()=>{
  const success=client(async()=>({ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>({success:true,data:{value:42}})}));
  assert.equal((await success.apiClient('/api/test')).value,42); assert.equal(success.cleared(),1);
  for(const method of ['GET','POST']) {
    const c=client(stalled), pending=c.apiClient('/api/test',{method});c.expire();
    await assert.rejects(pending,e=>e.status===408 && (method==='POST'?e.message.includes('may have completed'):e.message.includes('try again')));
    assert.equal(c.calls(),1,'A timed-out request must not be automatically retried');assert.equal(c.cleared(),1);
  }
  const observed=[];
  const headersClient=client(async(_,options)=>{observed.push(options.headers);return {ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>({success:true,data:{}})};});
  await headersClient.apiClient('/api/read');
  await headersClient.apiClient('/api/write',{method:'POST',body:JSON.stringify({quantity:'0.70'})});
  assert.equal(observed[0].has('Content-Type'),false,'Bodyless reads should not add an unnecessary JSON header');
  assert.equal(observed[1].get('Content-Type'),'application/json','JSON writes must keep their content type');
  const offline=client(async()=>{throw new TypeError('fetch failed');},false);
  await assert.rejects(offline.apiClient('/api/test'),e=>e.status===0 && e.message.includes('offline'));
  const c=client(stalled), caller=new AbortController(), pending=c.apiClient('/api/test',{signal:caller.signal});caller.abort();
  await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(c.cleared(),1);
  const server=client(async()=>({ok:false,status:403,headers:new Headers({'content-type':'application/json'}),json:async()=>({error:'Access denied'})}));
  await assert.rejects(server.apiClient('/api/test'),e=>e.status===403 && e.message==='Access denied');
  console.log('PASS: API success, timeout, write ambiguity/no retry, offline, caller cancellation and HTTP error handling');
})().catch(e=>{console.error(e);process.exitCode=1;});
