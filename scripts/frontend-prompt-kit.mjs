#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = parseArgs(process.argv.slice(2))
const scriptDir = path.dirname(fileURLToPath(import.meta.url))

const contract = {
  visualPreflight:
    '生成/实现前必须先收集用户 UI 风格描述，再逐项敲定首页元素，然后基于“风格+已确认元素”和整个技能合同补足专业学校门户框架、学校特色和精致视觉要求，吸收全球高校首页优秀模式并创新差异化，最后优先用 imagegen2 生成并确认一张登录页+首页设计稿/效果图；缺少任一项时不得开始工程实现。',
  pages: [
    '业务产物固定为两个入口：登录页、首页；打包格式按当前 Vite library/component 构建反推',
    '登录页：手机号、短信验证码、60s倒计时、登录、统一认证入口、校验',
    '首页：来信选登、我要写信、我的信件登录后二级视图、来信须知、校园服务电话、评价弹窗、详情/编辑/写信固定跳转'
  ],
  stack: {
    default: 'React + Ant Design',
    rule:
      '空目录或未指定技术栈时必须使用 React + Ant Design；已有工程遵循现有技术栈，若现有工程是 React，则 UI 组件框架默认使用 Ant Design。'
  },
  artifacts: {
    detectCommand: `${nodeCommand('detect-build-artifacts.mjs')} --root .`,
    home: {
      buildCommand: 'pnpm build:home',
      viteMode: 'home-component',
      entry: 'src/entry-home-component.ts',
      format: 'single IIFE JavaScript Web Component with CSS injected into JS',
      fileName: 'portal.min.js',
      localArtifact: 'dist-home/portal.min.js',
      currentViteOutDir:
        'lowcode4j-apps/app-xzxx/xzxx/src/main/resources/page/ as configured by vite.config.ts',
      customElement: 'principal-mailbox-home-widget',
      attributes: ['view', 'logged-in', 'login-url']
    },
    login: {
      buildCommand: 'pnpm build:login',
      viteMode: 'login-component',
      entry: 'src/entry-login-component.ts',
      format: 'single IIFE JavaScript Web Component with CSS injected into JS',
      fileName: 'login.min.js',
      localArtifact: 'dist-login/login.min.js',
      currentViteOutDir:
        'lowcode4j-apps/app-xzxx/xzxx/src/main/resources/page/ as configured by vite.config.ts',
      customElement: 'principal-mailbox-login-widget',
      attributes: ['unified-auth-url', 'submit-url', 'phone-field-name', 'code-field-name']
    },
    optionalLegacy: {
      appBuild: 'pnpm build -> dist/index.html single inlined HTML',
      combinedWidget: 'pnpm build:js -> dist-js/principal-mailbox-widget.min.js'
    }
  },
  globals: ['window.contextPath', 'window.userId', 'window.userName', 'window.logoPath'],
  endpoints: [
    ['GET', '/admin/upms/login/doLogout', 'redirect=buildPortalUrl("/plugins/xzxx/portal/index")'],
    ['POST', '/plugins/xzxx/portal/sms', '{ phone }'],
    ['POST', '/plugins/xzxx/portal/doLogin', '{ phone, code }'],
    ['POST', '/plugins/xzxx/portal/getConfig', '{}'],
    ['POST', '/plugins/xzxx/portal/phoneList', '{ pageNo: 1, pageSize: 20 }'],
    ['POST', '/plugins/xzxx/portal/letterTypeList', '{}'],
    ['POST', '/plugins/xzxx/portal/registerLetters', 'converted query payload'],
    ['POST', '/admin/api/query/xzxx_task_startByMeList', 'converted query payload'],
    ['POST', '/plugins/xzxx/portal/getEvaluateList', '{}'],
    ['POST', '/plugins/xzxx/portal/read', '{ bizId: readId }'],
    ['POST', '/admin/api/execute/xzxx_letter_rate', '{ params: { letterParam: { bizId, rateForm } } }'],
    ['POST', '/admin/api/execute/xzxx_letter_remove', '{ params: { letterParam: { bizId } } }'],
    ['POST', '/admin/api/execute/xzxx_letter_startBackTo', '{ params: { letterParam: { bizId } } }']
  ],
  jumps: [
    ['登录', '/plugins/xzxx/portal/login'],
    ['统一认证', '/plugins/xzxx/portal/ids-login'],
    ['写信', '/page/xzxx/formPage'],
    ['详情', '/page/xzxx/formPage#/?bizId=${encodeURIComponent(rowId)}&source=view'],
    ['编辑', '/page/xzxx/formPage#/?bizId=${encodeURIComponent(rowId)}']
  ],
  statuses: [
    'reviewed/evaluated => 已回复',
    'draft => 草稿',
    'to_review/to_confirm/suspend/xf_doing/xf_done => 处理中',
    '进度：信件提交、信件分派、信件回复、信件评价'
  ],
  preview:
    `${nodeCommand('mock-preview-server.mjs')} --port 4179 --home-js dist-home/portal.min.js --login-js dist-login/login.min.js`,
  lint:
    `${nodeCommand('contract-lint.mjs')} --root . --home-js dist-home/portal.min.js --login-js dist-login/login.min.js`,
  productionPurity: [
    '生产产物必须是纯净的 Web Component JS，只负责读取宿主 window globals、调用真实同路径接口、执行固定跳转。',
    'mock server、mock globals、测试数据、预览 HTML shell、/preview/* 路由、/__artifact/* loader 只能存在于本地预览环境或脚本中。',
    '生产 JS 不得内置 mock rows、mock-user、mock-logo.svg、本地预览测试数据、localhost、127.0.0.1、/preview/、__artifact、mock-preview-server 等标记。',
    '生产代码不得覆盖 window.contextPath/window.userId/window.userName/window.logoPath；只允许读取并在缺失时按合同兜底显示。',
    '验证时必须先生产构建，再用 contract-lint 扫描两个 JS 产物；预览服务只是托管这些产物进行烟测，不参与产物内容。'
  ]
}

