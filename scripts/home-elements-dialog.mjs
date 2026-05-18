#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const args = parseArgs(process.argv.slice(2))

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
node home-elements-dialog.mjs --mode defaults
node home-elements-dialog.mjs --mode fragment
node home-elements-dialog.mjs --mode fragment --answers homepage.answers.json
node home-elements-dialog.mjs --mode interactive

The script asks only homepage business-element questions. It intentionally avoids style details.`)
  process.exit(0)
}

const mode = args.mode || 'questions'

if (mode === 'questions') {
  console.log(renderQuestions())
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
- 用户未回答时使用默认值。
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
  }, {})
}

function loadAnswers() {
  const defaults = defaultAnswers()
  if (!args.answers) return defaults
  try {
    const parsed = JSON.parse(readFileSync(args.answers, 'utf8'))
    return normalizeAnswers({ ...defaults, ...parsed })
  } catch (error) {
    console.error(`Failed to read answers file: ${args.answers}`)
    console.error(error.message)
    process.exit(1)
  }
}

function normalizeAnswers(inputAnswers) {
  const result = {}
  for (const item of questions) {
    const allowed = new Set(item.choices.map(([choice]) => choice))
    const value = inputAnswers[item.id]
    result[item.id] = allowed.has(value) ? value : item.default
  }
  return result
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
- 我的信件列表只能在登录后的二级视图展示；未登录不得请求或渲染列表，只能跳登录并带 view=mail redirect。
- 不要把被关闭的元素做成可见 UI。
- 被关闭元素对应的固定接口和 helper 可以保留，但不要在首页主动调用。
- 样式细节不属于本配置，等待用户另给设计或页面风格提示词。`
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
      const value = (await rl.question(`选择 [${item.default}]: `)).trim()
      const allowed = new Set(item.choices.map(([choice]) => choice))
      answers[item.id] = allowed.has(value) ? value : item.default
    }
  } finally {
    rl.close()
  }

  console.log('\n' + JSON.stringify(answers, null, 2))
  console.log('\n' + renderFragment(answers))
}

function describe(id, value) {
  const item = questions.find((question) => question.id === id)
  const choice = item?.choices.find(([choiceValue]) => choiceValue === value)
  return choice ? `${choice[0]} - ${choice[1]}` : String(value || '')
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
