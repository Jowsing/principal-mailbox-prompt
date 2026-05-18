#!/usr/bin/env node
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs'
import { mkdtemp, readdir, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  console.log(`Usage:
node contract-lint.mjs --root .
node contract-lint.mjs --root . --home-static dist/home --login-static dist/login
node contract-lint.mjs --root . --home-js dist-home/portal.min.js --login-js dist-login/login.min.js
node contract-lint.mjs --self-test

Static contract scanner for generated 校长信箱 frontend projects. It checks fixed globals,
endpoints, jump URLs, payload markers, request rules, and optional login/home artifacts.
For this repo, the primary artifacts are Web Component JS files: portal.min.js and login.min.js.`)
  process.exit(0)
}

const endpoints = [
  '/admin/upms/login/doLogout',
  '/plugins/xzxx/portal/sms',
  '/plugins/xzxx/portal/doLogin',
  '/plugins/xzxx/portal/getConfig',
  '/plugins/xzxx/portal/phoneList',
  '/plugins/xzxx/portal/letterTypeList',
  '/plugins/xzxx/portal/registerLetters',
  '/admin/api/query/xzxx_task_startByMeList',
  '/plugins/xzxx/portal/getEvaluateList',
  '/plugins/xzxx/portal/read',
  '/admin/api/execute/xzxx_letter_rate',
  '/admin/api/execute/xzxx_letter_remove',
  '/admin/api/execute/xzxx_letter_startBackTo'
]

const requiredSnippets = [
  ['uses window.contextPath', 'window.contextPath'],
  ['uses window.userId', 'window.userId'],
  ['uses window.userName', 'window.userName'],
  ['uses window.logoPath', 'window.logoPath'],
  ['has buildPortalUrl helper', 'buildPortalUrl'],
  ['POST requests include cookies', 'credentials', 'include'],
  ['JSON content type', 'Content-Type', 'application/json'],
  ['logout redirect target', '/plugins/xzxx/portal/index'],
  ['login jump', '/plugins/xzxx/portal/login'],
  ['ids login jump', '/plugins/xzxx/portal/ids-login'],
  ['write/detail form page jump', '/page/xzxx/formPage'],
  ['detail source=view jump', 'source=view'],
  ['my letters secondary view redirect', 'view=mail'],
  ['opens external form safely', 'window.open', '_blank', 'noopener,noreferrer'],
  ['rate payload nesting', 'letterParam', 'rateForm', 'bizId'],
  ['querySetting conversion markers', 'querySetting', 'builder', 'linkOpt'],
  ['status reviewed', 'reviewed'],
  ['status evaluated', 'evaluated'],
  ['status draft', 'draft'],
  ['status to_review', 'to_review'],
  ['status to_confirm', 'to_confirm'],
  ['status suspend', 'suspend'],
  ['status xf_doing', 'xf_doing'],
  ['status xf_done', 'xf_done'],
  ['progress labels', '信件提交', '信件分派', '信件回复', '信件评价']
]

const forbiddenProductionArtifactSnippets = [
  'mock-preview-server',
  'mock-logo.svg',
  'mock-user',
  '本地预览测试数据',
  '/preview/',
  '__artifact',
  'localhost',
  '127.0.0.1'
]

const textExtensions = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.scss',
  '.ts', '.tsx', '.vue', '.yaml', '.yml'
])
const ignoredDirs = new Set(['.git', 'node_modules', '.cache', '.turbo', '.next', '.nuxt'])

