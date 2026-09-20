import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import worker from '../dist/server/index.js';import {database} from '../scripts/sqlite-adapter.mjs';
const confirmed={eligibility:'符合全部纳入标准，且无任何排除标准',stratum:'P',guidewire:'是',date:'2026-09-20',operator:'虚构测试执行人'};
test('randomize without any baseline or screening form; subsequently complete forms without changing allocation',async()=>{
 const DB=database();
 async function call(id,op,data){const response=await worker.fetch(new Request('https://test.invalid/api/'+(op==='create'?'patients':'patients/'+id+(op?'/'+op:'')),{method:data?'POST':'GET',headers:{Origin:'https://test.invalid','oai-authenticated-user-id':'test'},body:data?JSON.stringify(data):undefined}),{DB});return {status:response.status,data:await response.json()}}
 for(const [i,stratum]of ['P','NP'].entries()){
  const id='DEFERRED-'+i;assert.equal((await call(id,'create',{id,center:'C01'})).status,200);
  assert.equal((await call(id,'randomize',{})).status,400);
  for(const invalid of [{eligibility:'待核实'},{guidewire:'否'},{stratum:''}]){
   const previous=await call(id,'');const version=previous.data.records[0]?.version||0;
   assert.equal((await call(id,'records',{module:'random',data:{...confirmed,stratum,...invalid},version})).status,200);
   assert.equal((await call(id,'randomize',{})).status,400);
  }
  const before=await call(id,'');await call(id,'records',{module:'random',data:{...confirmed,stratum},version:before.data.records[0].version});
  const allocated=await call(id,'randomize',{});assert.equal(allocated.status,200);assert.equal(allocated.data.records.length,1);assert.equal(allocated.data.allocation.stratum,stratum);
  const allocationSnapshot=DB.sqlite.prepare('SELECT * FROM allocations WHERE patient=?').get(id);
  assert.equal((await call(id,'records',{module:'baseline',version:0,data:{tumor:stratum==='P'?'胰腺癌':'壶腹癌',date:'2026-09-19',ecog:'1',tbil:'180',distance:'3'}})).status,200);
  assert.equal((await call(id,'records',{module:'screen',version:0,data:{age:'60',consent:'是',consentDate:'2026-09-18',eligibility:confirmed.eligibility}})).status,200);
  assert.equal((await call(id,'records',{module:'baseline',version:1,data:{tumor:stratum==='P'?'壶腹癌':'胰腺癌'}})).status,409);
  assert.equal((await call(id,'records',{module:'random',version:4,data:{...confirmed,stratum:stratum==='P'?'NP':'P'}})).status,409);
  assert.deepEqual(DB.sqlite.prepare('SELECT * FROM allocations WHERE patient=?').get(id),allocationSnapshot);
  assert.equal((await call(id,'randomize',{})).data.allocation.randomNo,allocated.data.allocation.randomNo);
  assert.throws(()=>DB.sqlite.prepare("UPDATE records SET data='{}' WHERE patient=? AND module='random'").run(id));
  assert.ok((await call(id,'audit')).data.some(r=>r.action==='create_record:baseline:main'));
 }
});
test('append-only migration preserves existing patient, allocation and audit data while unlocking baseline only',()=>{
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('drizzle/0000_initial.sql','utf8'));db.exec(fs.readFileSync('drizzle/0001_audit_locks.sql','utf8'));
 db.prepare('INSERT INTO patients VALUES(?,?,?,?)').run('OLD','C01','2026-01-01','test');
 for(const module of ['baseline','screen','random'])db.prepare('INSERT INTO records VALUES(?,?,?,?,?,?,?,?)').run('OLD:'+module+':main','OLD',module,'main','{}',1,'2026-01-01','test');
 db.prepare('INSERT INTO allocations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run('OLD',1,'A','C01','P',.1,0,0,.5,'2026-01-01','test','test','[]');
 const snapshot=JSON.stringify(db.prepare('SELECT * FROM allocations').all()),count=db.prepare('SELECT COUNT(*) n FROM audit').get().n;
 assert.throws(()=>db.exec("UPDATE records SET version=2 WHERE module='baseline'"));
 db.exec(fs.readFileSync('drizzle/0002_allow_deferred_baseline.sql','utf8'));
 assert.equal(JSON.stringify(db.prepare('SELECT * FROM allocations').all()),snapshot);assert.equal(db.prepare('SELECT COUNT(*) n FROM audit').get().n,count);
 db.exec("UPDATE records SET data='{\"tbil\":\"100\"}',version=2 WHERE module='baseline'");
 assert.throws(()=>db.exec("UPDATE records SET version=2 WHERE module='random'"));assert.throws(()=>db.exec('DELETE FROM allocations'));assert.throws(()=>db.exec('DELETE FROM audit'));
});
