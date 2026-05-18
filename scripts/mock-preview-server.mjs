#!/usr/bin/env node
import { createServer } from 'node:http'
import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  console.log(`Usage:
node mock-preview-server.mjs [--port 4179] [--host 127.0.0.1] [--static dist] [--home-static dist/home] [--login-static dist/login] [--home-js dist-home/portal.min.js] [--login-js dist-login/login.min.js] [--context-path /lowcode]

Serves 校长信箱 mock portal APIs, host globals, fixed jump pages, and optional login/home static or Web Component JS frontend assets. This is a preview-only harness; it must not be bundled into production artifacts.`)
  process.exit(0)
}

const host = args.host || '127.0.0.1'
const port = Number(args.port || 4179)
const contextPath = normalizeContextPath(args['context-path'] || '')
const staticRoot = args.static ? path.resolve(args.static) : ''
const homeStaticRoot = args['home-static'] ? path.resolve(args['home-static']) : staticRoot
const loginStaticRoot = args['login-static'] ? path.resolve(args['login-static']) : staticRoot
const homeJsPath = args['home-js'] ? path.resolve(args['home-js']) : ''
const loginJsPath = args['login-js'] ? path.resolve(args['login-js']) : ''

const letterTypes = [
  { label: '咨询', value: 'consult' },
  { label: '建议', value: 'suggestion' },
  { label: '投诉', value: 'complaint' }
]

const phoneList = [
  { name: '校长办公室', phone: '025-88880001' },
  { name: '教务处', phone: '025-88880002' },
  { name: '学生工作处', phone: '025-88880003' },
  { name: '后勤服务中心', phone: '025-88880004' }
]

const letters = [
  makeLetter(101, 'reviewed', '咨询', '关于校园自习空间开放时间的咨询', '教务处已回复。'),
  makeLetter(102, 'to_review', '建议', '建议增加校园夜间照明巡检', ''),
  makeLetter(103, 'draft', '投诉', '食堂排队秩序问题', ''),
  makeLetter(104, 'evaluated', '建议', '建议优化校园网报修入口', '信息化办公室已回复。')
]

const evaluateList = [
  makeEvaluate('service', '服务态度', true),
  makeEvaluate('speed', '办理效率', false)
]

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

function normalizeContextPath(value) {
  const text = String(value || '').trim()
  if (!text || text === '/') return ''
  return `/${text.replace(/^\/|\/$/g, '')}`
}

function stripContext(urlPath) {
  if (contextPath && urlPath === contextPath) return '/'
  if (contextPath && urlPath.startsWith(`${contextPath}/`)) return urlPath.slice(contextPath.length)
  return urlPath
}

function makeLetter(id, status, type, title, replyContent) {
  return {
    id,
    bizId: `BIZ-${id}`,
    status,
    letterTypeName: type,
    serialNumber: `XZXX2026${String(id).padStart(4, '0')}`,
    createTime: '2026-05-18 09:00:00',
    title,
    pageoffice: `<p>${title}，这是一条本地预览测试数据。</p>`,
    replyUserName: replyContent ? '校长办公室' : '',
    replyContent,
    readCount: '12',
    ratingData: status === 'evaluated' ? { items: [{ startLevel: 5, parent: { dimensionName: '满意度' } }] } : undefined
  }
}

function makeEvaluate(id, dimensionName, defaultFiveStarFlag) {
  return {
    id,
    dimensionName,
    defaultFiveStarFlag,
    oneStar: '很差',
    twoStar: '不满意',
    threeStar: '一般',
    fourStar: '满意',
    fiveStar: '非常满意',
    usedFlag: true,
    deleteFlag: false
  }
}

async function readJson(req) {
  let text = ''
  for await (const chunk of req) text += chunk
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function ok(res, data) {
  res.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-credentials': 'true'
  })
  res.end(JSON.stringify({ success: true, code: '0', data }))
}

function html(res, body) {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(body)
}

function notFound(res) {
  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ success: false, message: 'Not found' }))
}

