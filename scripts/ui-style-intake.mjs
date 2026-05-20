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
  if (!style) failWith(renderQuestions())
  console.log(renderImagePrompt())
} else if (mode === 'fragment') {
  if (!style || !effectImage) failWith(renderBlocker())
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
6. 学校特色：可选，例如校名、校徽/Logo、校训、校园建筑、学院色、服务对象。
7. 差异化要求：可选，例如希望更学术、更现代、更国际化、不要和其他学校模板太像。

收到风格描述后，先生成一张 ${target} 的效果图，并让用户确认或修改。
如果用户描述较短，模型必须主动补全专业校园门户设计方向，不得直接用简陋描述生成。
模型必须吸收世界各地大学首页的成熟模式，博采众长、多创新；不同学校出图模板相似度不得高于 50%。
效果图未生成或未确认前，不要开始生成工程文件、业务合同层、页面或 mock。`
}

function renderTemplate() {
  return `# UI 风格描述

- 整体气质：
- 色彩倾向：
- 布局密度：
- 参考对象：
- 禁止项：
- 学校特色：
- 差异化要求：
- 其他偏好：
`
}

function renderImagePrompt() {
  const styleText = style || '[粘贴用户输入的 UI 风格描述]'
  return `请优先使用 imagegen2 生成一张 16:9 高保真 Web 前端效果图，作为“${target}”的视觉方向确认图；如果当前环境没有 imagegen2，则使用可用的图像生成能力，但必须遵守下面的增强设计说明。

用户原始 UI 风格描述：
${styleText}

AI 必须补充的设计方向：
${renderAugmentedStyleBrief(styleText)}

画面要求：
- 同一张图里同时表现登录页和首页的整体视觉风格；建议左侧为登录页，右侧为首页主界面。
- 登录页必须像真实学校门户入口：学校标识区、校名/校徽占位、手机号输入、验证码输入、获取验证码、登录、统一认证入口。
- 首页必须像专业校园服务门户：品牌头部、来信选登、我要写信、我的信件入口、来信须知、校园服务电话、评价弹窗入口等业务模块都有清晰视觉占位。
- 整体框架要专业化：完整页头、主视觉/信息摘要、内容区网格、模块卡片、列表区、二级视图入口、页脚或辅助信息层次。
- 风格必须体现学校特色：校园秩序感、公共服务可信感、学术/校园文化气质、可放置校徽/校训/校园建筑图像的位置。
- 吸收全球大学首页优秀模式：参考其清晰导航、校园图像组织、公告/服务入口、学术文化表达和可信信息层级，但不要复制任何单一高校模板。
- 多创新、强差异：给不同学校出图时模板相似度不得高于 50%；至少在首页框架、主视觉构图、模块顺序、色彩系统、校园符号、组件处理六项中改变四项以上。
- 页面必须精致优美：留白克制、层级清晰、组件一致、阴影/描边/圆角细腻，避免廉价模板感、营销海报感、杂乱堆叠。
- 默认表现为 React + Ant Design 可落地的表单、卡片、标签页、按钮、弹窗/抽屉、列表和状态组件质感。
- 只表达视觉方向、布局气质、组件风格和信息层级，不要求文字完全可读。
- 不要生成真实接口、代码、流程图、营销海报或纯插画。
- 输出应像可落地的后台/门户前端界面效果图，而不是抽象概念图。`
}

function renderAugmentedStyleBrief(styleText) {
  return `- 在用户描述基础上主动补齐缺失信息；不要因为用户描述少就生成简陋页面。
- 网页整体框架采用专业学校门户/公共服务平台结构，而不是单页宣传页。
- 视觉必须有学校识别：校徽/Logo 占位、校名区域、校训或校园文化短语位置、校园建筑/图书馆/教学楼意象、学术服务氛围。
- 学习吸收世界各地大学首页的成熟组织方式：清晰导航、公共服务入口、校园影像、公告/新闻层级、学术文化表达、可信认证入口；只能综合吸收，不能照搬某个学校。
- 针对不同学校必须重新组合视觉 DNA：模板相似度不得高于 50%，优先改动首页框架、主视觉构图、模块顺序、色彩系统、校园符号、组件处理。
- 信息架构要高级：登录页强调可信入口和认证流程；首页强调模块导航、来信选登、我的信件二级入口、服务电话和须知信息。
- 保持精致优美：低噪声背景、统一栅格、清晰卡片层级、克制动效暗示、细腻边框和阴影、足够留白、色彩有主辅和点缀。
- 避免：通用 SaaS 模板、纯政务蓝大色块、过度营销 hero、抽象渐变堆叠、卡片套卡片、廉价插画、随机虚构业务模块。
- 用户原始描述仍是第一风格依据：${styleText}`
}

function renderFragment() {
  const styleText = style || '[缺少 UI 风格描述：必须先询问用户并补齐]'
  const imageText = effectImage || '[缺少已确认效果图：必须先调用图片生成能力生成并经用户确认]'
  return `视觉前置门禁：
- 用户 UI 风格描述：${styleText}
- AI 补充设计方向：必须补足专业学校门户框架、学校特色识别、精致优美的页面质感，并优先用 imagegen2 生成效果图。
- 全球高校借鉴与差异化：必须综合吸收世界大学首页优秀模式并创新，不复制单一模板；不同学校模板相似度不得高于 50%。
- 已确认效果图：${imageText}
- 生成/实现工程前必须先完成以上两项；缺任一项时停止业务实现，先补齐视觉输入。
- 效果图只作为视觉方向：颜色、质感、密度、布局气质、组件风格可参考它。
- 业务/API/全局变量/payload/跳转/产物格式/交互状态仍以校长信箱合同为准，效果图不得覆盖业务合同。
- 不要把效果图里的随机文案、虚构接口、额外页面、额外模块当作业务需求。`
}

function renderBlocker() {
  if (!style) return renderQuestions()
  return `${renderImagePrompt()}

阻断：还缺少用户确认后的效果图引用。请先用上面的提示词生成登录页+首页效果图，并让用户确认；确认后用 --effect-image <approved-image> 继续。`
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

function failWith(message) {
  console.error(message)
  process.exit(2)
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
