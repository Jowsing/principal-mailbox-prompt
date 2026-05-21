#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const args = parseArgs(process.argv.slice(2))
const mode = args.mode || 'catalog'

const slots = [
  ['appShell', '页面外壳', 'HeaderBrand + page-stage/page-header/page-main/page-content + footer'],
  ['loginBlock', '登录页组件', 'HeaderBrand + LoginCard + 背景/主视觉/页脚'],
  ['actionCards', '快捷入口卡片', 'ActionCard: 我要写信、我的信件'],
  ['publicLettersBlock', '来信选登组件组', 'SliderTabs + LetterCard + search + empty/loading + load more'],
  ['servicePhoneBlock', '校园服务电话组件组', 'ServicePhoneCard + ServicePhoneDrawer'],
  ['noticeDialog', '来信须知弹窗', 'LetterNoticeDialog'],
  ['mailListBlock', '我的信件二级视图组件组', 'MailListFilters + MailListCard + MailProgressSteps + MailAttachmentList + MailEvaluateDialog'],
  ['userMenu', '登录入口与用户菜单', 'UserInfoDropdown + 登录按钮 + logoutPortal'],
  ['decorativeAssets', '装饰与品牌资产', 'logo/background/action card images/OverlapSquaresIcon/avatar'],
  ['mobile', '移动端组件', 'mobile views + MobileMailCard/MobileProgressSteps/MobilePublicLetterCard/MobileServicePhoneDrawer']
]

if (args.help) {
  console.log(`Usage:
node component-template-kit.mjs --mode catalog
node component-template-kit.mjs --mode questions
node component-template-kit.mjs --mode template
node component-template-kit.mjs --mode write --out principal-mailbox-component-template

Modes:
  catalog    Print existing-project component slot catalog.
  questions  Print the component-list question.
  template   Print React + Ant Design slot template code.
  css        Print template CSS.
  write      Write PrincipalMailboxTemplate.tsx and principal-mailbox-template.css to --out.`)
  process.exit(0)
}

if (mode === 'catalog') {
  console.log(renderCatalog())
} else if (mode === 'questions') {
  console.log(renderQuestions())
} else if (mode === 'template') {
  console.log(templateTsx().trim())
} else if (mode === 'css') {
  console.log(templateCss().trim())
} else if (mode === 'write') {
  writeTemplate()
} else {
  console.error(`Unknown mode: ${mode}`)
  process.exit(1)
}

function renderCatalog() {
  return `现有项目组件槽位目录：
${slots.map(([key, title, components]) => `- ${key}: ${title} -> ${components}`).join('\n')}

使用规则：
- 用户样式描述只决定 layout frame、视觉层级、tokens、密度、品牌感。
- 用户组件清单决定哪些槽位可见；未选择槽位不得出现在设计稿或代码中。
- 组件槽位来自当前项目结构，不能自由新增模块名；确需新增必须先询问用户。
- 固定接口、window globals、payload、跳转、登录 data redirect、交互状态仍以合同为准。`
}

function renderQuestions() {
  return `请用户提供组件清单，必须从下面现有项目槽位中选择：
${slots.map(([key, title]) => `- ${key}: ${title}`).join('\n')}

默认清单：appShell, loginBlock, actionCards, publicLettersBlock, servicePhoneBlock, noticeDialog, mailListBlock, userMenu, decorativeAssets, mobile。

拿到用户清单后：
1. 先把 UI 风格描述落成 layout frame 和 style tokens。
2. 再把用户选择的组件槽位填入布局框架。
3. 未选择组件不得出现在设计稿或代码里。
4. 代码必须基于模板结构，不要重新发明页面模块。`
}