function hostGlobals() {
  return `<script>
window.contextPath = window.contextPath ?? ${JSON.stringify(contextPath)};
window.userId = window.userId ?? (new URLSearchParams(location.search).get('loggedIn') === '0' ? '' : 'mock-user');
window.userName = window.userName ?? '测试用户';
window.logoPath = window.logoPath ?? '/mock-logo.svg';
</script>`
}

async function serveStatic(reqPath, res, root = staticRoot) {
  if (!root) return false
  const targetPath = path.resolve(path.join(root, reqPath === '/' ? 'index.html' : reqPath))
  if (!isInsideRoot(targetPath, root)) return false
  const filePath = existsSync(targetPath) && statSync(targetPath).isFile() ? targetPath : path.join(root, 'index.html')
  if (!existsSync(filePath)) return false
  let content = await readFile(filePath)
  if (filePath.endsWith('.html')) {
    content = Buffer.from(String(content).replace('</head>', `${hostGlobals()}</head>`))
  }
  res.writeHead(200, { 'content-type': contentType(filePath) })
  res.end(content)
  return true
}

async function serveAsset(reqPath, res, root) {
  if (!root) return false
  const targetPath = path.resolve(path.join(root, reqPath))
  if (!isInsideRoot(targetPath, root) || !existsSync(targetPath) || !statSync(targetPath).isFile()) return false
  const content = await readFile(targetPath)
  res.writeHead(200, { 'content-type': contentType(targetPath) })
  res.end(content)
  return true
}

async function serveFile(filePath, res, forcedType) {
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) return false
  const content = await readFile(filePath)
  res.writeHead(200, { 'content-type': forcedType || contentType(filePath) })
  res.end(content)
  return true
}

async function servePage(root, res) {
  if (!root) return false
  return serveStatic('/', res, root)
}

function isInsideRoot(targetPath, root) {
  const relative = path.relative(root, targetPath)
  return relative === '' || (relative && !relative.startsWith('..') && !path.isAbsolute(relative))
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8'
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8'
  if (filePath.endsWith('.svg')) return 'image/svg+xml'
  if (filePath.endsWith('.png')) return 'image/png'
  return 'application/octet-stream'
}

function filterLetters(payload) {
  const flat = (payload.querySetting || []).flat()
  const keyword = flat.find((item) => item?.builder === 'include')?.value || ''
  const statuses = flat.filter((item) => item?.name === 'status').map((item) => item.value)
  const letterType = flat.find((item) => item?.name === 'letterType')?.value || ''
  return letters.filter((item) => {
    const keywordMatch = !keyword || item.title.includes(keyword) || item.pageoffice.includes(keyword)
    const statusMatch = !statuses.length || statuses.includes(item.status)
    const typeMatch = !letterType || item.letterTypeName === letterType || item.letterType === letterType
    return keywordMatch && statusMatch && typeMatch
  })
}

function shell() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hostGlobals()}<title>校长信箱 Mock Preview</title><style>body{font-family:Arial,"PingFang SC",sans-serif;margin:0;background:#eef5ff;color:#1f2432}main{max-width:860px;margin:48px auto;padding:24px;background:#fff;border-radius:12px}code{background:#f6f8fc;padding:2px 6px;border-radius:4px}</style></head><body><main><h1>校长信箱 Mock Preview Server</h1><p>Mock APIs and host globals are running outside production artifacts.</p><p>Serve current Web Component artifacts with <code>--home-js dist-home/portal.min.js --login-js dist-login/login.min.js</code>.</p><p>Preview URLs: <code>/preview/home</code>, <code>/preview/mail</code>, <code>/preview/login</code>.</p></main></body></html>`
}

function componentShell({ title, scriptPath, elementTag, attributes = '' }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hostGlobals()}<title>${title}</title><style>html,body,#app{width:100%;height:100%;margin:0}</style></head><body><${elementTag} id="app" ${attributes}></${elementTag}><script src="${scriptPath}"></script></body></html>`
}

