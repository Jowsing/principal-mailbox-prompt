#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const args = parseArgs(process.argv.slice(2))
const defaultTimeoutMs = Number(args['timeout-ms'] || 300000)

const questions = [
  {
    id: 'appShell',
    title: '页面外壳',
    question: '是否使用当前项目页面外壳组件结构？',
    default: 'standard',
    choices: [
      ['standard', '使用 HeaderBrand、背景层、page-stage、page-header、page-main/page-content、footer 的现有结构'],
      ['minimal', '只保留 HeaderBrand、主内容区和 footer；仍保持两页入口与固定业务合同']
    ]
  },
  {
    id: 'loginBlock',
    title: '登录页组件',
    question: '登录页使用哪些现有组件槽位？',
    default: 'full',
    choices: [
      ['full', '使用 HeaderBrand + LoginCard + 背景/主视觉/页脚；LoginCard 含手机号、验证码、60s 倒计时、登录、统一认证'],
      ['card-only', '只使用 LoginCard 作为登录核心，外层布局按用户样式描述重排']
    ]
  },
  {
    id: 'actionCards',
    title: '快捷入口卡片',
    question: '首页快捷入口使用哪些 ActionCard？',
    default: 'write-mail',
    choices: [
      ['write-mail', '使用两个 ActionCard：我要写信、我的信件'],
      ['write-only', '只使用我要写信 ActionCard'],
      ['mail-only', '只使用我的信件 ActionCard；未登录仍只跳登录并带 view=mail redirect']
    ]
  },
  {
    id: 'publicLettersBlock',
    title: '来信选登组件组',
    question: '来信选登区域使用哪些现有组件？',
    default: 'full',
    choices: [
      ['full', '使用 SliderTabs + keyword 搜索框 + LetterCard grid/list + empty/loading + load more'],
      ['tabs-list', '使用 SliderTabs + LetterCard 列表，不展示 keyword 搜索'],
      ['list-only', '只使用 LetterCard 列表和 load more'],
      ['none', '不展示来信选登 UI；保留接口 helper，不主动请求']
    ]
  },
  {
    id: 'servicePhoneBlock',
    title: '校园服务电话组件组',
    question: '校园服务电话使用哪些现有组件？',
    default: 'card-drawer',
    choices: [
      ['card-drawer', '使用 ServicePhoneCard 首页摘要 + ServicePhoneDrawer 全量抽屉和搜索'],
      ['card-only', '只使用 ServicePhoneCard 摘要，不打开抽屉'],
      ['drawer-only', '只保留 ServicePhoneDrawer 作为入口后的全量列表'],
      ['none', '不展示服务电话 UI；showPhone=false 时仍不得请求或展示']
    ]
  },
  {
    id: 'noticeDialog',
    title: '来信须知弹窗',
    question: '写信前是否使用 LetterNoticeDialog？',
    default: 'required',
    choices: [
      ['required', '使用 LetterNoticeDialog；getConfig.noticeContent 有效时必须确认后才能打开写信固定地址'],
      ['skip', '不展示须知弹窗；仍调用 getConfig 并按固定写信跳转']
    ]
  },
  {
    id: 'mailListBlock',
    title: '我的信件二级视图组件组',
    question: '登录后的“我的信件”二级视图使用哪些现有组件？',
    default: 'full',
    choices: [
      ['full', '使用 MailListFilters + MailListCard + MailProgressSteps + MailAttachmentList + MailEvaluateDialog，含查看、附件展示、草稿编辑/删除、to_review 撤回、reviewed/evaluated 评价'],
      ['readonly', '使用 MailListFilters + MailListCard + MailProgressSteps + MailAttachmentList，只查看详情和附件'],
      ['no-evaluate', '使用 MailListFilters + MailListCard + MailProgressSteps + MailAttachmentList，含编辑/删除/撤回，不使用 MailEvaluateDialog'],
      ['entry-only', '首页只保留我的信件入口；未登录跳登录，登录后可进入空二级视图，不请求列表']
    ]
  },
  {
    id: 'userMenu',
    title: '登录入口与用户菜单',
    question: '头部登录态使用哪些现有组件？',
    default: 'full',
    choices: [
      ['full', '未登录显示登录按钮；已登录使用 UserInfoDropdown 并支持 logoutPortal'],
      ['minimal', '只展示登录按钮/用户名文本；仍必须保留登录/退出业务逻辑']
    ]
  },
  {
    id: 'decorativeAssets',
    title: '装饰与品牌资产',
    question: '是否复用当前项目资产槽位？',
    default: 'yes',
    choices: [
      ['yes', '保留 logo、背景图、ActionCard 图片、OverlapSquaresIcon、用户头像等资产槽位；具体视觉由用户样式描述重绘'],
      ['no', '只保留资产占位接口，视觉素材由新项目自行提供']
    ]
  },
  {
    id: 'mobile',
    title: '移动端组件',
    question: '是否使用当前项目移动端组件结构？',
    default: 'yes',
    choices: [
      ['yes', '使用 mobile/HomeWidgetApp、mobile/views/Home、mobile/views/Login、mobile/views/MailList 与 Mobile*Card/Drawer/Progress 结构'],
      ['no', '暂不生成移动端组件；PC 结构先完整落地']
    ]
  }
]

