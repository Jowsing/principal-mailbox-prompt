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
node task-pack.mjs --mode context --root .
node task-pack.mjs --mode write --root . --out .codex/principal-mailbox-task-pack
node task-pack.mjs --mode verify --root . --home-js dist-home/portal.min.js --login-js dist-login/login.min.js

Modes:
  context   Print a compact implementation context.
  write     Write prompt/steps/files/checklist/artifacts/homepage files to --out.
  verify    Run contract lint and mock preview self-test against generated artifacts.

Options:
  --answers <file>  Optional homepage answers JSON for fragment generation.
  --stack <name>    Optional stack hint passed into prompt generation.
  --mobile <yes|no> Optional mobile flag passed into prompt generation.`)
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
  return `校长信箱低上下文任务包

先执行：
1. ${nodeCommand('detect-build-artifacts.mjs')} --root .
2. ${nodeCommand('home-elements-dialog.mjs')} --mode defaults > homepage.answers.json
3. 如用户已选择首页元素，编辑 homepage.answers.json；否则使用默认值。
4. ${nodeCommand('task-pack.mjs')} --mode write --root . --out .codex/principal-mailbox-task-pack --answers homepage.answers.json

构建产物探测：
${runScript('detect-build-artifacts.mjs', ['--root', root])}

首页元素配置：
${homeFragment()}

核心执行命令：
- 生成完整 prompt：${nodeCommand('frontend-prompt-kit.mjs')} --mode prompt
- 生成步骤：${nodeCommand('frontend-prompt-kit.mjs')} --mode steps
- 生成文件清单：${nodeCommand('frontend-prompt-kit.mjs')} --mode files
- 生成验收清单：${nodeCommand('frontend-prompt-kit.mjs')} --mode checklist
- 预览：${nodeCommand('mock-preview-server.mjs')} --port 4179 --home-js dist-home/portal.min.js --login-js dist-login/login.min.js
- 验证：${nodeCommand('task-pack.mjs')} --mode verify --root . --home-js dist-home/portal.min.js --login-js dist-login/login.min.js

低智能模型规则：
- 实现任务必须创建或修改真实前端工程文件。
- 不要复制长合同进上下文；按 .codex/principal-mailbox-task-pack 里的文件逐项执行。
- 我的信件列表只能作为登录后的首页二级视图实现；未登录只跳登录并带 view=mail redirect。
- 预览环境和生产产物必须隔离；生产 JS 纯净，不含 mock、测试数据、/preview、__artifact、localhost 或预览 shell。
- 样式细节不入合同；业务/API/交互/产物格式必须完整。`
}

function writePack() {
  const outDir = path.resolve(args.out || path.join(root, '.codex', 'principal-mailbox-task-pack'))
  mkdirSync(outDir, { recursive: true })

  const files = {
    '00-README.md': renderReadme(),
    '01-artifacts.md': runScript('detect-build-artifacts.mjs', ['--root', root]),
    '01-artifacts.json': runScript('detect-build-artifacts.mjs', ['--root', root, '--json']),
    '02-homepage.answers.json': answersJson(),
    '03-homepage.fragment.md': homeFragment(),
    '04-prompt.md': promptKit('prompt'),
    '05-steps.md': promptKit('steps'),
    '06-files.md': promptKit('files'),
    '07-business.md': promptKit('business'),
    '08-artifacts.md': promptKit('artifacts'),
    '09-checklist.md': promptKit('checklist'),
    '10-commands.md': renderCommands()
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

1. \`01-artifacts.md/json\`: 当前构建产物格式。不要猜 HTML 或 JS，以这里和实际 build 输出为准。
2. \`02-homepage.answers.json\`: 首页业务元素选择。用户没有选择时使用默认值。
3. \`03-homepage.fragment.md\`: 可直接贴给实现模型的首页业务配置。
4. \`04-prompt.md\`: 完整生成提示词。
5. \`05-steps.md\`: 小步实现清单。
6. \`06-files.md\`: 必须落地的工程文件。
7. \`07-business.md\`: 业务逻辑和交互标准。
8. \`08-artifacts.md\`: 构建产物合同。
9. \`09-checklist.md\`: 最终验收。
10. \`10-commands.md\`: 预览、构建、验证命令。

硬规则：
- 实现任务必须创建或修改真实前端工程文件。
- 不要把样式细节当业务合同。
- 接口、全局变量、payload、跳转 URL、交互状态、验证码倒计时和当前产物格式不可漏。`
}

function renderCommands() {
  return `# 常用命令

生成上下文：
\`\`\`sh
${nodeCommand('task-pack.mjs')} --mode context --root .
\`\`\`

生成任务包：
\`\`\`sh
${nodeCommand('home-elements-dialog.mjs')} --mode defaults > homepage.answers.json
${nodeCommand('task-pack.mjs')} --mode write --root . --out .codex/principal-mailbox-task-pack --answers homepage.answers.json
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
  return runScript('frontend-prompt-kit.mjs', scriptArgs)
}

function homeFragment() {
  const scriptArgs = ['--mode', 'fragment']
  if (args.answers) scriptArgs.push('--answers', path.resolve(args.answers))
  return runScript('home-elements-dialog.mjs', scriptArgs)
}

function answersJson() {
  const answersPath = args.answers ? path.resolve(args.answers) : ''
  if (answersPath && existsSync(answersPath)) {
    return JSON.stringify(JSON.parse(readFileSync(answersPath, 'utf8')), null, 2)
  }
  return runScript('home-elements-dialog.mjs', ['--mode', 'defaults'])
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
