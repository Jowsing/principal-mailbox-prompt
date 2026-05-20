#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = parseArgs(process.argv.slice(2))
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(args.root || process.cwd())
const mode = args.mode || 'context'

if (args.help) {
  console.log(`Usage:
node task-pack.mjs --mode context --root . --answers homepage.answers.json --style-file ui-style.brief.md --effect-image ./effect.png
node task-pack.mjs --mode write --root . --out .codex/principal-mailbox-task-pack --answers homepage.answers.json --style-file ui-style.brief.md --effect-image ./effect.png
node task-pack.mjs --mode verify --root . --home-js dist-home/portal.min.js --login-js dist-login/login.min.js

Modes:
  context   Print a compact implementation context.
  write     Write prompt/steps/files/checklist/artifacts/homepage files to --out.
  verify    Run contract lint and mock preview self-test against generated artifacts.

Options:
  --answers <file>  Required homepage answers JSON from user decisions.
  --stack <name>    Optional stack hint passed into prompt generation.
  --mobile <yes|no> Optional mobile flag passed into prompt generation.
  --style <text>    User UI style description.
  --style-file <f>  File containing the UI style description.
  --effect-image <r> Approved effect-image path or URL.`)
  process.exit(0)
}

try {
  if (mode === 'context') {
    console.log(renderContext())
  } else if (mode === 'write') {
    writePack()
  } else if (mode === 'verify') {
    verifyPack()
  } else {
    console.error(`Unknown mode: ${mode}`)
    process.exit(1)
  }
} catch (error) {
  const stdout = error?.stdout ? String(error.stdout) : ''
  const stderr = error?.stderr ? String(error.stderr) : ''
  if (stdout) process.stdout.write(stdout)
  if (stderr) process.stderr.write(stderr)
  if (stderr.includes('listen EPERM')) {
    console.error('Preview self-test could not bind localhost in this sandbox. Re-run with permission or run contract-lint separately.')
  } else {
    console.error(error?.message || String(error))
  }
  process.exit(error?.status || 1)
}

function renderContext() {
  assertVisualReady()
  assertHomepageReady()

  return `校长信箱低上下文任务包

先执行：
1. ${nodeCommand('ui-style-intake.mjs')} --mode questions
2. 用户给出 UI 风格描述后，生成效果图提示词：${nodeCommand('ui-style-intake.mjs')} --mode prompt --style-file ui-style.brief.md
3. 调用图片生成能力生成登录页+首页效果图，并让用户确认。
4. ${nodeCommand('detect-build-artifacts.mjs')} --root .
5. ${nodeCommand('home-elements-dialog.mjs')} --mode questions
6. 逐项询问用户并保存 homepage.answers.json；不得未询问就使用默认值。
7. ${nodeCommand('task-pack.mjs')} --mode context --root . --answers homepage.answers.json --style-file ui-style.brief.md --effect-image <approved-image>
8. ${nodeCommand('task-pack.mjs')} --mode write --root . --out .codex/principal-mailbox-task-pack --answers homepage.answers.json --style-file ui-style.brief.md --effect-image <approved-image>

视觉前置：
${styleFragment()}

构建产物探测：
${runScript('detect-build-artifacts.mjs', ['--root', root])}

首页元素配置：
${homeFragment()}

核心执行命令：
- 询问 UI 风格：${nodeCommand('ui-style-intake.mjs')} --mode questions
- 生成效果图提示词：${nodeCommand('ui-style-intake.mjs')} --mode prompt --style-file ui-style.brief.md
- 生成完整 prompt：${nodeCommand('frontend-prompt-kit.mjs')} --mode prompt --style-file ui-style.brief.md --effect-image <approved-image> --answers homepage.answers.json
- 生成步骤：${nodeCommand('frontend-prompt-kit.mjs')} --mode steps --style-file ui-style.brief.md --effect-image <approved-image> --answers homepage.answers.json
- 生成文件清单：${nodeCommand('frontend-prompt-kit.mjs')} --mode files --style-file ui-style.brief.md --effect-image <approved-image> --answers homepage.answers.json
- 生成验收清单：${nodeCommand('frontend-prompt-kit.mjs')} --mode checklist
- 预览：${nodeCommand('mock-preview-server.mjs')} --port 4179 --home-js dist-home/portal.min.js --login-js dist-login/login.min.js
- 验证：${nodeCommand('task-pack.mjs')} --mode verify --root . --home-js dist-home/portal.min.js --login-js dist-login/login.min.js

低智能模型规则：
- 业务实现前必须先拿到用户 UI 风格描述和已确认效果图；缺少时停止并询问。
- 实现任务必须创建或修改真实前端工程文件。
- 不要复制长合同进上下文；按 .codex/principal-mailbox-task-pack 里的文件逐项执行。
- 空目录或未指定技术栈时默认 React + Ant Design；已有 React 工程默认使用 Ant Design UI 组件。
- 我的信件列表只能作为登录后的首页二级视图实现；未登录只跳登录并带 view=mail redirect。
- 预览环境和生产产物必须隔离；生产 JS 纯净，不含 mock、测试数据、/preview、__artifact、localhost 或预览 shell。
- 样式细节不入合同；业务/API/交互/产物格式必须完整。`
}