const requiredFiles = [
  ['project entry', 'package/build config and app entry files; create them when starting from an empty project'],
  ['login component entry', '登录页 Web Component entry equivalent to src/entry-login-component.ts'],
  ['home component entry', '首页 Web Component entry equivalent to src/entry-home-component.ts'],
  ['portal contract', 'fixed endpoints, fixed jumps, host globals, buildPortalUrl, hasLoggedInUser'],
  ['portal request', 'credentials include, JSON headers, text-first response parse, success/error unwrap'],
  ['portal query', 'querySetting conversion for keyword, letterType, status'],
  ['portal normalize', 'config, phone, type, letter, evaluate, status/action/progress normalization'],
  ['interaction states', 'standard loading/error/disabled/retry/countdown behavior for login and async actions'],
  ['home modules', 'public letters, write notice, my letters, phone list, evaluate dialog'],
  ['mock preview wiring', 'dev-only mock globals/proxy/static preview command kept outside production artifacts'],
  ['contract tests', 'minimum tests or scripts for helpers, endpoints, jumps, query conversion, payload nesting']
]

const businessRules = [
  '登录态只由 window.userId 判定；字符串要 trim，空字符串为未登录；window.userName 为空时显示“用户”。',
  '所有登录入口都要带 redirect。普通登录跳 /plugins/xzxx/portal/login，统一认证跳 /plugins/xzxx/portal/ids-login；redirect 支持 redirect、redirectUrl、redirectURI、redirect_uri 查询参数。',
  '登录页手机号必须匹配 /^1\\d{10}$/；验证码不能为空；验证码发送成功后才启动 60 秒倒计时；验证码发送和登录提交都要防重复。',
  '登录接口默认 /plugins/xzxx/portal/doLogin，但 submitUrl 可以覆盖接口路径；登录 payload 为 { phone, code }，如果存在 redirect 还要带 redirect。',
  '登录接口成功响应的 data 字段就是重定向链接，必须第一优先级使用 data 跳转；仅兼容兜底 redirectUrl/redirectURI/url/location/targetUrl；没有 redirect 时执行本地 success 状态切换。',
  '首页内部必须把“我的信件列表”实现成登录后的二级视图/mail view，但打包产物仍然只有首页一个页面；我的信件不是独立打包页面。',
  '未登录不得请求或渲染我的信件列表；未登录点击“我的信件”只跳登录，并把当前地址加 view=mail 作为 redirect；已登录进入 mail 二级视图后才请求 startByMeList。',
  '未登录点击公开信件详情跳登录，并把详情固定跳转地址作为 redirect。',
  '“我要写信”不直接打开表单；必须先 getConfig。noticeContent 有有效文本时先弹来信须知，确认后再打开写信固定地址；无须知时直接打开写信固定地址。',
  'getConfig、phoneList、letterTypeList、evaluateList 要做请求级缓存；force=true 时绕过缓存；并发请求复用同一个 Promise。',
  'showPhone 默认 true；showPhone=false 时隐藏校园服务电话入口、清空电话列表、关闭电话抽屉，并且不要再请求电话抽屉数据。',
  '首页来信选登默认 pageNo=1/pageSize=20；分类从 letterTypeList 加“全部”组成；分类变化重置列表；PC 搜索 keyword 300ms 防抖并支持回车；加载更多用 total 判断。',
  '公开信件点击：已登录先打开详情固定地址，再调用 read 接口 { bizId: readId }，成功后本地 readCount +1；未登录只跳登录 redirect，不调用 read。',
  '校园服务电话首页摘要只取有限条数；打开抽屉时 force 请求 pageSize=9999；抽屉内按 name 或 phone 本地搜索。',
  '我的信件默认 pageNo=1/pageSize=20；筛选字段为 keyword/title、status、letterType；PC 支持查询/重置/加载更多，移动端筛选 300ms 防抖。',
  '我的信件卡片必须始终有查看详情；rawStatus=draft 显示编辑和删除；rawStatus=to_review 显示撤回；rawStatus=reviewed/evaluated 显示评价。',
  '删除草稿和撤回处理中信件必须二次确认；成功后刷新我的信件列表；取消确认不能报错。',
  '评价前先拉取 evaluateList；每个维度必须有评分；默认评分来自 defaultFiveStarFlag；评论 remark 最多 500 字；提交后关闭弹窗并刷新我的信件列表。',
  '进度优先使用接口 processes：无 dealTime 的第一个节点为 active，全部有 dealTime 则 done；没有 processes 时按提交/分派/回复/评价日期推断。',
  '状态映射：draft 或含“草稿”为草稿；reviewed/evaluated 或含“已回复/已评价”为已回复；其他为处理中。',
  '所有列表请求都要有请求序号或等价竞态保护；过期响应不得覆盖新状态。'
]

const interactionRules = [
  '所有异步动作必须显式建模 idle/loading/success/error/disabled 状态；loading 期间禁用触发按钮，失败后恢复可操作。',
  '错误反馈分两层：字段校验错误显示在对应字段附近或字段错误状态；接口/网络错误使用统一消息区、toast 或弹窗展示，不允许静默失败。',
  '错误文案优先使用响应归一化后的 message/msg/errorMessage/error/desc；没有后端文案时使用“操作失败，请稍后重试”；网络异常使用“网络异常，请稍后重试”。',
  '字段校验失败时不发送请求，并聚焦或滚动到第一个错误字段；用户修改字段后清除该字段旧错误，但保留其他字段错误。',
  '验证码按钮状态固定：初始“获取验证码”；点击后先校验手机号；请求中显示“发送中”并禁用；发送成功才启动 60 秒倒计时；倒计时显示“{n}s后重发”并禁用；倒计时结束恢复“重新获取”。',
  '验证码发送失败时不启动倒计时，恢复可点击状态，显示接口错误；倒计时 timer 在组件卸载时必须清理，避免重复计时或内存泄漏。',
  '登录提交期间登录按钮 disabled/loading；失败时停留登录页、保留已输入手机号和验证码、展示错误；成功时才执行响应 redirect 或本地登录态切换。',
  '统一认证按钮点击后立即使用固定 IDS 跳转并携带 redirect；跳转前不调用短信或普通登录接口。',
  '列表必须覆盖初始 loading、空态、错误态、重试、加载更多中、没有更多数据；加载更多中禁用重复点击。',
  '删除、撤回、评价、退出等动作必须有 pending 状态；成功后给成功反馈并刷新相关数据；失败保留当前上下文并展示错误；取消确认不算错误。',
  '弹窗/抽屉内部提交必须覆盖 submitting、validation error、api error；关闭弹窗时清理临时错误、提交状态和未提交表单，但不要清理全局缓存。',
  '所有反馈规则只约束交互逻辑和状态，不约束颜色、间距、动效、图标等样式细节。'
]

