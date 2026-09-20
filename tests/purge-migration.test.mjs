import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

test('confirmed one-time purge removes all test data and restores delete locks',()=>{
 const db=new DatabaseSync(':memory:');
 for(const file of ['0000_initial.sql','0001_audit_locks.sql','0002_allow_deferred_baseline.sql','0003_patient_archive.sql','0004_patient_contact.sql'])for(const sql of fs.readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint'))if(sql.trim())db.exec(sql);
 db.exec("INSERT INTO patients(id,center,created,actor,name,phone) VALUES('TEST','C01','2026-01-01','test','','')");
 db.exec("INSERT INTO records VALUES('TEST:screen:main','TEST','screen','main','{}',1,'2026-01-01','test')");
 for(const sql of fs.readFileSync('drizzle/0005_purge_confirmed_test_data.sql','utf8').split('--> statement-breakpoint'))if(sql.trim())db.exec(sql);
 for(const table of ['patients','records','allocations','audit','patient_archives'])assert.equal(db.prepare('SELECT COUNT(*) n FROM '+table).get().n,0,table);
 db.exec("INSERT INTO patients(id,center,created,actor,name,phone) VALUES('NEW','C01','2026-01-01','test','','')");
 db.exec("INSERT INTO records VALUES('NEW:screen:main','NEW','screen','main','{}',1,'2026-01-01','test')");
 assert.throws(()=>db.exec('DELETE FROM records'));
 assert.throws(()=>db.exec('DELETE FROM audit'));
});