async function handle(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const reqPath = stripContext(url.pathname)

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,accept',
      'access-control-allow-credentials': 'true'
    })
    res.end()
    return
  }

  if (reqPath === '/mock-logo.svg') {
    res.writeHead(200, { 'content-type': 'image/svg+xml' })
    res.end('<svg xmlns="http://www.w3.org/2000/svg" width="154" height="72"><rect width="154" height="72" rx="8" fill="#333fff"/><text x="77" y="44" text-anchor="middle" font-size="22" fill="white">LOGO</text></svg>')
    return
  }

  if (req.method === 'GET') {
    if (reqPath === '/__artifact/home.js' && (await serveFile(homeJsPath, res, 'text/javascript; charset=utf-8'))) return
    if (reqPath === '/__artifact/login.js' && (await serveFile(loginJsPath, res, 'text/javascript; charset=utf-8'))) return
    if (reqPath.startsWith('/preview/login/') && (await serveStatic(reqPath.slice('/preview/login'.length) || '/', res, loginStaticRoot))) return
    if (reqPath.startsWith('/preview/home/') && (await serveStatic(reqPath.slice('/preview/home'.length) || '/', res, homeStaticRoot))) return
    if (reqPath === '/admin/upms/login/doLogout') return ok(res, { redirectUrl: url.searchParams.get('redirect') || `${contextPath}/plugins/xzxx/portal/index` })
    if (reqPath.startsWith('/page/xzxx/formPage')) return html(res, `<!doctype html><meta charset="utf-8"><h1>Mock 校长信箱表单页</h1><p>${reqPath}${url.search}</p>`)
    if (reqPath === '/preview/login' && loginJsPath) return html(res, componentShell({ title: '登录页预览', scriptPath: `${contextPath}/__artifact/login.js`, elementTag: 'principal-mailbox-login-widget' }))
    if (reqPath === '/preview/home' && homeJsPath) return html(res, componentShell({ title: '首页预览', scriptPath: `${contextPath}/__artifact/home.js`, elementTag: 'principal-mailbox-home-widget', attributes: 'view="home"' }))
    if (reqPath === '/preview/mail' && homeJsPath) return html(res, componentShell({ title: '我的信件二级视图预览', scriptPath: `${contextPath}/__artifact/home.js`, elementTag: 'principal-mailbox-home-widget', attributes: 'view="mail" logged-in="true"' }))
    if (reqPath === '/plugins/xzxx/portal/login' && loginJsPath) return html(res, componentShell({ title: '登录页预览', scriptPath: `${contextPath}/__artifact/login.js`, elementTag: 'principal-mailbox-login-widget' }))
    if (reqPath === '/preview/login' && (await servePage(loginStaticRoot, res))) return
    if (reqPath === '/preview/home' && (await servePage(homeStaticRoot, res))) return
    if (reqPath === '/preview/mail' && (await servePage(homeStaticRoot, res))) return
    if (reqPath === '/plugins/xzxx/portal/login' && (await servePage(loginStaticRoot, res))) return
    if (reqPath === '/plugins/xzxx/portal/login' || reqPath === '/plugins/xzxx/portal/ids-login') return html(res, '<!doctype html><meta charset="utf-8"><h1>Mock Login</h1>')
    if (await serveStatic(reqPath, res)) return
    if (await serveAsset(reqPath, res, homeStaticRoot)) return
    if (await serveAsset(reqPath, res, loginStaticRoot)) return
    if (reqPath === '/' && homeJsPath) return html(res, componentShell({ title: '首页预览', scriptPath: `${contextPath}/__artifact/home.js`, elementTag: 'principal-mailbox-home-widget', attributes: 'view="home"' }))
    if (reqPath === '/' && (await servePage(homeStaticRoot, res))) return
    if (reqPath === '/') return html(res, shell())
  }

  if (req.method === 'POST') {
    const payload = await readJson(req)
    if (reqPath === '/plugins/xzxx/portal/sms') return ok(res, { sent: true, phone: payload.phone })
    if (reqPath === '/plugins/xzxx/portal/doLogin') return ok(res, payload.redirect || `${contextPath}/plugins/xzxx/portal/index`)
    if (reqPath === '/plugins/xzxx/portal/getConfig') return ok(res, { showPhone: url.searchParams.get('showPhone') !== '0', noticeContent: '<p>请确认来信内容真实、清晰。</p>' })
    if (reqPath === '/plugins/xzxx/portal/phoneList') return ok(res, { rows: phoneList, total: phoneList.length })
    if (reqPath === '/plugins/xzxx/portal/letterTypeList') return ok(res, { rows: letterTypes })
    if (reqPath === '/plugins/xzxx/portal/registerLetters' || reqPath === '/admin/api/query/xzxx_task_startByMeList') {
      const rows = url.searchParams.get('empty') === '1' ? [] : filterLetters(payload)
      return ok(res, { rows, total: rows.length })
    }
    if (reqPath === '/plugins/xzxx/portal/getEvaluateList') return ok(res, { rows: evaluateList })
    if (reqPath === '/plugins/xzxx/portal/read') return ok(res, { read: true, bizId: payload.bizId })
    if (reqPath === '/admin/api/execute/xzxx_letter_rate') return ok(res, { rated: true })
    if (reqPath === '/admin/api/execute/xzxx_letter_remove') return ok(res, { removed: true })
    if (reqPath === '/admin/api/execute/xzxx_letter_startBackTo') return ok(res, { withdrawn: true })
  }

  notFound(res)
}