function writePack() {
  assertVisualReady()
  assertHomepageReady()

  const outDir = path.resolve(args.out || path.join(root, '.codex', 'principal-mailbox-task-pack'))
  mkdirSync(outDir, { recursive: true })

  const files = {
    '00-README.md': renderReadme(),
    '01-ui-style-question.md': runScript('ui-style-intake.mjs', ['--mode', 'questions']),
    '02-effect-image-prompt.md': stylePrompt(),
    '03-style.fragment.md': styleFragment(),
    '04-artifacts.md': runScript('detect-build-artifacts.mjs', ['--root', root]),
    '04-artifacts.json': runScript('detect-build-artifacts.mjs', ['--root', root, '--json']),
    '05-homepage.answers.json': answersJson(),
    '06-homepage.fragment.md': homeFragment(),
    '07-prompt.md': promptKit('prompt'),
    '08-steps.md': promptKit('steps'),
    '09-files.md': promptKit('files'),
    '10-business.md': promptKit('business'),
    '11-artifacts.md': promptKit('artifacts'),
    '12-checklist.md': promptKit('checklist'),
    '13-commands.md': renderCommands()
  }

  for (const [fileName, content] of Object.entries(files)) {
    writeFileSync(path.join(outDir, fileName), `${content.trim()}\n`, 'utf8')
  }

  console.log(`Task pack written: ${outDir}`)
  console.log('Next: open 00-README.md and execute the files in numeric order.')
}

function verifyPack() {
  const lintArgs = ['--root', root]
  if (args['home-js']) lintArgs.push('--home-js', path.resolve(args['home-js']))
  if (args['login-js']) lintArgs.push('--login-js', path.resolve(args['login-js']))
  console.log(runScript('contract-lint.mjs', lintArgs))

  const previewArgs = ['--self-test']
  if (args['home-js']) previewArgs.push('--home-js', path.resolve(args['home-js']))
  if (args['login-js']) previewArgs.push('--login-js', path.resolve(args['login-js']))
  console.log(runScript('mock-preview-server.mjs', previewArgs))
}

