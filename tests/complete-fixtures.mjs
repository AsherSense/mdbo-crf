import {MODULES,addDays,addMonths,procedurePlan,TUMORS} from '../src/schema.js';
// Entirely synthetic, local-only software validation cases. Not clinical source records.
export function completeCase(i,arm='A'){
 const surgery=addDays('2025-01-06',i*9),base=180+i*17,hasRbo=i%3===0,chemo=i%2===0;
 const records=[];
 const add=(module,data,slot='main')=>{const schema=MODULES.find(m=>m.id===module);records.push({module,slot,data:{...Object.fromEntries(schema.fields.map(f=>[f.id,''])),notes:'完全虚构的软件测试病例；不用于临床研究分析。',...data}})};
 add('screen',{admissionDate:addDays(surgery,-4),date:addDays(surgery,-3),initials:'TEST'+i,age:String(45+i*3),sex:i%2?'女':'男',consent:'是',consentDate:addDays(surgery,-3),eligibility:'符合全部纳入标准，且无任何排除标准'});
 add('baseline',{date:addDays(surgery,-2),ecog:String(i%3),tumor:TUMORS[i%4],tnm:'cT3N1M0；示例分期，AJCC第8版；虚构影像报告TEST-'+i,distance:String(2.5+i/10),drain:i%2?'塑料支架':'无',tbil:String(base),alp:String(290+i*13),alt:String(88+i*4),ast:String(72+i*3),wbc:String(5.5+i/10),platelets:String(170+i*9),inr:'1.1',creatinine:String(66+i*2),ca199:String(130+i*50)});
 add('random',{date:surgery,guidewire:'是',operator:'虚构测试执行人'+(i%3+1)});
 add('procedure',{conforms:'是',date:surgery,anesthesia:i%2?'镇静':'全麻',est:i%2?'EST':'均未做',nasal:'否',stenosis:String(2+i/10),...procedurePlan(arm),stentModel:'虚构测试器械型号-'+i,length:i%2?'80':'60',technical:'是',complication:'无',clipModel:arm==='A'?'虚构测试夹型号':'NA',exposure:'7',deviation:''});
 add('week2',{date:addDays(surgery,14),mode:i%2?'电话':'门诊',improve:'明显改善',labDate:addDays(surgery,14),tbil:String(Math.round(base*.45)),biliarySymptoms:'否',needIntervention:'否',combined:chemo?'是':'否',combinedDate:chemo?addDays(surgery,12):''});
 for(const month of [1,3,6,12])add('month'+month,{date:addMonths(surgery,month),mode:'门诊',symptom:'无',tbil:String(17+i),alp:String(90+i*2),alt:String(23+i),ast:String(21+i),imaging:month===1?'超声':'CT',stent:'正常',suspectedRbo:'否',anti:chemo?'化疗':'无',ae:month===1?'有':'无',survival:'存活',...(month===1?{reviewDate:addDays(surgery,30),pancreatitis:'无',cholecystitis:'无',bleeding:'无',migration:'无'}:{})});
 for(const [time,offset]of [['基线',-1],['3月',null],['6月',null]])add('qol',{date:offset===-1?addDays(surgery,-1):addMonths(surgery,time==='3月'?3:6),time,scale:'两者',method:i%2?'访谈':'自填',complete:'是',missing:'0',sourceRef:'虚构量表TEST-'+i+'-'+time},'qol-'+(offset===-1?'base':time==='3月'?'3':'6'));
 const visits=['入院','术前','围术期','术后7–30天','术后3个月','术后6个月','术后12个月'];
 visits.forEach((visit,k)=>add('therapy',{visit,date:k===0?addDays(surgery,-4):k===1?addDays(surgery,-2):k===2?surgery:k===3?addDays(surgery,14):addMonths(surgery,[0,0,0,0,3,6,12][k]),...(k===2?{nsaid:i%2?'吲哚美辛':'双氯芬酸',pancreaticStent:i%2?'是':'否',spec:i%2?'虚构规格5Fr×3cm':'',antibiotic:'是',antibioticDetail:'虚构用药记录；仅测试，不作为临床建议。'}:{}),chemo:chemo&&k>=3?'虚构化疗方案TEST-'+i:'',chemoStart:chemo&&k>=3?addDays(surgery,12):'',radiation:'否',immune:'否'},'therapy-'+k));
 for(const [day,tbil]of [[7,Math.round(base*.7)],[21,Math.round(base*.2)],[28,20]])add('clinical',{date:addDays(surgery,day),time:day+'天',tbil:String(tbil),biliarySymptoms:'否',needIntervention:'否'},'lab-'+day);
 add('ae',{date:addDays(surgery,1),event:i%2?'一过性腹痛':'一过性发热',severity:'轻',sae:'否',related:'可能相关',measure:'对症',outcome:'痊愈',awareAt:addDays(surgery,1)+'T10:00',reported:'不适用'},'ae-1');
 if(hasRbo){add('rbo',{date:addDays(surgery,110),confirmed:'是',rboDate:addDays(surgery,110),adjudicator:'虚构测试裁定委员会',type:'支架闭塞',occlusion:'胆泥/食物嵌塞',migration:'NA',clip:arm==='A'?'是':'NA',intervention:'ERCP清洗',interventionDate:addDays(surgery,111),technical:'是',ae:'无'},'rbo-1');}
 add('outcome',{date:addDays(surgery,180),rbo180:hasRbo?'是':'否',rboDate:hasRbo?addDays(surgery,110):'',rboType:hasRbo?'支架闭塞':'',exit:'否',lastFollow:addDays(surgery,180),deathCause:'NA'});
 return {id:'COMPLETE-TEST-'+String(i+1).padStart(2,'0'),center:'C0'+(i%6+1),records};
}
