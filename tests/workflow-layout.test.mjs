import test from "node:test";
import assert from "node:assert/strict";
import {WORKFLOW,recordsForPane,paneDefaults,allocationLabel} from "../src/workflow.js";
import {MODULES,validate} from "../src/schema.js";
import {guidanceFor} from "../src/guidance.js";
test("every input has corresponding field guidance",()=>{for(const m of MODULES)for(const f of m.fields)assert.ok(guidanceFor(m.id,f).length>=15,m.id+"."+f.id)});
test("chronological navigation covers every stored module without isolated QoL, medication or supplemental pages",()=>{
 assert.deepEqual(WORKFLOW.filter(v=>!v.event).map(v=>v.id),["screen","baseline","surgery","early","month1","month3","month6","month12"]);
 for(const m of MODULES)assert.ok(WORKFLOW.some(v=>v.panes.some(p=>p.module===m.id)),m.id);
 assert.ok(!WORKFLOW.some(v=>["qol","therapy","clinical"].includes(v.id)));
 assert.equal(WORKFLOW.find(v=>v.id==="early").panes[0].module,"week2");assert.ok(WORKFLOW.find(v=>v.id==="early").panes.find(p=>p.module==="clinical").optional);
 assert.equal(allocationLabel(null),"未分组");assert.equal(allocationLabel({arm:"B"}),"已分组");
});
test("visit-specific records remain separate; legacy rows survive but are not guessed into a visit",()=>{
 for(const view of WORKFLOW)for(const p of view.panes){assert.equal(validate(p.module,paneDefaults(p)).length,0);if(!p.context)continue;
 const rows=[{module:p.module,slot:"match",data:paneDefaults(p)},{module:p.module,slot:"legacy",data:{}},{module:p.module,slot:"different",data:{visit:"not-this-visit",time:"not-this-time"}}];
 assert.deepEqual(recordsForPane(rows,p).map(r=>r.slot),["match"]);assert.equal(rows.length,3);
 }
});