contract.businessRules = businessRules
contract.interactionRules = interactionRules
contract.styleBoundary =
  'Do not encode current style details; new visual direction comes from the user style description, confirmed homepage element answers, and confirmed design image. Code must follow the confirmed design.'

if (args.help) {
  console.log(`Usage:
node frontend-prompt-kit.mjs --mode prompt
node frontend-prompt-kit.mjs --mode steps
node frontend-prompt-kit.mjs --mode files
node frontend-prompt-kit.mjs --mode business
node frontend-prompt-kit.mjs --mode artifacts
node frontend-prompt-kit.mjs --mode checklist
node frontend-prompt-kit.mjs --mode contract-json
node frontend-prompt-kit.mjs --mode all

Options:
  --stack <name>       Optional framework hint. Default: React + Ant Design.
  --mobile <yes|no>    Whether to require independent mobile variants. Default: yes.
  --style <text>       User UI style description.
  --style-file <file>  File containing the UI style description.
  --effect-image <ref> Approved design image path or URL.
  --answers <file>     Required homepage answers JSON from user decisions, including __confirmedByUser=true.
`)
  process.exit(0)
}

const mode = args.mode || 'prompt'
const gatedModes = new Set(['prompt', 'steps', 'files', 'business', 'artifacts', 'all'])
const renderers = {
  prompt: renderPrompt,
  steps: renderSteps,
  files: renderFiles,
  business: renderBusiness,
  artifacts: renderArtifacts,
  checklist: renderChecklist,
  'contract-json': () => JSON.stringify(contract, null, 2),
  all: () => [renderPrompt(), renderSteps(), renderFiles(), renderBusiness(), renderArtifacts(), renderChecklist()].join('\n\n---\n\n')
}

if (!renderers[mode]) {
  console.error(`Unknown mode: ${mode}`)
  process.exit(1)
}

if (gatedModes.has(mode) && !hasStyleInput()) {
  console.error(renderStyleBlocker())
  process.exit(2)
}

if (gatedModes.has(mode) && !homepageReady()) {
  console.error(renderHomepageBlocker())
  process.exit(2)
}

if (gatedModes.has(mode) && !hasEffectImage()) {
  console.error(renderDesignBlocker())
  process.exit(2)
}

console.log(renderers[mode]())

