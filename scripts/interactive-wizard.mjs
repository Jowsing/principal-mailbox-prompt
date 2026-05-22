#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { stdin as input, stdout as output } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const args = parseArgs(process.argv.slice(2))
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(args.root || process.cwd())
const outDir = path.resolve(args.out || 'principal-mailbox-interactive')
const timeoutMs = Number(args['timeout-ms'] || 300000)

if (args.help) {
  console.log(`Usage:
node interactive-wizard.mjs --root . --out principal-mailbox-interactive

Interactive flow:
1. Ask UI style and write ui-style.brief.md.
2. Ask current-project component slots and write homepage.answers.json.
3. Write reference study, component template, and design image prompt.
4. Ask approved design image path/URL, with 5-minute default.
5. Write design fidelity brief and full task pack.

Options:
  --root <dir>       Target project root. Default: cwd.
  --out <dir>        Output folder. Default: principal-mailbox-interactive.
  --timeout-ms <n>   Timeout for each prompt. Default: 300000.
  --style <text>     Non-interactive UI style text.
  --style-file <f>   Read UI style from file.
  --effect-image <r> Approved design image path/URL.
  --skip-task-pack   Stop after writing prompt/reference/template files.`)
  process.exit(0)
}

await runWizard()

async function runWizard() {
  mkdirSync(outDir, { recursive: true })
  const manifest = {
    outDir,
    root,
    timeoutMs,
    startedAt: new Date().toISOString(),
    files: {}
  }

  console.log('校长信箱前端生成交互式向导')
  console.log(`输出目录：${outDir}`)
  console.log(`每步等待：${Math.round(timeoutMs / 1000)} 秒；超时自动使用默认值。\n`)

  const styleFile = path.join(outDir, 'ui-style.brief.md')
  const style = await collectStyle()
  writeFileSync(styleFile, `${style.trim()}\n`, 'utf8')
  manifest.files.style = styleFile
  console.log(`UI 风格已写入：${styleFile}`)

  const answersFile = path.join(outDir, 'homepage.answers.json')
  console.log('\n开始选择当前项目组件槽位。')
  const componentStatus = spawnSync(process.execPath, [
    scriptPath('home-elements-dialog.mjs'),
    '--mode',
    'interactive',
    '--timeout-ms',
    String(timeoutMs),
    '--out',
    answersFile
  ], {
    stdio: 'inherit'
  })
  if (componentStatus.status !== 0) {
    throw new Error(`组件清单交互失败，退出码 ${componentStatus.status}`)
  }
  if (!existsSync(answersFile)) {
    throw new Error(`组件清单未生成：${answersFile}`)
  }
  manifest.files.answers = answersFile

  const referenceDir = path.join(outDir, 'principal-mailbox-design-reference')
  runScript('design-reference-kit.mjs', ['--mode', 'write', '--out', referenceDir])
  manifest.files.designReference = referenceDir
  console.log(`优秀项目参考已写入：${referenceDir}`)

  const templateDir = path.join(outDir, 'principal-mailbox-component-template')
  runScript('component-template-kit.mjs', ['--mode', 'write', '--out', templateDir])
  manifest.files.componentTemplate = templateDir
  console.log(`组件模板已写入：${templateDir}`)

  const designPrompt = runScript('ui-style-intake.mjs', [
    '--mode',
    'prompt',
    '--style-file',
    styleFile,
    '--answers',
    answersFile
  ])
  const designPromptFile = path.join(outDir, 'design-image-prompt.md')
  writeFileSync(designPromptFile, `${designPrompt.trim()}\n`, 'utf8')
  manifest.files.designPrompt = designPromptFile
  console.log(`设计稿生成提示词已写入：${designPromptFile}`)

  const effectImage = await collectEffectImage()
  const effectImageFile = path.join(outDir, 'effect-image.ref.txt')
  writeFileSync(effectImageFile, `${effectImage}\n`, 'utf8')
  manifest.effectImage = effectImage
  manifest.files.effectImageRef = effectImageFile
  console.log(`设计稿引用已写入：${effectImageFile}`)

  const fidelityBrief = runScript('design-fidelity-brief.mjs', [
    '--mode',
    'brief',
    '--style-file',
    styleFile,
    '--answers',
    answersFile,
    '--effect-image',
    effectImage
  ])
  const fidelityFile = path.join(outDir, 'design-fidelity.brief.md')
  writeFileSync(fidelityFile, `${fidelityBrief.trim()}\n`, 'utf8')
  manifest.files.designFidelityBrief = fidelityFile
  console.log(`设计还原门禁已写入：${fidelityFile}`)

  if (!args['skip-task-pack']) {
    const taskPackDir = path.join(outDir, 'principal-mailbox-task-pack')
    runScript('task-pack.mjs', [
      '--mode',
      'write',
      '--root',
      root,
      '--out',
      taskPackDir,
      '--style-file',
      styleFile,
      '--answers',
      answersFile,
      '--effect-image',
      effectImage
    ])
    manifest.files.taskPack = taskPackDir
    console.log(`低上下文任务包已写入：${taskPackDir}`)
  }

  manifest.finishedAt = new Date().toISOString()
  const manifestFile = path.join(outDir, 'wizard.manifest.json')
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`\n向导完成：${manifestFile}`)
  console.log('下一步：用 design-image-prompt.md 生成/确认设计稿，再按 principal-mailbox-task-pack 编号文件执行。')
}

async function collectStyle() {
  if (args.style) return String(args.style).trim()
  if (args['style-file']) {
    const filePath = path.resolve(args['style-file'])
    if (existsSync(filePath)) return readFileSync(filePath, 'utf8').trim()
  }
  console.log('请输入 UI 风格描述。可包含校名、校徽/校园图、气质、色彩、布局、禁忌。')
  const response = await questionWithTimeout('UI 风格描述：', defaultStyle())
  return response.value.trim() || defaultStyle()
}

async function collectEffectImage() {
  if (args['effect-image']) return String(args['effect-image']).trim()
  console.log('\n请使用 design-image-prompt.md 生成并确认设计稿，然后输入图片路径或 URL。')
  const defaultRef = 'approved-design-image.png'
  const response = await questionWithTimeout(`确认后的设计稿路径/URL [${defaultRef}]：`, defaultRef)
  return response.value.trim() || defaultRef
}

function defaultStyle() {
  return runScript('ui-style-intake.mjs', ['--mode', 'default-style'])
}

function questionWithTimeout(prompt, defaultValue) {
  const rl = createInterface({ input, output })
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      console.log(`\n超时未答，使用默认值：${defaultValue}`)
      rl.close()
      resolve({ value: defaultValue, timedOut: true })
    }, timeoutMs)

    rl.question(prompt)
      .then((value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        rl.close()
        resolve({ value, timedOut: false })
      })
      .catch((error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        rl.close()
        reject(error)
      })
  })
}

function runScript(scriptName, scriptArgs) {
  return execFileSync(process.execPath, [scriptPath(scriptName), ...scriptArgs], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
}

function scriptPath(scriptName) {
  return path.join(scriptDir, scriptName)
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
