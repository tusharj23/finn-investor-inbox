import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin='http://127.0.0.1:8787';
const get=async(path)=>{const r=await fetch(origin+path);const x=await r.json();assert.equal(r.status,200,JSON.stringify(x));return x;};
const post=async(path,value)=>{const r=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(value)});const x=await r.json();assert.ok(r.ok,JSON.stringify(x));return x;};
const before=await get('/api/catalog');
const cold=await post('/api/companies/resolve',{symbol:'VGUARD'});
assert.equal(cold.company.symbol,'VGUARD');
assert.deepEqual(cold.company.membership,{portfolio:false,researchExample:false});
assert.equal(cold.company.identity.exchangeLinkVerified,true);
console.log('PASS cold VGUARD identity independent of both lists; documents:',cold.company.documents.length);
const warm=await post('/api/companies/resolve',{symbol:'VGUARD'});
assert.equal(warm.company.identity.provenance.fromCache,true);
assert.equal(warm.company.documents.length,cold.company.documents.length);
console.log('PASS repeated resolution uses cache without duplicating discovered documents');
const {jobId}=await post('/api/refresh',{});
let job;
for(let poll=0;poll<180;poll++){
  job=await get('/api/refresh?jobId='+jobId);
  if(job.status!=='running')break;
  if(poll%10===0)console.log('Refresh progress',job.completed+'/'+job.total);
  await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.notEqual(job.status,'running');assert.equal(job.total,30);assert.equal(job.completed,30);
const after=await get('/api/catalog');
assert.equal(after.coverage.portfolioCount,15);
for(const prior of before.companies){const next=after.companies.find(c=>c.symbol===prior.symbol);assert.ok(next);assert.ok(next.documents.length>=prior.documents.length);if(prior.market)assert.ok(next.market);}
assert.equal(new Set(after.filings.map(f=>f.id)).size,after.filings.length);
const success=30-job.errors.length;
console.log('PASS persisted refresh:',job.status,success+' successful source tasks;',job.errors.length+' failures retained with saved data');
await mkdir('verification',{recursive:true});
await writeFile('verification/ingestion-checks.json',JSON.stringify({testedAt:new Date().toISOString(),coldSymbol:'VGUARD',coldDocuments:cold.company.documents.length,cachedResolution:true,job,counts:{beforeFilings:before.filings.length,afterFilings:after.filings.length,portfolio:15,researchExamples:after.coverage.researchExamples}},null,2));
if(success===0)process.exitCode=1;