function renderPrompt() {
  const stack = args.stack || contract.stack.default
  const mobile = args.mobile === 'no' ? '只做 PC；如用户后续要求移动端再补' : 'PC 与移动端布局独立，业务/API helper 可共享'
  return `你要生成一个“校长信箱”前端项目。技术栈：${stack}。项目结构可以自行组织，但下列合同不可改。

视觉前置门禁：
${renderVisualGate()}

首页元素强制选择：
${homeFragment()}

交付强制要求：
1. 如果任务是生成或实现前端项目，必须创建/修改真实工程文件，不允许只输出提示词、方案、清单或代码片段。
2. 只有当用户明确要求“只生成提示词/文档/规范”时，才允许文本交付。
3. 最终回复必须列出实际改动文件、启动/预览命令、构建命令、验证结果。
4. 如果目标目录为空，必须初始化一个可运行前端工程；如果目标目录已有工程，必须按现有技术栈落地到该工程。

技术栈默认规则：
- ${contract.stack.rule}
- 新建 React 项目时 UI 组件、表单、弹窗、抽屉、消息反馈、分页、标签页、按钮等默认使用 Ant Design；业务样式可用项目 CSS/CSS Modules/Less 等实现，但不要把样式细节写成业务合同。
- 用户明确指定其他技术栈时，仍必须完整保留本合同的接口、全局变量、payload、跳转和交互标准。

硬性产物：
1. 业务入口固定为两个：登录页、首页。
2. 打包产物格式必须先运行 ${contract.artifacts.detectCommand}，再按当前工程构建形式反推确定：当前是 Vite library IIFE 单文件 Web Component，不是普通多 HTML 页面。
3. 首页构建命令：${contract.artifacts.home.buildCommand}；入口：${contract.artifacts.home.entry}；文件：${contract.artifacts.home.fileName}；自定义元素：<${contract.artifacts.home.customElement}>；属性：${contract.artifacts.home.attributes.join(', ')}。
4. 登录构建命令：${contract.artifacts.login.buildCommand}；入口：${contract.artifacts.login.entry}；文件：${contract.artifacts.login.fileName}；自定义元素：<${contract.artifacts.login.customElement}>；属性：${contract.artifacts.login.attributes.join(', ')}。
5. CSS 由构建插件注入到 JS 中；发布主产物是两个 JS 文件：${contract.artifacts.home.fileName} 和 ${contract.artifacts.login.fileName}。

预览/生产隔离：
${contract.productionPurity.map((item) => `- ${item}`).join('\n')}

业务页面：
1. 首页组件承载首页业务。
2. 登录页只承载手机号短信登录、统一认证入口、表单校验、短信 60s 倒计时。
3. 首页承载来信选登、我要写信、我的信件登录后二级视图、来信须知、校园服务电话、评价弹窗、详情/编辑/写信固定跳转。
4. 我的信件列表只能在登录后的首页二级视图展示；未登录只显示入口/登录引导并跳登录，不请求列表。
5. 不要把我的信件、服务电话、评价等模块打成独立页面产物。

样式边界：
1. 本提示词只固化业务逻辑，不固化当前项目颜色、间距、图片、圆角、阴影、字体等样式细节。
2. 新项目的视觉方向来自用户 UI 风格描述、用户确认的首页元素、AI 补充的专业学校门户设计方向、全球高校首页优秀模式的综合吸收和已确认设计稿/效果图。
3. 设计稿/效果图必须在首页元素敲定之后生成；设计时只能使用已确认元素，关闭元素不得出现在画面中，不允许自由发挥新增模块。
4. 生成工程时必须按已确认设计稿实现页面结构、模块位置、视觉层级和交互状态；网页整体框架必须专业化，风格必须体现学校特色，界面必须精致优美。
5. 不得复制任何单一高校首页模板；给不同学校出图时模板相似度不得高于 50%，至少在首页框架、主视觉构图、模块顺序、色彩系统、校园符号、组件处理六项中拉开差异。
6. 不要把设计稿里的随机文案、虚构接口、额外页面或额外模块当成业务需求。

全局变量：
${contract.globals.map((item) => `- ${item}`).join('\n')}
规则：所有相对接口和跳转都必须走 buildPortalUrl(path) 拼接 window.contextPath；登录态只看 window.userId；用户名为 window.userName || '用户'；logo 为 buildPortalUrl(window.logoPath || '')；生产不得覆盖宿主全局变量。

请求规则：
- POST：credentials include、Accept application/json、Content-Type application/json、JSON body。
- Logout：GET + credentials include + Accept application/json。
- 响应先读 text 再 JSON.parse，解析失败返回 { message: text, data: text }。
- 成功兼容 success=true、code='0'、result=true、status 为 0/1/200/'0'/'1'/'200'/'ok'/'success'。
- 列表兼容 list/rows/items/records/children，total 兼容 recordCount/total/totalCount/records。

固定接口：
${contract.endpoints.map(([method, path, body]) => `- ${method} ${path} ${body}`).join('\n')}

固定跳转：
${contract.jumps.map(([name, path]) => `- ${name}: ${renderJump(path)}`).join('\n')}
详情/编辑/写信使用 window.open(url, '_blank', 'noopener,noreferrer')。

状态与进度：
${contract.statuses.map((item) => `- ${item}`).join('\n')}

业务逻辑细则：
${businessRules.map((item) => `- ${item}`).join('\n')}

交互标准：
${interactionRules.map((item) => `- ${item}`).join('\n')}

归一化要求：
- Config: showPhone 默认 true；noticeContent 从 notice/noticeContent/content/notice 取，空 HTML 视为无须知。
- Phone: name/deptName/departmentName/orgName/title；phone/telephone/tel/mobile/deptPhone。
- Letter type: label 从 itemName/name/label/text/typeName/letterTypeName/value 取；value 从 itemId/id/code/value/label 取并去重。
- Evaluate: 过滤 deleteFlag=true 和 usedFlag=false；星级文案 oneStar 到 fiveStar，默认 很差/不满意/一般/满意/非常满意；defaultFiveStarFlag 默认 5 星。
- Letter: title/subject；summary 从 pageoffice/content/remark 去 HTML；bizId 从 bizId/id/serialNumber；date 取 createTime/replyTime/updateTime 前 10 位。

工程执行顺序：
1. 先询问 UI 风格描述并保存为 ui-style.brief.md；此时不得生成设计稿。
2. 运行首页元素对话脚本，逐项让用户确认首页模块开关：${nodeCommand('home-elements-dialog.mjs')} --mode questions；确认后保存 homepage.answers.json，并用 --answers 传给后续脚本。
3. 基于 UI 风格描述和已确认首页元素生成登录页+首页设计稿/效果图，并取得用户确认；设计稿必须只使用已确认元素，不允许自由发挥新增模块。
4. 生成低上下文任务包：${nodeCommand('task-pack.mjs')} --mode write --root . --out principal-mailbox-task-pack --style-file ui-style.brief.md --effect-image <approved-image> --answers homepage.answers.json
5. 再发现目标项目脚本、路由、入口、构建方式、样式系统；空目录或未指定栈时按 React + Ant Design 初始化。
6. 运行构建产物探测脚本：${contract.artifacts.detectCommand}
7. 生成或修改工程文件；最少要有登录页入口、首页入口、合同层、请求层、归一化层、query 转换、mock/预览、测试或检查脚本。
8. 先写合同层：buildPortalUrl、hasLoggedInUser、requestJson、response normalize、query conversion、endpoint/jump constants。
9. 给合同层补最小测试，再做 UI。
10. 实现 dev mock 和本地预览，但 mock、预览 shell、测试数据必须与生产 build 完全隔离。
11. 实现登录页。
12. 严格按已确认设计稿实现首页外壳、来信选登、登录后二级我的信件、来信须知、服务电话、评价弹窗和固定跳转；不得脱离设计稿自由改版。
13. 完成 loading/empty/error/disabled、重复提交保护、搜索防抖、请求竞态保护、删除/撤回确认。
14. ${mobile}。
15. 生产构建必须输出两个纯净 Web Component JS 产物：${contract.artifacts.home.fileName} 和 ${contract.artifacts.login.fileName}；不要把验收写成必须有 index.html。
16. 用 mock 预览服务验证：${contract.preview}

最低文件清单：
${requiredFiles.map(([name, description]) => `- ${name}: ${description}`).join('\n')}

发布与验收：
- 运行 install/typecheck/lint/test/build 中实际存在的脚本。
- 用合同扫描脚本检查固定合同：${contract.lint}
- 重点确认生产 JS 不包含 preview/mock/test-data/localhost 标记；mock 预览服务只负责外部托管和接口模拟。
- staging 以自定义元素方式挂载验证 globals、cookie、接口、跳转、登录页、首页、来信选登、我的信件、移动端。
- 发布说明必须包含版本/commit、${contract.artifacts.home.buildCommand}/${contract.artifacts.login.buildCommand}、${contract.artifacts.home.fileName}/${contract.artifacts.login.fileName}、烟测结果、回滚版本。`
}

