#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const args = parseArgs(process.argv.slice(2))
const mode = args.mode || 'questions'
const style = readStyleInput()
const effectImage = args['effect-image'] || args.image || ''
const target = args.target || '校长信箱登录页和首页'

if (args.help) {
  console.log(`Usage:
node ui-style-intake.mjs --mode questions
node ui-style-intake.mjs --mode prompt --style "清爽、政务、蓝白..."
node ui-style-intake.mjs --mode fragment --style-file ui-style.brief.md --effect-image ./effect.png
node ui-style-intake.mjs --mode write --out .codex/principal-mailbox-style --style-file ui-style.brief.md
node ui-style-intake.mjs --mode assert --style-file ui-style.brief.md --effect-image ./effect.png

Modes:
  questions  Print the required user question.
  template   Print a fillable style brief template.
  prompt     Print an image-generation prompt from the style brief.
  fragment   Print implementation instructions that bind the style brief and effect image.
  write      Write style gate files to --out.
  assert     Fail unless a non-empty style brief and effect image reference are present.

Options:
  --style <text>           Inline UI style description.
  --style-file <file>      File containing the UI style description.
  --effect-image <path>    Approved effect-image path or URL.
  --out <dir>              Output dir for --mode write.
  --target <text>          Target UI scope. Default: 校长信箱登录页和首页.`)
  process.exit(0)
}

if (mode === 'questions') {
  console.log(renderQuestions())
} else if (mode === 'template') {
  console.log(renderTemplate())
} else if (mode === 'prompt') {
  console.log(renderImagePrompt())
} else if (mode === 'fragment') {
  console.log(renderFragment())
} else if (mode === 'write') {
  writeStylePack()
} else if (mode === 'assert') {
  assertReady()
} else {
  console.error(`Unknown mode: ${mode}`)
  process.exit(1)
}

function renderQuestions() {
  return `生成校长信箱前端工程前，必须先收集视觉输入。

请用户先输入一段 UI 风格描述。至少包含：
1. 整体气质：例如政务、校园、清爽、专业、亲和、科技、极简。
2. 色彩倾向：例如蓝白、绿色校园、低饱和、深色、品牌色。
3. 布局密度：例如信息密集、留白舒展、卡片式、表格式、移动优先。
4. 参考对象：可选，例如某网站、某系统、某张图、品牌规范。
5. 禁止项：可选，例如不要营销感、不要渐变、不要插画、不要深色。

收到风格描述后，先生成一张 ${target} 的效果图，并让用户确认或修改。
效果图未生成或未确认前，不要开始生成工程文件、业务合同层、页面或 mock。`
}

function renderTemplate() {
  return `# UI 风格描述

- 整体气质：
- 色彩倾向：
- 布局密度：
- 参考对象：
- 禁止项：
- 其他偏好：
`
}

function renderImagePrompt() {
  const styleText = style || '[粘贴用户输入的 UI 风格描述]'
  return `请生成一张 16:9 高保真 Web 前端效果图，作为“${target}”的视觉方向确认图。

用户 UI 风格描述：
${styleText}

画面要求：
- 同一张图里同时表现登录页和首页的整体视觉风格；建议左侧为登录页，右侧为首页主界面。
- 登录页可包含学校标识区域、手机号输入、验证码输入、获取验证码、登录、统一认证入口。
- 首页可包含品牌头部、来信选登、我要写信、我的信件入口、来信须知、校园服务电话、评价弹窗入口等业务模块的视觉占位。
- 只表达视觉方向、布局气质、组件风格和信息层级，不要求文字完全可读。
- 不要生成真实接口、代码、流程图、营销海报或纯插画。
- 输出应像可落地的后台/门户前端界面效果图，而不是抽象概念图。`
}

function renderFragment() {
  const styleText = style || '[缺少 UI 风格描述：必须先询问用户并补齐]'
  const imageText = effectImage || '[缺少已确认效果图：必须先调用图片生成能力生成并经用户确认]'
  return `视觉前置门禁：
- 用户 UI 风格描述：${styleText}
- 已确认效果图：${imageText}
- 生成/实现工程前必须先完成以上两项；缺任一项时停止业务实现，先补齐视觉输入。
- 效果图只作为视觉方向：颜色、质感、密度、布局气质、组件风格可参考它。
- 业务/API/全局变量/payload/跳转/产物格式/交互状态仍以校长信箱合同为准，效果图不得覆盖业务合同。
- 不要把效果图里的随机文案、虚构接口、额外页面、额外模块当作业务需求。`
}

function writeStylePack() {
  const outDir = path.resolve(args.out || '.codex/principal-mailbox-style')
  mkdirSync(outDir, { recursive: true })
  const files = {
    '01-ui-style-question.md': renderQuestions(),
    '02-ui-style-template.md': renderTemplate(),
    '03-effect-image-prompt.md': renderImagePrompt(),
    '04-style-fragment.md': renderFragment()
  }

  for (const [fileName, content] of Object.entries(files)) {
    writeFileSync(path.join(outDir, fileName), `${content.trim()}\n`, 'utf8')
  }
  console.log(`Style gate written: ${outDir}`)
  if (!style) console.log('Next: fill 02-ui-style-template.md or rerun with --style/--style-file.')
  if (!effectImage) console.log('Next: generate an effect image from 03-effect-image-prompt.md and rerun with --effect-image.')
}

function assertReady() {
  const missing = []
  if (!style) missing.push('UI style description')
  if (!effectImage) missing.push('approved effect image')
  if (missing.length > 0) {
    console.error(`Missing required visual preflight: ${missing.join(', ')}`)
    process.exit(2)
  }
  console.log('Visual preflight ready.')
}

function readStyleInput() {
  if (args.style) return String(args.style).trim()
  if (args['style-file']) {
    const filePath = path.resolve(args['style-file'])
    if (existsSync(filePath)) return readFileSync(filePath, 'utf8').trim()
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
