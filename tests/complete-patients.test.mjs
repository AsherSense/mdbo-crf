import test from 'node:test';import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';import {database} from '../scripts/sqlite-adapter.mjs';import {completeCase} from './complete-fixtures.mjs';
import {MODULES,validate} from '../src/schema.js';import {fieldVisible,PERIOP_FIELDS} from '../src/workflow.js';
test('10 complete synthetic records: real allocation, all applicable visits, values, reload and immutable result',async()=>{
 const DB=database(),summary=[];
 async function call(path,data){const res=await worker.fetch(new Request('https://test.invalid/api/'+path,{method:data?'POST':'GET',headers:{Origin:'https://test.invalid','oai-authenticated-user-id':'local-test'},body:data?JSON.stringify(data):undefined}),{DB});const body=await res.json();assert.equal(res.status,200,JSON.stringify(body));return body}
 for(let i=0;i<10;i++){
  let p=completeCase(i);await call('patients',{id:p.id,center:p.center});
  for(const r of p.records.filter(r=>['screen','baseline','random'].includes(r.module)))await call('patients/'+p.id+'/records',{...r,version:0});
  const allocated=await call('patients/'+p.id+'/randomize',{});p=completeCase(i,allocated.allocation.arm);
  for(const r of p.records.filter(r=>!['screen','baseline','random'].includes(r.module))){assert.deepEqual(validate(r.module,r.data),[]);await call('patients/'+p.id+'/records',{...r,version:0});}
  const loaded=await call('patients/'+p.id);assert.equal(loaded.records.length,p.records.length);
  for(const r of p.records){const got=loaded.records.find(x=>x.module===r.module&&x.slot===r.slot);assert.deepEqual(got.data,r.data,r.module);}
  assert.equal((await call('patients/'+p.id+'/randomize',{})).allocation.randomNo,allocated.allocation.randomNo);
  summary.push({id:p.id,randomNo:allocated.allocation.randomNo,group:allocated.allocation.treatment,records:loaded.records.length});
 }
 assert.equal(new Set(summary.map(x=>x.randomNo)).size,10);assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM allocations').get().n,10);
 console.log('10例完整虚构病例：'+JSON.stringify(summary));
});
test('perioperative prophylaxis shown only in perioperative form; hidden fields remain in schema/export',()=>{
 for(const field of PERIOP_FIELDS){assert.ok(fieldVisible('therapy',field,'围术期'));for(const visit of ['入院','术前','术后7–30天','术后3个月','术后6个月','术后12个月'])assert.equal(fieldVisible('therapy',field,visit),false);assert.ok(MODULES.find(m=>m.id==='therapy').fields.some(f=>f.id===field));}
});