function renderSteps() {
  return `低智能模型执行清单。按顺序完成，不要跳步。

总规则：
- 本任务如果是“生成/实现前端项目”，必须创建或修改工程文件。
- 禁止只输出提示词、说明文档、计划、伪代码或孤立代码块。
- 每完成一个 PASS，都检查是否已有真实文件落地。
- 最终回答必须列出文件路径、启动命令、构建命令、验证命令和结果。

PASS -1 风格输入门禁
- 如果用户还没有提供 UI 风格描述，先运行：${nodeCommand('ui-style-intake.mjs')} --mode questions
- 等用户输入风格描述后保存为 ui-style.brief.md，或后续命令直接用 --style。
- 这里只收集风格，不生成设计稿/效果图；设计稿必须等 PASS 0 首页元素敲定后再生成。
- 没有风格描述时，停止，不要进入 PASS 0。

PASS 0 输入冻结
- 运行首页元素对话脚本，向用户确认首页模块：${nodeCommand('home-elements-dialog.mjs')} --mode questions
- 用户逐项确认后保存 homepage.answers.json；没有 --answers 时停止，不要用默认值继续。
- 不在首页元素对话中询问颜色、间距、图片等样式细节；样式只使用 PASS -1 的风格描述和后续确认设计稿。
- 首页元素敲定后生成设计稿提示词：${nodeCommand('ui-style-intake.mjs')} --mode prompt --style-file ui-style.brief.md --answers homepage.answers.json
- 优先调用 imagegen2 生成一张登录页 + 首页设计稿/效果图；如果环境没有 imagegen2，使用可用图像生成能力，但必须保留增强后的学校门户设计提示词。
- 设计稿必须严格使用 homepage.answers.json 中已确认的元素：开启元素必须呈现，关闭元素不得出现，不允许自由发挥新增业务模块。
- 预览图/设计稿必须严格遵守整个技能合同：两页入口、首页元素答案、我的信件登录后二级视图、React + Ant Design 默认组件模型、错误/loading/disabled/验证码倒计时状态、预览/生产隔离。
- 设计稿必须综合吸收世界大学首页优秀模式并创新，不得复制单一模板；不同学校方案相似度不得高于 50%。
- 让用户确认设计稿；用户要求调整时先重新生成设计稿。
- 没有已确认首页元素和已确认设计稿时，停止，不要生成任务包或工程文件。
- 优先生成任务包：${nodeCommand('task-pack.mjs')} --mode write --root . --out principal-mailbox-task-pack --style-file ui-style.brief.md --effect-image <approved-image> --answers homepage.answers.json
- 后续按 principal-mailbox-task-pack 的编号文件执行，减少上下文占用。
- 运行构建产物探测脚本：${contract.artifacts.detectCommand}
- 写下技术栈、构建命令、登录页入口、首页入口、产物目录和产物格式。
- 空目录或未指定技术栈时，按 React + Ant Design 生成工程；已有 React 工程默认接入 Ant Design。
- 再读 package.json 和构建配置，确认当前构建模式；本仓库当前是 build:home/build:login 两个 IIFE Web Component JS 产物。
- 如果不存在两页组件入口，先创建登录页和首页 Web Component entry。
- 标记固定合同：全局变量、接口路径、payload、跳转 URL 不允许改。

PASS 0.5 工程文件落点
- 空目录：初始化可运行前端工程文件，例如 package.json、index.html、src 入口、构建配置。
- 已有工程：读取现有 package、入口、路由、样式系统，按现有结构新增/修改文件。
- 必须落地等价文件组：登录页组件入口、首页组件入口、portal contract、request、normalize、query、mock preview、contract tests/checks。
- 不确定文件名时，选择清晰稳定命名，例如 portalContract、portalRequest、portalNormalize、portalQuery、Login、Home。
- 当前构建形式必须有等价自定义元素注册逻辑：${contract.artifacts.home.customElement} 和 ${contract.artifacts.login.customElement}。

PASS 1 合同层
- 新建 portal contract/helper 文件。
- 实现 buildPortalUrl(path)、hasLoggedInUser()。
- 实现 requestJson(method, path, body)、logoutGet()、withPortalRedirect(targetUrl, redirectUrl)、getCurrentPortalUrl(searchUpdates)。
- 写死全部固定 endpoint 和 jump constant。
- 实现 response normalize、list/total unwrap、error message unwrap。
- 实现 redirect unwrap：登录成功先取 response.data 作为重定向链接；再兼容 redirectUrl/redirectURI/url/location/targetUrl；相对路径走 buildPortalUrl。
- 实现 querySetting 转换：letterType equal；状态 reviewed/evaluated/draft/to_review/to_confirm/suspend/xf_doing/xf_done；keyword OR title/pageoffice include。
- 实现缓存：config、phoneList、letterTypeList、evaluateList；force=true 绕过缓存；并发复用 Promise。
- 跑合同层单测或最小脚本测试。

PASS 1.5 交互状态标准
- 建立统一异步状态：idle/loading/success/error/disabled。
- 建立统一错误处理：字段错误、接口错误、网络错误、取消确认，四类状态不能混淆。
- 字段错误靠字段状态展示；接口错误靠统一消息区、toast 或弹窗展示；错误文案来自 response normalize。
- 所有 loading 按钮必须禁用，失败后恢复，成功后按业务刷新或跳转。

PASS 2 Mock 与预览
- 保留生产代码读取宿主 window 值；只在 dev preview 缺省时注入 mock globals。
- 使用 mock-preview-server.mjs 提供生产同路径 mock API。
- 准备 showPhone true/false、空列表、draft/to_review/reviewed/evaluated、评价维度测试数据。
- mock server、预览 shell、测试数据、/__artifact 加载器只能存在于本地预览脚本；不能被打入生产 JS。

PASS 3 登录页
- 手机号、短信码、获取验证码、60s 倒计时、登录、统一认证。
- SMS 调固定 sms 接口；登录调固定 doLogin；统一认证跳固定 ids-login。
- 校验手机号 /^1\\d{10}$/；校验空验证码；submitUrl 可覆盖登录接口；payload 有 redirect 时带 redirect；防重复提交；错误提示。
- 验证码按钮：初始“获取验证码”；请求中“发送中”且禁用；发送成功才开始 60s；倒计时“{n}s后重发”且禁用；结束为“重新获取”；失败不倒计时并显示错误。
- 登录按钮：提交中 disabled/loading；失败保留输入并显示错误；成功才跳响应 redirect 或本地 success。
- 登录成功优先跳响应 data；data 为空时兼容 redirectUrl/redirectURI/url/location/targetUrl；都没有时执行本地 success。

PASS 4 首页基础
- header/logo/user menu；用户菜单显示 window.userName || '用户'；退出成功优先跳响应 redirectUrl。
- 未登录点击我的信件只跳登录，并带当前地址 view=mail redirect；不得请求或渲染我的信件列表。
- 来信选登：类型 tabs、搜索、列表、loading、empty、read count、pageNo/pageSize/total/load more。
- PC 搜索 keyword 300ms 防抖和回车搜索；移动端可只按分类加载。
- 点击详情：未登录跳登录并把详情 URL 做 redirect；已登录打开固定 detail jump，然后调用 read 接口并本地 readCount +1。

PASS 5 首页业务模块
- 我要写信先 getConfig；有 noticeContent 先展示来信须知，确认后固定 write jump。
- 我的信件是登录后的首页二级视图，不是独立页面产物；进入二级视图后再请求列表，提供筛选、查询、重置、分页、草稿编辑/删除、处理中撤回、已回复评价。
- 服务电话：showPhone=false 时隐藏入口和内容；打开抽屉时 force 拉取 pageSize=9999，支持 name/phone 本地搜索。
- 评价弹窗：打开前拉取评价维度；每个维度必须评分；默认评分来自 defaultFiveStarFlag；500 字评论；提交后刷新。
- 删除、撤回必须二次确认；取消确认不报错。

PASS 6 体验与边界
- 加 loading/empty/error/disabled。
- 按交互标准覆盖字段错误、接口错误、网络错误、取消确认、成功反馈、重试入口。
- 搜索防抖、请求竞态保护、重复提交保护。
- PC/mobile 独立业务流程；样式细节不属于本 skill 合同。

PASS 7 构建与预览
- 运行 ${contract.artifacts.home.buildCommand} 和 ${contract.artifacts.login.buildCommand}。
- 验证产物是单文件 JS Web Component：${contract.artifacts.home.fileName}、${contract.artifacts.login.fileName}。
- 验证 JS 里会注册 <${contract.artifacts.home.customElement}> 和 <${contract.artifacts.login.customElement}>。
- 验证生产 JS 纯净：不含 mock rows、mock-user、mock-logo.svg、本地预览测试数据、localhost、127.0.0.1、/preview/、__artifact、mock-preview-server。
- 启动：${contract.preview}
- 打开 /preview/login 和 /preview/home。
- 验证非根 contextPath、logoPath、userId、cookie 请求、固定跳转。

PASS 8 合同扫描与发布
- 运行：${contract.lint}
- 修复 FAIL 后重新构建。
- 发布说明写明两个产物路径和回滚版本。`
}

