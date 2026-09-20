// Presentation only: existing module IDs, record slots and audit history remain unchanged.
const pane=(module,label,context='')=>({module,label,context});
const medication=context=>pane('therapy','用药与抗肿瘤治疗',context);
export const WORKFLOW=[
 {id:'screen',title:'01 入院筛选',panes:[pane('screen','筛选与知情同意'),medication('入院')]},
 {id:'baseline',title:'02 术前评估',panes:[pane('baseline','基线资料'),pane('qol','生活质量','基线'),medication('术前')]},
 {id:'surgery',title:'03 随机分组与手术',panes:[pane('random','中央随机分组'),pane('procedure','手术记录'),medication('围术期')]},
 {id:'early',title:'04 术后早期（7–30天）',panes:[pane('clinical','7天检验','7天'),pane('week2','2周随访（14天）'),pane('clinical','21天检验','21天'),pane('clinical','28天检验','28天'),pane('month1','1个月随访与30天并发症'),medication('术后7–30天')]},
 {id:'month3',title:'05 术后3个月',panes:[pane('month3','本次随访'),pane('qol','生活质量','3月'),medication('术后3个月')]},
 {id:'month6',title:'06 术后6个月',panes:[pane('month6','本次随访'),pane('qol','生活质量','6月'),pane('outcome','180天终点与结局'),medication('术后6个月')]},
 {id:'month12',title:'07 术后12个月',panes:[pane('month12','本次随访'),medication('术后12个月')]},
 {id:'ae',title:'不良事件及严重不良事件',event:true,panes:[pane('ae','事件详情')]},
 {id:'rbo',title:'再次胆道梗阻与处理',event:true,panes:[pane('rbo','梗阻及再次干预')]},
 {id:'outcome',title:'退出、失访与生存结局',event:true,panes:[pane('outcome','终点与结局')]}
];
export function recordsForPane(records,p){return records.filter(r=>r.module===p.module&&(!p.context||r.data[p.module==='therapy'?'visit':'time']===p.context));}
export function paneDefaults(p){return p.context?{[p.module==='therapy'?'visit':'time']:p.context}:{};}
export function allocationLabel(allocation){return allocation?'已分组':'未分组';}