if (args.help) {
  console.log(`Usage:
node home-elements-dialog.mjs --mode questions
node home-elements-dialog.mjs --mode template
node home-elements-dialog.mjs --mode fragment
node home-elements-dialog.mjs --mode fragment --answers homepage.answers.json
node home-elements-dialog.mjs --mode interactive
node home-elements-dialog.mjs --mode defaults

The script asks only homepage business-element questions. It intentionally avoids style details.
Fragment mode requires --answers from user decisions or timeout defaults.
If the user does not answer within 5 minutes, use defaults and mark them as timeout defaults.

Options:
  --timeout-ms <n>  Interactive question timeout. Default: 300000.`)
  process.exit(0)
}

const mode = args.mode || 'questions'

if (mode === 'questions') {
  console.log(renderQuestions())
} else if (mode === 'template') {
  console.log(JSON.stringify(templateAnswers(), null, 2))
} else if (mode === 'defaults') {
  console.log(JSON.stringify(defaultAnswers(), null, 2))
} else if (mode === 'fragment') {
  console.log(renderFragment(loadAnswers()))
} else if (mode === 'interactive') {
  runInteractive().catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else {
  console.error(`Unknown mode: ${mode}`)
  process.exit(1)
}

function renderQuestions() {
  return `现有项目组件清单选择问题：

使用规则：
- 只问当前项目已有组件槽位和交互开关，不问颜色、图片、间距、字体、圆角、阴影等样式。
- 必须让用户逐项确认；括号里的默认值是 5 分钟无应答时的兜底值。
- 每个确认问题最多等待 5 分钟；用户无应答时直接采用默认值并继续，不要无限等待。
- 回答后保存为 homepage.answers.json，并加入 "__confirmedByUser": true，再用 --answers 传给后续脚本。
- 如果 5 分钟无应答自动采用默认值，仍保存 homepage.answers.json，并加入 "__confirmedByUser": true、"__defaultedAfterTimeout": true。
- 回答后按组件清单填入模板槽位；接口、全局变量、payload、固定跳转仍不可改。

${questions
  .map((item, index) => {
    const choices = item.choices.map(([value, description]) => `  - ${value}${value === item.default ? '（默认）' : ''}: ${description}`).join('\n')
    return `${index + 1}. ${item.title}：${item.question}\n${choices}`
  })
  .join('\n\n')}`
}

function defaultAnswers() {
  return questions.reduce((result, item) => {
    result[item.id] = item.default
    return result
  }, {
    __confirmedByUser: true,
    __defaultedAfterTimeout: true,
    __confirmationSource: 'timeout-default',
    __timeoutMs: defaultTimeoutMs
  })
}

function templateAnswers() {
  const result = { __confirmedByUser: false }
  for (const item of questions) result[item.id] = ''
  return result
}

function loadAnswers() {
  if (!args.answers) {
    console.error(renderAnswersBlocker())
    process.exit(2)
  }
  try {
    const parsed = JSON.parse(readFileSync(args.answers, 'utf8'))
    return normalizeAnswers(parsed)
  } catch (error) {
    console.error(`Failed to read answers file: ${args.answers}`)
    console.error(error.message)
    process.exit(1)
  }
}

function normalizeAnswers(inputAnswers) {
  const result = {}
  const missing = []
  const invalid = []
  if (inputAnswers.__confirmedByUser !== true) {
    invalid.push('__confirmedByUser must be true after user confirmation')
  }
  for (const item of questions) {
    const allowed = new Set(item.choices.map(([choice]) => choice))
    const value = inputAnswers[item.id]
    if (value === undefined || value === null || value === '') {
      missing.push(item.id)
      continue
    }
    if (!allowed.has(value)) {
      invalid.push(`${item.id}=${value}`)
      continue
    }
    result[item.id] = value
  }
  if (missing.length || invalid.length) {
    if (missing.length) console.error(`Missing component-list answers: ${missing.join(', ')}`)
    if (invalid.length) console.error(`Invalid component-list answers: ${invalid.join(', ')}`)
    console.error(renderQuestions())
    process.exit(2)
  }
  return result
}

function renderAnswersBlocker() {
  return `组件清单选择未完成，停止生成组件清单配置。

${renderQuestions()}

下一步：
1. 逐项询问用户并保存为 homepage.answers.json。
2. 每个问题最多等待 5 分钟；无应答时运行 ${nodeCommand('home-elements-dialog.mjs')} --mode defaults > homepage.answers.json。
3. 用户确认或超时默认后，答案文件都必须包含 "__confirmedByUser": true。
4. 确认后运行：${nodeCommand('home-elements-dialog.mjs')} --mode fragment --answers homepage.answers.json`
}

function renderFragment(answers) {
  return `现有项目组件清单配置：
- 页面外壳：${describe('appShell', answers.appShell)}
- 登录页组件：${describe('loginBlock', answers.loginBlock)}
- 快捷入口卡片：${describe('actionCards', answers.actionCards)}
- 来信选登组件组：${describe('publicLettersBlock', answers.publicLettersBlock)}
- 校园服务电话组件组：${describe('servicePhoneBlock', answers.servicePhoneBlock)}
- 来信须知弹窗：${describe('noticeDialog', answers.noticeDialog)}
- 我的信件二级视图组件组：${describe('mailListBlock', answers.mailListBlock)}
- 登录入口与用户菜单：${describe('userMenu', answers.userMenu)}
- 装饰与品牌资产：${describe('decorativeAssets', answers.decorativeAssets)}
- 移动端组件：${describe('mobile', answers.mobile)}

当前项目组件槽位：
- 登录页：HeaderBrand、LoginCard、登录背景/主视觉/页脚。
- 首页外壳：HeaderBrand、UserInfoDropdown、page-stage、page-header、page-main、footer。
- 首页业务：ActionCard、SliderTabs、LetterCard、ServicePhoneCard、ServicePhoneDrawer、LetterNoticeDialog、OverlapSquaresIcon。
- 我的信件二级视图：MailListFilters、MailListCard、MailProgressSteps、MailAttachmentList、MailEvaluateDialog。
- 移动端：MobileMailCard、MobileProgressSteps、MobilePublicLetterCard、MobileServicePhoneDrawer。

生成要求：
- 按上述组件清单填入模板槽位，用户样式描述只决定布局框架、视觉层级和样式 tokens。
- 设计稿/效果图必须在本配置确认之后生成，并且只能围绕上述已确认组件槽位设计。
- 我的信件列表只能在登录后的二级视图展示；未登录不得请求或渲染列表，只能跳登录并带 view=mail redirect。
- 不要把未选择的组件槽位做成可见 UI。
- 不要在设计稿或代码中自由发挥新增未确认的模块、入口、列表、卡片或业务动作。
- 未选择槽位对应的固定接口和 helper 可以保留，但不要在首页主动调用。
- 样式细节不属于本配置；视觉方向使用前置 UI 风格描述和基于本配置生成并确认后的设计稿。
- 代码实现必须按确认后的设计稿落地页面结构、模块位置、视觉层级和交互状态；业务/API/跳转仍以合同为准。`
}

async function runInteractive() {
  const rl = createInterface({ input, output })
  const answers = {}
  try {
    for (const item of questions) {
      console.log(`\n${item.title}: ${item.question}`)
      item.choices.forEach(([value, description]) => {
        console.log(`  ${value}${value === item.default ? ' (default)' : ''}: ${description}`)
      })
      const value = (await questionWithTimeout(rl, `选择 [${item.default}]，${Math.round(defaultTimeoutMs / 1000)}s 后默认: `, item.default)).trim()
      const allowed = new Set(item.choices.map(([choice]) => choice))
      answers[item.id] = allowed.has(value) ? value : item.default
    }
  } finally {
    rl.close()
  }

  answers.__confirmedByUser = true
  console.log('\n' + JSON.stringify(answers, null, 2))
  console.log('\n' + renderFragment(answers))
}

function describe(id, value) {
  const item = questions.find((question) => question.id === id)
  const choice = item?.choices.find(([choiceValue]) => choiceValue === value)
  return choice ? `${choice[0]} - ${choice[1]}` : String(value || '')
}

async function questionWithTimeout(rl, prompt, defaultValue) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), defaultTimeoutMs)
  try {
    return await rl.question(prompt, { signal: controller.signal })
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.log(`\n超时未答，使用默认值：${defaultValue}`)
      return defaultValue
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
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

function nodeCommand(scriptName) {
  return `node "$SKILL_DIR/scripts/${scriptName}"`
}