function renderFiles() {
  return `前端工程文件强制清单：

使用规则：
- 这是实现任务的最低落地范围，不是建议项。
- 可以按目标技术栈改文件名和扩展名，但必须有等价文件。
- 空项目必须创建完整可运行工程；已有项目必须融入现有目录。
- 不允许只交付 Markdown、提示词、计划或代码片段。
- 工程文件生成前必须已有用户 UI 风格描述、用户确认的首页元素、以及基于这些元素生成并确认的设计稿/效果图。
- 代码必须按确认设计稿实现页面结构、模块位置、视觉层级和交互状态；不得脱离设计稿自由改版。

最低文件组：
${requiredFiles.map(([name, description]) => `- [ ] ${name}: ${description}`).join('\n')}

推荐结构示例：
- package.json：dev/build/preview/test 或等价脚本。
- 默认新建工程依赖：react、react-dom、antd，以及构建所需的 Vite/TypeScript 依赖；若目标已有 React 依赖，复用现有版本。
- 构建配置：支持登录页/首页两个 component/library build mode。
- src/main.*：应用启动或多页面挂载。
- src/entry-login-component.*：注册登录页自定义元素。
- src/entry-home-component.*：注册首页自定义元素。
- src/pages/Login/* 或等价目录：登录页。
- src/pages/Home/* 或等价目录：首页及模块组合。
- src/portal/contract.*：固定 endpoint、jump、host global、buildPortalUrl。
- src/portal/request.*：请求和响应处理。
- src/portal/redirect.*：登录 redirect、当前地址 query 合并、响应 redirect 归一化。
- src/portal/query.*：querySetting 转换。
- src/portal/normalize.*：接口数据归一化和状态/进度映射。
- src/mock/* 或 dev server/proxy 配置：仅开发预览使用。
- 生产入口和组件代码不得 import mock 目录；mock 目录只允许被 dev server、preview server 或测试脚本引用。
- tests 或 scripts：合同层最小测试、contract lint、构建检查。

最终回复必须包含：
- 已创建/修改文件路径。
- 本地启动命令。
- mock 预览命令。
- 生产构建命令。
- 验证命令和结果。
- 登录页 JS 产物路径、首页 JS 产物路径。`
}

function renderBusiness() {
  return `业务逻辑细则：
${businessRules.map((item, index) => `${index + 1}. ${item}`).join('\n')}

交互标准：
${interactionRules.map((item, index) => `${index + 1}. ${item}`).join('\n')}

首页元素对话：
- 生成首页前先运行：${nodeCommand('home-elements-dialog.mjs')} --mode questions
- 只询问业务模块和交互开关，不询问样式。
- 必须逐项询问用户并用 --answers 传入回答文件；未回答时停止，不得自动使用默认值。

已确认首页配置：
${homeFragment()}

视觉前置：
- 业务逻辑之前先完成 UI 风格描述输入、首页元素确认、基于元素的设计稿生成和设计稿确认。
- AI 必须补足专业网站整体框架、学校特色识别和精致优美的视觉要求，并优先用 imagegen2 出设计稿/效果图。
- AI 必须学习吸收世界各地大学首页的成熟信息架构，博采众长、多创新；不同学校出图模板相似度不得高于 50%。
- 设计稿必须只使用已确认首页元素，不允许自由发挥新增模块；代码必须按确认设计稿实现。
- 生成预览图时必须遵守整个技能合同，不能只按视觉风格出图。
- 设计稿只影响视觉方向和页面落位，不影响上述业务/API/交互合同。`
}