function renderReadme() {
  return `# 校长信箱低上下文任务包

按文件编号执行：

1. \`01-ui-style-question.md\`: 先问用户 UI 风格描述。
2. \`02-effect-image-prompt.md\`: 用于生成登录页+首页效果图。
3. \`03-style.fragment.md\`: 已确认风格和效果图对实现模型的约束。
4. \`04-artifacts.md/json\`: 当前构建产物格式。不要猜 HTML 或 JS，以这里和实际 build 输出为准。
5. \`05-homepage.answers.json\`: 首页业务元素选择。必须来自用户逐项确认。
6. \`06-homepage.fragment.md\`: 可直接贴给实现模型的首页业务配置。
7. \`07-prompt.md\`: 完整生成提示词。
8. \`08-steps.md\`: 小步实现清单。
9. \`09-files.md\`: 必须落地的工程文件。
10. \`10-business.md\`: 业务逻辑和交互标准。
11. \`11-artifacts.md\`: 构建产物合同。
12. \`12-checklist.md\`: 最终验收。
13. \`13-commands.md\`: 预览、构建、验证命令。

硬规则：
- 先收集 UI 风格描述，生成并确认效果图，再进入业务实现。
- 实现任务必须创建或修改真实前端工程文件。
- 样式只来自用户风格输入和确认后的效果图；不要把样式细节当业务合同。
- 接口、全局变量、payload、跳转 URL、交互状态、验证码倒计时和当前产物格式不可漏。`
}

function renderCommands() {
  return `# 常用命令

生成上下文：
\`\`\`sh
${nodeCommand('task-pack.mjs')} --mode context --root . --answers homepage.answers.json --style-file ui-style.brief.md --effect-image <approved-image>
\`\`\`

视觉前置：
\`\`\`sh
${nodeCommand('ui-style-intake.mjs')} --mode questions
${nodeCommand('ui-style-intake.mjs')} --mode prompt --style-file ui-style.brief.md
\`\`\`

业务提示词：
\`\`\`sh
${nodeCommand('frontend-prompt-kit.mjs')} --mode prompt --style-file ui-style.brief.md --effect-image <approved-image> --answers homepage.answers.json
${nodeCommand('frontend-prompt-kit.mjs')} --mode steps --style-file ui-style.brief.md --effect-image <approved-image> --answers homepage.answers.json
\`\`\`

生成任务包：
\`\`\`sh
${nodeCommand('home-elements-dialog.mjs')} --mode questions
${nodeCommand('task-pack.mjs')} --mode write --root . --out .codex/principal-mailbox-task-pack --answers homepage.answers.json --style-file ui-style.brief.md --effect-image <approved-image>
\`\`\`

当前产物探测：
\`\`\`sh
${nodeCommand('detect-build-artifacts.mjs')} --root .
\`\`\`

首页选择：
\`\`\`sh
${nodeCommand('home-elements-dialog.mjs')} --mode questions
${nodeCommand('home-elements-dialog.mjs')} --mode fragment --answers homepage.answers.json
\`\`\`

构建：
\`\`\`sh
pnpm build:home
pnpm build:login
\`\`\`

预览：
\`\`\`sh
${nodeCommand('mock-preview-server.mjs')} --port 4179 --home-js dist-home/portal.min.js --login-js dist-login/login.min.js
\`\`\`

隔离要求：
- 预览服务只外部托管 JS 和 mock 同路径接口，不参与生产产物内容。
- 生产 JS 不得包含 mock、测试数据、/preview、__artifact、localhost、127.0.0.1。

验证：
\`\`\`sh
${nodeCommand('task-pack.mjs')} --mode verify --root . --home-js dist-home/portal.min.js --login-js dist-login/login.min.js
\`\`\``
}

function promptKit(modeName) {
  const scriptArgs = ['--mode', modeName]
  if (args.stack) scriptArgs.push('--stack', args.stack)
  if (args.mobile) scriptArgs.push('--mobile', args.mobile)
  if (args.style) scriptArgs.push('--style', args.style)
  if (args['style-file']) scriptArgs.push('--style-file', path.resolve(args['style-file']))
  if (args['effect-image']) scriptArgs.push('--effect-image', args['effect-image'])
  if (args.answers) scriptArgs.push('--answers', path.resolve(args.answers))
  return runScript('frontend-prompt-kit.mjs', scriptArgs)
}

