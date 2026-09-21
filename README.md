# MDBO CRF 与中央动态随机化

单入口、按住院号唯一识别；所有正式记录保存在服务器数据库。每个模块独立保存，重复事件按独立记录ID保存，修改采用版本冲突检查，操作日志追加保留。浏览器缓存仅用于未保存输入恢复。

## 来源与明确选择

- 研究方案：版本01，2026-04-13，第8–11页。
- Word CRF：CRF_中文3月25.docx，CRF-01至11。
- Excel：1.xlsx，中心代码、CRF_字典、中央随机化登记、算法与审计说明。
- 用户于2026-09-20确认：Excel动态随机法已获批，正式采用Excel法。PDF中的分层区组描述与此不同；上线依据为用户明确确认的动态算法，具体批准文件应由研究团队归档。
- 80%偏向较低不平衡评分，评分相同时50%；总体、中心、P/NP肿瘤层各权重1；A/B各136例，合计272例。服务器生成一次随机数并保存计算依据，重复请求返回同一分配。分配与日志禁止更新/删除。
- 30天并发症从14天表移到1个月模块；14天窗口±3日，1/3/6/12月按日历月±7日，180天主要终点另列。7/21/28天仅补录常规诊疗结果。
- 实际治疗与随机组分别记录。支架直径、夹数量等记录真实操作并提示偏离，不用方案值冒充实测值。
- 临床成功同时核对TBIL变化、胆道症状及是否需再干预；页面显示辅助计算，采血时限由研究者结合日期核对。

## 本地开发 / 验证

Node.js 24：`npm ci`、`npm run build`、`npm test`、`npm run dev`。
测试使用内存SQLite和50例标记为TEST的虚构患者，不写入线上数据库；本地预览使用.local.sqlite。不要提交任何患者文件、导出、数据库或密钥。

## GitHub 与部署

本项目是普通Git仓库，可推送到自己的私有GitHub仓库。GitHub存放源代码，不保存患者数据。GitHub Pages仅支持静态页面，不能独立承载此项目的中央随机化与数据库。实际运行需要服务器端Worker与D1（或移植成其他受控后端）。

当前Sites部署通过私有访问策略和平台可信身份头鉴别用户；此入口仅面向中央管理员。随访/终点裁定人员不能使用带有分组、手术及完整导出的管理员入口。

Cloudflare Worker 已部署在 `https://mdbo-crf.ashersense-research.workers.dev`，绑定全新的 APAC D1 数据库 `mdbo-crf-production`（见 `wrangler.jsonc`）。但 Cloudflare Zero Trust / Access 尚未开通：目前页面与 API 均返回 401，不能登录或录入数据。先由账号所有者在 Cloudflare 控制台完成 Zero Trust 组织、Free 方案及付款资料确认，然后在此 Worker 的 Access 设置中启用 **All traffic**，仅允许获授权的研究团队账号；最后核验未登录被拒绝、获授权用户可保存并重新读取虚构测试记录。Worker 仅接受 Cloudflare 提供的可信 `ctx.access` 身份对象，不信任客户端自带身份头。`npm run deploy` 可重新部署；源代码公开不代表患者数据公开，D1 数据不会进入 GitHub。

不得在未启用 Access 的情况下录入任何患者信息。`drizzle/0005_purge_confirmed_test_data.sql` 会清空患者、记录、随机化及审计数据，仅适用于经确认的全新空库初始化；绝不可对已有正式数据的 D1 执行整套迁移。正式上线前还需由研究团队完成角色授权、备份恢复演练、数据处理协议和机构安全验收。

## Streamlit 界面

`streamlit/app.py` 是同一研究系统的 Streamlit 入口，复用现有 Worker + D1 作为唯一云端数据和随机化后端，字段与访视从 `src/schema.js` / `src/workflow.js` 导出到 `streamlit/schema.json`。本地运行：`python -m pip install -r requirements.txt`，再执行 `python -m streamlit run streamlit/app.py`。未配置登录时只显示锁定提示，不能读写患者数据。

Streamlit Community Cloud 从公开 GitHub 仓库部署时默认公开访问；必须在应用 Secrets 中配置 OIDC 登录和 `crf.allowed_emails` 白名单。所需键为 `[auth]` 下的 `redirect_uri`、`cookie_secret`、`client_id`、`client_secret`、`server_metadata_url`，以及 `[crf]` 下的 `backend_url`（`https://mdbo-crf.ashersense-research.workers.dev`）、`service_token`、`allowed_emails`（逗号分隔的已验证邮箱）。登录用户通过白名单后，Streamlit 服务端才带服务令牌访问 API；令牌不能公开或提交仓库。Worker 的 `STREAMLIT_SERVICE_TOKEN` 须通过 Wrangler Secret 设置为同一随机值。目前尚未配置 OIDC 和 Streamlit Cloud，因此没有可用的线上 Streamlit 地址。正式临床使用仍需授权分工、备份和合规验收。

## 当前边界

提供中央管理员单入口。尚无独立的多中心角色授权、盲态随访入口、签名式修订工作流、自动异地备份恢复演练。随机分组页的资格确认、分层及当时输入快照锁定；筛选和基线可后补录并保留审计，但不能改变已锁定分层或重新分组。分层确认的更正仍需后续受控修订流程。对正式研究的完整验证和机构验收，本项目测试报告不能替代。

下载CSV为长表（住院号、中心、随机号、模块、记录ID、日期、字段、值、保存状态），保留重复事件。JSON包含完整服务器记录；操作日志可单独下载。CSV对公式起始字符转义，前导0标识加文本前缀以避免WPS/Excel误转数字。