function renderArtifacts() {
  return `打包产物格式合同：

反推规则：
1. 先运行 ${contract.artifacts.detectCommand}。
2. 再读 package.json scripts、Vite/Rollup/Webpack 配置、入口文件和实际 build 输出。
3. 产物格式以当前构建配置为准，不凭“页面”二字假设为 HTML。
4. 当前仓库的两个业务入口以 Web Component 单 JS 交付。

当前确定格式：
- 首页构建：${contract.artifacts.home.buildCommand}
- 首页 Vite mode：${contract.artifacts.home.viteMode}
- 首页入口：${contract.artifacts.home.entry}
- 首页产物：${contract.artifacts.home.fileName}
- 首页本地示例产物：${contract.artifacts.home.localArtifact}
- 首页自定义元素：<${contract.artifacts.home.customElement}>
- 首页属性：${contract.artifacts.home.attributes.join(', ')}

- 登录构建：${contract.artifacts.login.buildCommand}
- 登录 Vite mode：${contract.artifacts.login.viteMode}
- 登录入口：${contract.artifacts.login.entry}
- 登录产物：${contract.artifacts.login.fileName}
- 登录本地示例产物：${contract.artifacts.login.localArtifact}
- 登录自定义元素：<${contract.artifacts.login.customElement}>
- 登录属性：${contract.artifacts.login.attributes.join(', ')}

构建特征：
- 格式：${contract.artifacts.home.format}
- CSS：由 inject-css-into-js 构建插件注入 JS，不能要求单独 CSS 文件。
- outDir：当前 vite.config.ts 的 build:home/build:login 指向后端 resources/page；本地预览可使用 dist-home/portal.min.js 和 dist-login/login.min.js。
- 可选历史产物：${contract.artifacts.optionalLegacy.appBuild}；${contract.artifacts.optionalLegacy.combinedWidget}。

预览/生产隔离：
${contract.productionPurity.map((item) => `- ${item}`).join('\n')}

验证命令：
- ${contract.artifacts.home.buildCommand}
- ${contract.artifacts.login.buildCommand}
- ${contract.preview}
- ${contract.lint}`
}

function renderChecklist() {
  return `验收清单：
- [ ] 工程实现前已收集用户 UI 风格描述。
- [ ] 首页元素已通过 home-elements-dialog.mjs 逐项询问，并传入用户确认后的 --answers 文件；没有自动采用默认值。
- [ ] 已在用户描述基础上补足专业学校门户框架、学校特色和精致优美视觉要求。
- [ ] 已吸收世界大学首页优秀模式并创新差异化；不同学校效果图模板相似度不高于 50%。
- [ ] 已在首页元素敲定之后，优先用 imagegen2 生成一张登录页 + 首页设计稿/效果图，并经用户确认或明确接受。
- [ ] 设计稿严格使用已确认首页元素：开启元素有位置，关闭元素未出现，没有新增未确认业务模块。
- [ ] 预览图/设计稿严格遵守整个技能合同，没有漏掉两页入口、登录后二级我的信件、错误反馈、验证码倒计时、loading/disabled 和预览/生产隔离约束。
- [ ] 代码实现按确认设计稿落地页面结构、模块位置、视觉层级和交互状态。
- [ ] 已创建或修改真实前端工程文件，不是只输出文档/提示词。
- [ ] 最终回复列出文件路径、启动命令、构建命令、验证结果。
- [ ] 空目录或未指定技术栈时使用 React + Ant Design；已有 React 工程默认使用 Ant Design UI 组件。
- [ ] 已运行 detect-build-artifacts.mjs，并按当前构建配置反推出产物格式，不把 Web Component JS 误判为 HTML 页面目录。
- [ ] 主发布产物为两个单文件 JS：${contract.artifacts.home.fileName}、${contract.artifacts.login.fileName}。
- [ ] 首页 JS 注册 <${contract.artifacts.home.customElement}>，登录 JS 注册 <${contract.artifacts.login.customElement}>。
- [ ] 生产 JS 纯净：不包含 mock 数据、预览 shell、/preview 路由、/__artifact loader、localhost、127.0.0.1、mock-user、mock-logo.svg、mock-preview-server。
- [ ] mock、测试数据、dev globals、dev proxy 只存在于预览服务/测试脚本/dev-only 文件中，生产入口没有 import。
- [ ] 首页内含来信选登、我要写信、我的信件登录后二级视图、来信须知、服务电话、评价弹窗。
- [ ] 未登录点击我的信件只跳登录并带 view=mail redirect，不请求或渲染我的信件列表。
- [ ] 没有把颜色、间距、图片、圆角、阴影等当前项目样式细节写成业务合同；新视觉仅来自用户风格描述、首页元素答案和确认后的设计稿。
- [ ] 所有固定接口路径逐字一致。
- [ ] 所有 POST 都 credentials include + JSON headers。
- [ ] logout 是 GET，redirect 指向 buildPortalUrl('/plugins/xzxx/portal/index')。
- [ ] 所有相对接口/跳转都经过 buildPortalUrl。
- [ ] 登录 redirect 查询参数兼容 redirect/redirectUrl/redirectURI/redirect_uri。
- [ ] 登录 submitUrl 覆盖、响应 data 作为重定向链接跳转、无 redirect 本地 success 都已实现。
- [ ] 登录页字段错误、接口错误、网络错误都有明确反馈，不静默失败。
- [ ] 验证码按钮请求中禁用，发送成功才启动 60s 倒计时，失败不倒计时并恢复可点击。
- [ ] 验证码倒计时显示“{n}s后重发”，结束显示“重新获取”，组件卸载清理 timer。
- [ ] 登录提交中按钮 disabled/loading，失败保留输入并显示错误。
- [ ] 登录态只取 window.userId；用户名和 logo 使用宿主全局变量。
- [ ] 详情/编辑/写信使用固定 URL + window.open noopener,noreferrer。
- [ ] querySetting 转换覆盖 keyword、letterType、status。
- [ ] 状态映射和进度映射正确。
- [ ] showPhone=false 完全隐藏服务电话 UI。
- [ ] noticeContent 存在时必须确认后才能写信。
- [ ] 公开信件未登录走登录 redirect，已登录打开详情后调用 read 并本地阅读量 +1。
- [ ] 草稿可编辑/删除；处理中可撤回；已回复可评价。
- [ ] 删除/撤回二次确认，取消不报错，成功后刷新列表。
- [ ] 评价 payload 为 { params: { letterParam: { bizId, rateForm } } }。
- [ ] 评价维度逐项必填，默认评分和 500 字 remark 已实现。
- [ ] 列表、弹窗、抽屉、删除、撤回、评价、退出都有 loading/error/success/disabled 或等价交互状态。
- [ ] 本地 mock 预览可打开 /preview/login、/preview/home 和 /preview/mail。
- [ ] 预览服务托管生产构建后的 JS 做烟测，但不改变 JS 产物内容。
- [ ] typecheck/lint/test/build 中存在的脚本已运行。
- [ ] contract-lint.mjs 无 FAIL。
- [ ] 发布说明包含登录页产物、首页产物、commit、build 命令、烟测结果、回滚版本。`
}