function stylePrompt() {
  const scriptArgs = ['--mode', 'prompt']
  if (args.style) scriptArgs.push('--style', args.style)
  if (args['style-file']) scriptArgs.push('--style-file', path.resolve(args['style-file']))
  return runScript('ui-style-intake.mjs', scriptArgs)
}

function styleFragment() {
  const scriptArgs = ['--mode', 'fragment']
  if (args.style) scriptArgs.push('--style', args.style)
  if (args['style-file']) scriptArgs.push('--style-file', path.resolve(args['style-file']))
  if (args['effect-image']) scriptArgs.push('--effect-image', args['effect-image'])
  return runScript('ui-style-intake.mjs', scriptArgs)
}

function assertVisualReady() {
  if (hasStyleInput() && hasEffectImage()) return
  const error = new Error(renderVisualBlocker())
  error.status = 2
  throw error
}

function assertHomepageReady() {
  if (hasHomepageAnswers()) return
  const error = new Error(renderHomepageBlocker())
  error.status = 2
  throw error
}

function renderHomepageBlocker() {
  return `首页元素选择未完成，停止生成业务任务包。

${runScript('home-elements-dialog.mjs', ['--mode', 'questions'])}

下一步：
1. 逐项询问用户，保存为 homepage.answers.json。
2. 答案文件必须包含 "__confirmedByUser": true；不得跳过询问直接使用默认值，默认值只是推荐选项。
3. 确认后再运行 task-pack，并传入 --answers homepage.answers.json。`
}

function hasHomepageAnswers() {
  if (!args.answers) return false
  const answersPath = path.resolve(args.answers)
  if (!existsSync(answersPath)) return false
  try {
    runScript('home-elements-dialog.mjs', ['--mode', 'fragment', '--answers', answersPath])
    return true
  } catch {
    return false
  }
}

function renderVisualBlocker() {
  if (!hasStyleInput()) {
    return `视觉前置未完成，停止生成业务任务包。

${runScript('ui-style-intake.mjs', ['--mode', 'questions'])}

下一步：
1. 让用户输入 UI 风格描述，并保存到 ui-style.brief.md，或用 --style "<用户描述>"。
2. 再运行：${nodeCommand('ui-style-intake.mjs')} --mode prompt --style-file ui-style.brief.md
3. 生成登录页+首页效果图并让用户确认。
4. 确认后再运行 task-pack，并传入 --style-file ui-style.brief.md --effect-image <approved-image>。`
  }

  return `视觉前置未完成，停止生成业务任务包。

${stylePrompt()}

下一步：
1. 用上面的提示词生成一张登录页+首页效果图。
2. 让用户确认或要求重生成。
3. 确认后再运行 task-pack，并传入 --effect-image <approved-image>。`
}

function hasStyleInput() {
  return Boolean(readStyleInput())
}

function hasEffectImage() {
  return Boolean(args['effect-image'] || args.image)
}

function readStyleInput() {
  if (args.style) return String(args.style).trim()
  if (args['style-file']) {
    const filePath = path.resolve(args['style-file'])
    if (existsSync(filePath)) return readFileSync(filePath, 'utf8').trim()
  }
  return ''
}

function homeFragment() {
  const scriptArgs = ['--mode', 'fragment']
  scriptArgs.push('--answers', path.resolve(args.answers))
  return runScript('home-elements-dialog.mjs', scriptArgs)
}

function answersJson() {
  const answersPath = path.resolve(args.answers)
  return JSON.stringify(JSON.parse(readFileSync(answersPath, 'utf8')), null, 2)
}

function runScript(scriptName, scriptArgs) {
  const scriptPath = path.join(scriptDir, scriptName)
  return execFileSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
}

function nodeCommand(scriptName) {
  return `node .codex/skills/principal-mailbox-prompt/scripts/${scriptName}`
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
