#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const args = parseArgs(process.argv.slice(2))
const defaultTimeoutMs = Number(args['timeout-ms'] || 300000)

const questions = [
  {
    id: 'publicLetters',
    title: '来信选登',
    question: '首页是否展示“来信选登”？',
    default: 'yes',
    choices: [
      ['yes', '展示，含类型筛选、列表、空态、加载态、详情跳转、阅读量'],
      ['no', '不展示；仍保留相关接口能力，后续可打开']
    ]
  },
  {
    id: 'publicLetterSearch',
    title: '来信搜索',
    question: '来信选登是否支持 keyword 搜索？',
    default: 'pc-only',
    choices: [
      ['pc-only', 'PC 支持 300ms 防抖和回车搜索，移动端只做类型筛选'],
      ['all', 'PC 和移动端都支持 keyword 搜索'],
      ['none', '不展示搜索，只保留类型筛选']
    ]
  },
  {
    id: 'writeLetter',
    title: '我要写信',
    question: '首页是否展示“我要写信”？',
    default: 'yes',
    choices: [
      ['yes', '展示；点击前必须 getConfig，按 noticeContent 决定是否先显示来信须知'],
      ['no', '不展示；仍保留固定写信跳转能力']
    ]
  },
  {
    id: 'notice',
    title: '来信须知',
    question: '如果 getConfig 返回 noticeContent，是否必须先确认来信须知？',
    default: 'required',
    choices: [
      ['required', '必须确认后才能打开写信固定地址'],
      ['skip', '不拦截，直接打开写信固定地址']
    ]
  },
  {
    id: 'myLetters',
    title: '我的信件',
    question: '首页是否启用“我的信件”登录后二级视图？',
    default: 'yes',
    choices: [
      ['yes', '启用；未登录只展示入口并跳登录，带 view=mail redirect；已登录进入二级视图后才请求并展示列表'],
      ['no', '不启用列表；不得在首页主视图直接展示我的信件列表']
    ]
  },
  {
    id: 'myLetterActions',
    title: '信件操作',
    question: '我的信件需要哪些操作？',
    default: 'full',
    choices: [
      ['full', '查看、草稿编辑/删除、to_review 撤回、reviewed/evaluated 评价'],
      ['readonly', '只查看详情，不做删除/撤回/评价'],
      ['no-evaluate', '查看、草稿编辑/删除、撤回，不做评价']
    ]
  },
  {
    id: 'servicePhone',
    title: '校园服务电话',
    question: '首页是否展示“校园服务电话”？',
    default: 'config',
    choices: [
      ['config', '由 getConfig.showPhone 控制；false 时隐藏入口、清空列表、关闭抽屉'],
      ['always', '始终展示，仍调用 phoneList'],
      ['never', '不展示，不调用 phoneList']
    ]
  },
  {
    id: 'servicePhoneSearch',
    title: '电话搜索',
    question: '服务电话抽屉是否支持搜索？',
    default: 'yes',
    choices: [
      ['yes', '打开抽屉 force 拉取 pageSize=9999，并按 name/phone 本地搜索'],
      ['no', '只展示列表，不搜索']
    ]
  },
  {
    id: 'readCount',
    title: '阅读量',
    question: '公开信件详情点击是否调用阅读接口并本地 +1？',
    default: 'yes',
    choices: [
      ['yes', '已登录打开详情后 POST /plugins/xzxx/portal/read { bizId: readId }，成功后 readCount +1'],
      ['no', '只打开详情，不更新阅读量']
    ]
  },
  {
    id: 'mobile',
    title: '移动端',
    question: '是否需要移动端独立业务流程？',
    default: 'yes',
    choices: [
      ['yes', '需要；移动端首页、登录、我的信件业务流程独立实现，可共享 API helper'],
      ['no', '暂不做移动端']
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
  return `首页元素业务选择问题：

使用规则：
- 只问业务元素和交互开关，不问颜色、图片、间距、字体、圆角、阴影等样式。
- 必须让用户逐项确认；括号里的默认值是 5 分钟无应答时的兜底值。
- 每个确认问题最多等待 5 分钟；用户无应答时直接采用默认值并继续，不要无限等待。
- 回答后保存为 homepage.answers.json，并加入 "__confirmedByUser": true，再用 --answers 传给后续脚本。
- 如果 5 分钟无应答自动采用默认值，仍保存 homepage.answers.json，并加入 "__confirmedByUser": true、"__defaultedAfterTimeout": true。
- 回答后按选择生成首页，但接口、全局变量、payload、固定跳转仍不可改。

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
    if (missing.length) console.error(`Missing homepage answers: ${missing.join(', ')}`)
    if (invalid.length) console.error(`Invalid homepage answers: ${invalid.join(', ')}`)
    console.error(renderQuestions())
    process.exit(2)
  }
  return result
}

function renderAnswersBlocker() {
  return `首页元素选择未完成，停止生成首页配置。

${renderQuestions()}

下一步：
1. 逐项询问用户并保存为 homepage.answers.json。
2. 每个问题最多等待 5 分钟；无应答时运行 ${nodeCommand('home-elements-dialog.mjs')} --mode defaults > homepage.answers.json。
3. 用户确认或超时默认后，答案文件都必须包含 "__confirmedByUser": true。
4. 确认后运行：${nodeCommand('home-elements-dialog.mjs')} --mode fragment --answers homepage.answers.json`
}

function renderFragment(answers) {
  return `首页元素业务配置：
- 来信选登：${describe('publicLetters', answers.publicLetters)}
- 来信搜索：${describe('publicLetterSearch', answers.publicLetterSearch)}
- 我要写信：${describe('writeLetter', answers.writeLetter)}
- 来信须知：${describe('notice', answers.notice)}
- 我的信件：${describe('myLetters', answers.myLetters)}
- 信件操作：${describe('myLetterActions', answers.myLetterActions)}
- 校园服务电话：${describe('servicePhone', answers.servicePhone)}
- 电话搜索：${describe('servicePhoneSearch', answers.servicePhoneSearch)}
- 阅读量：${describe('readCount', answers.readCount)}
- 移动端：${describe('mobile', answers.mobile)}

生成要求：
- 按上述业务配置实现首页元素。
- 设计稿/效果图必须在本配置确认之后生成，并且只能围绕上述已确认元素设计。
- 我的信件列表只能在登录后的二级视图展示；未登录不得请求或渲染列表，只能跳登录并带 view=mail redirect。
- 不要把被关闭的元素做成可见 UI。
- 不要在设计稿或代码中自由发挥新增未确认的首页模块、入口、列表、卡片或业务动作。
- 被关闭元素对应的固定接口和 helper 可以保留，但不要在首页主动调用。
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
