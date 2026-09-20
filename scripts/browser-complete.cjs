const {chromium}=require('C:/Users/16546/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const {completeCase}=await import('../tests/complete-fixtures.mjs');const {WORKFLOW}=await import('../src/workflow.js');
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/16546/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const run=Date.now();
 await page.goto('http://127.0.0.1:4173');await page.getByText('服务器连接成功。请选择患者或建立新档案。',{exact:true}).waitFor();
 async function fill(data){for(const [key,value]of Object.entries(data)){const el=page.locator('#field-'+key);if(!await el.count()||!await el.isVisible()||await el.isDisabled())continue;const tag=await el.evaluate(n=>n.tagName);if(tag==='SELECT')await el.selectOption(value);else await el.fill(value);}}
 async function save(){await Promise.all([page.waitForResponse(r=>r.url().endsWith('/records')&&r.request().method()==='POST'),page.locator('#saveModule').click()]);await page.locator('#dirty').getByText('本页资料已保存',{exact:true}).waitFor();}
 for(let i=0;i<10;i++){
  let fixture=completeCase(i),id='UI-COMPLETE-'+run+'-'+i;
  await page.getByLabel('新患者住院号').fill(id);await page.getByLabel('研究中心',{exact:true}).selectOption(fixture.center);await page.getByRole('button',{name:'建立患者档案',exact:true}).click();await page.getByText('患者档案已建立。请填写筛选与知情同意。',{exact:true}).waitFor();
  const completed=new Set();let allocation;
  for(const view of WORKFLOW){
   for(let pi=0;pi<view.panes.length;pi++){
    const pane=view.panes[pi],row=fixture.records.find(r=>r.module===pane.module&&(!pane.context||r.data[pane.module==='therapy'?'visit':'time']===pane.context));
    if(!row||completed.has(row.module+':'+row.slot))continue;
    await page.locator('[data-view="'+view.id+'"]').click();if(pi)await page.locator('[data-pane="'+pi+'"]').click();
    if(await page.locator('[data-history],#exportModule,#backup,#audit,#saveInfo').count())throw Error('Removed UI controls remain');
    if(await page.getByText(/访视整合版|保存位置：服务器数据库|本记录上次保存值/).count())throw Error('Metadata clutter remains');
    if(row.module==='screen'&&!await page.locator('[data-field="eligibility"]').getByText('年龄≥18岁',{exact:true}).isVisible())throw Error('Eligibility criteria not immediately visible');
    if(row.module==='baseline'&&!await page.locator('[data-field="ecog"]').getByText(/清醒时间超过一半在床上或椅上/).isVisible())throw Error('ECOG details collapsed or missing');
    if(row.module==='therapy'&&pane.context!=='围术期'&&await page.locator('#field-pancreaticStent').count())throw Error('Pancreatic prophylaxis shown outside perioperative form');
    await fill(row.data);
    if(row.module==='random'){
     if(await page.locator('#saveModule').count())throw Error('Randomization has a competing save button');
     await page.getByRole('button',{name:'确认并随机分组',exact:true}).click();await page.getByText(/随机化成功：R/).waitFor();
     const response=await page.request.get('http://127.0.0.1:4173/api/patients/'+id);allocation=(await response.json()).allocation;
     if(!allocation?.subjectNo||!allocation.randomNo||!allocation.treatment)throw Error('Missing allocation identifiers');
     const banner=await page.locator('#allocationBanner').innerText();for(const value of [allocation.randomNo,allocation.subjectNo,allocation.arm==='A'?'试验组':'对照组'])if(!banner.includes(value))throw Error('Allocation not shown: '+value);
     fixture=completeCase(i,allocation.arm);
    }else await save();
    completed.add(row.module+':'+row.slot);
   }
  }
  await page.reload();await page.getByLabel('已保存患者（服务器）').selectOption(id);await page.getByText('已读取服务器记录',{exact:true}).waitFor();
  const saved=await (await page.request.get('http://127.0.0.1:4173/api/patients/'+id)).json();
  if(saved.records.length!==fixture.records.length)throw Error('Missing saved forms for '+id);
  for(const expected of fixture.records){const actual=saved.records.find(r=>r.module===expected.module&&r.data.date===expected.data.date&&(!expected.data.time||r.data.time===expected.data.time)&&(!expected.data.visit||r.data.visit===expected.data.visit));if(!actual)throw Error('Missing '+expected.module);for(const [k,val]of Object.entries(expected.data))if((actual.data[k]??'')!==val)throw Error(id+' '+expected.module+'.'+k+' expected '+val+' got '+actual.data[k]);}
  if(saved.allocation.randomNo!==allocation.randomNo)throw Error('Allocation changed on reload');
  if(await page.getByRole('button',{name:/下载/}).count()!==1)throw Error('More than one download control');
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'下载患者全部资料',exact:true}).click();const download=await pending;const csv=fs.readFileSync(await download.path(),'utf8');if(!csv.includes(id)||!csv.includes(allocation.randomNo)||!csv.includes('qol')&& !csv.includes('生活质量'))throw Error('Incomplete export');
  results.push({id,randomNo:allocation.randomNo,subjectNo:allocation.subjectNo,group:allocation.treatment,forms:saved.records.length,download:true,reload:true});console.log('Completed synthetic patient '+(i+1)+'/10');
 }
 fs.mkdirSync('test-output',{recursive:true});await page.locator('[data-view="surgery"]').click();await page.screenshot({path:'test-output/simplified-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-output/simplified-mobile.png',fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
 if(errors.length)throw Error(errors.join(';'));fs.writeFileSync('test-output/ten-complete-patients.json',JSON.stringify({synthetic:true,localOnly:true,passed:true,patients:results,consoleErrors:errors},null,2));console.log(JSON.stringify({passed:true,patients:10,downloads:10,consoleErrors:errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