if (args['self-test']) {
  selfTest().catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else {
  const root = path.resolve(args.root || process.cwd())
  runLint({
    root,
    homeStatic: args['home-static'] ? path.resolve(args['home-static']) : '',
    loginStatic: args['login-static'] ? path.resolve(args['login-static']) : '',
    homeJs: args['home-js'] ? path.resolve(args['home-js']) : '',
    loginJs: args['login-js'] ? path.resolve(args['login-js']) : ''
  }).then((result) => {
    printResult(result)
    process.exit(result.failed.length ? 1 : 0)
  }).catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

async function runLint(options) {
  const files = await collectTextFiles(options.root)
  const chunks = []
  for (const file of files) chunks.push(await readFile(file, 'utf8'))
  const text = chunks.join('\n')

  const checks = []
  for (const endpoint of endpoints) {
    checks.push(check(`endpoint ${endpoint}`, text.includes(endpoint)))
  }
  for (const [name, ...snippets] of requiredSnippets) {
    checks.push(check(name, snippets.every((snippet) => text.includes(snippet))))
  }
  const hasTwoPageMarkers = (text.includes('登录页') && text.includes('首页')) || (/login/i.test(text) && /home/i.test(text))
  const hasTwoArtifacts = Boolean(options.homeStatic && options.loginStatic)
  checks.push(check('two packaged page markers', hasTwoPageMarkers || hasTwoArtifacts))
  if (options.homeStatic) checks.push(check('home artifact has index.html', existsSync(path.join(options.homeStatic, 'index.html'))))
  if (options.loginStatic) checks.push(check('login artifact has index.html', existsSync(path.join(options.loginStatic, 'index.html'))))
  if (options.homeJs) checks.push(...checkJsArtifact('home JS artifact', options.homeJs, 'principal-mailbox-home-widget'))
  if (options.loginJs) checks.push(...checkJsArtifact('login JS artifact', options.loginJs, 'principal-mailbox-login-widget'))

  return {
    files: files.length,
    passed: checks.filter((item) => item.ok),
    failed: checks.filter((item) => !item.ok)
  }
}

function check(name, ok) {
  return { name, ok: Boolean(ok) }
}

function checkJsArtifact(name, filePath, elementTag) {
  const checks = [check(`${name} exists`, existsSync(filePath) && statSync(filePath).isFile())]
  if (!checks[0].ok) return checks

  const source = readFileSyncSafe(filePath, 4_000_000)
  checks.push(check(`${name} registers ${elementTag}`, source.includes(elementTag)))
  checks.push(check(`${name} is JavaScript`, filePath.endsWith('.js') || source.includes('customElements.define')))
  for (const snippet of forbiddenProductionArtifactSnippets) {
    checks.push(check(`${name} has no production-forbidden marker ${snippet}`, !source.includes(snippet)))
  }
  return checks
}

function readFileSyncSafe(filePath, maxBytes) {
  const size = statSync(filePath).size
  if (size > maxBytes) {
    const buffer = Buffer.alloc(maxBytes)
    const fd = openSync(filePath, 'r')
    try {
      readSync(fd, buffer, 0, maxBytes, 0)
    } finally {
      closeSync(fd)
    }
    return buffer.toString('utf8')
  }
  return readFileSync(filePath, 'utf8')
}

async function collectTextFiles(root) {
  const maxBytes = Number(args['max-file-bytes'] || 2_000_000)
  const results = []
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) await walk(fullPath)
        continue
      }
      if (!entry.isFile() || !isTextFile(entry.name)) continue
      const stat = statSync(fullPath)
      if (stat.size <= maxBytes) results.push(fullPath)
    }
  }
  await walk(root)
  return results
}

function isTextFile(fileName) {
  return textExtensions.has(path.extname(fileName)) || ['package.json', 'vite.config', 'webpack.config'].includes(fileName)
}

function printResult(result) {
  for (const item of result.passed) console.log(`PASS ${item.name}`)
  for (const item of result.failed) console.log(`FAIL ${item.name}`)
  console.log(`Scanned ${result.files} files. Passed ${result.passed.length}. Failed ${result.failed.length}.`)
}

async function selfTest() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'xzxx-contract-lint-'))
  const home = path.join(root, 'dist', 'home')
  const login = path.join(root, 'dist', 'login')
  const homeJs = path.join(root, 'dist-home', 'portal.min.js')
  const loginJs = path.join(root, 'dist-login', 'login.min.js')
  await mkdir(home, { recursive: true })
  await mkdir(login, { recursive: true })
  await mkdir(path.dirname(homeJs), { recursive: true })
  await mkdir(path.dirname(loginJs), { recursive: true })
  await writeFile(path.join(home, 'index.html'), '<!doctype html><title>首页</title>')
  await writeFile(path.join(login, 'index.html'), '<!doctype html><title>登录页</title>')
  await writeFile(homeJs, "customElements.define('principal-mailbox-home-widget', class extends HTMLElement {})")
  await writeFile(loginJs, "customElements.define('principal-mailbox-login-widget', class extends HTMLElement {})")
  await writeFile(path.join(root, 'source.ts'), selfTestSource())
  const result = await runLint({ root, homeStatic: home, loginStatic: login, homeJs, loginJs })
  await rm(root, { recursive: true, force: true })
  if (result.failed.length) {
    printResult(result)
    throw new Error('contract-lint self-test failed')
  }
  console.log('contract-lint self-test passed')
}

function selfTestSource() {
  return `
window.contextPath; window.userId; window.userName; window.logoPath;
function buildPortalUrl() {}
fetch('/x', { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
window.open('/page/xzxx/formPage#/?bizId=' + encodeURIComponent('1') + '&source=view', '_blank', 'noopener,noreferrer');
const pages = '登录页 首页';
const progress = '信件提交 信件分派 信件回复 信件评价';
const status = 'reviewed evaluated draft to_review to_confirm suspend xf_doing xf_done';
const query = 'querySetting builder linkOpt';
const payload = 'letterParam rateForm bizId';
${endpoints.map((item) => `const e${endpoints.indexOf(item)} = '${item}';`).join('\n')}
const login = '/plugins/xzxx/portal/login';
const ids = '/plugins/xzxx/portal/ids-login';
const redirect = '/plugins/xzxx/portal/index';
const mailRedirect = 'view=mail';
`
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