export function createMockPreviewServer() {
  return createServer((req, res) => {
    handle(req, res).catch((error) => {
      res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ success: false, message: error.message }))
    })
  })
}

async function selfTest() {
  const server = createMockPreviewServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const base = `http://127.0.0.1:${port}`
  const config = await fetch(`${base}/plugins/xzxx/portal/getConfig`, { method: 'POST' }).then((r) => r.json())
  const list = await fetch(`${base}/plugins/xzxx/portal/registerLetters`, { method: 'POST', body: '{}' }).then((r) => r.json())
  const loginResult = await fetch(`${base}/plugins/xzxx/portal/doLogin`, {
    method: 'POST',
    body: JSON.stringify({ phone: '13800000000', code: '123456', redirect: '/plugins/xzxx/portal/index' })
  }).then((r) => r.json())
  const home = homeStaticRoot ? await fetch(`${base}/preview/home`).then((r) => r.text()) : ''
  const login = loginStaticRoot ? await fetch(`${base}/preview/login`).then((r) => r.text()) : ''
  const homeJs = homeJsPath ? await fetch(`${base}/preview/home`).then((r) => r.text()) : ''
  const loginJs = loginJsPath ? await fetch(`${base}/preview/login`).then((r) => r.text()) : ''
  server.close()
  if (!config.success || !Array.isArray(list.data.rows)) throw new Error('self-test failed')
  if (loginResult.data !== '/plugins/xzxx/portal/index') throw new Error('login data redirect self-test failed')
  if (homeStaticRoot && !home.includes('window.contextPath')) throw new Error('home preview self-test failed')
  if (loginStaticRoot && !login.includes('window.contextPath')) throw new Error('login preview self-test failed')
  if (homeJsPath && !homeJs.includes('principal-mailbox-home-widget')) throw new Error('home js preview self-test failed')
  if (loginJsPath && !loginJs.includes('principal-mailbox-login-widget')) throw new Error('login js preview self-test failed')
  console.log('mock-preview-server self-test passed')
}

if (args['self-test']) {
  selfTest().catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else {
  createMockPreviewServer().listen(port, host, () => {
    console.log(`校长信箱 mock preview server: http://${host}:${port}${contextPath || ''}/`)
    if (staticRoot) console.log(`serving static: ${staticRoot}`)
    if (homeStaticRoot && homeStaticRoot !== staticRoot) console.log(`serving home page: ${homeStaticRoot}`)
    if (loginStaticRoot && loginStaticRoot !== staticRoot) console.log(`serving login page: ${loginStaticRoot}`)
    if (homeJsPath) console.log(`serving home js: ${homeJsPath}`)
    if (loginJsPath) console.log(`serving login js: ${loginJsPath}`)
  })
}
