#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  console.log(`Usage:
node detect-build-artifacts.mjs --root .
node detect-build-artifacts.mjs --root . --json

Reads package.json and common bundler config files, then prints the likely package artifact format.
This is intentionally heuristic: use it as the first pass, then confirm with the build output.`)
  process.exit(0)
}

const root = path.resolve(args.root || process.cwd())
const result = detectArtifacts(root)

if (args.json) {
  console.log(JSON.stringify(result, null, 2))
} else {
  console.log(renderMarkdown(result))
}

function detectArtifacts(projectRoot) {
  const packageJsonPath = path.join(projectRoot, 'package.json')
  const hasPackageJson = existsSync(packageJsonPath)
  const packageJson = readJson(packageJsonPath)
  const scripts = packageJson.scripts || {}
  const configPath = findFirstExisting(projectRoot, [
    'vite.config.ts',
    'vite.config.mts',
    'vite.config.js',
    'vite.config.mjs',
    'webpack.config.js',
    'webpack.config.mjs',
    'rollup.config.js',
    'rollup.config.mjs'
  ])
  const configText = configPath ? readText(configPath) : ''
  const modeToTarget = parseModeTargetMap(configText)
  const componentConfigs = parseComponentConfigs(configText)
  const buildScripts = Object.entries(scripts)
    .filter(([name, command]) => name.startsWith('build') && typeof command === 'string')
    .map(([name, command]) => analyzeBuildScript(projectRoot, name, command, modeToTarget, componentConfigs))

  const primaryArtifacts = buildScripts.filter((item) => item.role === '首页' || item.role === '登录页')
  const format = inferFormat(primaryArtifacts, buildScripts, configText)
  const warnings = []

  if (!hasPackageJson || !Object.keys(scripts).length) warnings.push('未读取到 package.json scripts。')
  if (!configPath) warnings.push('未找到 Vite/Webpack/Rollup 配置文件。')
  if (!primaryArtifacts.length) warnings.push('未自动识别登录页/首页产物，请人工核对 build 脚本和入口。')
  if (primaryArtifacts.length && !primaryArtifacts.every((item) => item.fileName)) {
    warnings.push('部分入口未识别到 fileName，需要以实际构建产物为准。')
  }

  return {
    root: projectRoot,
    packageJson: existsSync(packageJsonPath) ? packageJsonPath : '',
    configPath: configPath || '',
    format,
    primaryArtifacts,
    buildScripts,
    warnings
  }
}

function analyzeBuildScript(projectRoot, name, command, modeToTarget, componentConfigs) {
  const mode = extractMode(command)
  const target = mode ? modeToTarget.get(mode) || mode : ''
  const componentConfig = componentConfigs.get(target) || componentConfigs.get(mode) || null
  const entry = componentConfig?.entry || ''
  const entryInfo = entry ? inspectEntry(projectRoot, entry) : {}
  const fileName = componentConfig?.fileName || inferFileName(command)
  const role = inferRole({ scriptName: name, mode, target, entry, fileName, tag: entryInfo.customElement })
  const outDir = componentConfig?.outDir || ''

  return {
    script: name,
    command,
    mode,
    target,
    role,
    entry,
    outDir,
    fileName,
    libName: componentConfig?.name || '',
    styleId: componentConfig?.styleId || '',
    format: componentConfig ? 'Vite library/component' : inferScriptFormat(command),
    customElement: entryInfo.customElement || '',
    observedAttributes: entryInfo.observedAttributes || []
  }
}

function parseModeTargetMap(configText) {
  const result = new Map()
  const pattern = /mode\s*={2,3}\s*['"`]([^'"`]+)['"`]\s*\?\s*['"`]([^'"`]+)['"`]/g
  for (const match of configText.matchAll(pattern)) {
    result.set(match[1], match[2])
  }
  return result
}

