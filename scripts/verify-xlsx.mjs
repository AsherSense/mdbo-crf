import fs from 'node:fs';
import vm from 'node:vm';
const context={TextEncoder,Uint8Array,STUDY_TITLE:'测试研究',CENTERS:{C01:'测试中心'},MODULES:[{id:'screen',title:'入院筛选',fields:[{id:'date',label:'日期'}]},{id:'baseline',title:'术前资料',fields:[{id:'ecog',label:'ECOG'}]}],qualification:()=> '符合',completionReport:()=>({items:[{title:'入院筛选',text:'核心项目已填写'},{title:'术前资料',text:'尚未填写'}],outstanding:1})};
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/xlsx.js','utf8')+fs.readFileSync('src/xlsx-repair.js','utf8')+fs.readFileSync('src/xlsx-complete.js','utf8')+';this.make=buildCompleteXlsx',context);
const bytes=context.make({patient:{id:'000123',name:'测试患者',phone:'13800000000',center:'C01'},allocation:null,records:[{module:'screen',slot:'main',version:1,updated:'2026-09-20',data:{date:'2026-09-20'}}],audit:[{id:1,patient:'000123',action:'create_patient',before:null,after:'{}',at:'2026-09-20',actor:'test'}]});
if(bytes[0]!==0x50||bytes[1]!==0x4b)throw Error('不是ZIP/XLSX文件头');
fs.writeFileSync(process.argv[2],bytes);
console.log(bytes.length);