function writeTemplate() {
  const outDir = path.resolve(args.out || 'principal-mailbox-component-template')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(path.join(outDir, 'PrincipalMailboxTemplate.tsx'), `${templateTsx().trim()}\n`, 'utf8')
  writeFileSync(path.join(outDir, 'principal-mailbox-template.css'), `${templateCss().trim()}\n`, 'utf8')
  writeFileSync(path.join(outDir, 'component-slots.md'), `${renderCatalog().trim()}\n`, 'utf8')
  console.log(`Component template written: ${outDir}`)
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

function templateTsx() {
  return `
import { Button, Card, Drawer, Empty, Form, Input, List, Modal, Rate, Select, Spin, Tabs, message } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import './principal-mailbox-template.css'

export type PrincipalMailboxSlot =
  | 'appShell'
  | 'loginBlock'
  | 'actionCards'
  | 'publicLettersBlock'
  | 'servicePhoneBlock'
  | 'noticeDialog'
  | 'mailListBlock'
  | 'userMenu'
  | 'decorativeAssets'
  | 'mobile'

export type PrincipalMailboxStyleBrief = {
  schoolName?: string
  logoUrl?: string
  heroImageUrl?: string
  primaryColor?: string
  accentColor?: string
  background?: string
  density?: 'compact' | 'balanced' | 'spacious'
  radius?: number
}

export type PrincipalMailboxTemplateProps = {
  styleBrief: PrincipalMailboxStyleBrief
  enabledSlots: PrincipalMailboxSlot[]
  loggedIn?: boolean
  userName?: string
  countdown?: number
  loading?: boolean
  children?: ReactNode
}

const hasSlot = (slots: PrincipalMailboxSlot[], slot: PrincipalMailboxSlot) => slots.includes(slot)

export function PrincipalMailboxTemplate({
  styleBrief,
  enabledSlots,
  loggedIn = false,
  userName = '用户',
  countdown = 0,
  loading = false
}: PrincipalMailboxTemplateProps) {
  const themeStyle = {
    '--pm-primary': styleBrief.primaryColor || '#1769e0',
    '--pm-accent': styleBrief.accentColor || '#18a058',
    '--pm-bg': styleBrief.background || '#f4f8ff',
    '--pm-radius': \`\${styleBrief.radius ?? 12}px\`
  } as CSSProperties

  return (
    <div className={\`pm-template density-\${styleBrief.density || 'balanced'}\`} style={themeStyle}>
      {hasSlot(enabledSlots, 'appShell') && (
        <header className="pm-header">
          <div className="pm-brand">
            {styleBrief.logoUrl ? <img src={styleBrief.logoUrl} alt="" /> : <span className="pm-logo-mark" />}
            <span className="pm-brand-title">{styleBrief.schoolName || '校长信箱'}</span>
          </div>
          {hasSlot(enabledSlots, 'userMenu') && (
            <div className="pm-user">{loggedIn ? \`\${userName} / 退出\` : <Button type="link">登录</Button>}</div>
          )}
        </header>
      )}

      <main className="pm-main">
        <section className="pm-hero">
          <div className="pm-hero-copy">
            <p className="pm-eyebrow">Principal Mailbox</p>
            <h1>倾听您的声音，共建美好校园</h1>
            <p>围绕师生诉求、公开信件、进度查询和服务电话组织页面框架。</p>
          </div>
          {styleBrief.heroImageUrl && hasSlot(enabledSlots, 'decorativeAssets') && (
            <img className="pm-hero-image" src={styleBrief.heroImageUrl} alt="" />
          )}
        </section>

        {hasSlot(enabledSlots, 'loginBlock') && (
          <Card className="pm-login-card">
            <h2>欢迎登录</h2>
            <Form layout="vertical">
              <Form.Item label="手机号" required>
                <Input placeholder="请输入手机号" />
              </Form.Item>
              <Form.Item label="验证码" required>
                <Input
                  placeholder="请输入6位验证码"
                  suffix={<Button disabled={countdown > 0}>{countdown > 0 ? \`\${countdown}s后重发\` : '获取验证码'}</Button>}
                />
              </Form.Item>
              <Button type="primary" block loading={loading}>登录（校外人员）</Button>
              <Button type="link" block>统一身份认证登录</Button>
            </Form>
          </Card>
        )}

        {hasSlot(enabledSlots, 'actionCards') && (
          <section className="pm-action-grid">
            <Card className="pm-action-card" hoverable><h3>我要写信</h3><p>向校长表达您的意见、建议或问题</p></Card>
            <Card className="pm-action-card" hoverable><h3>我的信件</h3><p>查看您之前提交的信件及处理状态</p></Card>
          </section>
        )}

        {hasSlot(enabledSlots, 'publicLettersBlock') && (
          <section className="pm-section">
            <div className="pm-section-header"><h2>来信选登</h2><Input.Search className="pm-search" placeholder="请输入" /></div>
            <Tabs items={[{ key: 'all', label: '全部' }, { key: 'consult', label: '咨询' }, { key: 'suggest', label: '建议' }]} />
            <Spin spinning={loading}>
              <List
                grid={{ gutter: 16, column: 2 }}
                dataSource={[1, 2, 3, 4]}
                locale={{ emptyText: <Empty description="暂无记录" /> }}
                renderItem={(item) => (
                  <List.Item key={item}>
                    <Card className="pm-letter-card" hoverable>
                      <p className="pm-tag">建议</p>
                      <h3>关于校园服务体验的建议</h3>
                      <p>这里放置信件摘要和回复摘要，真实项目接入 registerLetters 数据。</p>
                      <span>阅读 128</span>
                    </Card>
                  </List.Item>
                )}
              />
            </Spin>
          </section>
        )}

        {hasSlot(enabledSlots, 'servicePhoneBlock') && (
          <Card className="pm-service-card" title="校园服务电话" extra={<Button type="link">更多</Button>}>
            <div className="pm-phone-grid"><span>党委办公室</span><strong>025-00000000</strong><span>后勤服务</span><strong>025-00000001</strong></div>
            <Drawer title="校园服务电话" open={false} onClose={() => message.info('close')}><Input.Search placeholder="搜索部门或电话" /></Drawer>
          </Card>
        )}

        {hasSlot(enabledSlots, 'mailListBlock') && loggedIn && (
          <section className="pm-section pm-mail-view">
            <div className="pm-section-header">
              <h2>我的信件</h2>
              <div className="pm-filter-row"><Input placeholder="信件标题" /><Select placeholder="信件状态" options={[{ value: 'reviewed', label: '已回复' }]} /><Button>查询</Button></div>
            </div>
            <Card className="pm-mail-card">
              <h3>关于校园环境的建议</h3>
              <p>进度：信件提交 / 信件分派 / 信件回复 / 信件评价</p>
              <div className="pm-attachment-list"><span>附件：</span><Button type="link">问题说明.pdf</Button></div>
              <Button>查看</Button><Button>评价</Button>
            </Card>
          </section>
        )}
      </main>

      {hasSlot(enabledSlots, 'noticeDialog') && <Modal title="来信须知" open={false} okText="同意并开始写信"><p>这里展示 getConfig.noticeContent。</p></Modal>}
      {hasSlot(enabledSlots, 'mailListBlock') && <Modal title="信件评价" open={false}><Rate defaultValue={5} /><Input.TextArea maxLength={500} placeholder="评价意见" /></Modal>}
    </div>
  )
}
`
}

function templateCss() {
  return `
.pm-template {
  min-height: 100vh;
  background: var(--pm-bg);
  color: #152033;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}

.pm-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
}

.pm-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
}

.pm-logo-mark {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--pm-primary);
}

.pm-main {
  width: min(1180px, calc(100% - 48px));
  margin: 0 auto;
  display: grid;
  gap: 20px;
  padding: 24px 0 40px;
}

.pm-hero,
.pm-section,
.pm-login-card,
.pm-service-card,
.pm-mail-card {
  border-radius: var(--pm-radius);
}

.pm-hero {
  min-height: 220px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
  align-items: center;
  padding: 32px;
  background: linear-gradient(135deg, rgba(255,255,255,.92), rgba(255,255,255,.68));
}

.pm-eyebrow,
.pm-tag {
  color: var(--pm-primary);
  font-weight: 600;
}

.pm-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.pm-action-card,
.pm-letter-card {
  border-radius: var(--pm-radius);
}

.pm-section {
  padding: 20px;
  background: rgba(255,255,255,.94);
}

.pm-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.pm-search {
  width: 260px;
}

.pm-phone-grid,
.pm-filter-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.pm-attachment-list {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 12px;
  color: #505266;
}

@media (max-width: 768px) {
  .pm-hero,
  .pm-action-grid,
  .pm-phone-grid,
  .pm-filter-row {
    grid-template-columns: 1fr;
  }
}
`
}