function parseComponentConfigs(configText) {
  const result = new Map()
  const pattern = /buildTarget\s*={2,3}\s*['"`]([^'"`]+)['"`]\s*\?\s*\{/g
  for (const match of configText.matchAll(pattern)) {
    const objectStart = configText.indexOf('{', match.index)
    const block = readBalancedBlock(configText, objectStart)
    if (!block) continue
    result.set(match[1], {
      outDir: extractStringField(block, 'outDir'),
      styleId: extractStringField(block, 'styleId'),
      entry: extractEntry(block),
      name: extractStringField(block, 'name'),
      fileName: extractStringField(block, 'fileName')
    })
  }
  return result
}

function readBalancedBlock(text, startIndex) {
  if (startIndex < 0 || text[startIndex] !== '{') return ''
  let depth = 0
  let quote = ''
  let escaped = false
  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index]
    if (quote) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth === 0) return text.slice(startIndex, index + 1)
  }
  return ''
}

function extractMode(command) {
  return command.match(/--mode\s+([^\s]+)/)?.[1] || ''
}

function extractStringField(block, fieldName) {
  const pattern = new RegExp(`${fieldName}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`)
  return block.match(pattern)?.[1] || ''
}

function extractEntry(block) {
  return block.match(/new URL\(\s*['"`]\.\/([^'"`]+)['"`]/)?.[1] || extractStringField(block, 'entry')
}

function inferFileName(command) {
  return command.match(/(?:--outFile|--outfile)\s+([^\s]+)/)?.[1] || ''
}

function inferScriptFormat(command) {
  if (/vite\s+build/.test(command)) return 'Vite build'
  if (/webpack/.test(command)) return 'Webpack build'
  if (/rollup/.test(command)) return 'Rollup build'
  return 'unknown'
}

function inferRole(item) {
  const text = [item.scriptName, item.mode, item.target, item.entry, item.fileName, item.tag].join(' ').toLowerCase()
  if (text.includes('login')) return '登录页'
  if (text.includes('home') || text.includes('portal')) return '首页'
  if (text.includes('mailbox')) return '合并/历史产物'
  return '未知'
}

function inspectEntry(projectRoot, entry) {
  const normalized = entry.replace(/^\.\//, '')
  const entryPath = path.join(projectRoot, normalized)
  if (!existsSync(entryPath)) return {}
  const source = readText(entryPath)
  const tag =
    source.match(/customElements\.define\(\s*['"`]([^'"`]+)['"`]/)?.[1] ||
    source.match(/const\s+ELEMENT_TAG\s*=\s*['"`]([^'"`]+)['"`]/)?.[1] ||
    ''
  const attrs = source.match(/observedAttributes[\s\S]{0,300}?return\s*\[([\s\S]*?)\]/)?.[1] || ''
  return {
    customElement: tag,
    observedAttributes: attrs
      .split(',')
      .map((item) => item.trim().replace(/^['"`]|['"`]$/g, ''))
      .filter(Boolean)
  }
}

function inferFormat(primaryArtifacts, buildScripts, configText) {
  const hasIife = /formats\s*:\s*\[\s*['"`]iife['"`]\s*\]/.test(configText)
  const hasCssInjection = /injectCssIntoJsPlugin|inject-css-into-js/.test(configText)
  const hasCustomElements = primaryArtifacts.some((item) => item.customElement)
  const hasJsFiles = primaryArtifacts.some((item) => item.fileName?.endsWith('.js'))

  if (primaryArtifacts.length && hasIife && hasCustomElements && hasJsFiles) {
    return `Vite library IIFE Web Component JS${hasCssInjection ? ' with CSS injected into JS' : ''}`
  }
  if (buildScripts.some((item) => item.fileName?.endsWith('.html'))) return 'HTML page artifact'
  if (hasJsFiles) return 'JavaScript artifact'
  return 'unknown; confirm by running the production build'
}

function renderMarkdown(result) {
  const lines = []
  lines.push('构建产物探测结果：')
  lines.push(`- 项目根目录：${result.root}`)
  lines.push(`- package.json：${result.packageJson || '未找到'}`)
  lines.push(`- 构建配置：${result.configPath || '未找到'}`)
  lines.push(`- 推断产物格式：${result.format}`)
  lines.push('')
  lines.push('主业务产物：')
  if (result.primaryArtifacts.length) {
    for (const item of result.primaryArtifacts) {
      lines.push(`- ${item.role}: ${item.script} -> ${item.fileName || '未知文件名'}`)
      lines.push(`  - command: ${item.command}`)
      if (item.mode) lines.push(`  - mode: ${item.mode}`)
      if (item.target) lines.push(`  - target: ${item.target}`)
      if (item.entry) lines.push(`  - entry: ${item.entry}`)
      if (item.outDir) lines.push(`  - outDir: ${item.outDir}`)
      if (item.customElement) lines.push(`  - custom element: <${item.customElement}>`)
      if (item.observedAttributes.length) lines.push(`  - attributes: ${item.observedAttributes.join(', ')}`)
    }
  } else {
    lines.push('- 未自动识别。')
  }
  lines.push('')
  lines.push('全部 build 脚本：')
  for (const item of result.buildScripts) {
    lines.push(`- ${item.script}: ${item.command}`)
  }
  if (result.warnings.length) {
    lines.push('')
    lines.push('警告：')
    for (const warning of result.warnings) lines.push(`- ${warning}`)
  }
  lines.push('')
  lines.push('下一步：运行对应生产构建，并用实际输出文件确认上面的 fileName/outDir。')
  return lines.join('\n')
}

function readJson(filePath) {
  if (!existsSync(filePath)) return {}
  try {
    return JSON.parse(readText(filePath))
  } catch {
    return {}
  }
}

function readText(filePath) {
  return readFileSync(filePath, 'utf8')
}

function findFirstExisting(projectRoot, names) {
  for (const name of names) {
    const candidate = path.join(projectRoot, name)
    if (existsSync(candidate)) return candidate
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