function renderJump(path) {
  if (path.includes('${')) return `buildPortalUrl(\`${path}\`)`
  return `buildPortalUrl('${path}')`
}

function renderVisualGate() {
  const style = readStyleInput()
  const effectImage = args['effect-image'] || args.image || ''
  const styleLine = style ? `用户 UI 风格描述：${style}` : '用户 UI 风格描述：缺失时必须先询问用户，不能开始工程实现。'
  const imageLine = effectImage
    ? `已确认设计稿/效果图：${effectImage}`
    : '已确认设计稿/效果图：缺失时必须先基于风格描述和已确认首页元素生成一张登录页+首页设计稿，并让用户确认。'
  return `- ${contract.visualPreflight}
- ${styleLine}
- 首页元素：必须已通过 home-elements-dialog.mjs 逐项询问并传入 --answers；设计稿只能使用已确认元素。
- AI 补充设计方向：专业学校门户整体框架、学校特色识别、精致优美页面质感；不得直接照搬过短描述生成简陋页面。
- 全球高校借鉴约束：吸收优秀大学首页的信息架构和视觉组织方式，但不得复制单一模板；不同学校模板相似度不得高于 50%。
- 全技能约束：生成预览图/设计稿时必须遵守整个技能合同，不能自由发挥覆盖业务、接口、跳转、交互状态或产物格式。
- ${imageLine}
- 可运行脚本：${nodeCommand('ui-style-intake.mjs')} --mode questions
- 首页元素确认脚本：${nodeCommand('home-elements-dialog.mjs')} --mode questions
- 可生成设计稿提示词：${nodeCommand('ui-style-intake.mjs')} --mode prompt --style-file ui-style.brief.md --answers homepage.answers.json
- 确认后的设计稿是代码实现依据；不得覆盖固定业务/API/全局变量/payload/跳转/产物格式/交互状态。`
}

function renderStyleBlocker() {
  return `风格输入未完成，停止生成业务 prompt。

请先运行：
${nodeCommand('ui-style-intake.mjs')} --mode questions

拿到用户 UI 风格描述后，保存为 ui-style.brief.md 或用 --style 传入。
注意：此时不要生成设计稿；必须先完成首页元素选择。`
}

function renderDesignBlocker() {
  return `设计稿未完成，停止生成业务 prompt。

首页元素已经要求先确认。请基于 UI 风格描述和 homepage.answers.json 生成设计稿提示词：
请先运行：
${nodeCommand('ui-style-intake.mjs')} --mode prompt --style-file ui-style.brief.md --answers homepage.answers.json

生成登录页+首页设计稿/效果图并让用户确认后，再用 --effect-image <approved-image> 继续。
设计稿必须只使用已确认首页元素；代码后续必须按确认设计稿实现。`
}

function hasStyleInput() {
  return Boolean(readStyleInput())
}

function hasEffectImage() {
  return Boolean(args['effect-image'] || args.image)
}

function homepageReady() {
  if (!args.answers) return false
  try {
    homeFragment()
    return true
  } catch {
    return false
  }
}

function renderHomepageBlocker() {
  return `首页元素选择未完成，停止生成业务 prompt。

${runScript('home-elements-dialog.mjs', ['--mode', 'questions'])}

下一步：
1. 逐项询问用户，保存为 homepage.answers.json。
2. 答案文件必须包含 "__confirmedByUser": true；先询问用户，5 分钟无应答时才允许使用 timeout defaults。
3. 确认后先生成设计稿提示词：${nodeCommand('ui-style-intake.mjs')} --mode prompt --style-file ui-style.brief.md --answers homepage.answers.json。
4. 设计稿确认后再运行 frontend-prompt-kit，并传入 --answers homepage.answers.json 与 --effect-image <approved-image>。`
}

function homeFragment() {
  return runScript('home-elements-dialog.mjs', ['--mode', 'fragment', '--answers', path.resolve(args.answers)])
}

function runScript(scriptName, scriptArgs) {
  const scriptPath = path.join(scriptDir, scriptName)
  return execFileSync(process.execPath, [scriptPath, ...scriptArgs], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
}

function nodeCommand(scriptName) {
  return `node "$SKILL_DIR/scripts/${scriptName}"`
}

function readStyleInput() {
  if (args.style) return String(args.style).trim()
  if (args['style-file']) {
    try {
      return readFileSync(path.resolve(args['style-file']), 'utf8').trim()
    } catch {
      return ''
    }
  }
  return ''
}

function parseArgs(items) {
  const result = {}
  for (let i = 0; i < items.length; i += 1) {
    const key = items[i]
    if (!key.startsWith('--')) continue
    const name = key.slice(2)
    const value = items[i + 1]
    if (!value || value.startsWith('--')) {
      result[name] = true
    } else {
      result[name] = value
      i += 1
    }
  }
  return result
}
